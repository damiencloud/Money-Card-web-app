import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { Role } from '@prisma/client';
import { formatSubscription } from './admin.controller.js';

export async function getPublicPlans(_req: Request, res: Response) {
  const plans = await prisma.plan.findMany({
    orderBy: { price: 'asc' },
  });
  return sendSuccess(res, plans);
}

export async function getMySubscription(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId && req.user?.role !== Role.SUPER_ADMIN) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Organization context required');
  }

  const subscription = await prisma.subscription.findFirst({
    where: orgId ? { organizationId: orgId } : {},
    include: {
      plan: true,
      organization: {
        include: {
          _count: {
            select: {
              branches: true,
              users: true,
              cards: true,
            },
          },
        },
      },
    },
  });

  if (!subscription) {
    return sendError(res, 404, 'NOT_FOUND', 'Subscription not found for this organization');
  }

  return sendSuccess(res, formatSubscription(subscription));
}

export async function getOrgSubscriptionPayments(req: Request, res: Response) {
  const isSuperAdmin = req.user?.role === Role.SUPER_ADMIN;
  const orgId = req.user?.organizationId;

  if (!isSuperAdmin && !orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Organization context required');
  }

  const payments = await prisma.subscriptionPayment.findMany({
    where: isSuperAdmin ? {} : { organizationId: orgId as string },
    orderBy: { createdAt: 'desc' },
    include: {
      organization: true,
    },
  });

  return sendSuccess(res, payments);
}

export async function getOrgPlanRequests(req: Request, res: Response) {
  const isSuperAdmin = req.user?.role === Role.SUPER_ADMIN;
  const orgId = req.user?.organizationId;

  if (!isSuperAdmin && !orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Organization context required');
  }

  const requests = await prisma.planChangeRequest.findMany({
    where: isSuperAdmin ? {} : { organizationId: orgId as string },
    orderBy: { requestedAt: 'desc' },
    include: {
      organization: true,
      requestedPlan: true,
    },
  });

  const allPlans = await prisma.plan.findMany();
  const planMap = new Map(allPlans.map((p) => [p.id, p.name]));

  const formatted = requests.map((r) => ({
    id: r.id,
    organizationId: r.organizationId,
    organizationName: r.organization?.name || 'Organization',
    currentPlanId: r.currentPlanId,
    currentPlanName: planMap.get(r.currentPlanId) || 'Standard Plan',
    requestedPlanId: r.requestedPlanId,
    requestedPlanName: r.requestedPlan?.name || 'Enterprise Plan',
    requestType: 'UPGRADE',
    reason: r.reason || '',
    status: r.status,
    adminNotes: r.adminNotes || '',
    createdAt: r.requestedAt,
    updatedAt: r.requestedAt,
    reviewedAt: r.reviewedAt,
    reviewedBy: r.reviewedByUserId,
  }));

  return sendSuccess(res, formatted);
}

export async function createOrgPlanRequest(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Organization context required');
  }

  const { requestedPlanId, reason } = req.body;
  if (!requestedPlanId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Requested plan ID is required');
  }

  const [currentSub, targetPlan] = await Promise.all([
    prisma.subscription.findUnique({ where: { organizationId: orgId } }),
    prisma.plan.findUnique({ where: { id: requestedPlanId } }),
  ]);

  if (!targetPlan) {
    return sendError(res, 404, 'NOT_FOUND', 'Requested plan not found');
  }

  const newRequest = await prisma.planChangeRequest.create({
    data: {
      organizationId: orgId,
      currentPlanId: currentSub?.planId || requestedPlanId,
      requestedPlanId,
      reason: reason || 'Plan change requested via Org Portal',
      status: 'PENDING',
    },
    include: {
      organization: true,
      requestedPlan: true,
    },
  });

  return sendSuccess(res, newRequest, 201);
}

export async function renewOrgSubscription(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Organization context required');
  }

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    include: { plan: true },
  });

  if (!subscription) {
    return sendError(res, 404, 'NOT_FOUND', 'Subscription not found');
  }

  return sendSuccess(res, {
    message: 'Renewal request recorded. Please contact Super Admin for invoice clearance.',
    subscription: formatSubscription(subscription),
  });
}

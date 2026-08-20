import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { hashPassword } from '../utils/crypto.js';
import {
  Role,
  OrgStatus,
  SubscriptionStatus,
  PermissionCode,
  DirectPaymentMethod,
  PlanRequestStatus,
} from '@prisma/client';

export async function getOrganizations(_req: Request, res: Response) {
  const orgs = await prisma.organization.findMany({
    include: {
      plan: true,
      subscription: true,
      _count: {
        select: {
          branches: true,
          users: true,
          cards: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = orgs.map((org) => ({
    id: org.id,
    name: org.name,
    status: org.status,
    planId: org.planId,
    plan: org.plan,
    subscription: org.subscription,
    usage: {
      branchCount: org._count.branches,
      branchLimit: org.subscription?.branchLimitOverride || org.plan?.branchLimit || 3,
      staffCount: org._count.users,
      staffLimit: org.subscription?.staffLimitOverride || org.plan?.staffLimit || 25,
      cardCount: org._count.cards,
      cardLimit: org.subscription?.cardLimitOverride || org.plan?.cardLimit || 1000,
    },
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  }));

  return sendSuccess(res, formatted);
}

export async function createOrganization(req: Request, res: Response) {
  const { name, adminEmail, password, planId } = req.body;

  if (!name || !name.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Organization name is required');
  }

  if (!adminEmail || !adminEmail.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Org Admin email is required');
  }

  const cleanEmail = adminEmail.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (existingUser) {
    return sendError(res, 400, 'VALIDATION_ERROR', `Account with email '${adminEmail}' already exists`);
  }

  if (!password || password.length < 6) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Password must be at least 6 characters');
  }

  const targetPlanId = planId || 'plan_002';
  const plan = await prisma.plan.findUnique({ where: { id: targetPlanId } });
  if (!plan) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Selected plan does not exist');
  }

  const passwordHash = await hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: name.trim(),
        planId: plan.id,
        status: OrgStatus.ACTIVE,
      },
    });

    const sub = await tx.subscription.create({
      data: {
        organizationId: org.id,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        renewalDate: new Date(Date.now() + 30 * 86400000),
      },
    });

    const defaultBranch = await tx.branch.create({
      data: {
        organizationId: org.id,
        name: 'Main Cafeteria',
      },
    });

    const adminUser = await tx.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        name: `${name.trim()} Admin`,
        role: Role.ORG_ADMIN,
        organizationId: org.id,
      },
    });

    const allPermissions = Object.values(PermissionCode);
    for (const perm of allPermissions) {
      await tx.userPermission.create({
        data: {
          userId: adminUser.id,
          permission: perm,
        },
      });
    }

    await tx.userBranch.create({
      data: {
        userId: adminUser.id,
        branchId: defaultBranch.id,
      },
    });

    return { org, sub, adminUser };
  });

  return sendSuccess(
    res,
    {
      id: result.org.id,
      name: result.org.name,
      status: result.org.status,
      planId: result.org.planId,
      plan,
      subscription: result.sub,
      usage: {
        branchCount: 1,
        branchLimit: plan.branchLimit,
        staffCount: 1,
        staffLimit: plan.staffLimit,
        cardCount: 0,
        cardLimit: plan.cardLimit,
      },
      createdAt: result.org.createdAt,
      updatedAt: result.org.updatedAt,
    },
    201,
  );
}

export async function getOrganizationById(req: Request, res: Response) {
  const { id } = req.params;
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      plan: true,
      subscription: true,
      branches: true,
      _count: {
        select: {
          branches: true,
          users: true,
          cards: true,
        },
      },
    },
  });

  if (!org) {
    return sendError(res, 404, 'NOT_FOUND', 'Organization not found');
  }

  const formatted = {
    id: org.id,
    name: org.name,
    status: org.status,
    planId: org.planId,
    plan: org.plan,
    subscription: org.subscription,
    branches: org.branches,
    usage: {
      branchCount: org._count.branches,
      branchLimit: org.subscription?.branchLimitOverride || org.plan?.branchLimit || 3,
      staffCount: org._count.users,
      staffLimit: org.subscription?.staffLimitOverride || org.plan?.staffLimit || 25,
      cardCount: org._count.cards,
      cardLimit: org.subscription?.cardLimitOverride || org.plan?.cardLimit || 1000,
    },
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };

  return sendSuccess(res, formatted);
}

export async function updateOrganization(req: Request, res: Response) {
  const { id } = req.params;
  const { name, status, planId, overrides } = req.body;

  if (planId) {
    await prisma.subscription.upsert({
      where: { organizationId: id },
      create: {
        organizationId: id,
        planId,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        renewalDate: new Date(Date.now() + 30 * 86400000),
        branchLimitOverride: overrides?.branchLimit,
        staffLimitOverride: overrides?.staffLimit,
        cardLimitOverride: overrides?.cardLimit,
      },
      update: {
        planId,
        ...(overrides ? {
          branchLimitOverride: overrides.branchLimit ?? null,
          staffLimitOverride: overrides.staffLimit ?? null,
          cardLimitOverride: overrides.cardLimit ?? null,
        } : {}),
      },
    });
  }

  const org = await prisma.organization.update({
    where: { id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(status ? { status } : {}),
      ...(planId ? { planId } : {}),
    },
    include: {
      plan: true,
      subscription: true,
      _count: {
        select: {
          branches: true,
          users: true,
          cards: true,
        },
      },
    },
  });

  const formatted = {
    id: org.id,
    name: org.name,
    status: org.status,
    planId: org.planId,
    plan: org.plan,
    subscription: org.subscription,
    usage: {
      branchCount: org._count.branches,
      branchLimit: org.subscription?.branchLimitOverride || org.plan?.branchLimit || 3,
      staffCount: org._count.users,
      staffLimit: org.subscription?.staffLimitOverride || org.plan?.staffLimit || 25,
      cardCount: org._count.cards,
      cardLimit: org.subscription?.cardLimitOverride || org.plan?.cardLimit || 1000,
    },
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };

  return sendSuccess(res, formatted);
}

export async function getOrganizationSubscription(req: Request, res: Response) {
  const { id } = req.params;
  const sub = await prisma.subscription.findUnique({
    where: { organizationId: id },
    include: { plan: true, organization: true },
  });
  if (!sub) return sendError(res, 404, 'NOT_FOUND', 'Subscription not found');
  return sendSuccess(res, sub);
}

export async function updateOrganizationSubscription(req: Request, res: Response) {
  const { id } = req.params;
  const { planId, status, overrides } = req.body;

  const org = await prisma.organization.findUnique({
    where: { id },
  });
  if (!org) return sendError(res, 404, 'NOT_FOUND', 'Organization not found');

  const sub = await prisma.subscription.upsert({
    where: { organizationId: id },
    create: {
      organizationId: id,
      planId: planId || org.planId || 'plan_002',
      status: status || 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      renewalDate: new Date(Date.now() + 30 * 86400000),
      branchLimitOverride: overrides?.branchLimit ?? null,
      staffLimitOverride: overrides?.staffLimit ?? null,
      cardLimitOverride: overrides?.cardLimit ?? null,
    },
    update: {
      ...(planId ? { planId } : {}),
      ...(status ? { status } : {}),
      branchLimitOverride: overrides?.branchLimit ?? null,
      staffLimitOverride: overrides?.staffLimit ?? null,
      cardLimitOverride: overrides?.cardLimit ?? null,
    },
    include: { plan: true, organization: true },
  });

  if (planId && planId !== org.planId) {
    await prisma.organization.update({
      where: { id },
      data: { planId },
    });
  }

  return sendSuccess(res, sub);
}

export async function getPlans(_req: Request, res: Response) {
  const plans = await prisma.plan.findMany({
    orderBy: { price: 'asc' },
  });
  return sendSuccess(res, plans);
}

export async function createPlan(req: Request, res: Response) {
  const { name, price, billingInterval, branchLimit, staffLimit, cardLimit, description, features, isPopular } = req.body;
  if (!name || price === undefined) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Plan name and price are required');
  }

  const plan = await prisma.plan.create({
    data: {
      name,
      price: Number(price),
      billingInterval: billingInterval || 'MONTHLY',
      branchLimit: Number(branchLimit) || 1,
      staffLimit: Number(staffLimit) || 5,
      cardLimit: Number(cardLimit) || 100,
      description,
      features: features || [],
      isPopular: !!isPopular,
    },
  });

  return sendSuccess(res, plan, 201);
}

export async function updatePlan(req: Request, res: Response) {
  const { id } = req.params;
  const { name, price, billingInterval, branchLimit, staffLimit, cardLimit, description, features, isPopular } = req.body;

  const plan = await prisma.plan.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(price !== undefined ? { price: Number(price) } : {}),
      ...(billingInterval ? { billingInterval } : {}),
      ...(branchLimit !== undefined ? { branchLimit: Number(branchLimit) } : {}),
      ...(staffLimit !== undefined ? { staffLimit: Number(staffLimit) } : {}),
      ...(cardLimit !== undefined ? { cardLimit: Number(cardLimit) } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(features ? { features } : {}),
      ...(isPopular !== undefined ? { isPopular: !!isPopular } : {}),
    },
  });

  return sendSuccess(res, plan);
}

export async function getSubscriptions(_req: Request, res: Response) {
  const subs = await prisma.subscription.findMany({
    include: {
      organization: true,
      plan: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return sendSuccess(res, subs);
}

export async function recordSubscriptionPayment(req: Request, res: Response) {
  const { organizationId, amount, paymentMethod, paymentReference, notes } = req.body;

  if (!organizationId || !amount || !paymentReference) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Organization ID, amount, and reference are required');
  }

  const payment = await prisma.$transaction(async (tx) => {
    const rec = await tx.subscriptionPayment.create({
      data: {
        organizationId,
        amount: Number(amount),
        paymentMethod: (paymentMethod as DirectPaymentMethod) || DirectPaymentMethod.DIRECT_BANK_TRANSFER,
        paymentReference,
        notes,
        recordedByUserId: req.user?.id,
      },
    });

    await tx.subscription.update({
      where: { organizationId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        endDate: new Date(Date.now() + 30 * 86400000),
        renewalDate: new Date(Date.now() + 30 * 86400000),
      },
    });

    return rec;
  });

  return sendSuccess(res, payment, 201);
}

export async function getPlanChangeRequests(_req: Request, res: Response) {
  const requests = await prisma.planChangeRequest.findMany({
    include: {
      organization: true,
      requestedPlan: true,
    },
    orderBy: { requestedAt: 'desc' },
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

export async function reviewPlanChangeRequest(req: Request, res: Response) {
  const { id } = req.params;
  const { status, adminNotes } = req.body;

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return sendError(res, 400, 'VALIDATION_ERROR', "Status must be 'APPROVED' or 'REJECTED'");
  }

  const reqDoc = await prisma.planChangeRequest.findUnique({ where: { id } });
  if (!reqDoc) {
    return sendError(res, 404, 'NOT_FOUND', 'Plan change request not found');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const pcr = await tx.planChangeRequest.update({
      where: { id },
      data: {
        status: status as PlanRequestStatus,
        adminNotes,
        reviewedAt: new Date(),
        reviewedByUserId: req.user?.id,
      },
    });

    if (status === 'APPROVED') {
      await tx.organization.update({
        where: { id: reqDoc.organizationId },
        data: { planId: reqDoc.requestedPlanId },
      });
      await tx.subscription.update({
        where: { organizationId: reqDoc.organizationId },
        data: { planId: reqDoc.requestedPlanId },
      });
    }

    return pcr;
  });

  return sendSuccess(res, updated);
}

export async function getSubscriptionPayments(_req: Request, res: Response) {
  const payments = await prisma.subscriptionPayment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { organization: true },
  });
  return sendSuccess(res, payments);
}

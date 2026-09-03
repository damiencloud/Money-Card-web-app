import crypto from 'crypto';
import { sendAccountActivationEmail } from '../services/email.service.js';
import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { hashPassword } from '../utils/crypto.js';
import {
  Role,
  UserStatus,
  OrgStatus,
  SubscriptionStatus,
  PaymentStatus,
  DirectPaymentMethod,
  PaymentRecordStatus,
  PlanRequestStatus,
} from '@prisma/client';

export function formatSubscription(sub: any) {
  if (!sub) return null;
  const overrides: Record<string, any> = {};
  if (sub.branchLimitOverride !== null && sub.branchLimitOverride !== undefined) {
    overrides.branchLimit = sub.branchLimitOverride;
  }
  if (sub.staffLimitOverride !== null && sub.staffLimitOverride !== undefined) {
    overrides.staffLimit = sub.staffLimitOverride;
  }
  if (sub.cardLimitOverride !== null && sub.cardLimitOverride !== undefined) {
    overrides.cardLimit = sub.cardLimitOverride;
  }

  return {
    ...sub,
    branchLimitOverride: sub.branchLimitOverride ?? null,
    staffLimitOverride: sub.staffLimitOverride ?? null,
    cardLimitOverride: sub.cardLimitOverride ?? null,
    overrides: Object.keys(overrides).length > 0 ? overrides : null,
  };
}

export async function getOrganizations(req: Request, res: Response) {
  const { search, status } = req.query;

  const whereClause: any = {};

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    whereClause.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { id: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      {
        users: {
          some: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      },
    ];
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    whereClause.status = status as OrgStatus;
  }

  const orgs = await prisma.organization.findMany({
    where: whereClause,
    include: {
      plan: true,
      subscription: true,
      users: {
        where: { role: Role.ORG_ADMIN },
        select: { id: true, name: true, email: true, mustChangePassword: true },
        take: 1,
      },
      _count: {
        select: {
          branches: true,
          users: { where: { role: Role.STAFF } },
          cards: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = orgs.map((org) => {
    const subFormatted = formatSubscription(org.subscription);
    const orgAdmin = org.users && org.users.length > 0 ? org.users[0] : null;
    return {
      id: org.id,
      name: org.name,
      status: org.status,
      planId: org.planId,
      plan: org.plan,
      adminUser: orgAdmin,
      subscription: subFormatted,
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
  });

  return sendSuccess(res, formatted);
}

export async function createOrganization(req: Request, res: Response) {
  const { name, status, planId, overrides, adminEmail, adminName, adminPassword } = req.body;

  if (!name || !name.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Organization name is required');
  }

  const selectedPlanId = planId || 'plan_002';
  const plan = await prisma.plan.findUnique({ where: { id: selectedPlanId } });
  if (!plan) {
    return sendError(res, 400, 'VALIDATION_ERROR', `Plan '${selectedPlanId}' does not exist`);
  }

  const email = adminEmail || `admin@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return sendError(res, 400, 'VALIDATION_ERROR', `Admin email '${email}' is already in use`);
  }

  const isInvitation = !adminPassword || adminPassword.trim().length === 0;
  let rawActivationToken: string | null = null;
  let tokenHash: string | null = null;
  let activationExpires: Date | null = null;
  let passwordHash: string;

  if (isInvitation) {
    rawActivationToken = crypto.randomBytes(32).toString('hex');
    tokenHash = crypto.createHash('sha256').update(rawActivationToken).digest('hex');
    activationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    passwordHash = await hashPassword(crypto.randomBytes(16).toString('hex'));
  } else {
    passwordHash = await hashPassword(adminPassword);
  }

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: name.trim(),
        status: (status as OrgStatus) || OrgStatus.ACTIVE,
        planId: selectedPlanId,
      },
    });

    const sub = await tx.subscription.create({
      data: {
        organizationId: org.id,
        planId: selectedPlanId,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        renewalDate: new Date(Date.now() + 30 * 86400000),
        branchLimitOverride: overrides?.branchLimit ? Number(overrides.branchLimit) : null,
        staffLimitOverride: overrides?.staffLimit ? Number(overrides.staffLimit) : null,
        cardLimitOverride: overrides?.cardLimit ? Number(overrides.cardLimit) : null,
      },
    });

    const adminUser = await tx.user.create({
      data: {
        organizationId: org.id,
        name: adminName || `${name} Admin`,
        email,
        passwordHash,
        role: Role.ORG_ADMIN,
        status: isInvitation ? UserStatus.PENDING_ACTIVATION : UserStatus.ACTIVE,
        activationToken: tokenHash,
        activationTokenExpires: activationExpires,
      },
    });

    return { org, sub, adminUser };
  });

  if (isInvitation && rawActivationToken) {
    const clientOrigin = req.headers.origin || 'http://localhost:5173';
    const activationLink = `${clientOrigin}/activate?token=${rawActivationToken}`;
    await sendAccountActivationEmail(
      email,
      adminName || `${name} Admin`,
      activationLink,
      Role.ORG_ADMIN,
      name,
    );
  }

  return sendSuccess(res, {
    id: result.org.id,
    name: result.org.name,
    status: result.org.status,
    planId: result.org.planId,
    plan,
    subscription: formatSubscription(result.sub),
    adminUser: {
      id: result.adminUser.id,
      email: result.adminUser.email,
      name: result.adminUser.name,
    },
    usage: {
      branchCount: 0,
      branchLimit: result.sub?.branchLimitOverride || plan.branchLimit,
      staffCount: 0,
      staffLimit: result.sub?.staffLimitOverride || plan.staffLimit,
      cardCount: 0,
      cardLimit: result.sub?.cardLimitOverride || plan.cardLimit,
    },
    createdAt: result.org.createdAt,
    updatedAt: result.org.updatedAt,
  }, 201);
}

export async function updateOrganization(req: Request, res: Response) {
  const { id } = req.params;
  const { name, status, planId, overrides } = req.body;

  const org = await prisma.organization.findUnique({
    where: { id },
  });

  if (!org) {
    return sendError(res, 404, 'NOT_FOUND', 'Organization not found');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.organization.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(status ? { status: status as OrgStatus } : {}),
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

    if (overrides !== undefined || planId) {
      await tx.subscription.upsert({
        where: { organizationId: id },
        create: {
          organizationId: id,
          planId: planId || org.planId || 'plan_002',
          status: SubscriptionStatus.ACTIVE,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 86400000),
          renewalDate: new Date(Date.now() + 30 * 86400000),
          branchLimitOverride: overrides?.branchLimit !== undefined && overrides.branchLimit !== null ? Number(overrides.branchLimit) : null,
          staffLimitOverride: overrides?.staffLimit !== undefined && overrides.staffLimit !== null ? Number(overrides.staffLimit) : null,
          cardLimitOverride: overrides?.cardLimit !== undefined && overrides.cardLimit !== null ? Number(overrides.cardLimit) : null,
        },
        update: {
          ...(planId ? { planId } : {}),
          ...(overrides?.branchLimit !== undefined
            ? { branchLimitOverride: overrides.branchLimit !== null ? Number(overrides.branchLimit) : null }
            : {}),
          ...(overrides?.staffLimit !== undefined
            ? { staffLimitOverride: overrides.staffLimit !== null ? Number(overrides.staffLimit) : null }
            : {}),
          ...(overrides?.cardLimit !== undefined
            ? { cardLimitOverride: overrides.cardLimit !== null ? Number(overrides.cardLimit) : null }
            : {}),
        },
      });
    }

    return o;
  });

  const refreshedSub = await prisma.subscription.findUnique({
    where: { organizationId: id },
    include: { plan: true },
  });

  return sendSuccess(res, {
    id: updated.id,
    name: updated.name,
    status: updated.status,
    planId: updated.planId,
    plan: updated.plan,
    subscription: formatSubscription(refreshedSub),
    usage: {
      branchCount: updated._count.branches,
      branchLimit: refreshedSub?.branchLimitOverride || updated.plan?.branchLimit || 3,
      staffCount: updated._count.users,
      staffLimit: refreshedSub?.staffLimitOverride || updated.plan?.staffLimit || 25,
      cardCount: updated._count.cards,
      cardLimit: refreshedSub?.cardLimitOverride || updated.plan?.cardLimit || 1000,
    },
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}

export async function deleteOrganization(req: Request, res: Response) {
  const { id } = req.params;

  const org = await prisma.organization.findUnique({
    where: { id },
  });

  if (!org) {
    return sendError(res, 404, 'NOT_FOUND', 'Organization not found');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Delete audit logs & history
    await tx.customerHistoryEvent.deleteMany({ where: { organizationId: id } });
    await tx.auditLog.deleteMany({ where: { organizationId: id } });

    // 2. Delete transaction items & transactions
    await tx.transactionItem.deleteMany({
      where: {
        transaction: {
          session: {
            organizationId: id,
          },
        },
      },
    });

    await tx.transaction.deleteMany({
      where: {
        session: {
          organizationId: id,
        },
      },
    });

    // 3. Delete card sessions & cards
    await tx.cardSession.deleteMany({ where: { organizationId: id } });
    await tx.card.deleteMany({ where: { organizationId: id } });

    // 4. Delete inventory & products
    await tx.inventoryItem.deleteMany({
      where: {
        branch: {
          organizationId: id,
        },
      },
    });
    await tx.product.deleteMany({ where: { organizationId: id } });

    // 5. Delete staff permissions & branch assignments & users
    await tx.userPermission.deleteMany({
      where: {
        user: {
          organizationId: id,
        },
      },
    });
    await tx.userBranch.deleteMany({
      where: {
        user: {
          organizationId: id,
        },
      },
    });
    await tx.user.deleteMany({ where: { organizationId: id } });

    // 6. Delete branches
    await tx.branch.deleteMany({ where: { organizationId: id } });

    // 7. Delete subscriptions & payments
    await tx.subscriptionPayment.deleteMany({
      where: {
        subscription: {
          organizationId: id,
        },
      },
    });
    await tx.planChangeRequest.deleteMany({ where: { organizationId: id } });
    await tx.subscription.deleteMany({ where: { organizationId: id } });

    // 8. Delete organization
    await tx.organization.delete({ where: { id } });
  });

  return sendSuccess(res, { message: `Organization '${org.name}' deleted successfully` });
}

export async function getOrganizationById(req: Request, res: Response) {
  const { id } = req.params;
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      plan: true,
      subscription: true,
      users: {
        where: { role: Role.ORG_ADMIN },
        select: { id: true, name: true, email: true, mustChangePassword: true },
        take: 1,
      },
      _count: {
        select: {
          branches: true,
          users: true,
          cards: true,
        },
      },
    },
  });

  if (!org) return sendError(res, 404, 'NOT_FOUND', 'Organization not found');

  const orgAdmin = org.users && org.users.length > 0 ? org.users[0] : null;
  const formatted = {
    id: org.id,
    name: org.name,
    status: org.status,
    planId: org.planId,
    plan: org.plan,
    adminUser: orgAdmin,
    subscription: formatSubscription(org.subscription),
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
  return sendSuccess(res, formatSubscription(sub));
}

export async function updateOrganizationSubscription(req: Request, res: Response) {
  const { id } = req.params;
  const { planId, status, overrides } = req.body;

  try {
    const org = await prisma.organization.findUnique({
      where: { id },
    });
    if (!org) return sendError(res, 404, 'NOT_FOUND', 'Organization not found');

    const existingSub = await prisma.subscription.findUnique({
      where: { organizationId: id },
    });

    let branchLimitOverride = existingSub?.branchLimitOverride ?? null;
    let staffLimitOverride = existingSub?.staffLimitOverride ?? null;
    let cardLimitOverride = existingSub?.cardLimitOverride ?? null;

    if (overrides === null) {
      branchLimitOverride = null;
      staffLimitOverride = null;
      cardLimitOverride = null;
    } else if (typeof overrides === 'object') {
      branchLimitOverride = overrides.branchLimit !== undefined && overrides.branchLimit !== null
        ? Number(overrides.branchLimit)
        : null;
      staffLimitOverride = overrides.staffLimit !== undefined && overrides.staffLimit !== null
        ? Number(overrides.staffLimit)
        : null;
      cardLimitOverride = overrides.cardLimit !== undefined && overrides.cardLimit !== null
        ? Number(overrides.cardLimit)
        : null;
    }

    const sub = await prisma.subscription.upsert({
      where: { organizationId: id },
      create: {
        organizationId: id,
        planId: planId || org.planId || 'plan_002',
        status: status || 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 86400000),
        renewalDate: new Date(Date.now() + 30 * 86400000),
        branchLimitOverride,
        staffLimitOverride,
        cardLimitOverride,
      },
      update: {
        ...(planId ? { planId } : {}),
        ...(status ? { status } : {}),
        branchLimitOverride,
        staffLimitOverride,
        cardLimitOverride,
      },
      include: { plan: true, organization: true },
    });

    if (planId && planId !== org.planId) {
      await prisma.organization.update({
        where: { id },
        data: { planId },
      });
    }

    return sendSuccess(res, formatSubscription(sub));
  } catch (error: any) {
    return sendError(res, 400, 'UPDATE_FAILED', error.message || 'Failed to update organization subscription');
  }
}

export async function getPlans(_req: Request, res: Response) {
  const plans = await prisma.plan.findMany({
    orderBy: { price: 'asc' },
  });
  return sendSuccess(res, plans);
}

export async function getPlanById(req: Request, res: Response) {
  const { id } = req.params;
  const plan = await prisma.plan.findUnique({
    where: { id },
  });
  if (!plan) {
    return sendError(res, 404, 'NOT_FOUND', 'Plan not found');
  }
  return sendSuccess(res, plan);
}

export async function createPlan(req: Request, res: Response) {
  const { name, price, billingInterval, branchLimit, staffLimit, cardLimit, description, features, isPopular } = req.body;
  if (!name || price === undefined) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Plan name and price are required');
  }

  try {
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
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return sendError(res, 409, 'DUPLICATE_PLAN_NAME', `A plan with the name '${name}' already exists.`);
    }
    return sendError(res, 400, 'PLAN_CREATION_FAILED', err?.message || 'Failed to create plan');
  }
}

export async function updatePlan(req: Request, res: Response) {
  const { id } = req.params;
  const { name, price, billingInterval, branchLimit, staffLimit, cardLimit, description, features, isPopular } = req.body;

  try {
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
  } catch (error: any) {
    return sendError(res, 400, 'UPDATE_FAILED', error.message || 'Failed to update plan');
  }
}

export async function deletePlan(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      return sendError(res, 404, 'NOT_FOUND', 'Plan not found');
    }

    const activeSubs = await prisma.subscription.count({
      where: { planId: id, status: 'ACTIVE' },
    });

    if (activeSubs > 0) {
      return sendError(
        res,
        400,
        'CANNOT_DELETE_ACTIVE_PLAN',
        `Cannot delete plan "${plan.name}" because ${activeSubs} organization(s) are currently subscribed to it. Please reassign them first.`
      );
    }

    // Safely cascade delete related change requests, unlink orgs, and delete plan inside a single transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete plan change requests referencing this plan (as requested or current plan)
      await tx.planChangeRequest.deleteMany({
        where: {
          OR: [
            { requestedPlanId: id },
            { currentPlanId: id },
          ],
        },
      });

      // 2. Unlink any organizations pointing to this plan
      await tx.organization.updateMany({
        where: { planId: id },
        data: { planId: null },
      });

      // 3. Delete non-active subscriptions pointing to this plan
      await tx.subscription.deleteMany({
        where: { planId: id },
      });

      // 4. Delete the plan itself
      await tx.plan.delete({ where: { id } });
    });

    return sendSuccess(res, { message: `Plan "${plan.name}" deleted successfully` });
  } catch (error: any) {
    return sendError(res, 400, 'DELETE_FAILED', error.message || 'Failed to delete plan');
  }
}

export async function getSubscriptions(_req: Request, res: Response) {
  const subs = await prisma.subscription.findMany({
    include: {
      organization: true,
      plan: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return sendSuccess(res, subs.map(formatSubscription));
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

  const formatted = requests.map((r) => {
    const isRenewal =
      r.currentPlanId === r.requestedPlanId || r.reason?.toLowerCase().includes('renewal');

    return {
      id: r.id,
      organizationId: r.organizationId,
      organizationName: r.organization?.name || 'Organization',
      currentPlanId: r.currentPlanId,
      currentPlanName: planMap.get(r.currentPlanId) || 'Standard Plan',
      requestedPlanId: r.requestedPlanId,
      requestedPlanName: r.requestedPlan?.name || 'Standard Plan',
      requestType: isRenewal ? 'RENEWAL' : 'UPGRADE',
      reason: r.reason || '',
      status: r.status,
      adminNotes: r.adminNotes || '',
      createdAt: r.requestedAt,
      updatedAt: r.requestedAt,
      reviewedAt: r.reviewedAt,
      reviewedBy: r.reviewedByUserId,
    };
  });

  return sendSuccess(res, formatted);
}

export async function reviewPlanChangeRequest(req: Request, res: Response) {
  const { id } = req.params;
  const { status, adminNotes } = req.body;

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return sendError(res, 400, 'VALIDATION_ERROR', "Status must be 'APPROVED' or 'REJECTED'");
  }

  const reqDoc = await prisma.planChangeRequest.findUnique({
    where: { id },
    include: {
      organization: true,
      requestedPlan: true,
    },
  });

  if (!reqDoc) {
    return sendError(res, 404, 'NOT_FOUND', 'Plan change request not found');
  }

  const isRenewal =
    reqDoc.currentPlanId === reqDoc.requestedPlanId ||
    reqDoc.reason?.toLowerCase().includes('renewal');

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
      const existingSub = await tx.subscription.findUnique({
        where: { organizationId: reqDoc.organizationId },
        include: { plan: true },
      });

      const targetPlan =
        reqDoc.requestedPlan ||
        (await tx.plan.findUnique({ where: { id: reqDoc.requestedPlanId } }));

      if (isRenewal && existingSub && targetPlan) {
        // Renewal: extend active duration (+365 days if YEARLY, +30 days if MONTHLY)
        const durationDays = targetPlan.billingInterval === 'YEARLY' ? 365 : 30;
        const durationMs = durationDays * 24 * 60 * 60 * 1000;
        const now = new Date();

        const baseDate =
          existingSub.endDate && existingSub.endDate.getTime() > now.getTime()
            ? existingSub.endDate
            : now;

        const newEndDate = new Date(baseDate.getTime() + durationMs);

        await tx.subscription.update({
          where: { organizationId: reqDoc.organizationId },
          data: {
            status: SubscriptionStatus.ACTIVE,
            paymentStatus: PaymentStatus.SUCCESS,
            endDate: newEndDate,
            renewalDate: newEndDate,
          },
        });

        await tx.subscriptionPayment.create({
          data: {
            organizationId: reqDoc.organizationId,
            amount: targetPlan.price,
            paymentMethod: DirectPaymentMethod.DIRECT_BANK_TRANSFER,
            paymentReference: `PAY-REN-${reqDoc.id.slice(0, 8).toUpperCase()}`,
            status: PaymentRecordStatus.SUCCESS,
            notes: `Subscription renewal approved by Super Admin (${req.user?.name || req.user?.email || 'Platform Admin'})`,
            recordedByUserId: req.user?.id,
          },
        });
      } else {
        // Plan Upgrade / Change
        await tx.organization.update({
          where: { id: reqDoc.organizationId },
          data: { planId: reqDoc.requestedPlanId },
        });

        const durationDays = targetPlan?.billingInterval === 'YEARLY' ? 365 : 30;
        const durationMs = durationDays * 24 * 60 * 60 * 1000;
        const now = new Date();
        const newEndDate = new Date(now.getTime() + durationMs);

        await tx.subscription.upsert({
          where: { organizationId: reqDoc.organizationId },
          create: {
            organizationId: reqDoc.organizationId,
            planId: reqDoc.requestedPlanId,
            status: SubscriptionStatus.ACTIVE,
            paymentStatus: PaymentStatus.SUCCESS,
            startDate: now,
            endDate: newEndDate,
            renewalDate: newEndDate,
          },
          update: {
            planId: reqDoc.requestedPlanId,
            status: SubscriptionStatus.ACTIVE,
            paymentStatus: PaymentStatus.SUCCESS,
            endDate: newEndDate,
            renewalDate: newEndDate,
          },
        });

        if (targetPlan) {
          await tx.subscriptionPayment.create({
            data: {
              organizationId: reqDoc.organizationId,
              amount: targetPlan.price,
              paymentMethod: DirectPaymentMethod.DIRECT_BANK_TRANSFER,
              paymentReference: `PAY-PLAN-${reqDoc.id.slice(0, 8).toUpperCase()}`,
              status: PaymentRecordStatus.SUCCESS,
              notes: `Plan change to ${targetPlan.name} approved by Super Admin`,
              recordedByUserId: req.user?.id,
            },
          });
        }
      }
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

export async function resetOrgAdminPassword(req: Request, res: Response) {
  const { id } = req.params;
  const { temporaryPassword } = req.body;

  if (!temporaryPassword || temporaryPassword.length < 6) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Temporary password must be at least 6 characters');
  }

  const org = await prisma.organization.findUnique({
    where: { id },
  });

  if (!org) {
    return sendError(res, 404, 'NOT_FOUND', 'Organization not found');
  }

  const orgAdmin = await prisma.user.findFirst({
    where: {
      organizationId: id,
      role: Role.ORG_ADMIN,
    },
  });

  if (!orgAdmin) {
    return sendError(res, 404, 'NOT_FOUND', 'No Org Admin user found for this organization');
  }

  const tempHash = await hashPassword(temporaryPassword);

  await prisma.user.update({
    where: { id: orgAdmin.id },
    data: {
      passwordHash: tempHash,
      mustChangePassword: true,
      tokenVersion: { increment: 1 },
    },
  });

  console.log(`[AUTH_AUDIT_LOG] PASSWORD_CHANGE source=resetOrgAdminPassword targetUserId=${orgAdmin.id} targetEmail=${orgAdmin.email} role=${orgAdmin.role} callerUserId=${req.user?.id} timestamp=${new Date().toISOString()}`);

  return sendSuccess(res, {
    message: `Password reset successfully for ${orgAdmin.name}.`,
    user: {
      id: orgAdmin.id,
      name: orgAdmin.name,
      email: orgAdmin.email,
      mustChangePassword: true,
    },
  });
}

export async function resendOrgAdminInvite(req: Request, res: Response) {
  const { id } = req.params;

  const org = await prisma.organization.findUnique({
    where: { id },
  });

  if (!org) {
    return sendError(res, 404, 'NOT_FOUND', 'Organization not found');
  }

  const orgAdmin = await prisma.user.findFirst({
    where: {
      organizationId: id,
      role: Role.ORG_ADMIN,
    },
  });

  if (!orgAdmin) {
    return sendError(res, 404, 'NOT_FOUND', 'No Org Admin found for this organization');
  }

  if (orgAdmin.status !== UserStatus.PENDING_ACTIVATION) {
    return sendError(res, 400, 'ALREADY_ACTIVE', 'This Org Admin account is already active.');
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const activationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: orgAdmin.id },
    data: {
      activationToken: tokenHash,
      activationTokenExpires: activationExpires,
    },
  });

  const clientOrigin = req.headers.origin || 'http://localhost:5173';
  const activationLink = `${clientOrigin}/activate?token=${rawToken}`;

  await sendAccountActivationEmail(
    orgAdmin.email,
    orgAdmin.name,
    activationLink,
    Role.ORG_ADMIN,
    org.name,
  );

  return sendSuccess(res, {
    message: `Activation invitation re-sent successfully to ${orgAdmin.email}.`,
  });
}

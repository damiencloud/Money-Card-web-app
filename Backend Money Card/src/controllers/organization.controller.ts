import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { Role } from '@prisma/client';
import { getEffectiveLimits, formatSubscription } from '../utils/limits.js';

export async function getOrganizationProfile(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const [org, effectiveLimits, branchCount, staffCount, cardCount] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        plan: true,
        subscription: {
          include: { plan: true },
        },
        branches: true,
      },
    }),
    getEffectiveLimits(orgId),
    prisma.branch.count({ where: { organizationId: orgId } }),
    prisma.user.count({ where: { organizationId: orgId, role: Role.STAFF } }),
    prisma.card.count({ where: { organizationId: orgId } }),
  ]);

  if (!org) {
    return sendError(res, 404, 'NOT_FOUND', 'Organization not found');
  }

  const activePlan = org.subscription?.plan || org.plan;

  const formatted = {
    id: org.id,
    name: org.name,
    status: org.status,
    logoUrl: org.logoUrl,
    phone: org.phone,
    email: org.email,
    address: org.address,
    planId: org.subscription?.planId || org.planId,
    plan: activePlan,
    subscription: formatSubscription(org.subscription),
    usage: {
      branchCount,
      branchLimit: effectiveLimits.branchLimit,
      staffCount,
      staffLimit: effectiveLimits.staffLimit,
      cardCount,
      cardLimit: effectiveLimits.cardLimit,
    },
    branches: org.branches,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };

  return sendSuccess(res, formatted);
}

export async function updateOrganizationProfile(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { name, phone, email, address, logoUrl } = req.body;

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
    },
  });

  return sendSuccess(res, org);
}

export async function getBranches(req: Request, res: Response) {
  const orgId = req.user?.organizationId || (req.query.organizationId as string);
  if (!orgId && req.user?.role !== Role.SUPER_ADMIN) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const where: any = {};
  if (orgId) {
    where.organizationId = orgId;
  }

  // Staff only see their assigned active branches
  if (req.user?.role === Role.STAFF) {
    where.status = 'ACTIVE';
    if (req.user.assignedBranchIds && req.user.assignedBranchIds.length > 0) {
      where.id = { in: req.user.assignedBranchIds };
    }
  }

  const branches = await prisma.branch.findMany({
    where,
    include: {
      _count: {
        select: {
          staffAssignments: true,
          inventoryItems: true,
          cardSessions: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const formatted = branches.map((b) => ({
    id: b.id,
    organizationId: b.organizationId,
    name: b.name,
    location: b.location,
    status: b.status,
    staffCount: b._count.staffAssignments,
    inventoryCount: b._count.inventoryItems,
    sessionCount: b._count.cardSessions,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }));

  return sendSuccess(res, formatted);
}

export async function createBranch(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { name, location } = req.body;
  if (!name || !name.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Branch name is required');
  }

  // Authoritative Effective Branch Limit Check
  const [effectiveLimits, currentBranchCount] = await Promise.all([
    getEffectiveLimits(orgId),
    prisma.branch.count({ where: { organizationId: orgId } }),
  ]);

  if (currentBranchCount >= effectiveLimits.branchLimit) {
    return sendError(
      res,
      409,
      'BRANCH_LIMIT_REACHED',
      `Your organization has reached its branch limit of ${effectiveLimits.branchLimit}. Please upgrade your plan or request a custom limit override to create more branches.`,
    );
  }

  const branch = await prisma.$transaction(async (tx) => {
    const countInTx = await tx.branch.count({ where: { organizationId: orgId } });
    if (countInTx >= effectiveLimits.branchLimit) {
      throw new Error('BRANCH_LIMIT_REACHED');
    }

    return tx.branch.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        location: location?.trim(),
      },
    });
  });

  return sendSuccess(res, branch, 201);
}

export async function getBranchById(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  const branch = await prisma.branch.findFirst({
    where: { id, organizationId: orgId || undefined },
  });

  if (!branch) {
    return sendError(res, 404, 'NOT_FOUND', 'Branch not found');
  }

  return sendSuccess(res, branch);
}

export async function updateBranch(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;
  const { name, location, status } = req.body;

  const branch = await prisma.branch.findFirst({
    where: { id, organizationId: orgId || undefined },
  });

  if (!branch) {
    return sendError(res, 404, 'NOT_FOUND', 'Branch not found');
  }

  // Prevent disabling all branches - at least one active branch is strictly required per organization
  if (status && status !== 'ACTIVE' && branch.status === 'ACTIVE') {
    const activeBranchesCount = await prisma.branch.count({
      where: {
        organizationId: branch.organizationId,
        status: 'ACTIVE',
      },
    });

    if (activeBranchesCount <= 1) {
      return sendError(
        res,
        400,
        'MIN_ACTIVE_BRANCH_REQUIRED',
        'Cannot disable this branch. An organization must have at least one active branch.',
      );
    }
  }

  const updated = await prisma.branch.update({
    where: { id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(status ? { status } : {}),
    },
  });

  return sendSuccess(res, updated);
}

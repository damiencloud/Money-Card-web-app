import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { Role } from '@prisma/client';

export async function getOrganizationProfile(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      plan: true,
      subscription: true,
      branches: true,
      _count: {
        select: {
          users: true,
          cards: true,
          products: true,
        },
      },
    },
  });

  if (!org) {
    return sendError(res, 404, 'NOT_FOUND', 'Organization not found');
  }

  return sendSuccess(res, org);
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

  // Check branch limit
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { plan: true, subscription: true },
  });

  const branchLimit =
    org?.subscription?.branchLimitOverride ?? org?.plan?.branchLimit ?? 5;

  const currentBranchCount = await prisma.branch.count({
    where: { organizationId: orgId },
  });

  if (currentBranchCount >= branchLimit) {
    return sendError(
      res,
      400,
      'LIMIT_REACHED',
      `Branch limit of ${branchLimit} reached for your plan. Please upgrade to add more branches.`,
    );
  }

  const branch = await prisma.branch.create({
    data: {
      organizationId: orgId,
      name: name.trim(),
      location: location?.trim(),
    },
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

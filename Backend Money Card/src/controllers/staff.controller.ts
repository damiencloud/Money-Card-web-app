import crypto from 'crypto';
import { sendAccountActivationEmail } from '../services/email.service.js';
import { getEffectiveLimits } from '../utils/limits.js';
import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { hashPassword } from '../utils/crypto.js';
import { PermissionCode, Role, UserStatus } from '@prisma/client';

export const FROZEN_M0_PERMISSIONS = [
  { code: 'CARD_VIEW', label: 'View Cards', description: 'View card status and list', category: 'Cards' },
  { code: 'CARD_ISSUE', label: 'Issue Cards', description: 'Issue and activate cards for customers', category: 'Cards' },
  { code: 'CARD_RETURN', label: 'Return / Settle Cards', description: 'Settle active session and refund remaining balance', category: 'Cards' },
  { code: 'CARD_BLOCK', label: 'Block Cards', description: 'Block lost or damaged cards', category: 'Cards' },
  { code: 'CARD_UNBLOCK', label: 'Unblock Cards', description: 'Restore blocked cards', category: 'Cards' },
  { code: 'RECHARGE', label: 'Recharge Balance', description: 'Add funds via Cash or UPI', category: 'Sessions' },
  { code: 'PURCHASE', label: 'POS Purchase', description: 'Allows staff to add products to cart and checkout', category: 'Sessions' },
  { code: 'REFUND', label: 'Direct Refund', description: 'Process itemized transaction refunds', category: 'Sessions' },
  { code: 'SESSION_VIEW', label: 'View Active Sessions', description: 'View customer balance and session history', category: 'Sessions' },
  { code: 'PRODUCT_VIEW', label: 'View Products', description: 'Browse product catalog and prices', category: 'Products' },
  { code: 'PRODUCT_MANAGE', label: 'Manage Products', description: 'Create and edit products', category: 'Products' },
  { code: 'INVENTORY_VIEW', label: 'View Inventory', description: 'Check branch stock counts', category: 'Inventory' },
  { code: 'INVENTORY_MANAGE', label: 'Manage Inventory', description: 'Adjust stock quantities', category: 'Inventory' },
  { code: 'INVENTORY_IMPORT', label: 'Import Inventory', description: 'Bulk CSV inventory import', category: 'Inventory' },
  { code: 'VIEW_ANALYTICS', label: 'View Analytics', description: 'Access branch revenue & sales KPIs', category: 'Analytics' },
  { code: 'VIEW_REPORTS', label: 'View Reports', description: 'Download PDF audit reports', category: 'Reports' },
  { code: 'STAFF_VIEW', label: 'View Staff', description: 'View staff members list', category: 'Staff' },
  { code: 'STAFF_MANAGE', label: 'Manage Staff', description: 'Create staff & manage permissions', category: 'Staff' },
  { code: 'BRANCH_VIEW', label: 'View Branches', description: 'View branch details', category: 'Branches' },
  { code: 'BRANCH_MANAGE', label: 'Manage Branches', description: 'Create and edit branches', category: 'Branches' },
];

export async function getPermissionsList(_req: Request, res: Response) {
  return sendSuccess(res, FROZEN_M0_PERMISSIONS);
}

export async function getStaffList(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const staffMembers = await prisma.user.findMany({
    where: {
      organizationId: orgId,
      role: { in: [Role.STAFF, Role.ORG_ADMIN] },
    },
    include: {
      permissions: true,
      assignedBranches: {
        include: { branch: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = staffMembers.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    status: s.status,
    assignedBranchIds: s.assignedBranches.map((b) => b.branchId),
    assignedBranches: s.assignedBranches.map((b) => ({
      id: b.branch.id,
      name: b.branch.name,
    })),
    permissions: s.permissions.map((p) => p.permission),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  return sendSuccess(res, formatted);
}

export async function createStaffMember(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { name, email, password, assignedBranchIds, branchIds, permissions, permissionCodes } = req.body;
  const resolvedBranchIds = assignedBranchIds ?? branchIds;
  const resolvedPermissions = permissions ?? permissionCodes;

  if (!name || !name.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Staff name is required');
  }

  if (!email || !email.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Staff email is required');
  }

  const cleanEmail = email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (existingUser) {
    return sendError(res, 400, 'VALIDATION_ERROR', `Account with email '${email}' already exists`);
  }

  // If no password provided, user will be invited via activation email
  const isInvitation = !password || password.trim().length === 0;
  if (password && password.trim().length < 8) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Password must be at least 8 characters long');
  }

  // Authoritative Effective Staff Limit Check
  const [effectiveLimits, currentStaffCount] = await Promise.all([
    getEffectiveLimits(orgId),
    prisma.user.count({ where: { organizationId: orgId, role: Role.STAFF } }),
  ]);

  if (currentStaffCount >= effectiveLimits.staffLimit) {
    return sendError(
      res,
      409,
      'STAFF_LIMIT_REACHED',
      `Your organization has reached its staff limit of ${effectiveLimits.staffLimit}. Please upgrade your plan or request a custom limit override to add more staff.`,
    );
  }

  let rawActivationToken: string | null = null;
  let tokenHash: string | null = null;
  let activationExpires: Date | null = null;
  let passwordHash: string;

  if (isInvitation) {
    rawActivationToken = crypto.randomBytes(32).toString('hex');
    tokenHash = crypto.createHash('sha256').update(rawActivationToken).digest('hex');
    activationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    passwordHash = await hashPassword(crypto.randomBytes(16).toString('hex')); // temporary unusable hash
  } else {
    passwordHash = await hashPassword(password);
  }

  const targetPermissions: PermissionCode[] = Array.isArray(permissions) && permissions.length > 0
    ? permissions
    : [
        PermissionCode.CARD_VIEW,
        PermissionCode.CARD_ISSUE,
        PermissionCode.CARD_RETURN,
        PermissionCode.RECHARGE,
        PermissionCode.PURCHASE,
        PermissionCode.SESSION_VIEW,
        PermissionCode.PRODUCT_VIEW,
        PermissionCode.INVENTORY_VIEW,
      ];

  const result = await prisma.$transaction(async (tx) => {
    const countInTx = await tx.user.count({ where: { organizationId: orgId, role: Role.STAFF } });
    if (countInTx >= effectiveLimits.staffLimit) {
      throw new Error('STAFF_LIMIT_REACHED');
    }

    const user = await tx.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: Role.STAFF,
        organizationId: orgId,
        status: isInvitation ? UserStatus.PENDING_ACTIVATION : UserStatus.ACTIVE,
        activationToken: tokenHash,
        activationTokenExpires: activationExpires,
      },
    });

    for (const perm of targetPermissions) {
      await tx.userPermission.create({
        data: {
          userId: user.id,
          permission: perm,
        },
      });
    }

    if (Array.isArray(assignedBranchIds)) {
      for (const branchId of assignedBranchIds) {
        await tx.userBranch.create({
          data: {
            userId: user.id,
            branchId,
          },
        });
      }
    }

    return user;
  });

  return sendSuccess(
    res,
    {
      id: result.id,
      name: result.name,
      email: result.email,
      role: result.role,
      status: result.status,
      assignedBranchIds: assignedBranchIds || [],
      permissions: targetPermissions,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    },
    201,
  );
}

export async function getStaffById(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  const staff = await prisma.user.findFirst({
    where: { id, organizationId: orgId || undefined },
    include: {
      permissions: true,
      assignedBranches: { include: { branch: true } },
    },
  });

  if (!staff) {
    return sendError(res, 404, 'NOT_FOUND', 'Staff member not found');
  }

  return sendSuccess(res, {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    status: staff.status,
    assignedBranchIds: staff.assignedBranches.map((b) => b.branchId),
    assignedBranches: staff.assignedBranches.map((b) => ({ id: b.branch.id, name: b.branch.name })),
    permissions: staff.permissions.map((p) => p.permission),
    createdAt: staff.createdAt,
    updatedAt: staff.updatedAt,
  });
}

export async function updateStaffMember(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;
  const { name, email, status, permissions, assignedBranchIds, branchIds } = req.body;

  const staff = await prisma.user.findFirst({
    where: { id, organizationId: orgId || undefined },
  });

  if (!staff) {
    return sendError(res, 404, 'NOT_FOUND', 'Staff member not found');
  }

  const targetBranches = assignedBranchIds || branchIds;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(email ? { email: email.trim().toLowerCase() } : {}),
        ...(status ? { status } : {}),
        ...(status === UserStatus.DEACTIVATED ? { tokenVersion: { increment: 1 } } : {}),
      },
    });

    if (Array.isArray(permissions)) {
      await tx.userPermission.deleteMany({ where: { userId: id } });
      for (const perm of permissions) {
        await tx.userPermission.create({
          data: { userId: id, permission: perm as PermissionCode },
        });
      }
      await tx.user.update({
        where: { id },
        data: { tokenVersion: { increment: 1 } },
      });
    }

    if (Array.isArray(targetBranches)) {
      await tx.userBranch.deleteMany({ where: { userId: id } });
      for (const bId of targetBranches) {
        await tx.userBranch.create({
          data: { userId: id, branchId: bId },
        });
      }
    }
  });

  const fullStaff = await prisma.user.findUnique({
    where: { id },
    include: {
      permissions: true,
      assignedBranches: { include: { branch: true } },
    },
  });

  return sendSuccess(res, {
    id: fullStaff!.id,
    name: fullStaff!.name,
    email: fullStaff!.email,
    role: fullStaff!.role,
    status: fullStaff!.status,
    assignedBranchIds: fullStaff!.assignedBranches.map((b) => b.branchId),
    assignedBranches: fullStaff!.assignedBranches.map((b) => ({ id: b.branch.id, name: b.branch.name })),
    permissions: fullStaff!.permissions.map((p) => p.permission),
    createdAt: fullStaff!.createdAt,
    updatedAt: fullStaff!.updatedAt,
    message: 'Staff member updated successfully.',
  });
}

export async function updateStaffBranches(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;
  const { branchIds, assignedBranchIds } = req.body;

  const targetBranchIds = branchIds || assignedBranchIds;
  if (!Array.isArray(targetBranchIds)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'branchIds must be an array of branch IDs');
  }

  const staff = await prisma.user.findFirst({
    where: { id, organizationId: orgId || undefined },
  });

  if (!staff) {
    return sendError(res, 404, 'NOT_FOUND', 'Staff member not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.userBranch.deleteMany({ where: { userId: id } });
    for (const bId of targetBranchIds) {
      await tx.userBranch.create({
        data: { userId: id, branchId: bId },
      });
    }
  });

  const fullStaff = await prisma.user.findUnique({
    where: { id },
    include: { permissions: true, assignedBranches: { include: { branch: true } } },
  });

  return sendSuccess(res, {
    id,
    assignedBranchIds: fullStaff!.assignedBranches.map((b) => b.branchId),
    assignedBranches: fullStaff!.assignedBranches.map((b) => ({ id: b.branch.id, name: b.branch.name })),
    permissions: fullStaff!.permissions.map((p) => p.permission),
    message: 'Branch assignments updated successfully.',
  });
}

export async function updateStaffPermissions(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'permissions must be an array of permission codes');
  }

  const staff = await prisma.user.findFirst({
    where: { id, organizationId: orgId || undefined },
  });

  if (!staff) {
    return sendError(res, 404, 'NOT_FOUND', 'Staff member not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.userPermission.deleteMany({ where: { userId: id } });
    for (const perm of permissions) {
      await tx.userPermission.create({
        data: { userId: id, permission: perm as PermissionCode },
      });
    }
    // Invalidate old tokens on permission changes
    await tx.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });
  });

  const fullStaff = await prisma.user.findUnique({
    where: { id },
    include: { permissions: true, assignedBranches: { include: { branch: true } } },
  });

  return sendSuccess(res, {
    id,
    permissions: fullStaff!.permissions.map((p) => p.permission),
    assignedBranchIds: fullStaff!.assignedBranches.map((b) => b.branchId),
    assignedBranches: fullStaff!.assignedBranches.map((b) => ({ id: b.branch.id, name: b.branch.name })),
    message: 'Permissions updated successfully.',
  });
}

export async function resendStaffInvite(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  if (!orgId && req.user?.role !== Role.SUPER_ADMIN) {
    return sendError(res, 403, 'FORBIDDEN', 'No organization context found');
  }

  const user = await prisma.user.findFirst({
    where: {
      id,
      ...(orgId ? { organizationId: orgId } : {}),
      role: Role.STAFF,
    },
    include: { organization: true },
  });

  if (!user) {
    return sendError(res, 404, 'NOT_FOUND', 'Staff member not found');
  }

  if (user.status !== UserStatus.PENDING_ACTIVATION) {
    return sendError(res, 400, 'ALREADY_ACTIVE', 'This staff account is already active.');
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const activationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      activationToken: tokenHash,
      activationTokenExpires: activationExpires,
    },
  });

  const clientOrigin = req.headers.origin || 'http://localhost:5173';
  const activationLink = `${clientOrigin}/activate?token=${rawToken}`;

  await sendAccountActivationEmail(
    user.email,
    user.name,
    activationLink,
    Role.STAFF,
    user.organization?.name || null,
  );

  return sendSuccess(res, {
    message: `Activation invitation re-sent successfully to ${user.email}.`,
  });
}

export async function deleteStaffMember(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  if (!orgId && req.user?.role !== Role.SUPER_ADMIN) {
    return sendError(res, 403, 'FORBIDDEN', 'No organization context found');
  }

  const user = await prisma.user.findFirst({
    where: {
      id,
      ...(orgId ? { organizationId: orgId } : {}),
    },
    include: {
      _count: {
        select: {
          recordedTransactions: true,
          issuedSessions: true,
          settledSessions: true,
        },
      },
    },
  });

  if (!user) {
    return sendError(res, 404, 'NOT_FOUND', 'Staff member not found');
  }

  if (user.role === Role.SUPER_ADMIN) {
    return sendError(
      res,
      403,
      'FORBIDDEN',
      'Super Admin accounts cannot be deleted.',
    );
  }

  const activeSessionsCount = await prisma.cardSession.count({
    where: {
      organizationId: user.organizationId || undefined,
      issuedByUserId: user.id,
      status: 'ACTIVE',
    },
  });

  if (activeSessionsCount > 0) {
    return sendError(
      res,
      400,
      'STAFF_HAS_ACTIVE_SESSIONS',
      `Cannot delete or deactivate staff member because they currently have ${activeSessionsCount} open card session(s). Settle all open sessions first.`,
    );
  }

  const hasHistory =
    user._count.recordedTransactions > 0 ||
    user._count.issuedSessions > 0 ||
    user._count.settledSessions > 0;

  if (hasHistory) {
    await prisma.$transaction(async (tx) => {
      await tx.userBranch.deleteMany({ where: { userId: user.id } });
      await tx.userPermission.deleteMany({ where: { userId: user.id } });
      await tx.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.DEACTIVATED,
          tokenVersion: { increment: 1 },
        },
      });
    });

    return sendSuccess(res, {
      deactivated: true,
      message: 'Staff member has historical transaction records and was safely deactivated. Login tokens revoked.',
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.userBranch.deleteMany({ where: { userId: user.id } });
    await tx.userPermission.deleteMany({ where: { userId: user.id } });
    await tx.user.delete({ where: { id: user.id } });
  });

  return sendSuccess(res, { deleted: true, message: 'Staff member permanently deleted.' });
}

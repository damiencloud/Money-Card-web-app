import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.js';
import { prisma } from '../config/database.js';
import { sendError } from '../utils/response.js';
import { PermissionCode, UserStatus } from '@prisma/client';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Authentication token required');
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired authentication token');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        permissions: true,
        assignedBranches: {
          include: { branch: true },
        },
        organization: true,
      },
    });

    if (!user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'User account no longer exists');
    }

    if (user.status !== UserStatus.ACTIVE) {
      return sendError(
        res,
        401,
        'STAFF_INACTIVE',
        'Your staff account is no longer active. Please contact your Organization Administrator.',
      );
    }

    // Validate Organization status for non-superadmin users
    if (user.organizationId && user.organization) {
      const orgStatus = (user.organization as any).status;
      if (orgStatus === 'SUSPENDED' || orgStatus === 'INACTIVE') {
        return sendError(
          res,
          403,
          'ORGANIZATION_INACTIVE',
          'Your organization account is currently inactive or suspended. Please contact your platform administrator.',
        );
      }
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Session expired due to credential changes. Please log in again.');
    }

    const permissions: PermissionCode[] = user.permissions.map((p) => p.permission);
    const assignedBranchIds: string[] = user.assignedBranches
      .filter((b) => !b.branch || b.branch.status === 'ACTIVE')
      .map((b) => b.branchId);

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      permissions,
      assignedBranchIds,
      tokenVersion: user.tokenVersion,
    };

    // If user must change password, restrict access strictly to change-password, me, and logout
    if (user.mustChangePassword) {
      const allowedPaths = ['/auth/change-password', '/auth/me', '/auth/logout'];
      const isAllowed = allowedPaths.some((p) => req.originalUrl.includes(p));
      if (!isAllowed) {
        return sendError(
          res,
          403,
          'PASSWORD_CHANGE_REQUIRED',
          'Temporary password detected. You must change your password before accessing platform features.',
        );
      }
    }

    return next();
  } catch {
    return sendError(res, 500, 'INTERNAL_ERROR', 'Authentication service error');
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7).trim();
  const payload = verifyAccessToken(token);
  if (!payload) {
    return next();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        permissions: true,
        assignedBranches: true,
      },
    });

    if (user && user.status === UserStatus.ACTIVE && user.tokenVersion === payload.tokenVersion) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        permissions: user.permissions.map((p) => p.permission),
        assignedBranchIds: user.assignedBranches.map((b) => b.branchId),
        tokenVersion: user.tokenVersion,
      };
    }
  } catch {
    // Ignore error for optional auth
  }

  return next();
}

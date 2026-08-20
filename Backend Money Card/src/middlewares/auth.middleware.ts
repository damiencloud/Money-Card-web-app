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
        assignedBranches: true,
      },
    });

    if (!user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'User account no longer exists');
    }

    if (user.status !== UserStatus.ACTIVE) {
      return sendError(res, 401, 'UNAUTHORIZED', 'User account is deactivated or inactive');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Session expired due to credential or permission changes');
    }

    const permissions: PermissionCode[] = user.permissions.map((p) => p.permission);
    const assignedBranchIds: string[] = user.assignedBranches.map((b) => b.branchId);

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      status: user.status,
      permissions,
      assignedBranchIds,
      tokenVersion: user.tokenVersion,
    };

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

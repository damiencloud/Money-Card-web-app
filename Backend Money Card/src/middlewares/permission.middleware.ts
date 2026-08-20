import { Request, Response, NextFunction } from 'express';
import { PermissionCode, Role } from '@prisma/client';
import { sendError } from '../utils/response.js';

export function requirePermission(...requiredPermissions: PermissionCode[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Super Admin and Org Admin have full permissions for their organization
    if (req.user.role === Role.SUPER_ADMIN || req.user.role === Role.ORG_ADMIN) {
      return next();
    }

    // For Staff: check if user has ALL required permissions
    const userPerms = req.user.permissions;
    const hasAll = requiredPermissions.every((p) => userPerms.includes(p));

    if (!hasAll) {
      return sendError(
        res,
        403,
        'PERMISSION_DENIED',
        `Permission denied: Missing required permission [${requiredPermissions.join(', ')}]`,
      );
    }

    return next();
  };
}

export function requireAnyPermission(...permissions: PermissionCode[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    if (req.user.role === Role.SUPER_ADMIN || req.user.role === Role.ORG_ADMIN) {
      return next();
    }

    const userPerms = req.user.permissions;
    const hasAny = permissions.some((p) => userPerms.includes(p));

    if (!hasAny) {
      return sendError(
        res,
        403,
        'PERMISSION_DENIED',
        `Permission denied: Requires at least one of [${permissions.join(', ')}]`,
      );
    }

    return next();
  };
}

import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { sendError } from '../utils/response.js';

export function enforceTenantIsolation(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
  }

  // Super Admin can access all organizations
  if (req.user.role === Role.SUPER_ADMIN) {
    return next();
  }

  // Org Admin & Staff must belong to an organization
  if (!req.user.organizationId) {
    return sendError(res, 403, 'ORGANIZATION_ACCESS_DENIED', 'No organization linked to account');
  }

  // If request contains an organizationId in params or body, verify it matches
  const targetOrgId = req.params.orgId || req.params.organizationId || req.body?.organizationId;
  if (targetOrgId && targetOrgId !== req.user.organizationId) {
    return sendError(
      res,
      403,
      'ORGANIZATION_ACCESS_DENIED',
      'Cannot access data belonging to another organization',
    );
  }

  return next();
}

export function enforceBranchIsolation(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
  }

  // Super Admin & Org Admin can access all branches in their organization
  if (req.user.role === Role.SUPER_ADMIN || req.user.role === Role.ORG_ADMIN) {
    return next();
  }

  // Staff must have branch assignment
  const targetBranchId = req.params.branchId || req.body?.branchId || req.query?.branchId;
  if (targetBranchId && typeof targetBranchId === 'string') {
    if (!req.user.assignedBranchIds.includes(targetBranchId)) {
      return sendError(
        res,
        403,
        'BRANCH_ACCESS_DENIED',
        'Staff member is not assigned to this branch',
      );
    }
  }

  return next();
}

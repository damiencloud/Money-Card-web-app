import { Router } from 'express';
import {
  getPermissionsList,
  getStaffList,
  createStaffMember,
  getStaffById,
  updateStaffMember,
  updateStaffBranches,
  updateStaffPermissions,
} from '../controllers/staff.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { Role } from '@prisma/client';

export const permissionsRouter = Router();
permissionsRouter.get('/', getPermissionsList);

export const staffRouter = Router();
staffRouter.use(requireAuth);
staffRouter.get('/', getStaffList);
staffRouter.post('/', requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), createStaffMember);
staffRouter.get('/:id', getStaffById);
staffRouter.patch('/:id', requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), updateStaffMember);
staffRouter.put('/:id/branches', requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), updateStaffBranches);
staffRouter.patch('/:id/branches', requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), updateStaffBranches);
staffRouter.put('/:id/permissions', requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), updateStaffPermissions);
staffRouter.patch('/:id/permissions', requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), updateStaffPermissions);

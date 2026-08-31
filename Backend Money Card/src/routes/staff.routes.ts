import { Router } from 'express';
import {
  getPermissionsList,
  getStaffList,
  createStaffMember,
  getStaffById,
  updateStaffMember,
  updateStaffBranches,
  updateStaffPermissions,
  resendStaffInvite,
  deleteStaffMember,
} from '../controllers/staff.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { Role } from '@prisma/client';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
  createStaffMemberSchema,
  updateStaffMemberSchema,
  updateStaffBranchesSchema,
  updateStaffPermissionsSchema,
} from '../validation/index.js';

export const permissionsRouter = Router();
permissionsRouter.get('/', getPermissionsList);

export const staffRouter = Router();
staffRouter.use(requireAuth);
staffRouter.get('/', getStaffList);
staffRouter.post(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN),
  validateRequest({ body: createStaffMemberSchema }),
  createStaffMember,
);
staffRouter.get('/:id', getStaffById);
staffRouter.patch(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN),
  validateRequest({ body: updateStaffMemberSchema }),
  updateStaffMember,
);
staffRouter.put(
  '/:id/branches',
  requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN),
  validateRequest({ body: updateStaffBranchesSchema }),
  updateStaffBranches,
);
staffRouter.put(
  '/:id/permissions',
  requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN),
  validateRequest({ body: updateStaffPermissionsSchema }),
  updateStaffPermissions,
  resendStaffInvite,
);

staffRouter.post(
  '/:id/resend-invite',
  requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN),
  resendStaffInvite,
);

staffRouter.delete('/:id', requireRole(Role.SUPER_ADMIN, Role.ORG_ADMIN), deleteStaffMember);

import { Router } from 'express';
import {
  getOrgAnalytics,
  getSuperAdminAnalytics,
  getPeakAnalytics,
} from '../controllers/analytics.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { PermissionCode, Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission(PermissionCode.VIEW_ANALYTICS), getOrgAnalytics);
router.get('/superadmin', requireRole(Role.SUPER_ADMIN), getSuperAdminAnalytics);
router.get('/peak', requirePermission(PermissionCode.VIEW_ANALYTICS), getPeakAnalytics);
router.get('/export', requirePermission(PermissionCode.VIEW_ANALYTICS), getOrgAnalytics);

export default router;

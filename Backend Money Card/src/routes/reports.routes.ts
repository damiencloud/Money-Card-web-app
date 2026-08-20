import { Router } from 'express';
import { getReportsCatalog, getReportPdf } from '../controllers/reports.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { PermissionCode } from '@prisma/client';

const router = Router();

router.use(requireAuth);
router.get('/', requirePermission(PermissionCode.VIEW_REPORTS), getReportsCatalog);
router.get('/:id/pdf', requirePermission(PermissionCode.VIEW_REPORTS), getReportPdf);

export default router;

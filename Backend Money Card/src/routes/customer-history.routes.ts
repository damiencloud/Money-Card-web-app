import { Router } from 'express';
import { listCustomerHistoryEvents } from '../controllers/customer-history.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { PermissionCode } from '@prisma/client';

export const customerHistoryRouter = Router();
customerHistoryRouter.use(requireAuth);
customerHistoryRouter.get('/', requirePermission(PermissionCode.SESSION_VIEW), listCustomerHistoryEvents);

export default customerHistoryRouter;

import { Router } from 'express';
import {
  createSession,
  getSessionById,
  getActiveSessionByQr,
  rechargeSession,
  purchaseSession,
  returnSession,
} from '../controllers/sessions.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { PermissionCode } from '@prisma/client';

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);
sessionsRouter.post('/', requirePermission(PermissionCode.CARD_ISSUE), createSession);
sessionsRouter.get('/:id', requirePermission(PermissionCode.SESSION_VIEW), getSessionById);
sessionsRouter.get('/active/by-qr/:qrToken', requirePermission(PermissionCode.SESSION_VIEW), getActiveSessionByQr);
sessionsRouter.post('/:id/recharge', requirePermission(PermissionCode.RECHARGE), rechargeSession);
sessionsRouter.post('/:id/purchase', requirePermission(PermissionCode.PURCHASE), purchaseSession);
sessionsRouter.post('/:id/return', requirePermission(PermissionCode.CARD_RETURN), returnSession);

export default sessionsRouter;

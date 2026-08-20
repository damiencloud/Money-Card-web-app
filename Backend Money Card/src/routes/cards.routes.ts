import { Router } from 'express';
import {
  getCards,
  createCard,
  createCardBatch,
  getCardById,
  blockCard,
  unblockCard,
} from '../controllers/cards.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { PermissionCode } from '@prisma/client';

export const cardsRouter = Router();
cardsRouter.use(requireAuth);
cardsRouter.get('/', requirePermission(PermissionCode.CARD_VIEW), getCards);
cardsRouter.post('/', requirePermission(PermissionCode.CARD_ISSUE), createCard);
cardsRouter.post('/batch', requirePermission(PermissionCode.CARD_ISSUE), createCardBatch);
cardsRouter.get('/:id', requirePermission(PermissionCode.CARD_VIEW), getCardById);
cardsRouter.post('/:id/block', requirePermission(PermissionCode.CARD_BLOCK), blockCard);
cardsRouter.post('/:id/unblock', requirePermission(PermissionCode.CARD_UNBLOCK), unblockCard);

export default cardsRouter;

import { listCustomerHistoryEvents } from '../controllers/customer-history.controller.js';
import { Router } from 'express';
import {
  getCards,
  createCard,
  createCardBatch,
  importQrCodes,
  assignCardNumber,
  bulkAssignCardNumbers,
  getCardById,
  resolveCard,
  blockCard,
  unblockCard,
  deleteCard,
} from '../controllers/cards.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { PermissionCode } from '@prisma/client';

export const cardsRouter = Router();
cardsRouter.use(requireAuth);
cardsRouter.get('/', requirePermission(PermissionCode.CARD_VIEW), getCards);
cardsRouter.post('/', requirePermission(PermissionCode.CARD_ISSUE), createCard);
cardsRouter.post('/resolve', requirePermission(PermissionCode.CARD_VIEW), resolveCard);
cardsRouter.post('/import-qr', requirePermission(PermissionCode.CARD_ISSUE), importQrCodes);
cardsRouter.post('/batch', requirePermission(PermissionCode.CARD_ISSUE), importQrCodes);
cardsRouter.post('/bulk-assign', requirePermission(PermissionCode.CARD_ISSUE), bulkAssignCardNumbers);
cardsRouter.post('/:id/assign-number', requirePermission(PermissionCode.CARD_ISSUE), assignCardNumber);
cardsRouter.patch('/:id/assign', requirePermission(PermissionCode.CARD_ISSUE), assignCardNumber);
cardsRouter.get('/history', requirePermission(PermissionCode.CARD_VIEW), listCustomerHistoryEvents);
cardsRouter.get('/:id', requirePermission(PermissionCode.CARD_VIEW), getCardById);
cardsRouter.post('/:id/block', requirePermission(PermissionCode.CARD_BLOCK), blockCard);
cardsRouter.post('/:id/unblock', requirePermission(PermissionCode.CARD_UNBLOCK), unblockCard);

cardsRouter.delete('/:id', requirePermission(PermissionCode.CARD_BLOCK), deleteCard);

export default cardsRouter;

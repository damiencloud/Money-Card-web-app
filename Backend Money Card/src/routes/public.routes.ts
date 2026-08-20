import { Router } from 'express';
import {
  resolvePublicQrToken,
  getPublicSessionBalance,
  getPublicSessionTransactions,
} from '../controllers/public.controller.js';

const router = Router();

router.post('/cards/resolve', resolvePublicQrToken);
router.post('/resolve-qr', resolvePublicQrToken);
router.get('/sessions/:sessionToken', getPublicSessionBalance);
router.get('/sessions/:sessionToken/transactions', getPublicSessionTransactions);

export default router;

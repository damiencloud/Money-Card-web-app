import { Router } from 'express';
import {
  getPublicPlans,
  getMySubscription,
  getOrgSubscriptionPayments,
  getOrgPlanRequests,
  createOrgPlanRequest,
  renewOrgSubscription,
} from '../controllers/subscription.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Publicly readable by all authenticated roles (Super Admin, Org Admin, Staff)
router.get('/plans', requireAuth, getPublicPlans);

// Scoped to Organization of current user
router.use(requireAuth);
router.get('/', getMySubscription);
router.get('/payments', getOrgSubscriptionPayments);
router.get('/plan-requests', getOrgPlanRequests);
router.post('/plan-requests', createOrgPlanRequest);
router.post('/renew', renewOrgSubscription);

export default router;

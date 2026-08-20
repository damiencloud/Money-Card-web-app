import { Router } from 'express';
import {
  getOrganizations,
  createOrganization,
  getOrganizationById,
  updateOrganization,
  getOrganizationSubscription,
  updateOrganizationSubscription,
  getPlans,
  createPlan,
  updatePlan,
  getSubscriptions,
  recordSubscriptionPayment,
  getSubscriptionPayments,
  getPlanChangeRequests,
  reviewPlanChangeRequest,
} from '../controllers/admin.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Protect all admin routes with SUPER_ADMIN role
router.use(requireAuth, requireRole(Role.SUPER_ADMIN));

router.get('/organizations', getOrganizations);
router.post('/organizations', createOrganization);
router.get('/organizations/:id', getOrganizationById);
router.patch('/organizations/:id', updateOrganization);
router.get('/organizations/:id/subscription', getOrganizationSubscription);
router.patch('/organizations/:id/subscription', updateOrganizationSubscription);

router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.patch('/plans/:id', updatePlan);

router.get('/subscriptions', getSubscriptions);
router.get('/subscription-payments', getSubscriptionPayments);
router.post('/subscription-payments', recordSubscriptionPayment);

router.get('/plan-change-requests', getPlanChangeRequests);
router.patch('/plan-change-requests/:id', reviewPlanChangeRequest);

export default router;

import { mockStore } from '../store';
import { mockDelay, createMockSuccess, createMockError } from '../utils';
import { mockAuthHandlers } from './auth';
import type {
  ApiResult,
  Plan,
  Subscription,
  SubscriptionPayment,
  PlanChangeRequest,
  CreatePlanRequestInput,
  ReviewPlanRequestInput,
  RecordDirectPaymentInput,
  UpdateOrganizationSubscriptionInput,
  CheckoutRequest,
  CheckoutResponseData,
} from '@/types';

export const mockSubscriptionsHandlers = {
  async deletePlan(id: string): Promise<ApiResult<any>> {
    await mockDelay();
    const index = mockStore.plans.findIndex((p) => p.id === id);
    if (index === -1) {
      return createMockError('NOT_FOUND', 'Plan not found');
    }
    const deleted = mockStore.plans.splice(index, 1)[0];
    return createMockSuccess({ message: `Plan "${deleted.name}" deleted successfully` });
  },
  // GET /api/v1/plans
  async getPlans(): Promise<ApiResult<Plan[]>> {
    await mockDelay();
    return createMockSuccess(mockStore.plans);
  },

  // POST /api/v1/admin/plans (Super Admin Create Plan)
  async createPlan(req: Partial<Plan>): Promise<ApiResult<Plan>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return createMockError('FORBIDDEN', 'Super Admin privileges required');
    }

    if (!req.name || req.price === undefined || req.price < 0) {
      return createMockError('VALIDATION_ERROR', 'Valid plan name and non-negative price required');
    }

    const newPlan: Plan = {
      id: req.id || mockStore.generateId('plan'),
      name: req.name,
      status: req.status || 'ACTIVE',
      price: req.price,
      currency: req.currency || 'INR',
      billingInterval: req.billingInterval || 'MONTHLY',
      branchLimit: req.branchLimit ?? 1,
      staffLimit: req.staffLimit ?? 10,
      cardLimit: req.cardLimit ?? 250,
      inventoryLevel: req.inventoryLevel || 'Basic',
      reportsLevel: req.reportsLevel || 'Basic',
      analyticsLevel: req.analyticsLevel || 'Basic',
      multiBranchEnabled: req.multiBranchEnabled ?? false,
      whiteLabelEnabled: req.whiteLabelEnabled ?? true,
      supportLevel: req.supportLevel || 'Standard',
      createdAt: mockStore.getTimestamp(),
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.plans.push(newPlan);
    return createMockSuccess(newPlan);
  },

  // PATCH /api/v1/admin/plans/:id (Super Admin Edit Plan)
  async updatePlan(id: string, req: Partial<Plan>): Promise<ApiResult<Plan>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return createMockError('FORBIDDEN', 'Super Admin privileges required');
    }

    const index = mockStore.plans.findIndex((p) => p.id === id);
    if (index === -1) {
      return createMockError('NOT_FOUND', `Plan '${id}' not found`);
    }

    const existing = mockStore.plans[index];
    const updated: Plan = {
      ...existing,
      ...req,
      id: existing.id, // Immutable ID
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.plans[index] = updated;
    return createMockSuccess(updated);
  },

  // GET /api/v1/admin/subscriptions (Super Admin Subscriptions View)
  async getAllSubscriptions(): Promise<ApiResult<Subscription[]>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return createMockError('FORBIDDEN', 'Super Admin privileges required');
    }

    return createMockSuccess(mockStore.subscriptions);
  },

  // GET /api/v1/admin/organizations/:orgId/subscription (Super Admin Get Org Subscription)
  async getOrganizationSubscription(organizationId: string): Promise<ApiResult<Subscription>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return createMockError('FORBIDDEN', 'Super Admin privileges required');
    }

    const sub = mockStore.subscriptions.find((s) => s.organizationId === organizationId);
    if (!sub) {
      return createMockError('NOT_FOUND', `Subscription for organization '${organizationId}' not found`);
    }
    return createMockSuccess(sub);
  },

  // GET /api/v1/admin/plan-change-requests (Super Admin List Plan Requests)
  async getAllPlanRequests(): Promise<ApiResult<PlanChangeRequest[]>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return createMockError('FORBIDDEN', 'Super Admin privileges required');
    }

    return createMockSuccess(mockStore.planRequests);
  },

  // PATCH /api/v1/admin/organizations/:orgId/subscription (Super Admin Edit Org Subscription & Custom Overrides)
  async updateOrganizationSubscription(
    organizationId: string,
    input: UpdateOrganizationSubscriptionInput,
  ): Promise<ApiResult<Subscription>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return createMockError('FORBIDDEN', 'Super Admin privileges required');
    }

    let subIndex = mockStore.subscriptions.findIndex((s) => s.organizationId === organizationId);
    if (subIndex === -1) {
      // If no subscription record exists yet, initialize one
      const newSub: Subscription = {
        id: mockStore.generateId('sub'),
        organizationId,
        planId: input.planId || 'PLAN_STANDARD',
        status: input.status || 'ACTIVE',
        startDate: mockStore.getTimestamp(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        paymentStatus: 'SUCCESS',
        overrides: input.overrides || null,
        createdAt: mockStore.getTimestamp(),
        updatedAt: mockStore.getTimestamp(),
      };
      mockStore.subscriptions.push(newSub);
      subIndex = mockStore.subscriptions.length - 1;
    }

    const existingSub = mockStore.subscriptions[subIndex];
    const targetPlanId = input.planId || existingSub.planId;
    const plan = mockStore.plans.find((p) => p.id === targetPlanId);
    if (!plan) {
      return createMockError('NOT_FOUND', `Plan '${targetPlanId}' not found`);
    }

    // Resolve Overrides
    let updatedOverrides = existingSub.overrides ? { ...existingSub.overrides } : null;
    if (input.overrides === null) {
      // Reset all overrides to plan default
      updatedOverrides = null;
    } else if (input.overrides !== undefined) {
      const cleanOverrides: { branchLimit?: number; staffLimit?: number; cardLimit?: number } = {};
      
      if (input.overrides.branchLimit !== undefined && input.overrides.branchLimit !== null) {
        cleanOverrides.branchLimit = input.overrides.branchLimit;
      }
      if (input.overrides.staffLimit !== undefined && input.overrides.staffLimit !== null) {
        cleanOverrides.staffLimit = input.overrides.staffLimit;
      }
      if (input.overrides.cardLimit !== undefined && input.overrides.cardLimit !== null) {
        cleanOverrides.cardLimit = input.overrides.cardLimit;
      }

      updatedOverrides = Object.keys(cleanOverrides).length > 0 ? cleanOverrides : null;
    }

    // Usage conflict check
    const branchCount = mockStore.branches.filter((b) => b.organizationId === organizationId).length;
    const staffCount = mockStore.staffEntities.filter((s) => s.organizationId === organizationId).length;
    const cardCount = mockStore.cards.filter((c) => c.organizationId === organizationId).length;

    const effBranchLimit = updatedOverrides?.branchLimit ?? plan.branchLimit;
    const effStaffLimit = updatedOverrides?.staffLimit ?? plan.staffLimit;
    const effCardLimit = updatedOverrides?.cardLimit ?? plan.cardLimit;

    if (branchCount > effBranchLimit) {
      return createMockError(
        'PLAN_LIMIT_REACHED',
        `Cannot reduce branch limit to ${effBranchLimit}: organization currently has ${branchCount} active branches.`,
      );
    }
    if (staffCount > effStaffLimit) {
      return createMockError(
        'PLAN_LIMIT_REACHED',
        `Cannot reduce staff limit to ${effStaffLimit}: organization currently has ${staffCount} active staff accounts.`,
      );
    }
    if (cardCount > effCardLimit) {
      return createMockError(
        'PLAN_LIMIT_REACHED',
        `Cannot reduce card limit to ${effCardLimit}: organization currently has ${cardCount} active cards.`,
      );
    }

    // Apply update to subscription
    const updatedSub: Subscription = {
      ...existingSub,
      planId: targetPlanId,
      status: input.status || existingSub.status,
      overrides: updatedOverrides,
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.subscriptions[subIndex] = updatedSub;

    // Update organization entity planId
    const orgIndex = mockStore.organizations.findIndex((o) => o.id === organizationId);
    if (orgIndex !== -1) {
      mockStore.organizations[orgIndex].planId = targetPlanId;
      mockStore.organizations[orgIndex].updatedAt = mockStore.getTimestamp();
    }

    return createMockSuccess(updatedSub);
  },

  // GET /api/v1/admin/subscription-payments (Super Admin Payments View)
  async getAllPayments(): Promise<ApiResult<SubscriptionPayment[]>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return createMockError('FORBIDDEN', 'Super Admin privileges required');
    }

    return createMockSuccess(mockStore.subscriptionPayments);
  },

  // GET /api/v1/subscription
  async getSubscription(): Promise<ApiResult<Subscription>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const orgId = currentUser.organizationId || 'org_001';
    const subscription = mockStore.subscriptions.find((s) => s.organizationId === orgId);

    if (!subscription) {
      return createMockError(
        'SUBSCRIPTION_NOT_FOUND',
        `No subscription record found for organization '${orgId}'`,
      );
    }

    return createMockSuccess(subscription);
  },

  // GET /api/v1/subscription/payments
  async getPayments(): Promise<ApiResult<SubscriptionPayment[]>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    if (currentUser.role === 'SUPER_ADMIN') {
      return createMockSuccess(mockStore.subscriptionPayments);
    }

    const orgId = currentUser.organizationId || 'org_001';
    const payments = mockStore.subscriptionPayments.filter(
      (p) => p.organizationId === orgId || !p.organizationId,
    );
    return createMockSuccess(payments);
  },

  // GET /api/v1/subscription/payments/:id
  async getPaymentById(id: string): Promise<ApiResult<SubscriptionPayment>> {
    await mockDelay();
    const pay = mockStore.subscriptionPayments.find((p) => p.id === id);
    if (!pay) {
      return createMockError('NOT_FOUND', `Subscription payment '${id}' not found`);
    }
    return createMockSuccess(pay);
  },

  // ─── Plan Change Requests (M0 / M2 Approved Business Model) ────

  // GET /api/v1/subscription/plan-requests
  async getPlanRequests(): Promise<ApiResult<PlanChangeRequest[]>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    if (currentUser.role === 'SUPER_ADMIN') {
      return createMockSuccess(mockStore.planRequests);
    }

    const orgId = currentUser.organizationId || 'org_001';
    const requests = mockStore.planRequests.filter((r) => r.organizationId === orgId);
    return createMockSuccess(requests);
  },

  // POST /api/v1/subscription/plan-requests (Org Admin Submit Request)
  async createPlanRequest(req: CreatePlanRequestInput): Promise<ApiResult<PlanChangeRequest>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const orgId = currentUser.organizationId || 'org_001';
    const org = mockStore.organizations.find((o) => o.id === orgId);
    const targetPlan = mockStore.plans.find((p) => p.id === req.requestedPlanId);

    if (!targetPlan) {
      return createMockError('NOT_FOUND', `Target plan '${req.requestedPlanId}' not found`);
    }

    const subscription = mockStore.subscriptions.find((s) => s.organizationId === orgId);
    const currentPlan = subscription
      ? mockStore.plans.find((p) => p.id === subscription.planId)
      : mockStore.plans[0];

    const newRequest: PlanChangeRequest = {
      id: mockStore.generateId('req'),
      organizationId: orgId,
      organizationName: org ? org.name : 'Organization',
      currentPlanId: currentPlan ? currentPlan.id : 'PLAN_STANDARD',
      currentPlanName: currentPlan ? currentPlan.name : 'Standard Plan',
      requestedPlanId: targetPlan.id,
      requestedPlanName: targetPlan.name,
      requestType: req.requestType,
      reason: req.reason?.trim() || undefined,
      status: 'PENDING',
      createdAt: mockStore.getTimestamp(),
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.planRequests.unshift(newRequest);

    return createMockSuccess(newRequest);
  },

  // PATCH /api/v1/admin/subscription/plan-requests/:id (Super Admin Review Request)
  async reviewPlanRequest(
    requestId: string,
    req: ReviewPlanRequestInput,
  ): Promise<ApiResult<PlanChangeRequest>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return createMockError('FORBIDDEN', 'Super Admin privileges required');
    }

    const reqIndex = mockStore.planRequests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) {
      return createMockError('NOT_FOUND', `Plan request '${requestId}' not found`);
    }

    const planReq = mockStore.planRequests[reqIndex];
    planReq.status = req.status;
    planReq.adminNotes = req.adminNotes?.trim() || undefined;
    planReq.reviewedAt = mockStore.getTimestamp();
    planReq.reviewedBy = currentUser.name || 'Platform Super Admin';
    planReq.updatedAt = mockStore.getTimestamp();

    if (req.status === 'APPROVED' && req.applySubscriptionChange !== false) {
      const subIndex = mockStore.subscriptions.findIndex(
        (s) => s.organizationId === planReq.organizationId,
      );

      if (planReq.requestType === 'RENEWAL') {
        if (subIndex !== -1) {
          const sub = mockStore.subscriptions[subIndex];
          const newEnd = new Date(new Date(sub.endDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          mockStore.subscriptions[subIndex].status = 'ACTIVE';
          mockStore.subscriptions[subIndex].paymentStatus = 'SUCCESS';
          mockStore.subscriptions[subIndex].endDate = newEnd;
          mockStore.subscriptions[subIndex].renewalDate = newEnd;
          mockStore.subscriptions[subIndex].updatedAt = mockStore.getTimestamp();

          // Log payment receipt
          const plan = mockStore.plans.find((p) => p.id === sub.planId);
          mockStore.subscriptionPayments.unshift({
            id: mockStore.generateId('sub_pay'),
            subscriptionId: sub.id,
            organizationId: sub.organizationId,
            amount: plan ? plan.price : 999,
            currency: 'INR',
            status: 'SUCCESS',
            paymentMethod: 'DIRECT_BANK_TRANSFER',
            paymentReference: `PAY-REN-${planReq.id.slice(0, 8).toUpperCase()}`,
            verifiedBy: currentUser.name || 'Platform Super Admin',
            verifiedAt: mockStore.getTimestamp(),
            createdAt: mockStore.getTimestamp(),
          });
        }
      } else {
        // Apply subscription plan change directly
        if (subIndex !== -1) {
          mockStore.subscriptions[subIndex].planId = planReq.requestedPlanId;
          mockStore.subscriptions[subIndex].status = 'ACTIVE';
          mockStore.subscriptions[subIndex].paymentStatus = 'SUCCESS';
          mockStore.subscriptions[subIndex].updatedAt = mockStore.getTimestamp();
        }

        // Also update organization planId
        const orgIndex = mockStore.organizations.findIndex(
          (o) => o.id === planReq.organizationId,
        );
        if (orgIndex !== -1) {
          mockStore.organizations[orgIndex].planId = planReq.requestedPlanId;
          mockStore.organizations[orgIndex].updatedAt = mockStore.getTimestamp();
        }
      }
    }

    return createMockSuccess(planReq);
  },

  // POST /api/v1/admin/subscription/record-payment (Super Admin Record Direct Offline Payment)
  async recordDirectPayment(
    req: RecordDirectPaymentInput,
  ): Promise<ApiResult<SubscriptionPayment>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return createMockError('FORBIDDEN', 'Super Admin privileges required');
    }

    if (!req.amount || req.amount <= 0) {
      return createMockError('VALIDATION_ERROR', 'Payment amount must be greater than zero');
    }

    if (!req.paymentReference || !req.paymentReference.trim()) {
      return createMockError('VALIDATION_ERROR', 'Payment reference number or invoice ID is required');
    }

    const subIndex = mockStore.subscriptions.findIndex((s) => s.id === req.subscriptionId);
    if (subIndex === -1) {
      return createMockError('NOT_FOUND', `Subscription '${req.subscriptionId}' not found`);
    }

    const sub = mockStore.subscriptions[subIndex];
    const newPayment: SubscriptionPayment = {
      id: mockStore.generateId('sub_pay'),
      subscriptionId: sub.id,
      organizationId: req.organizationId || sub.organizationId,
      amount: req.amount,
      currency: 'INR',
      status: 'SUCCESS',
      paymentMethod: req.paymentMethod || 'DIRECT_BANK_TRANSFER',
      paymentReference: req.paymentReference.trim(),
      verifiedBy: currentUser.name || 'Platform Super Admin',
      verifiedAt: mockStore.getTimestamp(),
      createdAt: mockStore.getTimestamp(),
    };

    mockStore.subscriptionPayments.unshift(newPayment);

    // Update subscription to active & extend 30 days
    const nextRenewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    mockStore.subscriptions[subIndex].status = 'ACTIVE';
    mockStore.subscriptions[subIndex].paymentStatus = 'SUCCESS';
    mockStore.subscriptions[subIndex].renewalDate = nextRenewal;
    mockStore.subscriptions[subIndex].endDate = nextRenewal;
    mockStore.subscriptions[subIndex].updatedAt = mockStore.getTimestamp();

    return createMockSuccess(newPayment);
  },

  // POST /api/v1/subscription/renew
  async renewSubscription(data?: { reason?: string }): Promise<ApiResult<any>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const orgId = currentUser.organizationId || 'org_001';
    const org = mockStore.organizations.find((o) => o.id === orgId);
    const subIndex = mockStore.subscriptions.findIndex((s) => s.organizationId === orgId);
    if (subIndex === -1) {
      return createMockError('SUBSCRIPTION_NOT_FOUND', 'Active subscription not found');
    }

    const sub = mockStore.subscriptions[subIndex];
    const currentPlan = mockStore.plans.find((p) => p.id === sub.planId) || mockStore.plans[0];

    const existingPending = mockStore.planRequests.find(
      (r) => r.organizationId === orgId && r.status === 'PENDING',
    );
    if (existingPending) {
      return createMockError(
        'VALIDATION_ERROR',
        'A subscription renewal or plan request is already pending review by Super Admin.',
      );
    }

    const newRequest: PlanChangeRequest = {
      id: mockStore.generateId('req'),
      organizationId: orgId,
      organizationName: org ? org.name : 'Organization',
      currentPlanId: currentPlan.id,
      currentPlanName: currentPlan.name,
      requestedPlanId: currentPlan.id,
      requestedPlanName: currentPlan.name,
      requestType: 'RENEWAL',
      reason:
        data?.reason?.trim() ||
        `Active subscription renewal requested for ${currentPlan.name}`,
      status: 'PENDING',
      createdAt: mockStore.getTimestamp(),
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.planRequests.unshift(newRequest);

    return createMockSuccess({
      message: 'Subscription renewal request submitted to Super Admin for review and approval.',
      request: newRequest,
      subscription: sub,
    });
  },

  // Deprecated gateway checkout retained safely
  async checkout(_req: CheckoutRequest): Promise<ApiResult<CheckoutResponseData>> {
    await mockDelay();
    return createMockError(
      'FORBIDDEN',
      'Online payment gateway checkout is disabled. Please contact Super Admin to request plan changes.',
    );
  },
};

export const deletePlan = (id: string): { success: boolean; data?: any; error?: any } => {
  const index = mockStore.plans.findIndex((p) => p.id === id);
  if (index === -1) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Plan not found.' } };
  }
  const deleted = mockStore.plans.splice(index, 1)[0];
  return { success: true, data: deleted };
};

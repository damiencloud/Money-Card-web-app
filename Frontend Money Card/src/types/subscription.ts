// ─── Plan & Subscription Types (M0 Section 4, 22, 33) ─────────

export type SubscriptionStatus =
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'RENEWAL_DUE'
  | 'RENEWING'
  | 'EXPIRED'
  | 'CANCELLED';

export type SubscriptionPaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'DISPUTED';

export type BillingInterval = 'MONTHLY' | 'YEARLY';

export type PlanRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
export type PlanRequestType = 'UPGRADE' | 'DOWNGRADE' | 'CHANGE_PLAN' | 'ENTERPRISE' | 'RENEWAL';

export interface Plan {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  branchLimit: number;
  staffLimit: number;
  cardLimit: number;
  inventoryLevel: string;
  reportsLevel: string;
  analyticsLevel: string;
  multiBranchEnabled: boolean;
  whiteLabelEnabled: boolean;
  supportLevel: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionOverrides {
  branchLimit?: number | null;
  staffLimit?: number | null;
  cardLimit?: number | null;
}

export interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  renewalDate: string;
  paymentStatus: SubscriptionPaymentStatus;
  externalSubscriptionId?: string | null;
  overrides?: SubscriptionOverrides | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationSubscriptionInput {
  planId?: string;
  status?: SubscriptionStatus;
  overrides?: SubscriptionOverrides | null;
}

export interface SubscriptionPayment {
  id: string;
  subscriptionId: string;
  organizationId?: string;
  amount: number;
  currency: string;
  status: SubscriptionPaymentStatus;
  paymentMethod: string;
  paymentReference?: string | null;
  externalReference?: string | null;
  gatewayPaymentId?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface PlanChangeRequest {
  id: string;
  organizationId: string;
  organizationName?: string;
  currentPlanId: string;
  currentPlanName: string;
  requestedPlanId: string;
  requestedPlanName: string;
  requestType: PlanRequestType;
  reason?: string;
  status: PlanRequestStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface CreatePlanRequestInput {
  requestedPlanId: string;
  requestType: PlanRequestType;
  reason?: string;
}

export interface ReviewPlanRequestInput {
  status: 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  applySubscriptionChange?: boolean;
}

export interface RecordDirectPaymentInput {
  organizationId: string;
  subscriptionId: string;
  amount: number;
  paymentMethod: string;
  paymentReference: string;
}

// Deprecated gateway checkout types kept for backward compatibility if needed
export interface CheckoutRequest {
  planId: string;
  billingInterval: BillingInterval;
}

export interface CheckoutResponseData {
  checkoutUrl: string;
  subscriptionId: string;
  status: SubscriptionStatus;
}

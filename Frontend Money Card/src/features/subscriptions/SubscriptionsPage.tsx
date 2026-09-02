// ─── Subscriptions & Plan Management Page (M9/M10/M11) ────────
// Web Subscription Management for ORG_ADMIN & SUPER_ADMIN.
// Uses apiService abstraction strictly — does NOT import mock handlers directly.
// Approved Business Model: Direct payment / offline invoice to Super Admin.
// Org Admin requests plan change -> Super Admin verifies & approves.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from '@/hooks';
import type {
  Plan,
  Subscription,
  SubscriptionPayment,
  Branch,
  Staff,
  Card as CardEntity,
  PlanChangeRequest,
  PlanRequestType,
} from '@/types';
import {
  Button,
  Select,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Modal,
  ModalFooter,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { notify, formatDate, formatCurrency } from '@/utils';
import { AdminPlansSubscriptionsView } from './AdminPlansSubscriptionsView';
import { UnauthorizedPage } from '@/features/auth';
import {
  CreditCard,
  Check,
  RefreshCw,
  AlertCircle,
  Building2,
  Users,
  BarChart3,
  Receipt,
  MessageSquare,
  Send,
  Clock,
} from 'lucide-react';

export function SubscriptionsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading && !user) {
    return <LoadingState message="Loading subscriptions..." />;
  }

  if (user?.role === 'SUPER_ADMIN') {
    return <AdminPlansSubscriptionsView />;
  }

  if (user?.role === 'ORG_ADMIN') {
    return <OrgAdminSubscriptionsView />;
  }

  return <UnauthorizedPage />;
}

function OrgAdminSubscriptionsView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [planRequests, setPlanRequests] = useState<PlanChangeRequest[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [cardsList, setCardsList] = useState<CardEntity[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Request Form
  const [showContactModal, setShowContactModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);

  const [formRequestedPlanId, setFormRequestedPlanId] = useState('');
  const [formRequestType, setFormRequestType] = useState<PlanRequestType>('UPGRADE');
  const [formReason, setFormReason] = useState('');
  const [renewReason, setRenewReason] = useState('');
  const [formValidationError, setFormValidationError] = useState<string | null>(null);
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch Organization Subscription Data ───────────────────
  const fetchOrgSubscriptionData = useCallback(async () => {
    setError(null);
    try {
      const [plansRes, subRes, payRes, reqsRes, branchRes, staffRes, cardRes] =
        await Promise.all([
          apiService.plans.getPlans(),
          apiService.subscriptions.getSubscription(),
          apiService.subscriptions.getPayments(),
          apiService.subscriptions.getPlanRequests(),
          apiService.branches.getBranches(),
          apiService.staff.getStaff(),
          apiService.cards.getCards(),
        ]);

      if (!plansRes.success) {
        setError(plansRes.error.message || 'Failed to load plans');
        return;
      }

      setPlans(plansRes.data);
      if (subRes.success) setSubscription(subRes.data);
      if (payRes.success) setPayments(payRes.data);
      if (reqsRes.success) setPlanRequests(reqsRes.data);
      if (branchRes.success) setBranches(branchRes.data.items);
      if (staffRes.success) setStaffList(staffRes.data.items);
      if (cardRes.success) setCardsList(cardRes.data.items);
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const [plansRes, subRes, payRes, reqsRes, branchRes, staffRes, cardRes] =
          await Promise.all([
            apiService.plans.getPlans(),
            apiService.subscriptions.getSubscription(),
            apiService.subscriptions.getPayments(),
            apiService.subscriptions.getPlanRequests(),
            apiService.branches.getBranches(),
            apiService.staff.getStaff(),
            apiService.cards.getCards(),
          ]);
        if (isCancelled) return;

        if (!plansRes.success) {
          setError(plansRes.error.message || 'Failed to load plans');
          return;
        }

        setPlans(plansRes.data);
        if (subRes.success) setSubscription(subRes.data);
        if (payRes.success) setPayments(payRes.data);
        if (reqsRes.success) setPlanRequests(reqsRes.data);
        if (branchRes.success) setBranches(branchRes.data.items);
        if (staffRes.success) setStaffList(staffRes.data.items);
        if (cardRes.success) setCardsList(cardRes.data.items);
      } catch {
        if (!isCancelled) setError('Unable to connect to the server. Please try again.');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, []);

  const currentPlan = plans.find((p) => p.id === subscription?.planId) || plans[0];

  // Authoritative Effective Limits: Custom Override > Plan Default
  const branchUsage = branches.length;
  const branchLimit =
    subscription?.overrides?.branchLimit ??
    (subscription as any)?.branchLimitOverride ??
    currentPlan?.branchLimit ??
    1;

  const staffUsage = staffList.length;
  const staffLimit =
    subscription?.overrides?.staffLimit ??
    (subscription as any)?.staffLimitOverride ??
    currentPlan?.staffLimit ??
    10;

  const cardUsage = cardsList.length;
  const cardLimit =
    subscription?.overrides?.cardLimit ??
    (subscription as any)?.cardLimitOverride ??
    currentPlan?.cardLimit ??
    250;

  // Active/Latest pending plan change request
  const pendingRequest = planRequests.find((r) => r.status === 'PENDING') || null;

  // ── Contact Super Admin Handler ───────────────────────────
  const handleOpenContactSuperAdmin = (targetPlan?: Plan) => {
    setFormValidationError(null);
    setModalApiError(null);
    const selected = targetPlan || plans.find((p) => p.id !== currentPlan?.id) || plans[0];
    setFormRequestedPlanId(selected.id);
    setFormReason('');

    if (selected.id === 'plan_004' || selected.name.toLowerCase().includes('enterprise')) {
      setFormRequestType('ENTERPRISE');
    } else if (selected.price > (currentPlan?.price || 0)) {
      setFormRequestType('UPGRADE');
    } else if (selected.price < (currentPlan?.price || 0)) {
      setFormRequestType('DOWNGRADE');
    } else {
      setFormRequestType('CHANGE_PLAN');
    }

    setShowContactModal(true);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError(null);
    setModalApiError(null);

    const selectedTarget = plans.find((p) => p.id === formRequestedPlanId);
    if (!selectedTarget) {
      setFormValidationError('Please select a valid target plan.');
      return;
    }

    if (selectedTarget.id === currentPlan?.id) {
      setFormValidationError('Requested plan must be different from your current active plan.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await apiService.subscriptions.createPlanRequest({
        requestedPlanId: selectedTarget.id,
        requestType: formRequestType,
        reason: formReason.trim() || undefined,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to submit plan change request.');
        return;
      }

      notify.success(`Plan change request for ${selectedTarget.name} submitted to Super Admin.`);
      setShowContactModal(false);
      fetchOrgSubscriptionData();
    } catch {
      setModalApiError('An unexpected network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Renew Subscription Handler ────────────────────────────
  const handleRenewSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setModalApiError(null);
    try {
      const res = await apiService.subscriptions.renewSubscription({
        reason:
          renewReason.trim() ||
          `Active subscription renewal requested for ${currentPlan?.name || 'Active Plan'}`,
      });
      if (!res.success) {
        setModalApiError(res.error.message || 'Renewal request submission failed');
        return;
      }

      notify.success('Subscription renewal request submitted to Super Admin for review and approval.');
      setShowRenewModal(false);
      setRenewReason('');
      fetchOrgSubscriptionData();
    } catch {
      setModalApiError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Billing Columns ───────────────────────────────────────
  const billingColumns = [
    {
      key: 'id',
      header: 'Invoice ID',
      render: (pay: SubscriptionPayment) => (
        <span className="font-mono text-xs font-bold text-slate-200">PAY-#{pay.id.slice(0, 8).toUpperCase()}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (pay: SubscriptionPayment) => (
        <span className="font-mono text-sm font-bold text-violet-300">
          {formatCurrency(pay.amount)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Payment Method',
      render: (pay: SubscriptionPayment) => (
        <Badge variant="outline" className="text-slate-300">
          {pay.paymentMethod.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'paymentReference',
      header: 'Reference ID',
      render: (pay: SubscriptionPayment) => (
        <span className="font-mono text-xs text-slate-400">
          {pay.paymentReference || pay.externalReference || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (pay: SubscriptionPayment) => (
        <Badge variant={pay.status === 'SUCCESS' ? 'success' : 'danger'}>
          {pay.status}
        </Badge>
      ),
    },
    {
      key: 'verifiedBy',
      header: 'Verification',
      render: (pay: SubscriptionPayment) => (
        <span className="text-xs text-emerald-400">
          {pay.verifiedBy ? `Verified (${pay.verifiedBy})` : 'Verified'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (pay: SubscriptionPayment) => (
        <span className="text-xs text-slate-400">{formatDate(pay.createdAt)}</span>
      ),
    },
  ];

  // ── Plan Requests Columns ─────────────────────────────────
  const requestColumns = [
    {
      key: 'requestedPlanName',
      header: 'Requested Plan',
      render: (req: PlanChangeRequest) => (
        <div>
          <span className="font-bold text-slate-100">{req.requestedPlanName}</span>
          <p className="text-[11px] text-slate-400">From {req.currentPlanName}</p>
        </div>
      ),
    },
    {
      key: 'requestType',
      header: 'Type',
      render: (req: PlanChangeRequest) => {
        if (req.requestType === 'RENEWAL') {
          return (
            <Badge variant="success" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-semibold">
              Subscription Renewal
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="text-violet-300 border-violet-500/30">
            {req.requestType.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      key: 'reason',
      header: 'Notes / Reason',
      render: (req: PlanChangeRequest) => (
        <span className="text-xs text-slate-300 max-w-xs truncate block">
          {req.reason || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (req: PlanChangeRequest) => (
        <Badge
          variant={
            req.status === 'APPROVED' || req.status === 'COMPLETED'
              ? 'success'
              : req.status === 'PENDING'
                ? 'warning'
                : 'danger'
          }
        >
          {req.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Submitted Date',
      render: (req: PlanChangeRequest) => (
        <span className="text-xs text-slate-400">{formatDate(req.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Subscription & Plan Details</h1>
          <p className="mt-1 text-sm text-slate-400">
            View your organization active subscription plan, resource utilization, and billing payment receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={() => handleOpenContactSuperAdmin()}
            leftIcon={<MessageSquare className="h-4 w-4" />}
          >
            Contact Super Admin
          </Button>

          {subscription && (
            <Button
              variant="outline"
              onClick={() => setShowRenewModal(true)}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Renew Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Pending Plan Change / Renewal Request Banner */}
      {pendingRequest && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-100 text-sm">
                  {pendingRequest.requestType === 'RENEWAL'
                    ? 'Subscription Renewal Request Submitted'
                    : 'Plan Change Request Submitted'}
                </span>
                <Badge variant="warning" className="text-[10px]">PENDING SUPER ADMIN REVIEW</Badge>
              </div>
              <p className="mt-1 text-slate-300">
                {pendingRequest.requestType === 'RENEWAL' ? (
                  <>
                    Your request to renew your active subscription for <strong className="text-amber-300">{pendingRequest.requestedPlanName}</strong> was submitted on {formatDate(pendingRequest.createdAt)}. Super Admin has been alerted to review and accept the renewal.
                  </>
                ) : (
                  <>
                    Your request to transition to <strong className="text-amber-300">{pendingRequest.requestedPlanName}</strong> ({pendingRequest.requestType.replace('_', ' ')}) was submitted on {formatDate(pendingRequest.createdAt)}. Pay Super Admin directly via offline invoice / bank transfer for activation.
                  </>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenContactSuperAdmin()}
            leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
          >
            Submit New Note
          </Button>
        </div>
      )}

      {isLoading ? (
        <LoadingState message="Loading subscription & plan entitlements..." />
      ) : error ? (
        <ErrorState title="Failed to load subscription" message={error} onRetry={fetchOrgSubscriptionData} />
      ) : (
        <div className="space-y-8">
          {/* Active Subscription & Usage Metrics Card */}
          <Card>
            <CardHeader
              title={`Current Plan: ${currentPlan?.name || 'Active Subscription'}`}
              description="Real-time resource utilization against your active subscription plan limits."
              action={
                <Badge
                  variant={
                    subscription?.status === 'ACTIVE'
                      ? 'success'
                      : subscription?.status === 'PENDING_PAYMENT'
                        ? 'warning'
                        : 'danger'
                  }
                  className="text-xs px-3 py-1"
                >
                  {subscription?.status || 'ACTIVE'}
                </Badge>
              }
            />

            <CardContent className="space-y-6">
              {/* Dates & Status Metadata */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-xl bg-slate-950 p-4 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500">Plan Price:</span>
                  <p className="font-mono text-sm font-bold text-violet-300">
                    {formatCurrency(currentPlan?.price || 0)} / {currentPlan?.billingInterval.toLowerCase()}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Start Date:</span>
                  <p className="font-medium text-slate-200">
                    {subscription ? formatDate(subscription.startDate) : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Renewal / End Date:</span>
                  <p className="font-medium text-slate-200">
                    {subscription ? formatDate(subscription.renewalDate) : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Payment Status:</span>
                  <p className="font-semibold text-emerald-400">
                    {subscription?.paymentStatus || 'SUCCESS'}
                  </p>
                </div>
              </div>

              {/* Real-Time Usage Bars (NO Transaction Limit Bar) */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Branches */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Building2 className="h-4 w-4 text-violet-400" />
                      Branch Locations
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      {branchUsage} / {branchLimit}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950">
                    <div
                      className="h-full bg-violet-500 transition-all duration-300"
                      style={{ width: `${Math.min((branchUsage / branchLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Staff Accounts */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Users className="h-4 w-4 text-indigo-400" />
                      Staff Accounts
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      {staffUsage} / {staffLimit}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${Math.min((staffUsage / staffLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Active Cards */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <CreditCard className="h-4 w-4 text-sky-400" />
                      Active Cards
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      {cardUsage} / {cardLimit}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950">
                    <div
                      className="h-full bg-sky-500 transition-all duration-300"
                      style={{ width: `${Math.min((cardUsage / cardLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Monthly Transactions Count (Metric Only - NO Limit Progress Bar) */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <BarChart3 className="h-4 w-4 text-emerald-400" />
                      Monthly Recorded Txns
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Continuous real-time settlement tracking.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Plans / Plan Comparison Grid */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Available Subscription Plans</h2>
              <p className="text-xs text-slate-400">
                Compare technical limits and feature entitlements for your organization. Contact Super Admin to request plan adjustments.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const isCurrent = plan.id === currentPlan?.id;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                      isCurrent
                        ? 'border-violet-500/80 bg-violet-500/10 shadow-lg shadow-violet-500/10'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    {isCurrent && (
                      <Badge variant="success" className="absolute -top-3 right-4 text-[10px]">
                        Active Plan
                      </Badge>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-100">{plan.name}</h3>
                        <p className="mt-1 font-mono text-2xl font-bold text-violet-300">
                          {formatCurrency(plan.price)}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            /{plan.billingInterval.toLowerCase()}
                          </span>
                        </p>
                      </div>

                      {/* Technical Limits List */}
                      <div className="space-y-2 border-t border-b border-slate-800 py-3 text-xs">
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Branches:</span>
                          <strong className="font-mono">{plan.branchLimit}</strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Staff Accounts:</span>
                          <strong className="font-mono">{plan.staffLimit}</strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Active Cards:</span>
                          <strong className="font-mono">{plan.cardLimit}</strong>
                        </div>
                      </div>

                      {/* Entitlements */}
                      <ul className="space-y-2 text-xs text-slate-400">
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{plan.inventoryLevel} Inventory</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>CSV Import Enabled</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{plan.analyticsLevel} Analytics</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{plan.supportLevel} Support</span>
                        </li>
                      </ul>
                    </div>

                    {/* Action CTA: [ Contact Super Admin ] */}
                    <div className="mt-6">
                      {isCurrent ? (
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          Current Plan
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full"
                          onClick={() => handleOpenContactSuperAdmin(plan)}
                          leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
                        >
                          Contact Super Admin
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plan Change Requests History */}
          {planRequests.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Plan Change Requests History</h2>
                <p className="text-xs text-slate-400">
                  Track the approval and review status of your organization's plan change submissions.
                </p>
              </div>

              <Card padding="none">
                <DataTable<PlanChangeRequest>
                  data={planRequests}
                  columns={requestColumns}
                  keyExtractor={(item: PlanChangeRequest) => item.id}
                />
              </Card>
            </div>
          )}

          {/* Billing & Direct Payment History Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Billing & Direct Payment History</h2>
              <p className="text-xs text-slate-400">
                Audited invoices and offline direct payment receipts verified by Super Admin.
              </p>
            </div>

            {payments.length === 0 ? (
              <EmptyState
                icon={<Receipt className="h-8 w-8 text-slate-500" />}
                title="No billing history recorded"
                description="Verified subscription payments will appear here."
              />
            ) : (
              <Card padding="none">
                <DataTable<SubscriptionPayment>
                  data={payments}
                  columns={billingColumns}
                  keyExtractor={(item: SubscriptionPayment) => item.id}
                />
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Contact Super Admin / Request Plan Change Modal ── */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Contact Super Admin / Request Plan Change"
      >
        <form onSubmit={handleContactSubmit} className="space-y-4 py-2">
          {formValidationError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{formValidationError}</span>
            </div>
          )}

          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          {/* Current Plan (Read-Only) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1 text-xs">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">Current Organization Plan</span>
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-bold text-slate-100">{currentPlan?.name || 'Standard'}</span>
              <span className="font-mono text-violet-300 font-bold">
                {formatCurrency(currentPlan?.price || 0)} / {currentPlan?.billingInterval.toLowerCase()}
              </span>
            </div>
          </div>

          {/* Requested Plan Select */}
          <Select
            label="Requested Plan *"
            value={formRequestedPlanId}
            onChange={(e) => {
              const planId = e.target.value;
              setFormRequestedPlanId(planId);
              const p = plans.find((pl) => pl.id === planId);
              if (p) {
                if (p.id === 'plan_004' || p.name.toLowerCase().includes('enterprise')) {
                  setFormRequestType('ENTERPRISE');
                } else if (p.price > (currentPlan?.price || 0)) {
                  setFormRequestType('UPGRADE');
                } else if (p.price < (currentPlan?.price || 0)) {
                  setFormRequestType('DOWNGRADE');
                } else {
                  setFormRequestType('CHANGE_PLAN');
                }
              }
            }}
            options={plans.map((p) => ({
              value: p.id,
              label: `${p.name} (${formatCurrency(p.price)}/${p.billingInterval.toLowerCase()})${p.id === currentPlan?.id ? ' - Current' : ''}`,
            }))}
            disabled={isSubmitting}
          />

          {/* Request Type Select */}
          <Select
            label="Request Type *"
            value={formRequestType}
            onChange={(e) => setFormRequestType(e.target.value as PlanRequestType)}
            options={[
              { value: 'UPGRADE', label: 'Upgrade' },
              { value: 'DOWNGRADE', label: 'Downgrade' },
              { value: 'CHANGE_PLAN', label: 'Change Plan' },
              { value: 'ENTERPRISE', label: 'Enterprise / Custom Plan' },
            ]}
            disabled={isSubmitting}
          />

          {/* Optional Message / Reason */}
          <div className="space-y-1 text-xs">
            <label className="font-semibold text-slate-300">Message / Reason (Optional)</label>
            <textarea
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="Provide context or details for the Super Admin regarding this plan request..."
              rows={3}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowContactModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Submit Request to Super Admin
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Renew Modal ── */}
      <Modal
        isOpen={showRenewModal}
        onClose={() => {
          setShowRenewModal(false);
          setModalApiError(null);
        }}
        title="Renew Active Subscription"
      >
        <form onSubmit={handleRenewSubmit} className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Plan</span>
              <Badge variant="success" className="text-[10px]">CURRENTLY ACTIVE</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-slate-100">{currentPlan?.name || 'Active Plan'}</span>
              <span className="font-mono font-bold text-violet-300">
                {formatCurrency(currentPlan?.price || 0)} / {currentPlan?.billingInterval.toLowerCase()}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Clicking <strong>Submit Renewal Request</strong> will send an <strong className="text-amber-300">Alert to Super Admin</strong> to review and accept your subscription renewal for <strong>{currentPlan?.name}</strong>. Upon approval, your subscription will be extended by 1 billing cycle ({currentPlan?.billingInterval.toLowerCase()}).
          </p>

          <div className="space-y-1 text-xs">
            <label className="font-semibold text-slate-300">Renewal Notes / Reference (Optional)</label>
            <textarea
              value={renewReason}
              onChange={(e) => setRenewReason(e.target.value)}
              placeholder="e.g. Offline payment made via Bank Transfer Ref #12345, please approve renewal..."
              rows={3}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowRenewModal(false);
                setModalApiError(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              leftIcon={<Send className="h-4 w-4" />}
            >
              Submit Renewal Request
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}

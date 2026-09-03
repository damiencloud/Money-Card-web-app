// ─── Super Admin Unified Plans & Subscriptions Dashboard (M10/M11/M12) ────────
// Platform Management: Global Plans, Organization Subscriptions & Custom Overrides,
// Plan Change Requests, and Direct Payment Ledger.
// Super Admin scope ONLY — uses existing apiService abstraction strictly.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { generateSecureNumericCode } from '@/utils/cryptoRandom';
import type {
  Plan,
  Subscription,
  SubscriptionPayment,
  OrganizationOverview,
  PlanChangeRequest,
  SubscriptionStatus,
} from '@/types';
import {
  Button,
  Input,
  Select,
  Card,
  Badge,
  Modal,
  ModalFooter,
  StatCard,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { notify, formatDate, formatCurrency } from '@/utils';
import {
  Layers,
  Building2,
  Receipt,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Check,
  Zap,
  Inbox,
  DollarSign,
  Sliders,
  RotateCcw,
  Users,
  CreditCard,
} from 'lucide-react';

export function AdminPlansSubscriptionsView() {
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'org_subscriptions' | 'requests' | 'payments'>('overview');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [planRequests, setPlanRequests] = useState<PlanChangeRequest[]>([]);
  const [orgs, setOrgs] = useState<OrganizationOverview[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter for Organization Subscriptions
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Modals
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [showOrgSubModal, setShowOrgSubModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationOverview | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PlanChangeRequest | null>(null);

  // Form State - Global Plan Definition
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('999');
  const [formCurrency, setFormCurrency] = useState('INR');
  const [formBillingInterval, setFormBillingInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [formBranchLimit, setFormBranchLimit] = useState('3');
  const [formStaffLimit, setFormStaffLimit] = useState('25');
  const [formCardLimit, setFormCardLimit] = useState('1000');
  const [formInventoryLevel, setFormInventoryLevel] = useState('Advanced');
  const [formAnalyticsLevel, setFormAnalyticsLevel] = useState('Advanced');
  const [formSupportLevel, setFormSupportLevel] = useState('Priority');

  // Form State - Org Subscription & Custom Overrides
  const [subFormPlanId, setSubFormPlanId] = useState('');
  const [subFormStatus, setSubFormStatus] = useState<SubscriptionStatus>('ACTIVE');
  const [subOverrideBranch, setSubOverrideBranch] = useState<string>('');
  const [subOverrideStaff, setSubOverrideStaff] = useState<string>('');
  const [subOverrideCard, setSubOverrideCard] = useState<string>('');

  // Form State - Review Request
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');

  // Form State - Record Direct Payment
  const [payOrgId, setPayOrgId] = useState('');
  const [payAmount, setPayAmount] = useState('1499');
  const [payMethod, setPayMethod] = useState('DIRECT_BANK_TRANSFER');
  const [payReference, setPayReference] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalApiError, setModalApiError] = useState<string | null>(null);

  // ── Fetch Unified Data ─────────────────────────────────────
  const fetchUnifiedData = useCallback(async () => {
    setError(null);
    try {
      const [plansRes, subsRes, payRes, reqsRes, orgsRes] = await Promise.all([
        apiService.plans.getPlans(),
        apiService.subscriptions.getAllSubscriptions(),
        apiService.subscriptions.getAllPayments(),
        apiService.subscriptions.getPlanRequests(),
        apiService.organizations.getOrganizations(),
      ]);

      if (!plansRes.success) {
        setError(plansRes.error.message || 'Failed to load plans');
        return;
      }

      setPlans(plansRes.data || []);
      if (subsRes.success) setSubscriptions(subsRes.data || []);
      if (payRes.success) setPayments(payRes.data || []);
      if (reqsRes.success) setPlanRequests(reqsRes.data || []);
      if (orgsRes.success) {
        const orgItems = (orgsRes.data as any)?.items || (Array.isArray(orgsRes.data) ? orgsRes.data : []);
        setOrgs(orgItems);
      }
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const [plansRes, subsRes, payRes, reqsRes, orgsRes] = await Promise.all([
          apiService.plans.getPlans(),
          apiService.subscriptions.getAllSubscriptions(),
          apiService.subscriptions.getAllPayments(),
          apiService.plans.getAllPlanRequests(),
          apiService.organizations.getOrganizations(),
        ]);
        if (isCancelled) return;

        if (!plansRes.success) {
          setError(plansRes.error.message || 'Failed to load plans');
          return;
        }

        setPlans(plansRes.data || []);
        if (subsRes.success) setSubscriptions(subsRes.data || []);
        if (payRes.success) setPayments(payRes.data || []);
        if (reqsRes.success) setPlanRequests(reqsRes.data || []);
        if (orgsRes.success) {
          const orgItems = (orgsRes.data as any)?.items || (Array.isArray(orgsRes.data) ? orgsRes.data : []);
          setOrgs(orgItems);
        }
      } catch {
        if (!isCancelled) setError('Unable to connect to server. Please try again.');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, []);

  // ── Open Modals ───────────────────────────────────────────
  const openCreatePlanModal = () => {
    setFormName('');
    setFormPrice('999');
    setFormCurrency('INR');
    setFormBillingInterval('MONTHLY');
    setFormBranchLimit('3');
    setFormStaffLimit('25');
    setFormCardLimit('1000');
    setFormInventoryLevel('Advanced');
    setFormAnalyticsLevel('Advanced');
    setFormSupportLevel('Priority');
    setModalApiError(null);
    setShowCreatePlanModal(true);
  };

  const openEditPlanModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setFormName(plan.name);
    setFormPrice(String(plan.price));
    setFormCurrency(plan.currency);
    setFormBillingInterval(plan.billingInterval);
    setFormBranchLimit(String(plan.branchLimit));
    setFormStaffLimit(String(plan.staffLimit));
    setFormCardLimit(String(plan.cardLimit));
    setFormInventoryLevel(plan.inventoryLevel);
    setFormAnalyticsLevel(plan.analyticsLevel);
    setFormSupportLevel(plan.supportLevel);
    setModalApiError(null);
    setShowEditPlanModal(true);
  };

  const openOrgSubscriptionModal = (org: OrganizationOverview) => {
    setSelectedOrg(org);
    const sub = subscriptions.find((s) => s.organizationId === org.id) || org.subscription;
    setSubFormPlanId(sub?.planId || org.planId || (plans[0]?.id ?? ''));
    setSubFormStatus(sub?.status || 'ACTIVE');
    const bOvr = sub?.overrides?.branchLimit ?? (sub as any)?.branchLimitOverride;
    const sOvr = sub?.overrides?.staffLimit ?? (sub as any)?.staffLimitOverride;
    const cOvr = sub?.overrides?.cardLimit ?? (sub as any)?.cardLimitOverride;
    setSubOverrideBranch(bOvr !== undefined && bOvr !== null ? String(bOvr) : '');
    setSubOverrideStaff(sOvr !== undefined && sOvr !== null ? String(sOvr) : '');
    setSubOverrideCard(cOvr !== undefined && cOvr !== null ? String(cOvr) : '');
    setModalApiError(null);
    setShowOrgSubModal(true);
  };

  const openReviewModal = (req: PlanChangeRequest) => {
    setSelectedRequest(req);
    setReviewStatus('APPROVED');
    setReviewNotes('');
    setModalApiError(null);
    setShowReviewModal(true);
  };

  const openRecordPaymentModal = (orgId?: string) => {
    const targetOrgId = orgId || (orgs[0] ? orgs[0].id : 'org_001');
    setPayOrgId(targetOrgId);
    setPayAmount('1499');
    setPayMethod('DIRECT_BANK_TRANSFER');
    setPayReference(`DIRECT_NEFT_${generateSecureNumericCode(6)}`);
    setModalApiError(null);
    setShowRecordPaymentModal(true);
  };

  // ── Form Handlers ─────────────────────────────────────────
  const handleCreatePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalApiError('Plan name is required.');
      return;
    }
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setModalApiError('Price must be a valid non-negative number.');
      return;
    }

    setIsSubmitting(true);
    setModalApiError(null);
    try {
      const res = await apiService.plans.createPlan({
        name: formName.trim(),
        price: priceNum,
        currency: formCurrency,
        billingInterval: formBillingInterval,
        branchLimit: parseInt(formBranchLimit, 10) || 1,
        staffLimit: parseInt(formStaffLimit, 10) || 10,
        cardLimit: parseInt(formCardLimit, 10) || 250,
        inventoryLevel: formInventoryLevel,
        analyticsLevel: formAnalyticsLevel,
        supportLevel: formSupportLevel,
        status: 'ACTIVE',
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to create plan.');
        return;
      }

      notify.success(`Plan "${formName}" created successfully.`);
      setShowCreatePlanModal(false);
      fetchUnifiedData();
    } catch {
      setModalApiError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!selectedPlan) return;
    const confirm = window.confirm(
      `Are you sure you want to permanently delete the global plan "${selectedPlan.name}"? This action cannot be undone.`
    );
    if (!confirm) return;

    setIsDeleting(true);
    setModalApiError(null);
    try {
      const res = await apiService.plans.deletePlan(selectedPlan.id);
      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to delete plan.');
        return;
      }

      notify.success(`Global Plan "${selectedPlan.name}" deleted successfully.`);
      setShowEditPlanModal(false);
      fetchUnifiedData();
    } catch {
      setModalApiError('An unexpected error occurred while deleting the plan.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditPlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!formName.trim()) {
      setModalApiError('Plan name is required.');
      return;
    }
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setModalApiError('Price must be a valid non-negative number.');
      return;
    }

    setIsSubmitting(true);
    setModalApiError(null);
    try {
      const res = await apiService.plans.updatePlan(selectedPlan.id, {
        name: formName.trim(),
        price: priceNum,
        currency: formCurrency,
        billingInterval: formBillingInterval,
        branchLimit: parseInt(formBranchLimit, 10) || 1,
        staffLimit: parseInt(formStaffLimit, 10) || 10,
        cardLimit: parseInt(formCardLimit, 10) || 250,
        inventoryLevel: formInventoryLevel,
        analyticsLevel: formAnalyticsLevel,
        supportLevel: formSupportLevel,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update plan.');
        return;
      }

      notify.success(`Global Plan "${formName}" updated successfully. (Existing organization-specific overrides preserved)`);
      setShowEditPlanModal(false);
      fetchUnifiedData();
    } catch {
      setModalApiError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrgSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    setIsSubmitting(true);
    setModalApiError(null);

    const overrides: { branchLimit?: number; staffLimit?: number; cardLimit?: number } = {};
    if (subOverrideBranch.trim()) {
      const val = parseInt(subOverrideBranch, 10);
      if (isNaN(val) || val < 1) {
        setModalApiError('Branch limit override must be a positive integer.');
        setIsSubmitting(false);
        return;
      }
      overrides.branchLimit = val;
    }
    if (subOverrideStaff.trim()) {
      const val = parseInt(subOverrideStaff, 10);
      if (isNaN(val) || val < 1) {
        setModalApiError('Staff limit override must be a positive integer.');
        setIsSubmitting(false);
        return;
      }
      overrides.staffLimit = val;
    }
    if (subOverrideCard.trim()) {
      const val = parseInt(subOverrideCard, 10);
      if (isNaN(val) || val < 1) {
        setModalApiError('Card limit override must be a positive integer.');
        setIsSubmitting(false);
        return;
      }
      overrides.cardLimit = val;
    }

    try {
      const res = await apiService.subscriptions.updateOrganizationSubscription(selectedOrg.id, {
        planId: subFormPlanId,
        status: subFormStatus,
        overrides: Object.keys(overrides).length > 0 ? overrides : null,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update organization subscription.');
        return;
      }

      notify.success(`Subscription and custom limits for "${selectedOrg.name}" updated successfully.`);
      setShowOrgSubModal(false);
      fetchUnifiedData();
    } catch {
      setModalApiError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAllOverrides = () => {
    setSubOverrideBranch('');
    setSubOverrideStaff('');
    setSubOverrideCard('');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setIsSubmitting(true);
    setModalApiError(null);
    try {
      const res = await apiService.subscriptions.reviewPlanRequest(selectedRequest.id, {
        status: reviewStatus,
        adminNotes: reviewNotes.trim() || undefined,
        applySubscriptionChange: reviewStatus === 'APPROVED',
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to process plan review.');
        return;
      }

      notify.success(`Plan request ${reviewStatus.toLowerCase()} successfully.`);
      setShowReviewModal(false);
      fetchUnifiedData();
    } catch {
      setModalApiError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setModalApiError('Please enter a valid positive payment amount.');
      return;
    }
    if (!payReference.trim()) {
      setModalApiError('Payment reference or invoice ID is required.');
      return;
    }

    const orgSub = subscriptions.find((s) => s.organizationId === payOrgId);
    if (!orgSub) {
      setModalApiError('Could not find active subscription for this organization.');
      return;
    }

    setIsSubmitting(true);
    setModalApiError(null);
    try {
      const res = await apiService.subscriptions.recordDirectPayment({
        organizationId: payOrgId,
        subscriptionId: orgSub.id,
        amount: amountNum,
        paymentMethod: payMethod,
        paymentReference: payReference.trim(),
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to record direct payment.');
        return;
      }

      notify.success(`Direct payment of ${formatCurrency(amountNum)} recorded and subscription verified.`);
      setShowRecordPaymentModal(false);
      fetchUnifiedData();
    } catch {
      setModalApiError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const activeSubsCount = subscriptions.filter((s) => s.status === 'ACTIVE').length;
  const pendingRequestsCount = planRequests.filter((r) => r.status === 'PENDING').length;
  const totalVerifiedRevenue = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amount, 0);

  // Filtered Organization Subscriptions
  const filteredOrgs = useMemo(() => {
    return orgs.filter((org) => {
      const sub = subscriptions.find((s) => s.organizationId === org.id) || org.subscription;
      const plan = plans.find((p) => p.id === (sub?.planId || org.planId)) || org.plan;

      const matchesSearch =
        !orgSearchQuery.trim() ||
        org.name.toLowerCase().includes(orgSearchQuery.toLowerCase()) ||
        org.id.toLowerCase().includes(orgSearchQuery.toLowerCase());

      const matchesPlan =
        selectedPlanFilter === 'ALL' ||
        plan?.id === selectedPlanFilter ||
        org.planId === selectedPlanFilter;

      const matchesStatus =
        selectedStatusFilter === 'ALL' ||
        (sub?.status || org.status) === selectedStatusFilter;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [orgs, subscriptions, plans, orgSearchQuery, selectedPlanFilter, selectedStatusFilter]);

  // Selected Plan for Org Sub Modal (for real-time default vs override preview)
  const previewSelectedPlan = plans.find((p) => p.id === subFormPlanId) || plans[0];

  // ── Column Definitions ─────────────────────────────────────
  const planColumns = [
    {
      key: 'name',
      header: 'Global Plan Definition',
      render: (plan: Plan) => (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-100">{plan.name}</p>
            <p className="text-xs text-slate-500">{plan.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Default Price',
      render: (plan: Plan) => (
        <span className="font-mono text-sm font-bold text-violet-300">
          {formatCurrency(plan.price)} <span className="text-xs text-slate-400 font-normal">/{(plan.billingInterval || 'MONTHLY').toLowerCase()}</span>
        </span>
      ),
    },
    {
      key: 'limits',
      header: 'Default Technical Limits',
      render: (plan: Plan) => (
        <span className="text-xs text-slate-300 font-mono">
          {plan.branchLimit} Branches • {plan.staffLimit} Staff • {plan.cardLimit} Cards
        </span>
      ),
    },
    {
      key: 'tenants',
      header: 'Subscribed Tenants',
      render: (plan: Plan) => {
        const count = orgs.filter((o) => {
          const s = subscriptions.find((sub) => sub.organizationId === o.id);
          return (s?.planId || o.planId) === plan.id;
        }).length;
        return <Badge variant="outline">{count} Organizations</Badge>;
      },
    },

    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (plan: Plan) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditPlanModal(plan)}
            leftIcon={<Edit2 className="h-3.5 w-3.5" />}
          >
            Edit Definition
          </Button>
        </div>
      ),
    },
  ];

  const orgSubColumns = [
    {
      key: 'organization',
      header: 'Organization',
      render: (org: OrganizationOverview) => (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-100">{org.name}</p>
            
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Assigned Plan',
      render: (org: OrganizationOverview) => {
        const sub = subscriptions.find((s) => s.organizationId === org.id);
        const plan = plans.find((p) => p.id === (sub?.planId || org.planId)) || org.plan;
        return (
          <Badge variant="outline" className="border-violet-500/30 text-violet-300 font-bold">
            {plan?.name || 'Standard'}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Subscription Status',
      render: (org: OrganizationOverview) => {
        const sub = subscriptions.find((s) => s.organizationId === org.id);
        const st = sub?.status || 'ACTIVE';
        return (
          <Badge variant={st === 'ACTIVE' ? 'success' : st === 'RENEWAL_DUE' ? 'warning' : 'danger'}>
            {st}
          </Badge>
        );
      },
    },
    {
      key: 'effectiveLimits',
      header: 'Effective Limits (Default vs Override)',
      render: (org: OrganizationOverview) => {
        const sub = subscriptions.find((s) => s.organizationId === org.id) || org.subscription;
        const plan = plans.find((p) => p.id === (sub?.planId || org.planId)) || org.plan;

        const bOvr = sub?.overrides?.branchLimit ?? (sub as any)?.branchLimitOverride;
        const sOvr = sub?.overrides?.staffLimit ?? (sub as any)?.staffLimitOverride;
        const cOvr = sub?.overrides?.cardLimit ?? (sub as any)?.cardLimitOverride;

        const hasOverrides = (bOvr !== undefined && bOvr !== null) ||
                             (sOvr !== undefined && sOvr !== null) ||
                             (cOvr !== undefined && cOvr !== null);

        const effBranches = bOvr ?? plan?.branchLimit ?? 1;
        const effStaff = sOvr ?? plan?.staffLimit ?? 10;
        const effCards = cOvr ?? plan?.cardLimit ?? 250;

        return (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-slate-200">
                {effBranches} Branches • {effStaff} Staff • {effCards} Cards
              </span>
              {hasOverrides && (
                <Badge variant="warning" className="text-[9px] px-1 py-0">
                  Custom Overrides
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Usage: {org.usage?.branchCount ?? 0}b / {org.usage?.staffCount ?? 0}s / {org.usage?.cardCount ?? 0}c
            </p>
          </div>
        );
      },
    },
    {
      key: 'renewal',
      header: 'Renewal Date',
      render: (org: OrganizationOverview) => {
        const sub = subscriptions.find((s) => s.organizationId === org.id);
        return <span className="text-xs text-slate-400">{sub ? formatDate(sub.renewalDate) : '—'}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (org: OrganizationOverview) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openOrgSubscriptionModal(org)}
            leftIcon={<Sliders className="h-3.5 w-3.5" />}
          >
            Edit Limits
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openRecordPaymentModal(org.id)}
            leftIcon={<DollarSign className="h-3.5 w-3.5" />}
          >
            Record Payment
          </Button>
        </div>
      ),
    },
  ];

  const requestColumns = [
    {
      key: 'organizationName',
      header: 'Organization',
      render: (req: PlanChangeRequest) => (
        <div className="flex flex-wrap items-center gap-2">
          <Building2 className="h-4 w-4 text-violet-400" />
          <span className="font-bold text-slate-100">{req.organizationName || "Organization"}</span>
        </div>
      ),
    },
    {
      key: 'planTransition',
      header: 'Plan Request',
      render: (req: PlanChangeRequest) => (
        <div>
          <span className="font-bold text-slate-100">{req.requestedPlanName}</span>
          <p className="text-[11px] text-slate-400">Current: {req.currentPlanName}</p>
        </div>
      ),
    },
    {
      key: 'requestType',
      header: 'Request Type',
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
            {(req.requestType || 'UPGRADE').replace(/_/g, ' ')}
          </Badge>
        );
      },
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
    {
      key: 'actions',
      header: 'Review Actions',
      className: 'text-right',
      render: (req: PlanChangeRequest) => (
        <div className="flex items-center justify-end gap-2">
          {req.status === 'PENDING' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => openReviewModal(req)}
              leftIcon={<Check className="h-3.5 w-3.5" />}
            >
              Review / Approve
            </Button>
          ) : (
            <span className="text-xs text-slate-500">Reviewed</span>
          )}
        </div>
      ),
    },
  ];

  const payColumns = [
    {
      key: 'id',
      header: 'Payment ID',
      render: (p: SubscriptionPayment) => (
        <span className="font-mono text-xs font-bold text-slate-200">PAY-#{p.id.slice(0, 8).toUpperCase()}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (p: SubscriptionPayment) => (
        <span className="font-mono text-sm font-bold text-violet-300">{formatCurrency(p.amount)}</span>
      ),
    },
    {
      key: 'method',
      header: 'Direct Payment Method',
      render: (p: SubscriptionPayment) => (
        <Badge variant="outline" className="text-slate-300">
          {(p.paymentMethod || 'DIRECT_BANK_TRANSFER').replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'reference',
      header: 'Reference ID',
      render: (p: SubscriptionPayment) => (
        <span className="font-mono text-xs text-slate-400">
          {p.paymentReference || p.externalReference || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p: SubscriptionPayment) => (
        <Badge variant={p.status === 'SUCCESS' ? 'success' : 'danger'}>{p.status}</Badge>
      ),
    },
    {
      key: 'verifiedBy',
      header: 'Verified By',
      render: (p: SubscriptionPayment) => (
        <span className="text-xs text-emerald-400 font-medium">
          {p.verifiedBy || 'Super Admin'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (p: SubscriptionPayment) => (
        <span className="text-xs text-slate-400">{formatDate(p.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">Plans & Subscriptions Management</h1>
            <Badge variant="outline" className="border-violet-500/30 text-violet-300">
              Super Admin Scope
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Global plan definitions, tenant organization subscriptions & custom limit overrides, and direct payment ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openRecordPaymentModal()}
            leftIcon={<DollarSign className="h-4 w-4" />}
          >
            Record Direct Payment
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openCreatePlanModal}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Global Plan
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Subscriptions"
          value={activeSubsCount}
          icon={<Layers className="h-5 w-5 text-violet-400" />}
        />
        <StatCard
          label="Pending Plan Requests"
          value={pendingRequestsCount}
          icon={<Inbox className="h-5 w-5 text-amber-400" />}
        />
        <StatCard
          label="Global Plan Catalog"
          value={plans.length}
          icon={<Zap className="h-5 w-5 text-sky-400" />}
        />
        <StatCard
          label="Verified Direct Revenue"
          value={formatCurrency(totalVerifiedRevenue)}
          icon={<Receipt className="h-5 w-5 text-emerald-400" />}
        />
      </div>

      {/* Navigation Tabs (Distinct Global Plans vs Org Subscriptions) */}
      <div className="flex border-b border-slate-800 text-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'plans'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Global Plans ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab('org_subscriptions')}
          className={`px-4 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'org_subscriptions'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Organization Subscriptions ({orgs.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'requests'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Plan Requests</span>
          {pendingRequestsCount > 0 && (
            <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">
              {pendingRequestsCount}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2.5 font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'payments'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Payment History ({payments.length})
        </button>
      </div>

      {isLoading ? (
        <LoadingState message="Loading plans, subscriptions, and override states..." />
      ) : error ? (
        <ErrorState title="Failed to load data" message={error} onRetry={fetchUnifiedData} />
      ) : (
        <div className="space-y-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Pending Requests Banner */}
              {pendingRequestsCount > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Inbox className="h-5 w-5 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-100 text-sm">{pendingRequestsCount} Pending Plan Change Request(s)</span>
                      <p className="text-xs text-slate-300">Organizations have requested plan transitions. Review direct offline payment to approve.</p>
                    </div>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => setActiveTab('requests')}>
                    Review Requests
                  </Button>
                </div>
              )}

              {/* Global Plan Catalog Grid */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">Global Plan Definitions</h2>
                    <p className="text-xs text-slate-400">Baseline blueprints and default resource quotas.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('plans')}>
                    Manage Plans →
                  </Button>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {plans.map((plan) => {
                    const tenantsCount = orgs.filter((o) => {
                      const s = subscriptions.find((sub) => sub.organizationId === o.id);
                      return (s?.planId || o.planId) === plan.id;
                    }).length;

                    return (
                      <div key={plan.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-slate-100">{plan.name}</h3>
                            <p className="font-mono text-xl font-bold text-violet-300">
                              {formatCurrency(plan.price)}{' '}
                              <span className="text-xs text-slate-400 font-normal">/{(plan.billingInterval || 'MONTHLY').toLowerCase()}</span>
                            </p>
                          </div>
                          <Badge variant="outline">{tenantsCount} Tenants</Badge>
                        </div>
                        <div className="border-t border-slate-800 pt-3 text-xs text-slate-300 space-y-1 font-mono">
                          <div>{plan.branchLimit} Branches Default</div>
                          <div>{plan.staffLimit} Staff Accounts Default</div>
                          <div>{plan.cardLimit} Active Cards Default</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tenant Subscriptions Overview Preview */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">Organization Subscriptions Snapshot</h2>
                    <p className="text-xs text-slate-400">Active tenant subscriptions and customized organization limits.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('org_subscriptions')}>
                    View All Organizations →
                  </Button>
                </div>
                <Card padding="none">
                  <DataTable<OrganizationOverview>
                    data={orgs.slice(0, 5)}
                    columns={orgSubColumns}
                    keyExtractor={(item: OrganizationOverview) => item.id}
                  />
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: GLOBAL PLANS DEFINITION */}
          {activeTab === 'plans' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Global Plan Catalog Definitions</h2>
                  <p className="text-xs text-slate-400">
                    Create and manage standard catalog blueprints. Changes here affect default limits for new subscriptions only; existing organization overrides remain preserved.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={openCreatePlanModal} leftIcon={<Plus className="h-4 w-4" />}>
                  Create Plan Definition
                </Button>
              </div>

              <Card padding="none">
                <DataTable<Plan>
                  data={plans}
                  columns={planColumns}
                  keyExtractor={(item: Plan) => item.id}
                />
              </Card>
            </div>
          )}

          {/* TAB 3: ORGANIZATION SUBSCRIPTIONS & CUSTOM OVERRIDES */}
          {activeTab === 'org_subscriptions' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Organization Subscriptions & Custom Limits</h2>
                  <p className="text-xs text-slate-400">
                    Manage tenant-specific subscriptions. Set custom branch, staff, or card limits for individual organizations without modifying global plan definitions.
                  </p>
                </div>
              </div>

              {/* Search & Filters */}
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  placeholder="Search organization by name or ID..."
                  value={orgSearchQuery}
                  onChange={(e) => setOrgSearchQuery(e.target.value)}
                />
                <Select
                  value={selectedPlanFilter}
                  onChange={(e) => setSelectedPlanFilter(e.target.value)}
                  options={[
                    { value: 'ALL', label: 'All Plans' },
                    ...plans.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
                <Select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  options={[
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'RENEWAL_DUE', label: 'Renewal Due' },
                    { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
                    { value: 'EXPIRED', label: 'Expired' },
                  ]}
                />
              </div>

              {filteredOrgs.length === 0 ? (
                <EmptyState
                  icon={<Building2 className="h-8 w-8 text-slate-500" />}
                  title="No organization subscriptions found"
                  description="Try adjusting your search query or filter selection."
                />
              ) : (
                <Card padding="none">
                  <DataTable<OrganizationOverview>
                    data={filteredOrgs}
                    columns={orgSubColumns}
                    keyExtractor={(item: OrganizationOverview) => item.id}
                  />
                </Card>
              )}
            </div>
          )}

          {/* TAB 4: PLAN REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Tenant Plan Change Requests</h2>
                <p className="text-xs text-slate-400">
                  Review tenant requests to upgrade, downgrade, or switch plans. Verify direct payment before approving.
                </p>
              </div>

              {planRequests.length === 0 ? (
                <EmptyState
                  icon={<Inbox className="h-8 w-8 text-slate-500" />}
                  title="No plan change requests"
                  description="When organization admins submit plan adjustment requests, they will appear here."
                />
              ) : (
                <Card padding="none">
                  <DataTable<PlanChangeRequest>
                    data={planRequests}
                    columns={requestColumns}
                    keyExtractor={(item: PlanChangeRequest) => item.id}
                  />
                </Card>
              )}
            </div>
          )}

          {/* TAB 5: PAYMENT HISTORY */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Direct Payment Ledger</h2>
                  <p className="text-xs text-slate-400">Audited offline direct bank transfers and offline invoices verified by Super Admin.</p>
                </div>
                <Button variant="primary" size="sm" onClick={() => openRecordPaymentModal()} leftIcon={<DollarSign className="h-4 w-4" />}>
                  Record Direct Payment
                </Button>
              </div>

              <Card padding="none">
                <DataTable<SubscriptionPayment>
                  data={payments}
                  columns={payColumns}
                  keyExtractor={(item: SubscriptionPayment) => item.id}
                />
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── Create Global Plan Modal ── */}
      <Modal isOpen={showCreatePlanModal} onClose={() => setShowCreatePlanModal(false)} title="Create Global Plan Definition">
        <form onSubmit={handleCreatePlanSubmit} className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <Input label="Plan Name *" value={formName} onChange={(e) => setFormName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Default Price (₹) *" type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} required />
            <Select
              label="Billing Interval"
              value={formBillingInterval}
              onChange={(e) => setFormBillingInterval(e.target.value as 'MONTHLY' | 'YEARLY')}
              options={[
                { value: 'MONTHLY', label: 'Monthly' },
                { value: 'YEARLY', label: 'Yearly' },
              ]}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="Default Branch Limit" type="number" value={formBranchLimit} onChange={(e) => setFormBranchLimit(e.target.value)} />
            <Input label="Default Staff Limit" type="number" value={formStaffLimit} onChange={(e) => setFormStaffLimit(e.target.value)} />
            <Input label="Default Card Limit" type="number" value={formCardLimit} onChange={(e) => setFormCardLimit(e.target.value)} />
          </div>

          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => setShowCreatePlanModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>Create Global Plan</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Edit Global Plan Modal ── */}
      <Modal isOpen={showEditPlanModal} onClose={() => setShowEditPlanModal(false)} title={`Edit Global Plan: ${selectedPlan?.name}`}>
        <form onSubmit={handleEditPlanSubmit} className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <Input label="Plan Name *" value={formName} onChange={(e) => setFormName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Default Price (₹) *" type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} required />
            <Select
              label="Billing Interval"
              value={formBillingInterval}
              onChange={(e) => setFormBillingInterval(e.target.value as 'MONTHLY' | 'YEARLY')}
              options={[
                { value: 'MONTHLY', label: 'Monthly' },
                { value: 'YEARLY', label: 'Yearly' },
              ]}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="Default Branch Limit" type="number" value={formBranchLimit} onChange={(e) => setFormBranchLimit(e.target.value)} />
            <Input label="Default Staff Limit" type="number" value={formStaffLimit} onChange={(e) => setFormStaffLimit(e.target.value)} />
            <Input label="Default Card Limit" type="number" value={formCardLimit} onChange={(e) => setFormCardLimit(e.target.value)} />
          </div>

          <p className="text-xs text-slate-400">
            Note: Changing default limits updates the global template. Organization-specific overrides will remain intact.
          </p>

          <ModalFooter className="flex items-center justify-between w-full">
            <Button
              variant="danger"
              type="button"
              onClick={handleDeletePlan}
              isLoading={isDeleting}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Delete Plan
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" type="button" onClick={() => setShowEditPlanModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSubmitting}>
                Save Global Plan
              </Button>
            </div>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Edit Organization Subscription & Custom Overrides Modal ── */}
      <Modal
        isOpen={showOrgSubModal}
        onClose={() => setShowOrgSubModal(false)}
        title={`Subscription & Overrides: ${selectedOrg?.name}`}
      >
        {selectedOrg && (
          <form onSubmit={handleOrgSubSubmit} className="space-y-6 py-2">
            {modalApiError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{modalApiError}</span>
              </div>
            )}

            {/* Basic Subscription Settings */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Assigned Plan *"
                value={subFormPlanId}
                onChange={(e) => setSubFormPlanId(e.target.value)}
                options={plans.map((p) => ({
                  value: p.id,
                  label: `${p.name} (${formatCurrency(p.price)}/${(p.billingInterval || 'MONTHLY').toLowerCase()})`,
                }))}
              />
              <Select
                label="Subscription Status *"
                value={subFormStatus}
                onChange={(e) => setSubFormStatus(e.target.value as SubscriptionStatus)}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'RENEWAL_DUE', label: 'Renewal Due' },
                  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
                  { value: 'EXPIRED', label: 'Expired' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>

            {/* Custom Limits Table (Plan Default vs Organization Override vs Effective Limit) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-violet-400" />
                    Organization-Specific Limit Overrides
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Applies ONLY to this organization. Leave blank to inherit the global plan default.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={handleResetAllOverrides}
                  leftIcon={<RotateCcw className="h-3 w-3" />}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Reset All to Defaults
                </Button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden text-xs">
                {/* Table Header */}
                <div className="grid grid-cols-4 bg-slate-900/90 px-4 py-2.5 font-semibold text-slate-300 border-b border-slate-800">
                  <div>Resource</div>
                  <div>Plan Default</div>
                  <div>Custom Override</div>
                  <div className="text-right">Effective Limit</div>
                </div>

                {/* Branches */}
                <div className="grid grid-cols-4 items-center px-4 py-3 border-b border-slate-800/60">
                  <div className="flex items-center gap-2 font-medium text-slate-200">
                    <Building2 className="h-3.5 w-3.5 text-violet-400" />
                    Branches
                  </div>
                  <div className="font-mono text-slate-400">{previewSelectedPlan?.branchLimit ?? 1}</div>
                  <div className="pr-2">
                    <input
                      type="number"
                      placeholder="Inherit default"
                      value={subOverrideBranch}
                      onChange={(e) => setSubOverrideBranch(e.target.value)}
                      className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div className="text-right font-mono font-bold text-violet-300">
                    {subOverrideBranch.trim() ? subOverrideBranch : previewSelectedPlan?.branchLimit ?? 1}
                  </div>
                </div>

                {/* Staff */}
                <div className="grid grid-cols-4 items-center px-4 py-3 border-b border-slate-800/60">
                  <div className="flex items-center gap-2 font-medium text-slate-200">
                    <Users className="h-3.5 w-3.5 text-indigo-400" />
                    Staff Accounts
                  </div>
                  <div className="font-mono text-slate-400">{previewSelectedPlan?.staffLimit ?? 10}</div>
                  <div className="pr-2">
                    <input
                      type="number"
                      placeholder="Inherit default"
                      value={subOverrideStaff}
                      onChange={(e) => setSubOverrideStaff(e.target.value)}
                      className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div className="text-right font-mono font-bold text-violet-300">
                    {subOverrideStaff.trim() ? subOverrideStaff : previewSelectedPlan?.staffLimit ?? 10}
                  </div>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-4 items-center px-4 py-3">
                  <div className="flex items-center gap-2 font-medium text-slate-200">
                    <CreditCard className="h-3.5 w-3.5 text-sky-400" />
                    Active Cards
                  </div>
                  <div className="font-mono text-slate-400">{previewSelectedPlan?.cardLimit ?? 250}</div>
                  <div className="pr-2">
                    <input
                      type="number"
                      placeholder="Inherit default"
                      value={subOverrideCard}
                      onChange={(e) => setSubOverrideCard(e.target.value)}
                      className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div className="text-right font-mono font-bold text-violet-300">
                    {subOverrideCard.trim() ? subOverrideCard : previewSelectedPlan?.cardLimit ?? 250}
                  </div>
                </div>
              </div>
            </div>

            <ModalFooter>
              <Button variant="outline" type="button" onClick={() => setShowOrgSubModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" isLoading={isSubmitting} leftIcon={<Check className="h-4 w-4" />}>
                Save Organization Subscription
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* ── Review Plan Change / Renewal Request Modal ── */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setModalApiError(null);
        }}
        title={
          selectedRequest?.requestType === 'RENEWAL'
            ? 'Review & Accept Subscription Renewal'
            : 'Review Plan Change Request'
        }
      >
        {selectedRequest && (
          <form onSubmit={handleReviewSubmit} className="space-y-4 py-2">
            {modalApiError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{modalApiError}</span>
              </div>
            )}

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Organization:</span>
                <strong className="text-slate-100 text-sm">
                  {selectedRequest.organizationName || selectedRequest.organizationId}
                </strong>
              </div>

              {selectedRequest.requestType === 'RENEWAL' ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Plan to Renew:</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {selectedRequest.requestedPlanName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Request Intent:</span>
                    <Badge variant="success" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                      Active Subscription Renewal
                    </Badge>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Transition:</span>
                    <span className="font-bold text-violet-300">
                      {selectedRequest.currentPlanName} → {selectedRequest.requestedPlanName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Request Type:</span>
                    <Badge variant="outline">{selectedRequest.requestType}</Badge>
                  </div>
                </>
              )}

              {selectedRequest.reason && (
                <div className="pt-2 border-t border-slate-800 text-slate-300">
                  <span className="text-slate-400 block mb-1">Tenant Notes:</span>
                  <p className="bg-slate-900 p-2.5 rounded-lg text-slate-200">{selectedRequest.reason}</p>
                </div>
              )}
            </div>

            {selectedRequest.requestType === 'RENEWAL' ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200 space-y-1">
                <span className="font-bold block text-emerald-300">Super Admin Renewal Acceptance:</span>
                <p className="leading-relaxed">
                  Accepting this renewal will extend the active subscription date by 1 billing cycle, ensure organization access remains uninterrupted, and log a verified payment record in the billing ledger.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3.5 text-xs text-violet-200 space-y-1">
                <span className="font-bold block text-violet-300">Plan Change Application:</span>
                <p className="leading-relaxed">
                  Approving this request will switch the organization active plan to {selectedRequest.requestedPlanName} and update their resource limits.
                </p>
              </div>
            )}

            <Select
              label="Review Decision *"
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as 'APPROVED' | 'REJECTED')}
              options={
                selectedRequest.requestType === 'RENEWAL'
                  ? [
                      { value: 'APPROVED', label: 'Accept & Extend Active Subscription' },
                      { value: 'REJECTED', label: 'Reject Renewal Request' },
                    ]
                  : [
                      { value: 'APPROVED', label: 'Approve & Apply Plan Change' },
                      { value: 'REJECTED', label: 'Reject Request' },
                    ]
              }
            />

            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-300">Admin Remarks / Audit Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  selectedRequest.requestType === 'RENEWAL'
                    ? 'e.g. Bank payment received and verified, active subscription extended...'
                    : 'Optional remarks for the organization regarding this decision...'
                }
                rows={3}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <ModalFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  setModalApiError(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant={reviewStatus === 'APPROVED' ? 'primary' : 'danger'}
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                leftIcon={reviewStatus === 'APPROVED' ? <Check className="h-4 w-4" /> : undefined}
              >
                {reviewStatus === 'APPROVED'
                  ? selectedRequest.requestType === 'RENEWAL'
                    ? 'Accept & Renew Subscription'
                    : 'Approve & Apply Plan Change'
                  : 'Reject Request'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* ── Record Direct Payment Modal ── */}
      <Modal isOpen={showRecordPaymentModal} onClose={() => setShowRecordPaymentModal(false)} title="Record Direct Offline Payment">
        <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <Select
            label="Organization *"
            value={payOrgId}
            onChange={(e) => setPayOrgId(e.target.value)}
            options={orgs.map((o) => ({ value: o.id, label: `${o.name} (${o.plan?.name || 'Standard'})` }))}
          />

          <Input
            label="Payment Amount (₹) *"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            required
          />

          <Select
            label="Payment Method *"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            options={[
              { value: 'DIRECT_BANK_TRANSFER', label: 'Direct Bank Transfer / NEFT / RTGS' },
              { value: 'OFFLINE_INVOICE', label: 'Offline Corporate Invoice' },
              { value: 'DIRECT_CASH', label: 'Direct Cash Receipt' },
              { value: 'DIRECT_UPI', label: 'Direct Verified UPI Transfer' },
            ]}
          />

          <Input
            label="Payment Reference / Invoice Number *"
            value={payReference}
            onChange={(e) => setPayReference(e.target.value)}
            placeholder="e.g. NEFT_REF_998822, INV-2026-001"
            required
          />

          <ModalFooter>
            <Button variant="outline" type="button" onClick={() => setShowRecordPaymentModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting} leftIcon={<Check className="h-4 w-4" />}>
              Verify & Record Payment
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}

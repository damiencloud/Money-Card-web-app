// ─── Super Admin Plans & Subscriptions View (M10) ─────────
// Plan catalog management & platform subscription oversight for SUPER_ADMIN.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import type { Plan, Subscription, SubscriptionPayment } from '@/types';
import {
  Button,
  Input,
  Select,
  Card,
  Badge,
  Modal,
  ModalFooter,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { notify, formatDate, formatCurrency } from '@/utils';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Power,
  AlertCircle,
  CreditCard,
  Building2,
  Receipt,
  Layers,
} from 'lucide-react';

export function AdminPlansView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);

  const [activeTab, setActiveTab] = useState<'PLANS' | 'SUBSCRIPTIONS' | 'PAYMENTS'>('PLANS');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCurrency, setFormCurrency] = useState('INR');
  const [formInterval, setFormInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [formBranchLimit, setFormBranchLimit] = useState('1');
  const [formStaffLimit, setFormStaffLimit] = useState('10');
  const [formCardLimit, setFormCardLimit] = useState('250');
  const [formInventoryLevel, setFormInventoryLevel] = useState('Basic');
  const [formReportsLevel, setFormReportsLevel] = useState('Basic');
  const [formAnalyticsLevel, setFormAnalyticsLevel] = useState('Basic');
  const [formMultiBranch, setFormMultiBranch] = useState(false);
  const [formWhiteLabel, setFormWhiteLabel] = useState(true);
  const [formSupportLevel, setFormSupportLevel] = useState('Standard');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch Super Admin Data ────────────────────────────────
  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [plansRes, subsRes, payRes] = await Promise.all([
        apiService.plans.getPlans(),
        apiService.subscriptions.getAllSubscriptions(),
        apiService.subscriptions.getAllPayments(),
      ]);

      if (!plansRes.success) {
        setError(plansRes.error.message || 'Failed to load plan catalog');
        return;
      }

      setPlans(plansRes.data);
      if (subsRes.success) setSubscriptions(subsRes.data);
      if (payRes.success) setPayments(payRes.data);
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
        const [plansRes, subsRes, payRes] = await Promise.all([
          apiService.plans.getPlans(),
          apiService.subscriptions.getAllSubscriptions(),
          apiService.subscriptions.getAllPayments(),
        ]);
        if (isCancelled) return;

        if (!plansRes.success) {
          setError(plansRes.error.message || 'Failed to load plan catalog');
          return;
        }

        setPlans(plansRes.data);
        if (subsRes.success) setSubscriptions(subsRes.data);
        if (payRes.success) setPayments(payRes.data);
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

  // ── Open Create Modal ─────────────────────────────────────
  const handleOpenCreate = () => {
    setFormName('Custom Enterprise');
    setFormPrice('4999');
    setFormCurrency('INR');
    setFormInterval('MONTHLY');
    setFormBranchLimit('20');
    setFormStaffLimit('100');
    setFormCardLimit('10000');
    setFormInventoryLevel('Advanced');
    setFormReportsLevel('Advanced');
    setFormAnalyticsLevel('Advanced');
    setFormMultiBranch(true);
    setFormWhiteLabel(true);
    setFormSupportLevel('Dedicated 24/7');
    setFormStatus('ACTIVE');
    setFormErrors({});
    setModalApiError(null);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formName.trim()) errors.name = 'Plan name is required';
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) errors.price = 'Valid non-negative price required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.subscriptions.createPlan({
        name: formName.trim(),
        price: priceNum,
        currency: formCurrency,
        billingInterval: formInterval,
        branchLimit: parseInt(formBranchLimit, 10) || 1,
        staffLimit: parseInt(formStaffLimit, 10) || 10,
        cardLimit: parseInt(formCardLimit, 10) || 250,
        inventoryLevel: formInventoryLevel,
        reportsLevel: formReportsLevel,
        analyticsLevel: formAnalyticsLevel,
        multiBranchEnabled: formMultiBranch,
        whiteLabelEnabled: formWhiteLabel,
        supportLevel: formSupportLevel,
        status: formStatus,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to create plan');
        return;
      }

      notify.success(`Plan ${res.data.name} created successfully`);
      setShowCreateModal(false);
      fetchData();
    } catch {
      setModalApiError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Edit Modal ───────────────────────────────────────
  const handleOpenEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    setFormName(plan.name);
    setFormPrice(String(plan.price));
    setFormCurrency(plan.currency);
    setFormInterval(plan.billingInterval);
    setFormBranchLimit(String(plan.branchLimit));
    setFormStaffLimit(String(plan.staffLimit));
    setFormCardLimit(String(plan.cardLimit));
    setFormInventoryLevel(plan.inventoryLevel);
    setFormReportsLevel(plan.reportsLevel);
    setFormAnalyticsLevel(plan.analyticsLevel);
    setFormMultiBranch(plan.multiBranchEnabled);
    setFormWhiteLabel(plan.whiteLabelEnabled);
    setFormSupportLevel(plan.supportLevel);
    setFormStatus(plan.status);
    setFormErrors({});
    setModalApiError(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Plan name is required';
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) errors.price = 'Valid non-negative price required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.subscriptions.updatePlan(selectedPlan.id, {
        name: formName.trim(),
        price: priceNum,
        currency: formCurrency,
        billingInterval: formInterval,
        branchLimit: parseInt(formBranchLimit, 10) || 1,
        staffLimit: parseInt(formStaffLimit, 10) || 10,
        cardLimit: parseInt(formCardLimit, 10) || 250,
        inventoryLevel: formInventoryLevel,
        reportsLevel: formReportsLevel,
        analyticsLevel: formAnalyticsLevel,
        multiBranchEnabled: formMultiBranch,
        whiteLabelEnabled: formWhiteLabel,
        supportLevel: formSupportLevel,
        status: formStatus,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update plan');
        return;
      }

      notify.success(`Plan ${selectedPlan.name} updated successfully`);
      setShowEditModal(false);
      fetchData();
    } catch {
      setModalApiError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (plan: Plan) => {
    const newStatus = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await apiService.subscriptions.updatePlan(plan.id, { status: newStatus });
      if (res.success) {
        notify.success(`Plan ${plan.name} status updated to ${newStatus}`);
        fetchData();
      }
    } catch {
      notify.error('Failed to change plan status');
    }
  };

  // ── Plan Columns ──────────────────────────────────────────
  const planColumns = [
    {
      key: 'name',
      header: 'Plan Name',
      render: (plan: Plan) => (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-100">{plan.name}</p>
            <p className="text-xs text-slate-500 font-mono">{plan.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price / Interval',
      render: (plan: Plan) => (
        <span className="font-mono text-sm font-bold text-violet-300">
          {formatCurrency(plan.price)} / {plan.billingInterval.toLowerCase()}
        </span>
      ),
    },
    {
      key: 'limits',
      header: 'Technical Limits',
      render: (plan: Plan) => (
        <div className="text-xs text-slate-300 space-y-0.5 font-mono">
          <p>Branches: {plan.branchLimit}</p>
          <p>Staff: {plan.staffLimit} | Cards: {plan.cardLimit}</p>
        </div>
      ),
    },
    {
      key: 'entitlements',
      header: 'Entitlements',
      render: (plan: Plan) => (
        <div className="flex flex-wrap gap-1 text-[11px]">
          <Badge variant="outline">{plan.inventoryLevel} Inv</Badge>
          <Badge variant="outline">{plan.analyticsLevel} Analytics</Badge>
          <Badge variant="outline">{plan.supportLevel} Support</Badge>
        </div>
      ),
    },

    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (plan: Plan) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(plan)}
            leftIcon={<Edit2 className="h-3.5 w-3.5" />}
          >
            Edit
          </Button>

          <Button
            variant={plan.status === 'ACTIVE' ? 'ghost' : 'outline'}
            size="sm"
            onClick={() => handleToggleStatus(plan)}
            leftIcon={<Power className="h-3.5 w-3.5" />}
          >
            {plan.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  // ── Subscriptions Columns ─────────────────────────────────
  const subColumns = [
    {
      key: 'organizationId',
      header: 'Organization',
      render: (sub: Subscription) => (
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <Building2 className="h-4 w-4 text-violet-400" />
          <span>{sub.organizationId}</span>
        </div>
      ),
    },
    {
      key: 'planId',
      header: 'Assigned Plan',
      render: (sub: Subscription) => {
        const p = plans.find((pl) => pl.id === sub.planId);
        return <Badge variant="outline" className="font-semibold">{p?.name || sub.planId}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Subscription Status',
      render: (sub: Subscription) => (
        <Badge
          variant={
            sub.status === 'ACTIVE'
              ? 'success'
              : sub.status === 'PENDING_PAYMENT'
                ? 'warning'
                : 'danger'
          }
        >
          {sub.status}
        </Badge>
      ),
    },
    {
      key: 'renewalDate',
      header: 'Renewal Date',
      render: (sub: Subscription) => (
        <span className="text-xs text-slate-400">{formatDate(sub.renewalDate)}</span>
      ),
    },
  ];

  // ── Payment Columns ───────────────────────────────────────
  const paymentColumns = [
    {
      key: 'id',
      header: 'Payment ID',
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
      header: 'Gateway / Method',
      render: (pay: SubscriptionPayment) => (
        <span className="text-xs text-slate-300">{pay.paymentMethod}</span>
      ),
    },
    {
      key: 'status',
      header: 'Payment Status',
      render: (pay: SubscriptionPayment) => (
        <Badge variant={pay.status === 'SUCCESS' ? 'success' : 'danger'}>
          {pay.status}
        </Badge>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Super Admin Plan & Subscriptions Oversight</h1>
          <p className="mt-1 text-sm text-slate-400">
            Configure commercial subscription plans, manage technical limits, and audit platform billing history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={handleOpenCreate} leftIcon={<Plus className="h-4 w-4" />}>
            Create New Plan
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('PLANS')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'PLANS'
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          Plan Catalog ({plans.length})
        </button>

        <button
          onClick={() => setActiveTab('SUBSCRIPTIONS')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'SUBSCRIPTIONS'
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Org Subscriptions ({subscriptions.length})
        </button>

        <button
          onClick={() => setActiveTab('PAYMENTS')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'PAYMENTS'
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Billing History ({payments.length})
        </button>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <LoadingState message="Loading plan management registry..." />
      ) : error ? (
        <ErrorState title="Failed to load subscription data" message={error} onRetry={fetchData} />
      ) : activeTab === 'PLANS' ? (
        <Card padding="none">
          <DataTable<Plan> data={plans} columns={planColumns} keyExtractor={(item: Plan) => item.id} />
        </Card>
      ) : activeTab === 'SUBSCRIPTIONS' ? (
        <Card padding="none">
          <DataTable<Subscription>
            data={subscriptions}
            columns={subColumns}
            keyExtractor={(item: Subscription) => item.id}
          />
        </Card>
      ) : (
        <Card padding="none">
          <DataTable<SubscriptionPayment>
            data={payments}
            columns={paymentColumns}
            keyExtractor={(item: SubscriptionPayment) => item.id}
          />
        </Card>
      )}

      {/* ── Create Plan Modal ── */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Plan">
        <form onSubmit={handleCreateSubmit} noValidate className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <Input
            id="create-plan-name"
            label="Plan Display Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            error={formErrors.name}
            disabled={isSubmitting}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="create-plan-price"
              type="number"
              label="Commercial Price"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              error={formErrors.price}
              disabled={isSubmitting}
            />

            <Select
              id="create-plan-currency"
              label="Currency"
              value={formCurrency}
              onChange={(e) => setFormCurrency(e.target.value)}
              options={[{ value: 'INR', label: 'INR (₹)' }, { value: 'USD', label: 'USD ($)' }]}
              disabled={isSubmitting}
            />

            <Select
              id="create-plan-interval"
              label="Billing Interval"
              value={formInterval}
              onChange={(e) => setFormInterval(e.target.value as 'MONTHLY' | 'YEARLY')}
              options={[{ value: 'MONTHLY', label: 'MONTHLY' }, { value: 'YEARLY', label: 'YEARLY' }]}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="create-branch-limit"
              type="number"
              label="Max Branches"
              value={formBranchLimit}
              onChange={(e) => setFormBranchLimit(e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              id="create-staff-limit"
              type="number"
              label="Max Staff Accounts"
              value={formStaffLimit}
              onChange={(e) => setFormStaffLimit(e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              id="create-card-limit"
              type="number"
              label="Max Active Cards"
              value={formCardLimit}
              onChange={(e) => setFormCardLimit(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              Create Plan
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Edit Plan Modal ── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit Plan: ${selectedPlan?.name}`}>
        <form onSubmit={handleEditSubmit} noValidate className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <Input
            id="edit-plan-name"
            label="Plan Display Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            error={formErrors.name}
            disabled={isSubmitting}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="edit-plan-price"
              type="number"
              label="Price (₹)"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              error={formErrors.price}
              disabled={isSubmitting}
            />

            <Select
              id="edit-plan-status"
              label="Status"
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              options={[{ value: 'ACTIVE', label: 'ACTIVE' }, { value: 'INACTIVE', label: 'INACTIVE' }]}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="edit-branch-limit"
              type="number"
              label="Max Branches"
              value={formBranchLimit}
              onChange={(e) => setFormBranchLimit(e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              id="edit-staff-limit"
              type="number"
              label="Max Staff"
              value={formStaffLimit}
              onChange={(e) => setFormStaffLimit(e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              id="edit-card-limit"
              type="number"
              label="Max Cards"
              value={formCardLimit}
              onChange={(e) => setFormCardLimit(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              Save Plan Changes
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}

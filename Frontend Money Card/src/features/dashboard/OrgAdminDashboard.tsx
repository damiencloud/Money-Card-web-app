// ─── Organization Admin Dashboard (M11) ────────────────────
// Real-time organization metrics, plan usage limits, and
// date-range calendar filtered operational metrics.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { useBranch, usePermissions } from '@/hooks';
import type {
  Plan,
  Subscription,
  Branch,
  Staff,
  Card as CardEntity,
  InventoryItem,
  AnalyticsOverview,
} from '@/types';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  StatCard,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { formatCurrency } from '@/utils';
import {
  Building2,
  Users,
  CreditCard,
  ShoppingBag,
  TrendingUp,
  RefreshCw,
  Zap,
  ArrowRight,
  AlertTriangle,
  Upload,
  BarChart3,
  CalendarDays,
  Clock,
  X,
} from 'lucide-react';

export type DatePreset = 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom';

export function getPresetDates(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (preset === 'today') {
    return { startDate: todayStr, endDate: todayStr };
  }
  if (preset === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().split('T')[0];
    return { startDate: yestStr, endDate: yestStr };
  }
  if (preset === 'last7') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
  }
  if (preset === 'last30') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
  }
  if (preset === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
  }

  return { startDate: '', endDate: '' };
}

export function OrgAdminDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { currentBranch, branches: userBranches, selectBranch, clearBranch } = useBranch();

  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [cardsList, setCardsList] = useState<CardEntity[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);

  // Date Filtering State
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
      const { startDate: s, endDate: e } = getPresetDates(preset);
      setStartDate(s);
      setEndDate(e);
    }
  };

  const handleClearDateFilter = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setShowCustomPicker(false);
  };

  const fetchOrgDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);
    setError(null);
    try {
      const [plansRes, subRes, branchRes, staffRes, cardRes, invRes, analyticsRes] =
        await Promise.all([
          apiService.plans.getPlans(),
          apiService.subscriptions.getSubscription(),
          apiService.branches.getBranches(),
          apiService.staff.getStaff(),
          apiService.cards.getCards(),
          apiService.inventory.getInventory(),
          apiService.analytics.getAnalyticsOverview({
            branchId: currentBranch ? currentBranch.id : undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          }),
        ]);

      if (!subRes.success) {
        setError(subRes.error.message || 'Failed to load organization data');
        return;
      }

      setSubscription(subRes.data);

      if (plansRes.success && subRes.data) {
        const foundPlan = plansRes.data.find((p) => p.id === subRes.data.planId) || plansRes.data[0];
        setCurrentPlan(foundPlan);
      }

      if (branchRes.success) setBranches(branchRes.data.items);
      if (staffRes.success) setStaffList(staffRes.data.items);
      if (cardRes.success) setCardsList(cardRes.data.items);
      if (invRes.success) setInventory(invRes.data.items);
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentBranch, startDate, endDate]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const [plansRes, subRes, branchRes, staffRes, cardRes, invRes, analyticsRes] =
          await Promise.all([
            apiService.plans.getPlans(),
            apiService.subscriptions.getSubscription(),
            apiService.branches.getBranches(),
            apiService.staff.getStaff(),
            apiService.cards.getCards(),
            apiService.inventory.getInventory(),
            apiService.analytics.getAnalyticsOverview({
              branchId: currentBranch ? currentBranch.id : undefined,
              startDate: startDate || undefined,
              endDate: endDate || undefined,
            }),
          ]);
        if (isCancelled) return;

        if (!subRes.success) {
          setError(subRes.error.message || 'Failed to load organization data');
          return;
        }

        setSubscription(subRes.data);

        if (plansRes.success && subRes.data) {
          const foundPlan = plansRes.data.find((p) => p.id === subRes.data.planId) || plansRes.data[0];
          setCurrentPlan(foundPlan);
        }

        if (branchRes.success) setBranches(branchRes.data.items);
        if (staffRes.success) setStaffList(staffRes.data.items);
        if (cardRes.success) setCardsList(cardRes.data.items);
        if (invRes.success) setInventory(invRes.data.items);
        if (analyticsRes.success) setAnalytics(analyticsRes.data);
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
  }, [currentBranch, startDate, endDate]);

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

  const txnUsage = analytics?.totalTransactions || 0;

  // Filter Cards by Date Range
  const filteredCardsIssuedCount = useMemo(() => {
    if (!startDate && !endDate) return cardsList.length;
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z').getTime() : Infinity;

    return cardsList.filter((c) => {
      const cardDate = new Date(c.createdAt || (c as any).issuedAt || 0).getTime();
      return cardDate >= start && cardDate <= end;
    }).length;
  }, [cardsList, startDate, endDate]);

  // Low Stock Items (Threshold <= 10)
  const lowStockCount = useMemo(() => {
    return inventory.filter((i) => i.quantity <= 10).length;
  }, [inventory]);

  // Formatted date period description
  const activeDateLabel = useMemo(() => {
    if (!startDate && !endDate) return 'All Time';
    if (startDate && endDate && startDate === endDate) {
      return `Date: ${startDate}`;
    }
    if (startDate && endDate) {
      return `${startDate} to ${endDate}`;
    }
    if (startDate) return `From ${startDate}`;
    if (endDate) return `Until ${endDate}`;
    return 'All Time';
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Organization Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time overview of your branches, cards, inventory, and subscription entitlements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {userBranches.length > 0 && (
            <select
              value={currentBranch?.id || ''}
              onChange={(e) => {
                const bId = e.target.value;
                if (!bId) {
                  clearBranch();
                } else {
                  const target = userBranches.find((b) => b.id === bId);
                  if (target) selectBranch(target);
                }
              }}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
            >
              <option value="">All Branches</option>
              {userBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrgDashboardData(false)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range Calendar Filter Bar */}
      <Card className="border-slate-800/80 bg-slate-900/50 backdrop-blur-sm">
        <div className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Quick Preset Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-2">
                <CalendarDays className="h-4 w-4 text-violet-400" />
                Date Filter:
              </span>

              <button
                type="button"
                onClick={() => handlePresetChange('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  datePreset === 'all'
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                    : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                All Time
              </button>

              <button
                type="button"
                onClick={() => handlePresetChange('today')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  datePreset === 'today'
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                    : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => handlePresetChange('yesterday')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  datePreset === 'yesterday'
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                    : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                Yesterday
              </button>

              <button
                type="button"
                onClick={() => handlePresetChange('last7')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  datePreset === 'last7'
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                    : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                Last 7 Days
              </button>

              <button
                type="button"
                onClick={() => handlePresetChange('last30')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  datePreset === 'last30'
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                    : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                Last 30 Days
              </button>

              <button
                type="button"
                onClick={() => handlePresetChange('thisMonth')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  datePreset === 'thisMonth'
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                    : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                This Month
              </button>

              <button
                type="button"
                onClick={() => handlePresetChange('custom')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  datePreset === 'custom'
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                    : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Active Range Summary Tag */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-300 border border-slate-800">
                <Clock className="h-3.5 w-3.5 text-violet-400" />
                <span>Period: <strong className="text-slate-100">{activeDateLabel}</strong></span>
              </span>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={handleClearDateFilter}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-1 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Reset date filter to All Time"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Expanded Custom Date Picker Inputs */}
          {(showCustomPicker || datePreset === 'custom') && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <label htmlFor="dashboard-start-date" className="font-medium text-slate-400">
                  From:
                </label>
                <input
                  id="dashboard-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none [color-scheme:dark]"
                />
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="dashboard-end-date" className="font-medium text-slate-400">
                  To:
                </label>
                <input
                  id="dashboard-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none [color-scheme:dark]"
                />
              </div>

              <span className="text-[11px] text-slate-500">
                Metrics update automatically when dates are selected.
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Permission-Guarded Quick Actions Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {hasPermission('BRANCH_MANAGE') && (
          <button
            onClick={() => navigate('/branches')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center transition-all hover:border-violet-500/50 hover:bg-slate-900"
          >
            <Building2 className="h-5 w-5 text-violet-400 mb-1.5" />
            <span className="text-xs font-semibold text-slate-200">Branches</span>
          </button>
        )}

        {hasPermission('STAFF_MANAGE') && (
          <button
            onClick={() => navigate('/staff')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center transition-all hover:border-violet-500/50 hover:bg-slate-900"
          >
            <Users className="h-5 w-5 text-indigo-400 mb-1.5" />
            <span className="text-xs font-semibold text-slate-200">Add Staff</span>
          </button>
        )}

        {hasPermission('CARD_ISSUE') && (
          <button
            onClick={() => navigate('/cards')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center transition-all hover:border-violet-500/50 hover:bg-slate-900"
          >
            <CreditCard className="h-5 w-5 text-sky-400 mb-1.5" />
            <span className="text-xs font-semibold text-slate-200">Issue Card</span>
          </button>
        )}

        {hasPermission('PRODUCT_MANAGE') && (
          <button
            onClick={() => navigate('/products')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center transition-all hover:border-violet-500/50 hover:bg-slate-900"
          >
            <ShoppingBag className="h-5 w-5 text-emerald-400 mb-1.5" />
            <span className="text-xs font-semibold text-slate-200">Add Product</span>
          </button>
        )}

        {hasPermission('INVENTORY_IMPORT') && (
          <button
            onClick={() => navigate('/inventory')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center transition-all hover:border-violet-500/50 hover:bg-slate-900"
          >
            <Upload className="h-5 w-5 text-amber-400 mb-1.5" />
            <span className="text-xs font-semibold text-slate-200">Import CSV</span>
          </button>
        )}

        {hasPermission('VIEW_ANALYTICS') && (
          <button
            onClick={() => navigate('/analytics')}
            className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center transition-all hover:border-violet-500/50 hover:bg-slate-900"
          >
            <BarChart3 className="h-5 w-5 text-violet-400 mb-1.5" />
            <span className="text-xs font-semibold text-slate-200">Analytics</span>
          </button>
        )}

        <button
          onClick={() => navigate('/subscriptions')}
          className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center transition-all hover:border-violet-500/50 hover:bg-slate-900"
        >
          <Zap className="h-5 w-5 text-indigo-400 mb-1.5" />
          <span className="text-xs font-semibold text-slate-200">Plan Limits</span>
        </button>
      </div>

      {isLoading ? (
        <LoadingState message="Loading organization dashboard..." />
      ) : error ? (
        <ErrorState title="Failed to load dashboard" message={error} onRetry={() => fetchOrgDashboardData(false)} />
      ) : (
        <div className="space-y-6">
          {/* Active Plan & Resource Utilization Limits */}
          <Card>
            <CardHeader
              title={`Active Plan: ${currentPlan?.name || 'Standard Plan'}`}
              description="Real-time resource utilization vs active subscription plan quotas."
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={subscription?.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {subscription?.status || 'ACTIVE'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/subscriptions')}
                    rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  >
                    Manage Plan
                  </Button>
                </div>
              }
            />

            <CardContent className="space-y-6">
              {/* Progress bars */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Branches */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Building2 className="h-4 w-4 text-violet-400" />
                      Branches
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      {branchUsage} / {branchLimit}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full bg-violet-500 transition-all duration-300"
                      style={{ width: `${Math.min((branchUsage / branchLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Staff Accounts */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Users className="h-4 w-4 text-indigo-400" />
                      Staff Accounts
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      {staffUsage} / {staffLimit}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${Math.min((staffUsage / staffLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Active Cards Fleet Total */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <CreditCard className="h-4 w-4 text-sky-400" />
                      Active Cards
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      {cardUsage} / {cardLimit}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-full bg-sky-500 transition-all duration-300"
                      style={{ width: `${Math.min((cardUsage / cardLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Monthly Transactions */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <BarChart3 className="h-4 w-4 text-emerald-400" />
                      Monthly Transactions
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {txnUsage.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operational Stat Cards (Filtered by Date Range) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Purchase Sales Volume"
              value={formatCurrency(analytics?.totalPurchaseVolume || 0)}
              icon={<ShoppingBag className="h-5 w-5 text-emerald-400" />}
            />

            <StatCard
              label="Card Wallet Recharges"
              value={formatCurrency(analytics?.totalRechargeVolume || 0)}
              icon={<TrendingUp className="h-5 w-5 text-violet-400" />}
            />

            <StatCard
              label={startDate || endDate ? "Cards Issued in Period" : "Active Cards Issued"}
              value={filteredCardsIssuedCount}
              icon={<CreditCard className="h-5 w-5 text-sky-400" />}
            />

            <StatCard
              label="Low Stock Alert Items"
              value={lowStockCount}
              icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
            />
          </div>
        </div>
      )}
    </div>
  );
}

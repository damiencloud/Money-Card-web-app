// ─── Organization Admin Dashboard (M11) ────────────────────
// Real-time organization metrics, plan usage limits, and
// unified date-range calendar filtered operational metrics.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { useBranch, usePermissions, useAuth } from '@/hooks';
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
  Select,
  Card,
  CardHeader,
  CardContent,
  Badge,
  StatCard,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { formatCurrency, storage } from '@/utils';
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
  BarChart3,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react';

export type DatePreset = 'thisMonth' | 'today' | 'yesterday' | 'last7' | 'last30' | 'all' | 'custom';

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
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { currentBranch, selectBranch, clearBranch, setBranches: updateBranchContext } = useBranch();

  const setupStorageKey = `org_setup_complete_${user?.organizationId || 'default'}`;
  const setupDismissedKey = `org_setup_dismissed_${user?.organizationId || 'default'}`;

  const isPreviouslyCompleted = useMemo(() => {
    return storage.get<boolean>(setupStorageKey) === true;
  }, [setupStorageKey]);

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return storage.get<boolean>(setupDismissedKey) === true;
  });

  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [cardsList, setCardsList] = useState<CardEntity[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);

  // Date Filtering State (Default: This Month matching Analytics)
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const [startDate, setStartDate] = useState<string>(() => getPresetDates('thisMonth').startDate);
  const [endDate, setEndDate] = useState<string>(() => getPresetDates('thisMonth').endDate);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const { startDate: s, endDate: e } = getPresetDates(preset);
      setStartDate(s);
      setEndDate(e);
    }
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
          apiService.inventory.getInventory(currentBranch ? { branchId: currentBranch.id } : undefined),
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

      if (branchRes.success) {
        setBranches(branchRes.data.items);
        updateBranchContext(branchRes.data.items);
      }
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
            apiService.inventory.getInventory(currentBranch ? { branchId: currentBranch.id } : undefined),
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

        if (branchRes.success) {
          setBranches(branchRes.data.items);
          updateBranchContext(branchRes.data.items);
        }
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

  // Getting Started Checklist Calculations
  const hasBranches = branches.length > 0 || !!currentBranch;
  const hasStaff = staffList.length > 0;
  const hasCards = cardsList.length > 0;
  const hasProducts = inventory.length > 0;

  const setupSteps = useMemo(() => [
    {
      id: 'branches',
      title: '1. Create branch location',
      description: 'Define your cafeteria counter or store location.',
      completed: hasBranches,
      path: '/branches',
      actionLabel: 'Add Branch',
    },
    {
      id: 'staff',
      title: '2. Add team members & cashiers',
      description: 'Grant counter staff access to scan cards and take orders.',
      completed: hasStaff,
      path: '/staff',
      actionLabel: 'Add Staff',
    },
    {
      id: 'cards',
      title: '3. Register smart cards',
      description: 'Scan or import physical cards for your customers.',
      completed: hasCards,
      path: '/cards',
      actionLabel: 'Register Cards',
    },
    {
      id: 'products',
      title: '4. Add menu items & prices',
      description: 'Create food items and prices for POS checkout.',
      completed: hasProducts,
      path: '/products',
      actionLabel: 'Add Products',
    },
  ], [hasBranches, hasStaff, hasCards, hasProducts]);

  const completedStepsCount = setupSteps.filter((s) => s.completed).length;
  const setupPercent = Math.round((completedStepsCount / setupSteps.length) * 100);
  const isSetupComplete = completedStepsCount === setupSteps.length;

  // Persist setup completion so it never flashes or reappears once completed
  useEffect(() => {
    if (isSetupComplete && !isLoading) {
      storage.set(setupStorageKey, true);
    }
  }, [isSetupComplete, isLoading, setupStorageKey]);

  // NEVER show the first-time setup checklist while loading, when scoped to a specific branch,
  // or when already completed or dismissed.
  const showSetupChecklist =
    !isLoading &&
    !currentBranch &&
    !isPreviouslyCompleted &&
    !isDismissed &&
    !isSetupComplete;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Organization Dashboard</h1>
        </div>
      </div>

      {/* ─── 4 Primary Quick Action Cards (Non-Technical Friendly) ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hasPermission('CARD_ISSUE') && (
          <button
            type="button"
            onClick={() => navigate('/cards')}
            className="group flex flex-col justify-between p-5 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950 hover:from-slate-900 hover:to-emerald-950/20 hover:border-emerald-500/50 transition-all text-left shadow-lg cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <CreditCard className="h-6 w-6" />
              </div>
              <span className="text-xs font-semibold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                Issue & Register Cards
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Scan or assign new smart cards to customers
              </p>
            </div>
          </button>
        )}

        {hasPermission('STAFF_MANAGE') && (
          <button
            type="button"
            onClick={() => navigate('/staff')}
            className="group flex flex-col justify-between p-5 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950 hover:from-slate-900 hover:to-violet-950/20 hover:border-violet-500/50 transition-all text-left shadow-lg cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <span className="text-xs font-semibold text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-100 group-hover:text-violet-300 transition-colors">
                Add Team Member
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Invite cashiers and branch supervisors
              </p>
            </div>
          </button>
        )}

        {hasPermission('PRODUCT_MANAGE') && (
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="group flex flex-col justify-between p-5 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950 hover:from-slate-900 hover:to-teal-950/20 hover:border-teal-500/50 transition-all text-left shadow-lg cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 group-hover:scale-110 transition-transform">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <span className="text-xs font-semibold text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
            <div>
              <h3 className="font-bold text-slate-100 group-hover:text-teal-300 transition-colors">
                Add Menu Item
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Create food items and prices for POS checkout
              </p>
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/sessions')}
          className="group flex flex-col justify-between p-5 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950 hover:from-slate-900 hover:to-amber-950/20 hover:border-amber-500/50 transition-all text-left shadow-lg cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <BarChart3 className="h-6 w-6" />
            </div>
            <span className="text-xs font-semibold text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              Open <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <h3 className="font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
              Today's Activity & Sales
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Inspect active cards, orders, and settlements
            </p>
          </div>
        </button>
      </div>

      {/* Secondary Tools Strip */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-1">More Tools:</span>
        {hasPermission('BRANCH_MANAGE') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/branches')}
            leftIcon={<Building2 className="h-3.5 w-3.5" />}
          >
            Branches
          </Button>
        )}
        {hasPermission('VIEW_ANALYTICS') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/analytics')}
            leftIcon={<BarChart3 className="h-3.5 w-3.5" />}
          >
            Analytics
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/subscriptions')}
          leftIcon={<Zap className="h-3.5 w-3.5" />}
        >
          Plan Limits
        </Button>
      </div>

      {/* ─── Getting Started Checklist (Interactive Setup Guide) ─── */}
      {showSetupChecklist && (
        <Card className="border-violet-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-violet-950/20 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" />
                <h3 className="font-bold text-slate-100 text-base">
                  Getting Started Checklist
                </h3>
                <Badge variant="warning" className="text-xs font-semibold">
                  {completedStepsCount} of {setupSteps.length} Steps
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Complete these initial steps to get your cafeteria operations fully running.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-full sm:w-48 space-y-1">
                <div className="flex justify-between text-xs font-medium text-slate-300">
                  <span>Setup Progress</span>
                  <span className="font-bold text-violet-400">{setupPercent}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${setupPercent}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  storage.set(setupDismissedKey, true);
                  setIsDismissed(true);
                }}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors shrink-0"
                title="Dismiss setup checklist"
                aria-label="Dismiss setup checklist"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-3 pt-4 sm:grid-cols-2">
            {setupSteps.map((step) => (
              <div
                key={step.id}
                className={`flex items-start justify-between p-3.5 rounded-xl border transition-all ${
                  step.completed
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-300'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {step.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-600 flex items-center justify-center text-[10px] text-slate-400 font-bold" />
                    )}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${step.completed ? 'text-emerald-300 line-through' : 'text-slate-100'}`}>
                      {step.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{step.description}</p>
                  </div>
                </div>

                {!step.completed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs py-1 px-2.5 ml-2 border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
                    onClick={() => navigate(step.path)}
                  >
                    {step.actionLabel}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

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

          {/* ── UNIFIED FILTERED METRICS BOX (Date Filter Toolbar + 4 Operational Stat Cards) ── */}
          <Card className="border-slate-800/80 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader
              title="Sales & Operations Overview"
            />

            <CardContent className="space-y-5">
              {/* Filter Toolbar (Branch Scope, Time Window, Refresh Data) */}
              <div className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Branch Scope Filter */}
                  <div className="w-full sm:w-52">
                    <label className="mb-1 block text-[11px] font-medium text-slate-400">Branch Scope</label>
                    <Select
                      id="dashboard-branch-filter"
                      value={currentBranch?.id || ''}
                      onChange={(e) => {
                        const bId = e.target.value;
                        if (!bId) {
                          clearBranch();
                        } else {
                          const target = branches.find((b) => b.id === bId);
                          if (target) selectBranch(target);
                        }
                      }}
                      options={[
                        { value: '', label: 'All Branches' },
                        ...branches.map((b) => ({ value: b.id, label: b.name })),
                      ]}
                    />
                  </div>

                  {/* Time Window Filter */}
                  <div className="w-full sm:w-44">
                    <label className="mb-1 block text-[11px] font-medium text-slate-400">Time Window</label>
                    <Select
                      id="dashboard-preset-filter"
                      value={datePreset}
                      onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
                      options={[
                        { value: 'thisMonth', label: 'This Month' },
                        { value: 'today', label: 'Today' },
                        { value: 'yesterday', label: 'Yesterday' },
                        { value: 'last7', label: 'Last 7 Days' },
                        { value: 'last30', label: 'Last 30 Days' },
                        { value: 'all', label: 'All Time' },
                        { value: 'custom', label: 'Custom Range' },
                      ]}
                    />
                  </div>

                  {/* Custom Date Inputs (if selected) */}
                  {datePreset === 'custom' && (
                    <div className="flex items-end gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-400">Start Date</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-400">End Date</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Refresh Data Button */}
                <div className="pt-2 lg:pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchOrgDashboardData(false)}
                    disabled={isRefreshing}
                    isLoading={isRefreshing}
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                  >
                    Refresh Data
                  </Button>
                </div>
              </div>

              {/* 4 Filtered Stat Cards inside the box */}
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Organization Admin Dashboard (M11) ────────────────────
// Real-time organization metrics, plan usage limits, financial summary, and permission-guarded quick actions.

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

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

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrgDashboardData = useCallback(async () => {
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
          apiService.analytics.getAnalyticsOverview(
            currentBranch ? { branchId: currentBranch.id } : undefined,
          ),
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
    }
  }, [currentBranch]);

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
            apiService.analytics.getAnalyticsOverview(
              currentBranch ? { branchId: currentBranch.id } : undefined,
            ),
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
  }, [currentBranch]);

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

  const lowStockCount = inventory.filter((i) => i.quantity <= 10).length;

  return (
    <div className="space-y-8">
      {/* Header Bar & Branch Selector */}
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

          <Button variant="outline" size="sm" onClick={fetchOrgDashboardData} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Refresh
          </Button>
        </div>
      </div>

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
        <ErrorState title="Failed to load dashboard" message={error} onRetry={fetchOrgDashboardData} />
      ) : (
        <div className="space-y-8">
          {/* Active Plan & Real-Time Resource Usage Summary Card */}
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

                {/* Active Cards */}
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

          {/* Operational Stat Cards */}
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
              label="Active Cards Issued"
              value={cardsList.length}
              icon={<CreditCard className="h-5 w-5 text-sky-400" />}
            />

            <StatCard
              label="Low Stock Alert Items"
              value={lowStockCount}
              icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
            />
          </div>

          {/* Financial Distinction Summary Card (M0 Rule 7) */}
          <Card className="border-violet-500/30 bg-gradient-to-r from-slate-900 via-slate-900/90 to-violet-950/30">
            <CardHeader
              title="Financial Revenue vs. Wallet Liabilities (M0 Section 29)"
              description="Authoritative distinction between actual POS purchase sales revenue and unspent card wallet deposits."
            />
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-xs font-semibold text-slate-400">Actual POS Purchase Sales:</span>
                  <p className="font-mono text-xl font-bold text-emerald-400">
                    {formatCurrency(analytics?.totalPurchaseVolume || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500">Recognized revenue from completed food/store purchases.</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-1">
                  <span className="text-xs font-semibold text-slate-400">Card Wallet Deposits (Recharges):</span>
                  <p className="font-mono text-xl font-bold text-violet-300">
                    {formatCurrency(analytics?.totalRechargeVolume || 0)}
                  </p>
                  <p className="text-[11px] text-slate-500">Unspent pre-funded card balance liabilities.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

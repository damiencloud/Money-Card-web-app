// ─── Super Admin Platform Dashboard ───────────────────────────
// Built for non-technical users: clear hierarchy, prominent Action Needed,
// quick actions, simplified KPI cards, and plain-English sections.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import type {
  OrganizationOverview,
  Plan,
  AnalyticsOverview,
  PlanChangeRequest,
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
import { DataTable } from '@/components/tables';
import { formatDate, formatCurrency } from '@/utils';
import {
  Building2,
  BarChart3,
  TrendingUp,
  Receipt,
  ArrowRight,
  RefreshCw,
  Layers,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  CalendarDays,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Search,
  PlusCircle,
  Bell,
  CheckCircle2,
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

export function SuperAdminDashboard() {
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState<OrganizationOverview[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [planRequests, setPlanRequests] = useState<PlanChangeRequest[]>([]);

  // Organization Filter State
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  // Date Filtering State
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Search & Business Overview Accordion Toggle
  const [searchOrgTerm, setSearchOrgTerm] = useState('');
  const [isDetailedView, setIsDetailedView] = useState(false);

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

  const fetchPlatformData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);
    setError(null);
    try {
      const [orgsRes, plansRes, analyticsRes, reqsRes] = await Promise.all([
        apiService.organizations.getOrganizations(),
        apiService.plans.getPlans(),
        apiService.analytics.getAnalyticsOverview({
          organizationId: selectedOrgId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        apiService.subscriptions.getPlanRequests(),
      ]);

      if (!orgsRes.success) {
        setError(orgsRes.error.message || 'Failed to load dashboard data');
        return;
      }

      setOrgs(orgsRes.data.items);
      if (plansRes.success) setPlans(plansRes.data);
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      if (reqsRes.success) setPlanRequests(reqsRes.data || []);
    } catch {
      setError('Unable to connect to server. Please check your connection.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedOrgId, startDate, endDate]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const [orgsRes, plansRes, analyticsRes, reqsRes] = await Promise.all([
          apiService.organizations.getOrganizations(),
          apiService.plans.getPlans(),
          apiService.analytics.getAnalyticsOverview({
            organizationId: selectedOrgId || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          }),
          apiService.subscriptions.getPlanRequests(),
        ]);
        if (isCancelled) return;

        if (!orgsRes.success) {
          setError(orgsRes.error.message || 'Failed to load dashboard data');
          return;
        }

        setOrgs(orgsRes.data.items);
        if (plansRes.success) setPlans(plansRes.data);
        if (analyticsRes.success) setAnalytics(analyticsRes.data);
        if (reqsRes.success) setPlanRequests(reqsRes.data || []);
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
  }, [selectedOrgId, startDate, endDate]);

  const activeOrgsCount = orgs.filter((o) => o.status === 'ACTIVE').length;

  const selectedOrgName = useMemo(() => {
    if (!selectedOrgId) return 'All Cafeterias';
    const found = orgs.find((o) => o.id === selectedOrgId);
    return found ? found.name : 'Selected Cafeteria';
  }, [selectedOrgId, orgs]);

  const pendingRequests = useMemo(
    () => planRequests.filter((r) => r.status === 'PENDING'),
    [planRequests]
  );

  const filteredOrgs = useMemo(() => {
    if (!searchOrgTerm.trim()) return orgs;
    const term = searchOrgTerm.toLowerCase().trim();
    return orgs.filter((o) => o.name.toLowerCase().includes(term));
  }, [orgs, searchOrgTerm]);

  // Simplified Table Headers: Cafeteria, Status, Plan, Joined, View
  const orgColumns = [
    {
      key: 'name',
      header: 'Cafeteria',
      render: (org: OrganizationOverview) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-100">{org.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (org: OrganizationOverview) => (
        <Badge variant={org.status === 'ACTIVE' ? 'success' : 'danger'}>
          {org.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (org: OrganizationOverview) => (
        <Badge variant="outline" className="text-violet-300 border-violet-500/30">
          {org.plan?.name || 'Standard'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (org: OrganizationOverview) => (
        <span className="text-xs text-slate-400">{formatDate(org.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'View',
      render: (_org: OrganizationOverview) => (
        <button
          onClick={() => navigate('/organizations')}
          className="text-xs font-semibold text-violet-400 hover:text-violet-300 hover:underline inline-flex items-center gap-1"
        >
          <span>Open</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Welcome back, Super Admin 👋
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchPlatformData(false)}
          isLoading={isRefreshing}
          leftIcon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* ── 2. Action Needed (Most Prominent Section) ────────────────────── */}
      {pendingRequests.length > 0 ? (
        <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 p-5 shadow-lg shadow-amber-500/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-100">
                    Action Needed: {pendingRequests.length} Request{pendingRequests.length > 1 ? 's' : ''} Awaiting Approval
                  </span>
                  <Badge variant="warning" className="text-[10px] font-bold">URGENT</Badge>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {pendingRequests.some((r) => r.requestType === 'RENEWAL')
                    ? `${pendingRequests[0]?.organizationName || 'A cafeteria'} requested plan renewal. Tap to approve.`
                    : 'Cafeterias submitted plan changes requiring your approval.'}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/subscriptions')}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 shrink-0 shadow-md shadow-amber-500/25"
            >
              Review Requests
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-emerald-200">
              Action Needed: All caught up! No pending approvals right now.
            </span>
          </div>
          <span className="text-xs text-emerald-400/80 font-medium">All systems normal</span>
        </div>
      )}

      {/* ── 3. Quick Actions ──────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Quick Actions
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={() => navigate('/organizations')}
            className="group flex flex-col sm:flex-row items-center sm:items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center sm:text-left transition-all hover:border-violet-500/50 hover:bg-slate-900 hover:shadow-md hover:shadow-violet-500/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400 group-hover:scale-105 transition-transform">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100 group-hover:text-violet-300 transition-colors">
                Add Cafeteria
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate('/subscriptions')}
            className="group flex flex-col sm:flex-row items-center sm:items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center sm:text-left transition-all hover:border-amber-500/50 hover:bg-slate-900 hover:shadow-md hover:shadow-amber-500/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 group-hover:scale-105 transition-transform">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                Review Requests
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate('/plans')}
            className="group flex flex-col sm:flex-row items-center sm:items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center sm:text-left transition-all hover:border-indigo-500/50 hover:bg-slate-900 hover:shadow-md hover:shadow-indigo-500/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 group-hover:scale-105 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                Manage Plans
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate('/analytics')}
            className="group flex flex-col sm:flex-row items-center sm:items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center sm:text-left transition-all hover:border-sky-500/50 hover:bg-slate-900 hover:shadow-md hover:shadow-sky-500/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 group-hover:scale-105 transition-transform">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                View Reports
              </span>
            </div>
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading dashboard..." />
      ) : error ? (
        <ErrorState title="Could not load dashboard data" message={error} onRetry={() => fetchPlatformData(false)} />
      ) : (
        <div className="space-y-6">
          {/* ── 4. Simplified KPI Cards (Cafeterias, Sales, Active Cards, Orders) ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Cafeterias"
              value={`${activeOrgsCount} Active`}
              icon={<Building2 className="h-5 w-5 text-violet-400" />}
            />

            <StatCard
              label="Sales"
              value={formatCurrency(analytics?.totalPurchaseVolume || 0)}
              icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
            />

            <StatCard
              label="Active Cards"
              value={(analytics?.activeCardsCount || 0).toLocaleString()}
              icon={<CreditCard className="h-5 w-5 text-sky-400" />}
            />

            <StatCard
              label="Orders"
              value={(analytics?.totalTransactions || 0).toLocaleString()}
              icon={<ShoppingBag className="h-5 w-5 text-indigo-400" />}
            />
          </div>

          {/* ── 5. Simple Time & Cafeteria Filter ───────────────────────────── */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Quick Date Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-2">
                  <CalendarDays className="h-4 w-4 text-violet-400" />
                  Time Period:
                </span>

                {(
                  [
                    { id: 'all', label: 'All Time' },
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'last7', label: 'Last 7 Days' },
                    { id: 'thisMonth', label: 'This Month' },
                    { id: 'custom', label: 'Custom Dates' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetChange(preset.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      datePreset === preset.id
                        ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Cafeteria Dropdown & Reset */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Cafeteria:</span>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-violet-500 focus:outline-none"
                  >
                    <option value="">All Cafeterias</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                {(startDate || endDate || selectedOrgId || datePreset !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClearDateFilter();
                      setSelectedOrgId('');
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom Date Pickers */}
            {(showCustomPicker || datePreset === 'custom') && (
              <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <label htmlFor="superadmin-start-date" className="font-semibold text-slate-400">
                    From:
                  </label>
                  <input
                    id="superadmin-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDatePreset('custom');
                    }}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none [color-scheme:dark]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="superadmin-end-date" className="font-semibold text-slate-400">
                    To:
                  </label>
                  <input
                    id="superadmin-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDatePreset('custom');
                    }}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none [color-scheme:dark]"
                  />
                </div>

                <span className="text-[11px] text-slate-500">
                  Metrics update automatically for selected dates.
                </span>
              </div>
            )}
          </div>

          {/* ── 6. Business Overview (Renamed from Financial & Operational Breakdown) ── */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
            <button
              onClick={() => setIsDetailedView((prev) => !prev)}
              className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-900/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Business Overview ({selectedOrgName})
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-violet-400">
                <span>{isDetailedView ? 'Hide Details' : 'Show Details'}</span>
                {isDetailedView ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {isDetailedView && (
              <div className="p-5 pt-0 space-y-5 border-t border-slate-800/80">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-4">
                  <StatCard
                    label="Money Added to Cards"
                    value={formatCurrency(analytics?.totalRechargeVolume || 0)}
                    icon={<TrendingUp className="h-5 w-5 text-violet-400" />}
                  />

                  <StatCard
                    label="Customer Refunds"
                    value={formatCurrency(analytics?.totalRefundVolume || 0)}
                    icon={<Receipt className="h-5 w-5 text-rose-400" />}
                  />

                  <StatCard
                    label="Net Revenue"
                    value={formatCurrency(
                      Math.max(0, (analytics?.totalPurchaseVolume || 0) - (analytics?.totalRefundVolume || 0))
                    )}
                    icon={<Receipt className="h-5 w-5 text-teal-400" />}
                  />

                  <StatCard
                    label="Active Sessions"
                    value={analytics?.activeSessionsCount || 0}
                    icon={<Clock className="h-5 w-5 text-amber-400" />}
                  />
                </div>

                {/* Branch Breakdown Table */}
                {analytics?.branchPerformance && analytics.branchPerformance.length > 0 && (
                  <div className="space-y-3 pt-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Branch Breakdown
                      </h4>
                      <span className="text-xs text-slate-500 font-mono">
                        {analytics.branchPerformance.length} location{analytics.branchPerformance.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Location</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Purchases</th>
                            <th className="px-4 py-3 text-right">Recharges</th>
                            <th className="px-4 py-3 text-right">Refunds</th>
                            <th className="px-4 py-3 text-right">Orders</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {analytics.branchPerformance.map((bp) => (
                            <tr key={bp.branchId} className="hover:bg-slate-900/40 transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-100 flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                                <span>{bp.branchName}</span>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={bp.status === 'ACTIVE' ? 'success' : 'danger'}>
                                  {bp.status === 'ACTIVE' ? 'Open' : 'Closed'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-emerald-400">
                                {formatCurrency(bp.purchaseVolume)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-violet-300">
                                {formatCurrency(bp.rechargeVolume)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-rose-400">
                                {formatCurrency(bp.refundVolume)}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-slate-200">
                                {bp.transactionCount.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── 7. Subscription Plans ─────────────────────────────────────── */}
          <Card>
            <CardHeader
              title="Subscription Plans"
            />
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => {
                  const count = orgs.filter(
                    (o) => o.plan?.id === plan.id || o.plan?.name === plan.name
                  ).length;

                  return (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 transition-all hover:border-violet-500/40"
                    >
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-slate-100">{plan.name}</span>
                        <p className="text-xs font-semibold text-emerald-400">
                          {formatCurrency(plan.price)} <span className="text-[10px] text-slate-500 font-normal">/ {plan.billingInterval.toLowerCase()}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="font-bold text-violet-300 border-violet-500/30">
                          {count} Cafeteria{count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── 8. Cafeterias Directory (With Search) ──────────────────────── */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  Cafeterias
                </h2>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Cafeterias */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchOrgTerm}
                    onChange={(e) => setSearchOrgTerm(e.target.value)}
                    placeholder="Search cafeteria..."
                    className="rounded-xl border border-slate-800 bg-slate-900 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                  />
                  {searchOrgTerm && (
                    <button
                      onClick={() => setSearchOrgTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/organizations')}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Manage All
                </Button>
              </div>
            </div>

            <Card padding="none">
              <DataTable<OrganizationOverview>
                data={filteredOrgs.slice(0, 6)}
                columns={orgColumns}
                keyExtractor={(item: OrganizationOverview) => item.id}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

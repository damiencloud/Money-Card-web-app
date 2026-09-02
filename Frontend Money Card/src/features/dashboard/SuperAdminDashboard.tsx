// ─── Super Admin Platform Dashboard (M11) ────────────────────
// Platform-wide metrics, tenant selection, subscription oversight,
// and unified date-range calendar filtered operational metrics.

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
  ShieldCheck,
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
        setError(orgsRes.error.message || 'Failed to load platform data');
        return;
      }

      setOrgs(orgsRes.data.items);
      if (plansRes.success) setPlans(plansRes.data);
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      if (reqsRes.success) setPlanRequests(reqsRes.data || []);
    } catch {
      setError('Unable to connect to server. Please try again.');
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
          setError(orgsRes.error.message || 'Failed to load platform data');
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
    if (!selectedOrgId) return 'All Organizations';
    const found = orgs.find((o) => o.id === selectedOrgId);
    return found ? found.name : 'Selected Organization';
  }, [selectedOrgId, orgs]);

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

  const orgColumns = [
    {
      key: 'name',
      header: 'Organization Name',
      render: (org: OrganizationOverview) => (
        <div className="flex items-center gap-3">
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
      key: 'status',
      header: 'Status',
      render: (org: OrganizationOverview) => (
        <Badge variant={org.status === 'ACTIVE' ? 'success' : 'danger'}>
          {org.status}
        </Badge>
      ),
    },
    {
      key: 'plan',
      header: 'Active Plan',
      render: (org: OrganizationOverview) => (
        <Badge variant="outline" className="text-violet-300 border-violet-500/30">
          {org.plan?.name || 'Standard Plan'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined Date',
      render: (org: OrganizationOverview) => (
        <span className="text-xs text-slate-400">{formatDate(org.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">Super Admin Platform Overview</h1>
            <Badge variant="outline" className="text-violet-300 border-violet-500/30">
              Super Admin
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Multi-tenant organization oversight, plan catalog control, and platform activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Organization Selector */}
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
          >
            <option value="">All Organizations</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPlatformData(false)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh Overview
          </Button>
        </div>
      </div>

      {/* Pending Renewal / Plan Change Alert Banner for Super Admin */}
      {planRequests.filter((r) => r.status === 'PENDING').length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-100 text-sm">
                  {planRequests.filter((r) => r.status === 'PENDING').length} Pending Subscription & Plan Alert
                  {planRequests.filter((r) => r.status === 'PENDING').length > 1 ? 's' : ''}
                </span>
                {planRequests.some((r) => r.status === 'PENDING' && r.requestType === 'RENEWAL') && (
                  <Badge variant="success" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                    Subscription Renewal Pending
                  </Badge>
                )}
                <Badge variant="warning" className="text-[10px]">ACTION REQUIRED</Badge>
              </div>
              <p className="text-slate-300 mt-1">
                {planRequests.some((r) => r.status === 'PENDING' && r.requestType === 'RENEWAL')
                  ? `${
                      planRequests.find((r) => r.status === 'PENDING' && r.requestType === 'RENEWAL')
                        ?.organizationName || 'An organization'
                    } has requested active subscription renewal. Review and accept in Subscriptions.`
                  : 'Organizations have requested plan changes requiring Super Admin review and approval.'}
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/subscriptions')}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Review & Accept Requests
          </Button>
        </div>
      )}

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          onClick={() => navigate('/organizations')}
          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-violet-500/50 hover:bg-slate-900 text-left"
        >
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-200">Organizations</span>
            <p className="text-[11px] text-slate-500">Manage all tenants</p>
          </div>
          <Building2 className="h-5 w-5 text-violet-400 shrink-0" />
        </button>

        <button
          onClick={() => navigate('/plans')}
          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-violet-500/50 hover:bg-slate-900 text-left"
        >
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-200">Plan Catalog</span>
            <p className="text-[11px] text-slate-500">Prices & technical limits</p>
          </div>
          <Layers className="h-5 w-5 text-indigo-400 shrink-0" />
        </button>

        <button
          onClick={() => navigate('/subscriptions')}
          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-violet-500/50 hover:bg-slate-900 text-left"
        >
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-200">Subscriptions</span>
            <p className="text-[11px] text-slate-500">Audit invoices</p>
          </div>
          <Receipt className="h-5 w-5 text-emerald-400 shrink-0" />
        </button>

        <button
          onClick={() => navigate('/analytics')}
          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-violet-500/50 hover:bg-slate-900 text-left"
        >
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-200">Platform Analytics</span>
            <p className="text-[11px] text-slate-500">System trends & reports</p>
          </div>
          <BarChart3 className="h-5 w-5 text-sky-400 shrink-0" />
        </button>
      </div>

      {isLoading ? (
        <LoadingState message="Loading platform overview metrics..." />
      ) : error ? (
        <ErrorState title="Failed to load platform dashboard" message={error} onRetry={() => fetchPlatformData(false)} />
      ) : (
        <div className="space-y-6">
          {/* Summary Stat Cards (Platform / Organization Scope) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={selectedOrgId ? "Selected Organization" : "Total Organizations"}
              value={selectedOrgId ? selectedOrgName : orgs.length}
              icon={<Building2 className="h-5 w-5 text-violet-400" />}
            />

            <StatCard
              label={selectedOrgId ? "Tenant Status" : "Active Tenants"}
              value={
                selectedOrgId
                  ? (orgs.find((o) => o.id === selectedOrgId)?.status || 'ACTIVE')
                  : activeOrgsCount
              }
              icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
            />

            <StatCard
              label={selectedOrgId ? `${selectedOrgName} Sales` : "Platform Sales Volume"}
              value={formatCurrency(analytics?.totalPurchaseVolume || 0)}
              icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
            />

            <StatCard
              label={selectedOrgId ? `${selectedOrgName} Txns` : "Total System Txns"}
              value={(analytics?.totalTransactions || 0).toLocaleString()}
              icon={<BarChart3 className="h-5 w-5 text-indigo-400" />}
            />
          </div>

          {/* ── UNIFIED FILTERED METRICS BOX (Date Filter Toolbar + 4 Operational Stat Cards) ── */}
          <Card className="border-slate-800/80 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader
              title={`Operational & Financial Metrics: ${selectedOrgName}`}
              description={`Key metrics for ${selectedOrgName.toLowerCase()} filtered for ${activeDateLabel.toLowerCase()}.`}
              action={
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-300 border border-slate-800">
                    <Clock className="h-3.5 w-3.5 text-violet-400" />
                    <span>Period: <strong className="text-slate-100">{activeDateLabel}</strong></span>
                  </span>

                  {(startDate || endDate || selectedOrgId) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClearDateFilter();
                        setSelectedOrgId('');
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-1 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Reset filters"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reset All</span>
                    </button>
                  )}
                </div>
              }
            />

            <CardContent className="space-y-5">
              {/* Date Filter & Organization Selector Toolbar inside the box */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-3">
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
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
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
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
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
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
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
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
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
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
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
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
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
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                      }`}
                    >
                      Custom Range
                    </button>
                  </div>

                  {/* Scope Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Org:</span>
                    <select
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
                    >
                      <option value="">All Organizations</option>
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Expanded Custom Date Picker Inputs */}
                {(showCustomPicker || datePreset === 'custom') && (
                  <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-2">
                      <label htmlFor="superadmin-start-date" className="font-medium text-slate-400">
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
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none [color-scheme:dark]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor="superadmin-end-date" className="font-medium text-slate-400">
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
                        className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none [color-scheme:dark]"
                      />
                    </div>

                    <span className="text-[11px] text-slate-500">
                      Metrics update automatically when dates are selected.
                    </span>
                  </div>
                )}
              </div>

              {/* Operational & Financial Stat Cards inside the box */}
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
                  label="Total Refunds"
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
                  label="Total Transactions"
                  value={(analytics?.totalTransactions || 0).toLocaleString()}
                  icon={<BarChart3 className="h-5 w-5 text-indigo-400" />}
                />

                <StatCard
                  label="Active Card Sessions"
                  value={analytics?.activeSessionsCount || 0}
                  icon={<Clock className="h-5 w-5 text-amber-400" />}
                />

                <StatCard
                  label="Cards Issued / Available"
                  value={analytics?.activeCardsCount || 0}
                  icon={<CreditCard className="h-5 w-5 text-sky-400" />}
                />

                <StatCard
                  label="Low Stock Alert Items"
                  value={analytics?.lowStockItemsCount || 0}
                  icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
                />
              </div>

              {/* Branch Breakdown Table for Selected Organization / Scope */}
              {analytics?.branchPerformance && analytics.branchPerformance.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-violet-400" />
                      <h3 className="text-sm font-bold text-slate-200">
                        {selectedOrgId ? `${selectedOrgName} Branch Breakdown` : 'Platform Branch Performance Breakdown'}
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {analytics.branchPerformance.length} {analytics.branchPerformance.length === 1 ? 'branch' : 'branches'}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Branch Name</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Sales Volume</th>
                          <th className="px-4 py-3 text-right">Recharges</th>
                          <th className="px-4 py-3 text-right">Refunds</th>
                          <th className="px-4 py-3 text-right">Transactions</th>
                          <th className="px-4 py-3 text-right">Active Sessions</th>
                          <th className="px-4 py-3 text-right">Low Stock</th>
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
                                {bp.status}
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
                            <td className="px-4 py-3 text-right font-medium text-sky-300">
                              {bp.activeSessionsCount}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {bp.lowStockItemCount > 0 ? (
                                <Badge variant="warning">{bp.lowStockItemCount}</Badge>
                              ) : (
                                <span className="text-slate-500">0</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Platform Subscription Distribution */}
          <Card>
            <CardHeader
              title="Platform Subscription Distribution"
              description="Distribution of active organization tenants across plan tiers."
            />
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => {
                  const count = orgs.filter(
                    (o) => o.plan?.id === plan.id || o.plan?.name === plan.name,
                  ).length;

                  return (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-200">{plan.name}</span>
                        <p className="text-[11px] text-slate-400">
                          {formatCurrency(plan.price)} / {plan.billingInterval.toLowerCase()}
                        </p>
                      </div>
                      <Badge variant="outline" className="font-mono text-violet-300">
                        {count} Orgs
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Registered Organizations Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  {selectedOrgId ? `Organization Record: ${selectedOrgName}` : 'Registered Platform Organizations'}
                </h2>
                <p className="text-xs text-slate-400">
                  {selectedOrgId
                    ? `Active tenant overview and subscription details for ${selectedOrgName}.`
                    : 'Manage tenant accounts and active subscriptions.'}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/organizations')}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                View All Organizations
              </Button>
            </div>

            <Card padding="none">
              <DataTable<OrganizationOverview>
                data={selectedOrgId ? orgs.filter((o) => o.id === selectedOrgId) : orgs.slice(0, 5)}
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

// ─── Super Admin Platform Dashboard (M11) ─────────────────────────
// Platform-wide metrics, subscription oversight, and quick actions for SUPER_ADMIN.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import type {
  OrganizationOverview,
  Plan,
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
} from 'lucide-react';

export function SuperAdminDashboard() {
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState<OrganizationOverview[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlatformData = useCallback(async () => {
    setError(null);
    try {
      const [orgsRes, plansRes, analyticsRes] = await Promise.all([
        apiService.organizations.getOrganizations(),
        apiService.plans.getPlans(),
        apiService.analytics.getAnalyticsOverview(),
      ]);

      if (!orgsRes.success) {
        setError(orgsRes.error.message || 'Failed to load platform data');
        return;
      }

      setOrgs(orgsRes.data.items);
      if (plansRes.success) setPlans(plansRes.data);
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
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
        const [orgsRes, plansRes, analyticsRes] = await Promise.all([
          apiService.organizations.getOrganizations(),
          apiService.plans.getPlans(),
          apiService.analytics.getAnalyticsOverview(),
        ]);
        if (isCancelled) return;

        if (!orgsRes.success) {
          setError(orgsRes.error.message || 'Failed to load platform data');
          return;
        }

        setOrgs(orgsRes.data.items);
        if (plansRes.success) setPlans(plansRes.data);
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
  }, []);

  const activeOrgsCount = orgs.filter((o) => o.status === 'ACTIVE').length;

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
      key: 'plan',
      header: 'Current Plan',
      render: (org: OrganizationOverview) => (
        <Badge variant="outline" className="text-violet-300 border-violet-500/30">
          {org.plan?.name || 'Standard'}
        </Badge>
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
      key: 'createdAt',
      header: 'Joined Date',
      render: (org: OrganizationOverview) => (
        <span className="text-xs text-slate-400">{formatDate(org.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
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

        <Button variant="outline" size="sm" onClick={fetchPlatformData} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Refresh Overview
        </Button>
      </div>

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
        <ErrorState title="Failed to load platform dashboard" message={error} onRetry={fetchPlatformData} />
      ) : (
        <div className="space-y-8">
          {/* Summary Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Organizations"
              value={orgs.length}
              icon={<Building2 className="h-5 w-5 text-violet-400" />}
            />

            <StatCard
              label="Active Tenants"
              value={activeOrgsCount}
              icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
            />

            <StatCard
              label="Platform Sales Volume"
              value={formatCurrency(analytics?.totalPurchaseVolume || 0)}
              icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
            />

            <StatCard
              label="Total System Txns"
              value={(analytics?.totalTransactions || 0).toLocaleString()}
              icon={<BarChart3 className="h-5 w-5 text-indigo-400" />}
            />
          </div>

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
                <h2 className="text-lg font-bold text-slate-100">Registered Platform Organizations</h2>
                <p className="text-xs text-slate-400">Manage tenant accounts and active subscriptions.</p>
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
                data={orgs.slice(0, 5)}
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

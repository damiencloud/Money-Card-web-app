import { buildPeakDemandJsPdf } from "./peakPdfExport";
// ─── Peak & Demand Analysis Page (M-Peak) ──────────────────────
// Dedicated Peak Hours, Food Demand, and Operational Traffic Analysis for ORG_ADMIN.
// Uses apiService abstraction strictly — does NOT import mock handlers directly.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { useBranch } from '@/hooks';
import type {
  PeakAnalyticsOverview,
  ProductDemandMetric,
  Branch,
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
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { notify, formatCurrency } from '@/utils';
import {
  Flame,
  Clock,
  TrendingUp,
  Download,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  Building2,
} from 'lucide-react';

export function PeakPage() {
  const { currentBranch } = useBranch();

  const [data, setData] = useState<PeakAnalyticsOverview | null>(null);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>(currentBranch?.id || 'ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<'today' | '7d' | '30d'>('7d');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // ── Fetch Peak Analytics ───────────────────────────────────
  const fetchPeakData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [peakRes, branchRes] = await Promise.all([
        apiService.analytics.getPeakAnalytics({
          branchId: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
        }),
        apiService.branches.getBranches(),
      ]);

      if (!peakRes.success) {
        setError(peakRes.error.message || 'Failed to load peak analytics data');
        return;
      }

      setData(peakRes.data);
      if (branchRes.success) {
        setAllBranches(branchRes.data.items);
      }
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [peakRes, branchRes] = await Promise.all([
          apiService.analytics.getPeakAnalytics({
            branchId: selectedBranchId !== 'ALL' ? selectedBranchId : undefined,
          }),
          apiService.branches.getBranches(),
        ]);
        if (isCancelled) return;

        if (!peakRes.success) {
          setError(peakRes.error.message || 'Failed to load peak analytics data');
          return;
        }

        setData(peakRes.data);
        if (branchRes.success) {
          setAllBranches(branchRes.data.items);
        }
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
  }, [selectedBranchId]);

  // ── CSV Export Handler ────────────────────────────────────
  // ── PDF Download Handler ──────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!data) {
      notify.error('No peak demand data available to export.');
      return;
    }

    setIsExporting(true);
    try {
      const selectedBranchObj = allBranches.find((b) => b.id === selectedBranchId);
      const selectedBranchName = selectedBranchId === 'ALL'
        ? 'All Branches'
        : (selectedBranchObj?.name || 'Selected Branch');

      const dateRangeLabel = selectedDateRange === 'today'
        ? 'Today'
        : selectedDateRange === '7d'
          ? 'Last 7 Days'
          : 'Last 30 Days';

      const doc = buildPeakDemandJsPdf({
        data,
        selectedBranchName,
        dateRangeLabel,
        organizationName: 'Money Card Cafeteria',
      });

      const filename = `Peak_Demand_Report_${selectedBranchName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);

      notify.success('Peak & Demand PDF downloaded successfully.');
    } catch (err: any) {
      notify.error(err?.message || 'Failed to generate Peak & Demand PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Filtered Products Demand ──────────────────────────────
  const productDemand = data?.productDemand;
  const hourlyDistribution = data?.hourlyDistribution;

  const categories = useMemo(() => {
    if (!productDemand) return [];
    const set = new Set(productDemand.map((p) => p.category));
    return Array.from(set);
  }, [productDemand]);

  const filteredProducts = useMemo(() => {
    if (!productDemand) return [];
    if (selectedCategory === 'ALL') return productDemand;
    return productDemand.filter((p) => p.category === selectedCategory);
  }, [productDemand, selectedCategory]);

  // Peak Hours Filter
  const peakHourBuckets = useMemo(() => {
    if (!hourlyDistribution) return [];
    return hourlyDistribution.filter((h) => h.isPeak);
  }, [hourlyDistribution]);

  // Columns for Product Demand Table
  const productColumns = [
    {
      key: 'productName',
      header: 'Product / Food Item',
      render: (p: ProductDemandMetric) => (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-100">{p.productName}</p>
            <span className="text-[11px] text-slate-400">{p.category}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'quantitySold',
      header: 'Total Units Sold',
      render: (p: ProductDemandMetric) => (
        <span className="font-mono text-sm font-bold text-slate-100">
          {p.quantitySold.toLocaleString()} units
        </span>
      ),
    },

    {
      key: 'revenue',
      header: 'Gross Revenue',
      render: (p: ProductDemandMetric) => (
        <span className="font-mono text-sm font-bold text-violet-300">
          {formatCurrency(p.revenue)}
        </span>
      ),
    },
    {
      key: 'stockStatus',
      header: 'Peak Stock Status',
      render: (p: ProductDemandMetric) => (
        <Badge
          variant={
            p.stockStatus === 'NORMAL'
              ? 'success'
              : p.stockStatus === 'LOW'
                ? 'warning'
                : 'danger'
          }
        >
          {p.stockStatus.replace(/_/g, ' ')}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header Bar ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">Peak & Demand Analytics</h1>
            <Badge variant="warning" className="gap-1 bg-amber-500/10 text-amber-300 border-amber-500/30">
              <Flame className="h-3 w-3" />
              Live Demand
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPeakData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadPdf}
            isLoading={isExporting}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="grid gap-4 sm:grid-cols-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        {/* Branch Filter */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">Branch Location</label>
          <Select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Branches' },
              ...allBranches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
        </div>

        {/* Date Range Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">Analysis Window</label>
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
            <button
              onClick={() => setSelectedDateRange('today')}
              className={`rounded py-1.5 text-xs font-medium transition-colors ${
                selectedDateRange === 'today'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDateRange('7d')}
              className={`rounded py-1.5 text-xs font-medium transition-colors ${
                selectedDateRange === '7d'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setSelectedDateRange('30d')}
              className={`rounded py-1.5 text-xs font-medium transition-colors ${
                selectedDateRange === '30d'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Product Category Filter */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1.5">Food Category</label>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Food Categories' },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Calculating hour-by-hour peak and item demand distributions..." />
      ) : error ? (
        <ErrorState title="Failed to load peak analytics" message={error} onRetry={fetchPeakData} />
      ) : data ? (
        <div className="space-y-8">
          {/* ── KPI Cards ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Busiest Peak Hour"
              value={data.comparison.busiestHour}
              icon={<Clock className="h-5 w-5 text-amber-400" />}
            />
            <StatCard
              label="Peak Hours Volume"
              value={formatCurrency(data.comparison.peakVolume)}
              icon={<Flame className="h-5 w-5 text-rose-400" />}
            />
            <StatCard
              label="Peak Transactions"
              value={data.comparison.peakTransactions.toLocaleString()}
              icon={<TrendingUp className="h-5 w-5 text-violet-400" />}
            />
            <StatCard
              label="Busiest Branch"
              value={data.comparison.busiestBranchName}
              icon={<Building2 className="h-5 w-5 text-sky-400" />}
            />
          </div>



          {/* ── Section 1: 24-Hour Activity Heatmap / Bar Distribution ── */}
          <Card>
            <CardHeader
              title="24-Hour Traffic & Demand Distribution"
              description="Live transaction volume and throughput per hour from 00:00 to 23:00."
            />
            <CardContent className="space-y-6">
              {/* Hour Bars */}
              <div className="grid grid-cols-12 sm:grid-cols-24 gap-1.5 items-end h-44 pt-6 px-1">
                {data.hourlyDistribution.map((hour) => {
                  const maxVol = Math.max(...data.hourlyDistribution.map((h) => h.totalVolume), 1);
                  const hasActivity = hour.totalVolume > 0 || hour.transactionCount > 0;
                  const heightPct = hasActivity
                    ? Math.max(8, Math.round((hour.totalVolume / maxVol) * 100))
                    : 3;

                  return (
                    <div
                      key={hour.hour}
                      className="group relative flex flex-col items-center h-full justify-end cursor-pointer"
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700 p-2.5 shadow-2xl z-30 text-[11px] w-36 pointer-events-none">
                        <span className="font-bold text-slate-100">{hour.hourLabel} - {String((hour.hour + 1) % 24).padStart(2, '0')}:00</span>
                        <span className="text-emerald-400 font-mono font-bold mt-0.5">{formatCurrency(hour.totalVolume)}</span>
                        <span className="text-slate-400 text-[10px]">{hour.transactionCount} transactions</span>
                      </div>

                      {/* Visual Bar */}
                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          hasActivity
                            ? 'bg-gradient-to-t from-violet-600 to-indigo-400 hover:from-violet-500 hover:to-indigo-300 shadow-sm shadow-indigo-500/20'
                            : 'bg-slate-800/40 hover:bg-slate-700/50'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />

                      {/* Hour Label */}
                      <span className="mt-2 text-[9px] font-mono text-slate-400 rotate-45 sm:rotate-0">
                        {hour.hour % 3 === 0 ? hour.hourLabel.replace(':00', 'h') : ''}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend & Summary */}
              <div className="flex flex-wrap items-center justify-between border-t border-slate-800 pt-4 text-xs">
                <div className="flex items-center gap-4 text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-gradient-to-t from-violet-600 to-indigo-400 inline-block" />
                    Hourly Transaction Volume
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-slate-800/40 inline-block" />
                    Zero Activity Window
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                  <span>Busiest Hour: <strong className="text-violet-300">{data.comparison.busiestHour}</strong></span>
                  <span>•</span>
                  <span>Busiest Day: <strong className="text-slate-200">{data.busiestDay || 'Friday'}</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Section 2: Food / Product Demand Analysis ── */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Top Food & Item Demand</h2>
              </div>

              {selectedCategory !== 'ALL' && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedCategory('ALL')}>
                  Reset Category Filter
                </Button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-8 w-8 text-slate-500" />}
                title="No product demand records"
                description="No food or item transactions recorded for the selected filter."
              />
            ) : (
              <Card padding="none">
                <DataTable<ProductDemandMetric>
                  data={filteredProducts}
                  columns={productColumns}
                  keyExtractor={(item: ProductDemandMetric) => item.productId}
                />
              </Card>
            )}
          </div>

          {/* ── Section 3: Operational Peak Insights & Stock Alerts ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Peak Hours Breakdown Card */}
            <Card>
              <CardHeader
                title="Peak Hour Traffic Breakdown"
              />
              <CardContent className="space-y-3">
                {peakHourBuckets.slice(0, 4).map((h) => (
                  <div
                    key={h.hour}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 font-mono font-bold">
                        {h.hourLabel.replace(':00', 'h')}
                      </div>
                      <div>
                        <p className="font-bold text-slate-100">{h.hourLabel} Window</p>
                        <span className="text-slate-400 font-mono">
                          {h.rechargeCount} Recharges • {h.purchaseCount} Purchases
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-violet-300">
                        {formatCurrency(h.totalVolume)}
                      </span>
                      <p className="text-[10px] text-slate-400">{h.transactionCount} txns</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Inventory Demand & Running Low Warnings */}
            <Card>
              <CardHeader
                title="Peak Stock Alerts & Low Inventory"
              />
              <CardContent className="space-y-3">
                {filteredProducts
                  .filter((p) => p.stockStatus === 'LOW' || p.stockStatus === 'OUT_OF_STOCK')
                  .slice(0, 3)
                  .map((p) => (
                    <div
                      key={p.productId}
                      className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300"
                    >
                      <div className="flex flex-wrap items-center gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-100">{p.productName}</p>
                          <span className="text-[11px] text-rose-400">
                            High rush demand ({p.peakHourQuantity} sold in peak window)
                          </span>
                        </div>
                      </div>
                      <Badge variant="danger" className="text-[10px]">
                        {p.stockStatus}
                      </Badge>
                    </div>
                  ))}

                {filteredProducts.filter((p) => p.stockStatus !== 'NORMAL').length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    <p className="text-emerald-400 font-semibold mb-1">All Peak Stock Levels Normal</p>
                    All high-demand food items have sufficient inventory buffers.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}

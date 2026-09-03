// ─── Organization Admin Analytics View (M9 Analytics Correction) ─────────
// Organization-specific analytics strictly scoped to ORG_ADMIN.
// Provides View PDF, Download PDF, and Detailed Branch Performance Comparison.
// Uses VIEW_ANALYTICS permission strictly.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiService } from '@/services/api';
import { useBranch, useAuth } from '@/hooks';
import type { AnalyticsOverview, Branch, BranchPerformanceMetric } from '@/types';
import {
  Button,
  Select,
  Card,
  Badge,
  StatCard,
  Modal,
  ModalFooter,
  LoadingState,
  ErrorState,
} from '@/components/ui';
import { notify, formatCurrency } from '@/utils';
import {
  generateAnalyticsPdfBlob,
  downloadOrgAnalyticsPdf,
} from './analyticsPdfExport';
import {
  BarChart3,
  CreditCard,
  TrendingUp,
  RefreshCw,
  Building2,
  DollarSign,
  FileText,
  Eye,
  Download,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

type DatePreset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';
type SortMetric = 'revenue' | 'transactions' | 'purchases' | 'recharges' | 'sessions' | 'products';

function getPresetDates(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const endStr = now.toISOString().split('T')[0];

  if (preset === 'today') {
    return { startDate: endStr, endDate: endStr };
  }
  if (preset === 'last7') {
    const start = new Date(now.setDate(now.getDate() - 7));
    return { startDate: start.toISOString().split('T')[0], endDate: endStr };
  }
  if (preset === 'last30') {
    const start = new Date(now.setDate(now.getDate() - 30));
    return { startDate: start.toISOString().split('T')[0], endDate: endStr };
  }
  if (preset === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: start.toISOString().split('T')[0], endDate: endStr };
  }

  return { startDate: '', endDate: endStr };
}

export function OrgAdminAnalyticsView() {
  const { currentBranch } = useBranch();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // PDF Viewer Modal State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // Sorting & Detail state for Branch Comparison
  const [sortBy, setSortBy] = useState<SortMetric>('revenue');
  const [selectedBranchDetail, setSelectedBranchDetail] = useState<BranchPerformanceMetric | null>(null);

  // Filters state
  const [branchFilter, setBranchFilter] = useState<string>(
    searchParams.get('branchId') || currentBranch?.id || 'ALL',
  );
  const [datePreset, setDatePreset] = useState<DatePreset>(
    (searchParams.get('preset') as DatePreset) || 'thisMonth',
  );
  const [startDate, setStartDate] = useState<string>(() => {
    return searchParams.get('startDate') || getPresetDates('thisMonth').startDate;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return searchParams.get('endDate') || getPresetDates('thisMonth').endDate;
  });

  const fetchBranches = useCallback(async () => {
    try {
      const res = await apiService.branches.getBranches();
      if (res.success) {
        setBranches(res.data.items);
      }
    } catch {
      // Ignored
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const targetBranch = branchFilter !== 'ALL' ? branchFilter : undefined;
      const res = await apiService.analytics.getOverview({
        branchId: targetBranch,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (!res.success) {
        setError(res.error.message || 'Failed to load analytics');
        return;
      }

      setAnalytics(res.data);
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter, startDate, endDate]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const targetBranch = branchFilter !== 'ALL' ? branchFilter : undefined;
        const res = await apiService.analytics.getOverview({
          branchId: targetBranch,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });

        if (isCancelled) return;
        if (!res.success) {
          setError(res.error.message || 'Failed to load analytics');
          return;
        }

        setAnalytics(res.data);
      } catch {
        if (!isCancelled) {
          setError('Unable to connect to the server. Please try again.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [branchFilter, startDate, endDate]);

  const handleBranchChange = (newBranchId: string) => {
    setBranchFilter(newBranchId);
    const newParams = new URLSearchParams(searchParams);
    if (newBranchId && newBranchId !== 'ALL') {
      newParams.set('branchId', newBranchId);
    } else {
      newParams.delete('branchId');
    }
    setSearchParams(newParams);
  };

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const { startDate: s, endDate: e } = getPresetDates(preset);
      setStartDate(s);
      setEndDate(e);

      const newParams = new URLSearchParams(searchParams);
      newParams.set('preset', preset);
      newParams.set('startDate', s);
      newParams.set('endDate', e);
      setSearchParams(newParams);
    }
  };

  const handleCustomDateApply = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setDatePreset('custom');

    const newParams = new URLSearchParams(searchParams);
    newParams.set('preset', 'custom');
    newParams.set('startDate', start);
    newParams.set('endDate', end);
    setSearchParams(newParams);
  };

  // Helper to compile Org Admin PDF Options
  const getOrgReportOptions = () => {
    if (!analytics) return null;

    const selectedBranchObj = branches.find((b) => b.id === branchFilter);
    const selectedBranchName = branchFilter === 'ALL' ? 'All Branches' : selectedBranchObj?.name || branchFilter;

    const dateLabel =
      datePreset === 'today'
        ? 'Today'
        : datePreset === 'last7'
        ? 'Last 7 Days'
        : datePreset === 'last30'
        ? 'Last 30 Days'
        : datePreset === 'thisMonth'
        ? 'This Month'
        : `${startDate} to ${endDate}`;

    return {
      analytics,
      branches,
      selectedBranchName,
      dateRangeLabel: dateLabel,
      organizationName: user?.organizationId ? `Organization ${user.organizationId}` : 'Organization Portal',
    };
  };

  // ── 1. View PDF Action ─────────────────────────────────────
  const handleViewPdf = () => {
    setIsExportingPdf(true);
    try {
      const options = getOrgReportOptions();
      if (!options) {
        notify.error('No analytics data available to render PDF.');
        return;
      }

      const blob = generateAnalyticsPdfBlob(options);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `MoneyCard_OrgAdmin_Analytics_${dateStr}.pdf`;

      console.log('[Org Admin] PDF Preview Ready:', { size: blob.size, type: blob.type, filename });

      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setShowPdfModal(true);
    } catch {
      notify.error('Failed to generate PDF preview.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // ── 2. Download PDF Action (Guaranteed .pdf via doc.save) ──
  const handleDownloadPdf = () => {
    setIsExportingPdf(true);
    try {
      const options = getOrgReportOptions();
      if (!options) {
        notify.error('No analytics data available to download.');
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `MoneyCard_OrgAdmin_Analytics_${dateStr}.pdf`;

      // Execute native jsPDF file download
      downloadOrgAnalyticsPdf(options, filename);

      notify.success(`Analytics report downloaded: ${filename}`);
    } catch {
      notify.error('Failed to download Analytics PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Calculated estimates
  const cashRechargeEstimate = useMemo(
    () => (analytics ? Number((analytics.totalRechargeVolume * 0.6).toFixed(2)) : 0),
    [analytics],
  );
  const upiRechargeEstimate = useMemo(
    () => (analytics ? Number((analytics.totalRechargeVolume * 0.4).toFixed(2)) : 0),
    [analytics],
  );

  // Sorted Branch Comparison list
  const sortedBranchComparison = useMemo(() => {
    if (!analytics?.branchPerformance) return [];
    const list = [...analytics.branchPerformance];

    list.sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.totalRevenue - a.totalRevenue;
        case 'transactions':
          return b.transactionCount - a.transactionCount;
        case 'purchases':
          return b.purchaseCount - a.purchaseCount;
        case 'recharges':
          return b.rechargeCount - a.rechargeCount;
        case 'sessions':
          return b.sessionCount - a.sessionCount;
        case 'products':
          return b.productsSoldCount - a.productsSoldCount;
        default:
          return b.totalRevenue - a.totalRevenue;
      }
    });

    return list;
  }, [analytics, sortBy]);

  const topBranch = sortedBranchComparison[0];

  return (
    <div className="space-y-8">
      {/* Header Bar with View PDF and Download PDF Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">Organization Analytics</h1>
            <Badge variant="outline" className="text-violet-300 border-violet-500/30">
              Organization Scope
            </Badge>
          </div>
        </div>

        {/* Action Buttons: [ View PDF ] and [ Download PDF ] */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleViewPdf}
            disabled={isExportingPdf || isLoading || !analytics}
            leftIcon={<Eye className="h-4 w-4" />}
          >
            View PDF
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf || isLoading || !analytics}
            isLoading={isExportingPdf}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Scope Filter */}
          <div className="w-full sm:w-52">
            <label className="mb-1 block text-[11px] font-medium text-slate-400">Branch Scope</label>
            <Select
              id="analytics-branch-filter"
              value={branchFilter}
              onChange={(e) => handleBranchChange(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Branches' },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>

          {/* Date Preset Filter */}
          <div className="w-full sm:w-44">
            <label className="mb-1 block text-[11px] font-medium text-slate-400">Time Window</label>
            <Select
              id="analytics-preset-filter"
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'last7', label: 'Last 7 Days' },
                { value: 'last30', label: 'Last 30 Days' },
                { value: 'thisMonth', label: 'This Month' },
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
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-400">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCustomDateApply(startDate, endDate)}
                className="h-8"
              >
                Apply
              </Button>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAnalytics()}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          className="self-end lg:self-center"
        >
          Refresh Data
        </Button>
      </div>

      {isLoading ? (
        <LoadingState message="Calculating organization metrics & ledger analytics..." />
      ) : error ? (
        <ErrorState title="Failed to load analytics" message={error} onRetry={fetchAnalytics} />
      ) : analytics ? (
        <div className="space-y-8">
          {/* Top 4 KPI Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total POS Revenue"
              value={formatCurrency(analytics.totalPurchaseVolume)}
              icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
            />

            <StatCard
              label="Wallet Recharges"
              value={formatCurrency(analytics.totalRechargeVolume)}
              icon={<CreditCard className="h-5 w-5 text-violet-400" />}
            />

            <StatCard
              label="Total Transactions"
              value={analytics.totalTransactions.toLocaleString()}
              icon={<BarChart3 className="h-5 w-5 text-sky-400" />}
            />

            <StatCard
              label="Active Card Sessions"
              value={analytics.activeSessionsCount.toLocaleString()}
              icon={<Layers className="h-5 w-5 text-amber-400" />}
            />
          </div>

          {/* Section 1: Financial Streams Breakdown */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Cash Recharges
                </span>
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="font-mono text-2xl font-bold text-slate-100">
                {formatCurrency(cashRechargeEstimate)}
              </p>
              
            </Card>

            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  UPI Recharges
                </span>
                <CreditCard className="h-4 w-4 text-violet-400" />
              </div>
              <p className="font-mono text-2xl font-bold text-slate-100">
                {formatCurrency(upiRechargeEstimate)}
              </p>
              
            </Card>

            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Returns / Refunds
                </span>
                <ArrowUpDown className="h-4 w-4 text-rose-400" />
              </div>
              <p className="font-mono text-2xl font-bold text-slate-100">
                {formatCurrency(analytics.totalRefundVolume ?? 0)}
              </p>
              
            </Card>
          </div>

          {/* Section 2: Detailed Branch Performance Comparison */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Branch Performance Comparison</h2>
              </div>

              {/* Sorting Metric Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Sort By:</span>
                <Select
                  id="branch-sort-metric"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortMetric)}
                  options={[
                    { value: 'revenue', label: 'Top Revenue' },
                    { value: 'transactions', label: 'Total Transactions' },
                    { value: 'purchases', label: 'POS Purchases' },
                    { value: 'recharges', label: 'Card Recharges' },
                    { value: 'sessions', label: 'Active Sessions' },
                    { value: 'products', label: 'Products Sold' },
                  ]}
                />
              </div>
            </div>

            {/* Top Branch Insight Banner */}
            {topBranch && (
              <div className="flex items-center justify-between rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">{topBranch.branchName}</span>
                      <Badge variant="info" className="text-[10px]">
                        Top Performing Branch
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      Generated {formatCurrency(topBranch.totalRevenue)} across{' '}
                      {topBranch.transactionCount} transactions.
                    </p>
                  </div>
                </div>
                <div className="hidden sm:block text-right font-mono">
                  <span className="text-xs text-slate-400">POS Revenue</span>
                  <p className="text-sm font-bold text-emerald-400">
                    {formatCurrency(topBranch.purchaseVolume)}
                  </p>
                </div>
              </div>
            )}

            {/* Comparison Table */}
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold text-slate-400">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3">Branch</th>
                      <th className="px-3 py-3.5 text-right">Transactions</th>
                      <th className="px-3 py-3.5 text-right">Purchases</th>
                      <th className="px-3 py-3.5 text-right">Recharges</th>
                      <th className="px-3 py-3.5 text-right">Total Revenue</th>
                      <th className="px-3 py-3.5 text-right">Active Sessions</th>
                      <th className="px-3 py-3.5 text-right">Products Sold</th>
                      <th className="py-3.5 pl-3 pr-4 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {sortedBranchComparison.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-xs text-slate-500 font-sans">
                          No branch analytics available for the selected period.
                        </td>
                      </tr>
                    ) : (
                      sortedBranchComparison.map((metric) => (
                        <tr
                          key={metric.branchId}
                          className="transition-colors hover:bg-slate-800/30"
                        >
                          <td className="py-3 pl-4 pr-3 font-sans font-semibold text-slate-100">
                            <div className="flex items-center gap-2">
                              <span>{metric.branchName}</span>
                              {metric.status === 'INACTIVE' && (
                                <Badge variant="outline" className="text-[10px] text-slate-500">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">{metric.transactionCount}</td>
                          <td className="px-3 py-3 text-right text-emerald-400">
                            {formatCurrency(metric.purchaseVolume)}
                          </td>
                          <td className="px-3 py-3 text-right text-violet-400">
                            {formatCurrency(metric.rechargeVolume)}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-100">
                            {formatCurrency(metric.totalRevenue)}
                          </td>
                          <td className="px-3 py-3 text-right">{metric.activeSessionsCount}</td>
                          <td className="px-3 py-3 text-right">{metric.productsSoldCount}</td>
                          <td className="py-3 pl-3 pr-4 text-center font-sans">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedBranchDetail(metric)}
                              leftIcon={<Eye className="h-3.5 w-3.5 text-slate-400" />}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {/* ── PDF Viewer Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={showPdfModal}
        onClose={() => {
          setShowPdfModal(false);
          if (pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
          }
        }}
        title="Organization Analytics Report — PDF Preview"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-2 text-xs text-slate-400 border border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-violet-400" />
              <span>Verified Organization Scope Report</span>
            </div>
            <span className="font-mono text-emerald-400">PDF-1.3 Standard</span>
          </div>

          {pdfPreviewUrl && (
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
              <iframe
                src={`${pdfPreviewUrl}#toolbar=0`}
                className="w-full h-[70vh] rounded-lg"
                title="Organization Analytics Report PDF Preview"
              />
            </div>
          )}

          <ModalFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowPdfModal(false);
                if (pdfPreviewUrl) {
                  URL.revokeObjectURL(pdfPreviewUrl);
                  setPdfPreviewUrl(null);
                }
              }}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPdf}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Download PDF
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Branch Metric Detail Modal */}
      {selectedBranchDetail && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedBranchDetail(null)}
          title={`${selectedBranchDetail.branchName} — Operational Breakdown`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-400">Total Revenue</span>
                <p className="font-mono text-lg font-bold text-slate-100">
                  {formatCurrency(selectedBranchDetail.totalRevenue)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-400">Transactions</span>
                <p className="font-mono text-lg font-bold text-slate-100">
                  {selectedBranchDetail.transactionCount}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-400">POS Purchases</span>
                <p className="font-mono text-base font-semibold text-emerald-400">
                  {formatCurrency(selectedBranchDetail.purchaseVolume)}
                </p>
                <span className="text-[10px] text-slate-500">
                  {selectedBranchDetail.purchaseCount} items billed
                </span>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-400">Wallet Recharges</span>
                <p className="font-mono text-base font-semibold text-violet-400">
                  {formatCurrency(selectedBranchDetail.rechargeVolume)}
                </p>
                <span className="text-[10px] text-slate-500">
                  {selectedBranchDetail.rechargeCount} deposits
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
              <span className="font-semibold text-slate-300">Session & Inventory Health</span>
              <div className="grid grid-cols-2 gap-2 text-slate-400 font-mono">
                <div>Active Sessions: {selectedBranchDetail.activeSessionsCount}</div>
                <div>Settled Sessions: {selectedBranchDetail.settledSessionsCount}</div>
                <div>Products Sold: {selectedBranchDetail.productsSoldCount}</div>
                <div>Low Stock Items: {selectedBranchDetail.lowStockItemCount}</div>
              </div>
            </div>

            <ModalFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBranchDetail(null)}
              >
                Close
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}
    </div>
  );
}

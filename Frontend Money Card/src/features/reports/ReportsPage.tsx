// ─── Reports Management Page (M9) ──────────────────────────
// Formal Reports View & PDF Download for ORG_ADMIN & SUPER_ADMIN.
// Download is strictly PDF ONLY. Uses VIEW_REPORTS permission strictly.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { usePermissions, useAuth } from '@/hooks';
import type { ReportItem, Branch, Transaction, ProductWithInventory, CardSession } from '@/types';
import {
  Button,
  Select,
  Card,
  Badge,
  Modal,
  ModalFooter,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { notify, formatDate, formatCurrency } from '@/utils';
import { UnauthorizedPage } from '@/features/auth';
import { generateReportPdfBlob } from './reportsPdfExport';
import {
  FileText,
  Search,
  RefreshCw,
  FileCheck,
  Eye,
  CreditCard,
  TrendingUp,
} from 'lucide-react';

export function ReportsPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canViewReports = hasPermission('VIEW_REPORTS');

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Preview Modal state
  const [previewReport, setPreviewReport] = useState<ReportItem | null>(null);
  const [previewData, setPreviewData] = useState<{
    transactions: Transaction[];
    inventory: ProductWithInventory[];
    sessions: CardSession[];
  }>({ transactions: [], inventory: [], sessions: [] });
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // ── Fetch Reports Catalog & Branches ───────────────────────
  const fetchReportsData = useCallback(async () => {
    setError(null);
    try {
      const [reportsRes, branchRes] = await Promise.all([
        apiService.reports.getReports(),
        apiService.branches.getBranches(),
      ]);

      if (!reportsRes.success) {
        setError(reportsRes.error.message || 'Failed to load reports catalog');
        return;
      }

      let filtered = reportsRes.data;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((r) => r.title.toLowerCase().includes(q));
      }

      setReports(filtered);
      if (branchRes.success) setBranches(branchRes.data.items);
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const [reportsRes, branchRes] = await Promise.all([
          apiService.reports.getReports(),
          apiService.branches.getBranches(),
        ]);
        if (isCancelled) return;

        if (!reportsRes.success) {
          setError(reportsRes.error.message || 'Failed to load reports catalog');
          return;
        }

        let filtered = reportsRes.data;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter((r) => r.title.toLowerCase().includes(q));
        }

        setReports(filtered);
        if (branchRes.success) setBranches(branchRes.data.items);
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
  }, [searchQuery]);

  if (!canViewReports) {
    return <UnauthorizedPage />;
  }

  // ── Download PDF Only Handler ──────────────────────────────
  const handleDownloadPdf = async (report: ReportItem) => {
    if (downloadingId) return; // Prevent concurrent/duplicate clicks
    setDownloadingId(report.id);

    try {
      const targetBranch = branchFilter !== 'ALL' ? branchFilter : undefined;
      const selectedBranchObj = branches.find((b) => b.id === branchFilter);
      const selectedBranchName = branchFilter === 'ALL' ? 'All Branches' : selectedBranchObj?.name || branchFilter;

      // Fetch relevant scoped datasets for official PDF generation
      const [prodRes, sessRes] = await Promise.all([
        apiService.products.getProducts({ branchId: targetBranch, limit: 100 }),
        apiService.sessions.getSessions({ branchId: targetBranch, limit: 100 }),
      ]);

      const inventory = prodRes.success ? prodRes.data.items : [];
      const sessions = sessRes.success ? sessRes.data.items : [];

      // Collect sample transactions for sessions
      const transactions: Transaction[] = [];
      if (sessRes.success && sessRes.data.items.length > 0) {
        for (const s of sessRes.data.items.slice(0, 8)) {
          const tRes = await apiService.sessions.getSessionTransactions(s.id);
          if (tRes.success) {
            transactions.push(...tRes.data);
          }
        }
      }

      const pdfBlob = generateReportPdfBlob({
        report,
        branches,
        selectedBranchName,
        transactions,
        inventory,
        sessions,
        organizationName: user?.organizationId ? `Organization ${user.organizationId}` : 'Organization Portal',
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      const cleanTitle = report.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filename = `${cleanTitle}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notify.success(`Official PDF Report "${report.title}" downloaded`);
    } catch {
      notify.error('Failed to generate PDF report. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Open Report Preview ─────────────────────────────────────
  const handleOpenPreview = async (report: ReportItem) => {
    setPreviewReport(report);
    setIsPreviewLoading(true);

    try {
      const targetBranch = branchFilter !== 'ALL' ? branchFilter : undefined;
      const [prodRes, sessRes] = await Promise.all([
        apiService.products.getProducts({ branchId: targetBranch, limit: 10 }),
        apiService.sessions.getSessions({ branchId: targetBranch, limit: 10 }),
      ]);

      const transactions: Transaction[] = [];
      if (sessRes.success && sessRes.data.items.length > 0) {
        for (const s of sessRes.data.items.slice(0, 4)) {
          const tRes = await apiService.sessions.getSessionTransactions(s.id);
          if (tRes.success) {
            transactions.push(...tRes.data);
          }
        }
      }

      setPreviewData({
        transactions,
        inventory: prodRes.success ? prodRes.data.items : [],
        sessions: sessRes.success ? sessRes.data.items : [],
      });
    } catch {
      notify.error('Failed to load report preview sample');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // ── Table Columns ───────────────────────────────────────────
  const columns = [
    {
      key: 'title',
      header: 'Official Report Title',
      render: (report: ReportItem) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-100">{report.title}</p>
            
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Report Category',
      render: (report: ReportItem) => (
        <Badge variant="outline" className="text-violet-300 border-violet-500/30">
          {report.type}
        </Badge>
      ),
    },
    {
      key: 'format',
      header: 'Format',
      render: () => (
        <Badge variant="outline" className="text-rose-300 border-rose-500/30">
          PDF ONLY
        </Badge>
      ),
    },
    {
      key: 'generatedAt',
      header: 'Generated Date',
      render: (report: ReportItem) => (
        <span className="text-xs text-slate-400">{formatDate(report.generatedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (report: ReportItem) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenPreview(report)}
            leftIcon={<Eye className="h-3.5 w-3.5" />}
          >
            Preview
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleDownloadPdf(report)}
            disabled={downloadingId === report.id}
            isLoading={downloadingId === report.id}
            leftIcon={<FileText className="h-3.5 w-3.5" />}
          >
            Download PDF
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">Official Reports Catalog</h1>
            <Badge variant="outline" className="text-violet-300 border-violet-500/30">
              12+ Formal Reports
            </Badge>
          </div>
        </div>

        <Button variant="outline" size="md" onClick={fetchReportsData} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Refresh Catalog
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search report titles..."
            value={searchQuery}
            maxLength={30}
            onChange={(e) => setSearchQuery(e.target.value.slice(0, 30))}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Branch Scope Filter */}
        <div className="w-full sm:w-52">
          <Select
            id="reports-branch-filter"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Branches' },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
        </div>
      </div>

      {/* Content Table */}
      {isLoading ? (
        <LoadingState message="Loading official reports catalog..." />
      ) : error ? (
        <ErrorState title="Failed to load reports" message={error} onRetry={fetchReportsData} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<FileCheck className="h-8 w-8 text-slate-500" />}
          title="No reports found"
          description={
            searchQuery
              ? `No reports matching "${searchQuery}"`
              : 'System reports will appear here when generated.'
          }
        />
      ) : (
        <Card padding="none">
          <DataTable<ReportItem>
            data={reports}
            columns={columns}
            keyExtractor={(item: ReportItem) => item.id}
          />
        </Card>
      )}

      {/* ── Report Preview Modal ── */}
      <Modal
        isOpen={Boolean(previewReport)}
        onClose={() => setPreviewReport(null)}
        title={`Report Preview: ${previewReport?.title || ''}`}
        size="lg"
      >
        {previewReport && (
          <div className="space-y-4 max-h-[66vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-slate-400">Category & Target Branch</span>
                <p className="text-sm font-semibold text-slate-200">
                  {previewReport.type} — {branchFilter === 'ALL' ? 'All Branches' : branches.find((b) => b.id === branchFilter)?.name || branchFilter}
                </p>
              </div>
              <Badge variant="outline" className="text-rose-300 border-rose-500/30">
                PDF Export Ready
              </Badge>
            </div>

            {isPreviewLoading ? (
              <LoadingState message="Generating document preview..." />
            ) : (
              <div className="space-y-4">
                {/* Financial Report Preview */}
                {previewReport.type === 'FINANCIAL' && (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-0.5">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-emerald-400" />
                          Purchase Revenue
                        </span>
                        <p className="font-mono text-base font-bold text-emerald-300">
                          {formatCurrency(
                            previewData.transactions
                              .filter((t) => t.type === 'PURCHASE')
                              .reduce((sum, t) => sum + t.amount, 0),
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-0.5">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <CreditCard className="h-3 w-3 text-violet-400" />
                          Recharge Deposits
                        </span>
                        <p className="font-mono text-base font-bold text-violet-300">
                          {formatCurrency(
                            previewData.transactions
                              .filter((t) => t.type === 'RECHARGE')
                              .reduce((sum, t) => sum + t.amount, 0),
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-0.5">
                        <span className="text-[11px] text-slate-400">Ledger Records</span>
                        <p className="font-mono text-base font-bold text-slate-100">
                          {previewData.transactions.length} txns sampled
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <p className="text-xs font-semibold text-slate-300 mb-2">Sample Transaction Log</p>
                      <div className="divide-y divide-slate-800/80 text-xs">
                        {previewData.transactions.slice(0, 5).map((t) => (
                          <div key={t.id} className="flex justify-between py-1.5 text-slate-400">
                            <span className="font-mono text-slate-300">TXN-#{t.id.slice(0, 8).toUpperCase()}</span>
                            <Badge variant={t.type === 'PURCHASE' ? 'success' : 'outline'}>{t.type}</Badge>
                            <span className="font-mono font-medium text-slate-200">{formatCurrency(t.amount)}</span>
                            <span className="text-[11px]">{new Date(t.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Inventory Report Preview */}
                {previewReport.type === 'INVENTORY' && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex justify-between items-center">
                      <div>
                        <span className="text-xs text-slate-400">Total Catalog Items</span>
                        <p className="font-mono text-lg font-bold text-slate-100">{previewData.inventory.length} products</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400">Low Stock Warnings</span>
                        <p className="font-mono text-lg font-bold text-rose-400">
                          {previewData.inventory.filter((i) => i.quantity < 10).length} items
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <p className="text-xs font-semibold text-slate-300 mb-2">Stock Inventory Sample</p>
                      <div className="divide-y divide-slate-800/80 text-xs">
                        {previewData.inventory.slice(0, 5).map((i) => (
                          <div key={i.id} className="flex justify-between py-1.5 text-slate-400">
                            <span className="font-medium text-slate-200">{i.itemName}</span>
                            <Badge variant="outline">{i.category}</Badge>
                            <span className="font-mono text-emerald-300">{formatCurrency(i.price)}</span>
                            <span className="font-mono font-bold text-slate-300">{i.quantity} in stock</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Audit Report Preview */}
                {previewReport.type !== 'FINANCIAL' && previewReport.type !== 'INVENTORY' && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex justify-between items-center">
                      <div>
                        <span className="text-xs text-slate-400">Audited Sessions</span>
                        <p className="font-mono text-lg font-bold text-slate-100">{previewData.sessions.length} sessions</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400">Active Wallets</span>
                        <p className="font-mono text-lg font-bold text-sky-400">
                          {previewData.sessions.filter((s) => s.status === 'ACTIVE').length} active
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                      <p className="text-xs font-semibold text-slate-300 mb-2">Sample Card Session & Wallet Ledger</p>
                      <div className="divide-y divide-slate-800/80 text-xs">
                        {previewData.sessions.slice(0, 6).map((s) => {
                          const cardNum = s.physicalCardNumber || (s.cardId?.startsWith('MC-') ? s.cardId : `MC-${s.cardId ? s.cardId.replace(/-/g, '').slice(0, 6).toUpperCase() : '105'}`);
                          const shortSessId = `SESSION-#${s.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

                          return (
                            <div key={s.id} className="flex items-center justify-between py-2 text-slate-400">
                              <div className="flex items-center gap-3">
                                <div>
                                  <span className="font-mono font-bold text-violet-300">{cardNum}</span>
                                  <p className="text-[10px] text-slate-500 font-mono">{shortSessId}</p>
                                </div>
                              </div>
                              <Badge variant={s.status === 'ACTIVE' ? 'success' : 'outline'}>{s.status}</Badge>
                              <div className="text-right">
                                <span className="font-mono font-bold text-emerald-400">
                                  {formatCurrency(s.balance)}
                                </span>
                                <p className="text-[10px] text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <ModalFooter className="px-0 pb-0 pt-2 flex items-center justify-between">
              <Button variant="outline" onClick={() => setPreviewReport(null)}>
                Close Preview
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (previewReport) handleDownloadPdf(previewReport);
                }}
                disabled={downloadingId === previewReport.id}
                isLoading={downloadingId === previewReport.id}
                leftIcon={<FileText className="h-4 w-4" />}
              >
                Download PDF
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Customer History & Session Lifecycle Page ───────────────────────────
// Real Customer Session History Only — Unissued idle stock belongs to Cards Management.
// Multi-field Global Search by Customer Name, Phone Number, Physical Card (e.g. MC-104),
// and Internal Session Cycle ID (e.g. MC-104_1, MC-104_2).

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks';
import type {
  Card as CardEntity,
  SessionStatus,
  Transaction,
  Branch,
  CardSession,
} from '@/types';
import {
  Button,
  Select,
  Card as UiCard,
  Badge,
  Modal,
  ModalFooter,
  StatCard,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { formatDate, formatCurrency } from '@/utils';
import {
  Clock,
  CreditCard,
  Building2,
  Search,
  RefreshCw,
  Eye,
  Wallet,
  ArrowUpRight,
  ShoppingBag,
  RotateCcw,
  CheckCircle2,
  User,
  Phone,
  History,
  X,
  Sparkles,
} from 'lucide-react';

// ─── Customer Session Record Model ────────────────────────────────────
export interface CustomerHistoryItem {
  id: string; // Session UUID
  cardId: string;
  physicalCardNumber: string;
  sessionCardNumber: string;
  cycleNumber: number;
  customerName: string | null;
  customerPhone: string | null;
  session: CardSession;
  sessionStatus: SessionStatus;
  balance: number;
  branchId: string | null;
  branchName: string;
  startedAt: string;
  settledAt: string | null;
  issuedByName?: string;
  lastActivityAt: string;
}

export function SessionsPage() {
  const { hasPermission } = usePermissions();

  const [rawCards, setRawCards] = useState<CardEntity[]>([]);
  const [rawSessions, setRawSessions] = useState<CardSession[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Filters State ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<SessionStatus | 'ALL'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'today' | 'yesterday' | '7d' | '30d'>('ALL');

  // ─── Session Details Inspection Modal ──────────────────────────────
  const [selectedItem, setSelectedItem] = useState<CustomerHistoryItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sessionTxns, setSessionTxns] = useState<Transaction[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'timeline' | 'purchases' | 'recharges'>('overview');

  // ─── Fetch Sessions, Cards & Branches ──────────────────────────────
  const fetchCustomerHistoryData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sessionsRes, cardsRes, branchesRes] = await Promise.all([
        apiService.sessions.getSessions({ limit: 300 }),
        apiService.cards.getCards(),
        apiService.branches.getBranches(),
      ]);

      if (!sessionsRes.success) {
        setError(sessionsRes.error.message || 'Failed to load customer sessions');
        return;
      }

      setRawSessions(sessionsRes.data.items);
      if (cardsRes.success) {
        setRawCards(cardsRes.data.items);
      }
      if (branchesRes.success) {
        setBranches(branchesRes.data.items);
      }
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
        const [sessionsRes, cardsRes, branchesRes] = await Promise.all([
          apiService.sessions.getSessions({ limit: 300 }),
          apiService.cards.getCards(),
          apiService.branches.getBranches(),
        ]);

        if (isCancelled) return;

        if (!sessionsRes.success) {
          setError(sessionsRes.error.message || 'Failed to load customer sessions');
          return;
        }

        setRawSessions(sessionsRes.data.items);
        if (cardsRes.success) {
          setRawCards(cardsRes.data.items);
        }
        if (branchesRes.success) {
          setBranches(branchesRes.data.items);
        }
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
  }, []);

  // ─── Build Customer History Records (ONLY real customer sessions) ──
  const customerHistoryItems = useMemo<CustomerHistoryItem[]>(() => {
    return rawSessions.map((s) => {
      const card = rawCards.find((c) => c.id === s.cardId);
      const branch = branches.find((b) => b.id === s.branchId);

      const physCard = card ? card.physicalCardNumber : (s.physicalCardNumber || 'MC-Card');
      const cycleNum = s.cycleNumber || 1;
      const sessionCardNum = s.sessionCardNumber || `${physCard}_${cycleNum}`;

      return {
        id: s.id,
        cardId: s.cardId,
        physicalCardNumber: physCard,
        sessionCardNumber: sessionCardNum,
        cycleNumber: cycleNum,
        customerName: s.customerName || null,
        customerPhone: s.customerPhone || null,
        session: s,
        sessionStatus: s.status,
        balance: s.balance,
        branchId: s.branchId,
        branchName: branch ? branch.name : 'Main Branch',
        startedAt: s.startedAt,
        settledAt: s.settledAt || null,
        issuedByName: (s as any).issuedBy?.name,
        lastActivityAt: s.updatedAt || s.createdAt || s.startedAt,
      };
    });
  }, [rawSessions, rawCards, branches]);

  // ─── Multi-criteria Global Search & Filter ──────────────────────────
  const filteredItems = useMemo(() => {
    return customerHistoryItems.filter((item) => {
      // 1. Global Search Filter (Customer Name, Phone Number, Physical Card Number, Internal Session ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCustomerName = item.customerName?.toLowerCase().includes(q) ?? false;
        const matchesCustomerPhone = item.customerPhone?.toLowerCase().includes(q) ?? false;
        const matchesPhysicalNumber = item.physicalCardNumber.toLowerCase().includes(q);
        const matchesInternalNumber = item.sessionCardNumber.toLowerCase().includes(q);
        const matchesSessionId = item.id.toLowerCase().includes(q);
        const matchesBranch = item.branchName.toLowerCase().includes(q);

        if (
          !matchesCustomerName &&
          !matchesCustomerPhone &&
          !matchesPhysicalNumber &&
          !matchesInternalNumber &&
          !matchesSessionId &&
          !matchesBranch
        ) {
          return false;
        }
      }

      // 2. Session Status filter
      if (sessionStatusFilter !== 'ALL') {
        if (item.sessionStatus !== sessionStatusFilter) return false;
      }

      // 3. Branch filter
      if (branchFilter !== 'ALL') {
        if (item.branchId !== branchFilter) return false;
      }

      // 4. Date Range filter
      if (dateRangeFilter !== 'ALL' && item.startedAt) {
        const itemDate = new Date(item.startedAt);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const itemTime = itemDate.getTime();

        if (dateRangeFilter === 'today') {
          if (itemTime < startOfToday) return false;
        } else if (dateRangeFilter === 'yesterday') {
          const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
          if (itemTime < startOfYesterday || itemTime >= startOfToday) return false;
        } else if (dateRangeFilter === '7d') {
          const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
          if (itemTime < sevenDaysAgo) return false;
        } else if (dateRangeFilter === '30d') {
          const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
          if (itemTime < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [customerHistoryItems, searchQuery, sessionStatusFilter, branchFilter, dateRangeFilter]);

  // ─── KPI Metrics ────────────────────────────────────────────────────
  const activeCount = useMemo(
    () => customerHistoryItems.filter((i) => i.sessionStatus === 'ACTIVE').length,
    [customerHistoryItems],
  );

  const settledCount = useMemo(
    () => customerHistoryItems.filter((i) => i.sessionStatus === 'SETTLED').length,
    [customerHistoryItems],
  );

  const uniqueCustomersCount = useMemo(() => {
    const customers = new Set<string>();
    for (const item of customerHistoryItems) {
      if (item.customerPhone) {
        customers.add(item.customerPhone);
      } else if (item.customerName) {
        customers.add(item.customerName.toLowerCase());
      }
    }
    return customers.size;
  }, [customerHistoryItems]);

  const totalActiveBalance = useMemo(
    () =>
      customerHistoryItems
        .filter((i) => i.sessionStatus === 'ACTIVE')
        .reduce((sum, i) => sum + i.balance, 0),
    [customerHistoryItems],
  );

  // ─── Open Session Detail Inspection ────────────────────────────────
  const handleOpenDetails = async (item: CustomerHistoryItem) => {
    setSelectedItem(item);
    setDetailTab('overview');
    setShowDetailModal(true);
    setIsLoadingTxns(true);
    setSessionTxns([]);

    try {
      const res = await apiService.sessions.getSessionTransactions(item.id);
      if (res.success) {
        setSessionTxns(res.data);
      }
    } catch {
      setSessionTxns([]);
    } finally {
      setIsLoadingTxns(false);
    }
  };

  // ─── Transaction Sub-filters for Detail Modal ──────────────────────
  const recharges = useMemo(
    () => sessionTxns.filter((t) => t.type === 'RECHARGE' || t.type?.includes('RECHARGE')),
    [sessionTxns],
  );

  const purchases = useMemo(
    () => sessionTxns.filter((t) => t.type === 'PURCHASE'),
    [sessionTxns],
  );

  const refundTxn = useMemo(
    () => sessionTxns.find((t) => t.type === 'REFUND' || t.type?.includes('REFUND') || t.type?.includes('RETURN')),
    [sessionTxns],
  );

  // ─── Permission Guard ──────────────────────────────────────────────
  if (!hasPermission('SESSION_VIEW')) {
    return (
      <ErrorState
        title="Access Denied"
        message="You do not have the required SESSION_VIEW permission to view customer history."
      />
    );
  }

  // ─── Table Columns ─────────────────────────────────────────────────
  const columns = [
    {
      key: 'customer',
      header: 'Customer Profile',
      render: (item: CustomerHistoryItem) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 shrink-0 font-bold text-xs">
            {item.customerName ? item.customerName.charAt(0).toUpperCase() : <User className="h-4 w-4 text-slate-400" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-100 truncate">
              {item.customerName || <span className="text-slate-400 font-normal italic">Guest User</span>}
            </p>
            {item.customerPhone ? (
              <p className="flex items-center gap-1 text-[11px] font-mono text-violet-300">
                <Phone className="h-3 w-3 text-slate-500" />
                {item.customerPhone}
              </p>
            ) : (
              <p className="text-[10px] text-slate-500">No phone registered</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'card',
      header: 'Physical Card & Internal ID',
      render: (item: CustomerHistoryItem) => (
        <div>
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-mono text-sm font-bold text-slate-200">{item.physicalCardNumber}</span>
          </div>
          <div className="mt-0.5">
            <Badge variant="outline" className="text-[10px] font-mono text-cyan-300 border-cyan-800/60 bg-cyan-950/30">
              Internal ID: {item.sessionCardNumber}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: 'sessionStatus',
      header: 'Session Status',
      render: (item: CustomerHistoryItem) => {
        if (item.sessionStatus === 'ACTIVE') {
          return (
            <Badge variant="success" className="gap-1.5 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ACTIVE
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="text-xs text-slate-400 border-slate-700">
            SETTLED
          </Badge>
        );
      },
    },
    {
      key: 'balance',
      header: 'Wallet Balance',
      render: (item: CustomerHistoryItem) => (
        <div className="font-mono">
          <p
            className={`text-sm font-bold ${
              item.balance > 0 ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            {formatCurrency(item.balance)}
          </p>
          <span className="text-[10px] text-slate-500">
            {item.sessionStatus === 'ACTIVE' ? 'Live Balance' : 'Settled & Refunded'}
          </span>
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'Branch Location',
      render: (item: CustomerHistoryItem) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="truncate max-w-[130px]">{item.branchName}</span>
        </div>
      ),
    },
    {
      key: 'startedAt',
      header: 'Session Lifecycle',
      render: (item: CustomerHistoryItem) => (
        <div className="text-xs text-slate-400 space-y-0.5">
          <p>Started: {formatDate(item.startedAt)}</p>
          {item.settledAt ? (
            <p className="text-[11px] text-slate-500">Settled: {formatDate(item.settledAt)}</p>
          ) : (
            <p className="text-[11px] text-emerald-400 font-medium">Session in progress</p>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item: CustomerHistoryItem) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenDetails(item)}
          leftIcon={<Eye className="h-3.5 w-3.5 text-violet-400" />}
          className="border-slate-700 hover:border-violet-500/50 hover:bg-violet-950/20"
        >
          Inspect History
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">Customer History</h1>
            <Badge variant="outline" className="border-violet-500/30 text-violet-300 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Customer Audit Trail
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Chronological customer session records with global search by Name, Phone (10 digits), Physical Card (e.g. MC-104), or Internal Cycle ID (e.g. MC-104_1, MC-104_2).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchCustomerHistoryData}
          disabled={isLoading}
          leftIcon={<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh Data
        </Button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Customer Sessions"
          value={activeCount.toString()}
          icon={<Clock className="h-5 w-5 text-emerald-400" />}
        />

        <StatCard
          label="Settled Customer Cycles"
          value={settledCount.toString()}
          icon={<CheckCircle2 className="h-5 w-5 text-blue-400" />}
        />

        <StatCard
          label="Identified Customers"
          value={uniqueCustomersCount.toString()}
          icon={<User className="h-5 w-5 text-violet-400" />}
        />

        <StatCard
          label="Live Wallet Liabilities"
          value={formatCurrency(totalActiveBalance)}
          icon={<Wallet className="h-5 w-5 text-amber-400" />}
        />
      </div>

      {/* Global Search & Filters Toolbar */}
      <UiCard className="p-4 space-y-4 border-slate-800 bg-slate-900/60">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Global Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="customer-global-search"
              type="text"
              placeholder="Search by Customer Name, Phone (98765...), Physical Card (MC-104), or Internal ID (MC-104_1)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-8 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <Select
              id="session-status-filter"
              value={sessionStatusFilter}
              onChange={(e) => setSessionStatusFilter(e.target.value as any)}
              options={[
                { value: 'ALL', label: 'All Cycles' },
                { value: 'ACTIVE', label: 'Active Sessions' },
                { value: 'SETTLED', label: 'Settled & Refunded' },
              ]}
              className="w-40 text-xs"
            />

            {/* Branch Filter */}
            <Select
              id="branch-filter"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Branches' },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
              className="w-44 text-xs"
            />

            {/* Date Range Selector */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-1">
              {(
                [
                  { id: 'ALL', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: '7d', label: 'Last 7D' },
                  { id: '30d', label: 'Last 30D' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDateRangeFilter(tab.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    dateRangeFilter === tab.id
                      ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(searchQuery || sessionStatusFilter !== 'ALL' || branchFilter !== 'ALL' || dateRangeFilter !== 'ALL') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
            <span>Filtering {filteredItems.length} of {customerHistoryItems.length} customer sessions</span>
            {searchQuery && (
              <Badge variant="outline" className="gap-1 border-violet-700 bg-violet-950/40 text-violet-300">
                Search: "{searchQuery}"
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
              </Badge>
            )}
            {sessionStatusFilter !== 'ALL' && (
              <Badge variant="outline" className="gap-1 border-slate-700">
                Status: {sessionStatusFilter}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSessionStatusFilter('ALL')} />
              </Badge>
            )}
            {branchFilter !== 'ALL' && (
              <Badge variant="outline" className="gap-1 border-slate-700">
                Branch: {branches.find((b) => b.id === branchFilter)?.name || branchFilter}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setBranchFilter('ALL')} />
              </Badge>
            )}
            {dateRangeFilter !== 'ALL' && (
              <Badge variant="outline" className="gap-1 border-slate-700">
                Date: {dateRangeFilter}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setDateRangeFilter('ALL')} />
              </Badge>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSessionStatusFilter('ALL');
                setBranchFilter('ALL');
                setDateRangeFilter('ALL');
              }}
              className="text-xs text-violet-400 hover:underline ml-auto"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </UiCard>

      {/* Main Customer History Data Table */}
      {isLoading ? (
        <LoadingState message="Loading customer session history..." />
      ) : error ? (
        <ErrorState title="Failed to Load Customer History" message={error} onRetry={fetchCustomerHistoryData} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No Matching Customer Records' : 'No Customer History Yet'}
          description={
            searchQuery
              ? `No customer session matches your search query "${searchQuery}". Try searching by customer name, 10-digit mobile number, or card number.`
              : 'Customer sessions will be logged here once staff members issue cards at branch counters.'
          }
          icon={<History className="h-10 w-10 text-slate-500" />}
          action={
            searchQuery ? (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear Search Filter
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable<CustomerHistoryItem>
          data={filteredItems}
          columns={columns}
          keyExtractor={(item) => item.id}
        />
      )}

      {/* ─── Customer Session Details Modal ─────────────────────────── */}
      {selectedItem && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Customer Session: ${selectedItem.customerName || selectedItem.physicalCardNumber}`}
          size="lg"
        >
          <div className="space-y-5">
            {/* Header Hero Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 font-bold text-base">
                    {selectedItem.customerName ? selectedItem.customerName.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-100">
                      {selectedItem.customerName || 'Guest User (Unassigned)'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-400">
                      {selectedItem.customerPhone && (
                        <span className="flex items-center gap-1 text-violet-300 font-mono">
                          <Phone className="h-3 w-3" />
                          {selectedItem.customerPhone}
                        </span>
                      )}
                      <span>•</span>
                      <span className="font-mono text-slate-300">Physical Card: {selectedItem.physicalCardNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400">
                    {selectedItem.sessionStatus === 'ACTIVE' ? 'Live Balance' : 'Settled & Refunded'}
                  </span>
                  <p className="text-xl font-bold font-mono text-emerald-400">
                    {formatCurrency(selectedItem.balance)}
                  </p>
                </div>
              </div>

              {/* Internal Cycle & Status Metadata */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
                {selectedItem.sessionStatus === 'ACTIVE' ? (
                  <Badge variant="success" className="gap-1.5 text-xs font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ACTIVE SESSION
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-slate-400 border-slate-700">
                    SETTLED & REFUNDED
                  </Badge>
                )}

                <Badge variant="outline" className="text-xs font-mono text-cyan-300 border-cyan-800/60 bg-cyan-950/40">
                  Internal Tracking ID: {selectedItem.sessionCardNumber}
                </Badge>

                <div className="flex items-center gap-1 ml-auto text-slate-400">
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  <span>{selectedItem.branchName}</span>
                </div>
              </div>
            </div>

            {/* Modal Sub-tabs */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
              {[
                { id: 'overview', label: 'Session Overview', icon: Clock },
                { id: 'timeline', label: `All Transactions (${sessionTxns.length})`, icon: History },
                { id: 'purchases', label: `POS Purchases (${purchases.length})`, icon: ShoppingBag },
                { id: 'recharges', label: `Recharges (${recharges.length})`, icon: ArrowUpRight },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                      detailTab === tab.id
                        ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            {isLoadingTxns ? (
              <LoadingState message="Loading customer transaction records..." />
            ) : (
              <>
                {/* TAB 1: OVERVIEW */}
                {detailTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <span className="text-slate-500 text-[11px]">Total Recharges</span>
                        <p className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                          {formatCurrency(recharges.reduce((sum, r) => sum + r.amount, 0))}
                        </p>
                        <span className="text-[10px] text-slate-500">{recharges.length} top-ups</span>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <span className="text-slate-500 text-[11px]">Total Purchases</span>
                        <p className="text-base font-bold font-mono text-violet-300 mt-0.5">
                          {formatCurrency(purchases.reduce((sum, p) => sum + p.amount, 0))}
                        </p>
                        <span className="text-[10px] text-slate-500">{purchases.length} transactions</span>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <span className="text-slate-500 text-[11px]">Settlement Refund</span>
                        <p className="text-base font-bold font-mono text-amber-300 mt-0.5">
                          {refundTxn ? formatCurrency(refundTxn.amount) : '₹0.00'}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {selectedItem.sessionStatus === 'SETTLED' ? 'Returned to user' : 'Active session'}
                        </span>
                      </div>

                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <span className="text-slate-500 text-[11px]">Session Cycle</span>
                        <p className="text-base font-bold font-mono text-cyan-300 mt-0.5">
                          Cycle #{selectedItem.cycleNumber}
                        </p>
                        <span className="text-[10px] text-slate-500">{selectedItem.sessionCardNumber}</span>
                      </div>
                    </div>

                    {/* Timeline Breakdown */}
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
                      <h4 className="font-semibold text-slate-300 text-xs">Lifecycle Timestamps & Staff</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-slate-400">
                        <div>
                          <span className="text-slate-500">Session Started:</span>
                          <p className="font-medium text-slate-200">
                            {formatDate(selectedItem.startedAt)}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Session Settled:</span>
                          <p className="font-medium text-slate-200">
                            {selectedItem.settledAt ? formatDate(selectedItem.settledAt) : 'Currently Active'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: ALL TRANSACTIONS */}
                {detailTab === 'timeline' && (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {sessionTxns.length === 0 ? (
                      <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-6 text-center text-xs text-slate-500">
                        No transactions recorded for this customer session yet.
                      </div>
                    ) : (
                      sessionTxns.map((t) => {
                        const isPurchase = t.type === 'PURCHASE';
                        const isRecharge = t.type === 'RECHARGE' || t.type?.includes('RECHARGE');

                        return (
                          <div
                            key={t.id}
                            className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950 p-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                  isRecharge
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : isPurchase
                                      ? 'bg-violet-500/10 text-violet-400'
                                      : 'bg-amber-500/10 text-amber-400'
                                }`}
                              >
                                {isRecharge ? (
                                  <ArrowUpRight className="h-4 w-4" />
                                ) : isPurchase ? (
                                  <ShoppingBag className="h-4 w-4" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-200">{t.type}</span>
                                  <span className="text-[11px] text-slate-400">
                                    {t.paymentMethod || 'WALLET'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500">{formatDate(t.createdAt)}</p>
                              </div>
                            </div>

                            <div className="text-right font-mono">
                              <p
                                className={`font-bold ${
                                  isRecharge ? 'text-emerald-400' : 'text-slate-200'
                                }`}
                              >
                                {isRecharge ? '+' : '-'}
                                {formatCurrency(t.amount || 0)}
                              </p>
                              <span className="text-[10px] text-slate-500">
                                Balance: {formatCurrency(t.balanceAfter ?? 0)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* TAB 3: POS PURCHASES */}
                {detailTab === 'purchases' && (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {purchases.length === 0 ? (
                      <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-6 text-center text-xs text-slate-500">
                        No food or store purchases made during this session.
                      </div>
                    ) : (
                      purchases.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-lg border border-slate-800/80 bg-slate-950 p-3 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="h-3.5 w-3.5 text-violet-400" />
                              <span className="font-semibold text-slate-200">POS Purchase</span>
                            </div>
                            <span className="font-mono font-bold text-violet-300">
                              {formatCurrency(p.amount || 0)}
                            </span>
                          </div>

                          {p.items && p.items.length > 0 && (
                            <div className="border-t border-slate-900 pt-1 text-[11px] text-slate-400 space-y-0.5">
                              {p.items.map((it: any, idx: number) => (
                                <div key={idx} className="flex justify-between">
                                  <span>{it.itemName || it.productId} × {it.quantity}</span>
                                  <span className="font-mono">{formatCurrency((it.priceAtSale || it.price || 0) * it.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                            <span>{formatDate(p.createdAt)}</span>
                            <span>Remaining Balance: {formatCurrency(p.balanceAfter ?? 0)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 4: RECHARGES */}
                {detailTab === 'recharges' && (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {recharges.length === 0 ? (
                      <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-6 text-center text-xs text-slate-500">
                        No wallet recharges recorded for this session.
                      </div>
                    ) : (
                      recharges.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950 p-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="font-semibold text-slate-200">Wallet Top-Up</span>
                              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-800/60 bg-emerald-950/20">
                                {r.paymentMethod || 'CASH'}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(r.createdAt)}</p>
                          </div>

                          <div className="text-right font-mono">
                            <p className="font-bold text-emerald-400">+{formatCurrency(r.amount || 0)}</p>
                            <span className="text-[10px] text-slate-500">After: {formatCurrency(r.balanceAfter ?? 0)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}

// ─── Card Sessions Management Page (M8) ──────────────────────
// Complete Card & Session Visibility and Multi-criteria Filtering for ORG_ADMIN.
// Read-only administrative UI — operational workflows belong to Staff Flutter POS.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks';
import type {
  Card as CardEntity,
  CardStatus,
  SessionStatus,
  Transaction,
  Branch,
  CardSession,
} from '@/types';
import {
  Button,
  Select,
  Card,
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
  ShieldAlert,
  SlidersHorizontal,
  AlertTriangle,
} from 'lucide-react';

// ─── Unified Card & Session Item Model ───────────────────────
export interface CardSessionItem {
  id: string; // Unique row key
  cardId: string;
  physicalCardNumber: string;
  cardStatus: CardStatus;
  session: CardSession | null;
  sessionStatus: SessionStatus | 'NO_ACTIVE_SESSION';
  balance: number;
  branchId: string | null;
  branchName: string;
  startedAt: string | null;
  settledAt: string | null;
  lastActivityAt: string;
}

export function SessionsPage() {
  const { hasPermission } = usePermissions();

  const [rawCards, setRawCards] = useState<CardEntity[]>([]);
  const [rawSessions, setRawSessions] = useState<CardSession[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filters State ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [cardStatusFilter, setCardStatusFilter] = useState<CardStatus | 'ALL'>('ALL');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<SessionStatus | 'NO_ACTIVE_SESSION' | 'ALL'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'today' | '7d' | '30d'>('ALL');

  // ── Session Details Inspection Modal ───────────────────────
  const [selectedItem, setSelectedItem] = useState<CardSessionItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sessionTxns, setSessionTxns] = useState<Transaction[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'transactions' | 'recharges' | 'purchases' | 'settlement'>('overview');

  // ── Fetch Cards, Sessions & Branches ───────────────────────
  const fetchCardSessionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cardsRes, sessionsRes, branchesRes] = await Promise.all([
        apiService.cards.getCards(),
        apiService.sessions.getSessions(),
        apiService.branches.getBranches(),
      ]);

      if (!cardsRes.success) {
        setError(cardsRes.error.message || 'Failed to load cards registry');
        return;
      }

      setRawCards(cardsRes.data.items);
      if (sessionsRes.success) {
        setRawSessions(sessionsRes.data.items);
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
        const [cardsRes, sessionsRes, branchesRes] = await Promise.all([
          apiService.cards.getCards(),
          apiService.sessions.getSessions(),
          apiService.branches.getBranches(),
        ]);
        if (isCancelled) return;

        if (!cardsRes.success) {
          setError(cardsRes.error.message || 'Failed to load cards registry');
          return;
        }

        setRawCards(cardsRes.data.items);
        if (sessionsRes.success) setRawSessions(sessionsRes.data.items);
        if (branchesRes.success) setBranches(branchesRes.data.items);
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
  }, []);

  // ── Combine Cards & Sessions with Complete Visibility ──────
  const unifiedItems: CardSessionItem[] = useMemo(() => {
    const items: CardSessionItem[] = [];
    const processedCardIds = new Set<string>();

    // 1. Process all sessions (Active & Settled)
    for (const s of rawSessions) {
      const card = rawCards.find((c) => c.id === s.cardId);
      const branch = branches.find((b) => b.id === s.branchId);

      items.push({
        id: `session_${s.id}`,
        cardId: s.cardId,
        physicalCardNumber: card ? card.physicalCardNumber : 'MC-Unlinked',
        cardStatus: card ? card.status : 'AVAILABLE',
        session: s,
        sessionStatus: s.status,
        balance: s.balance,
        branchId: s.branchId,
        branchName: branch ? branch.name : 'Main Branch',
        startedAt: s.startedAt,
        settledAt: s.settledAt || null,
        lastActivityAt: s.updatedAt || s.createdAt,
      });

      if (s.status === 'ACTIVE') {
        processedCardIds.add(s.cardId);
      }
    }

    // 2. Add cards that currently have NO active session
    for (const c of rawCards) {
      if (!processedCardIds.has(c.id)) {
        // Find if this card has any past session
        const pastSessions = rawSessions.filter((s) => s.cardId === c.id);
        const hasPastSessions = pastSessions.length > 0;

        // If card already has settled session rows in table, we avoid duplicate row or present as available card
        if (!hasPastSessions) {
          const branch = branches.find((b) => b.id === c.currentBranchId);
          items.push({
            id: `card_${c.id}`,
            cardId: c.id,
            physicalCardNumber: c.physicalCardNumber,
            cardStatus: c.status,
            session: null,
            sessionStatus: 'NO_ACTIVE_SESSION',
            balance: 0,
            branchId: c.currentBranchId || null,
            branchName: branch ? branch.name : 'Unassigned (Available)',
            startedAt: null,
            settledAt: null,
            lastActivityAt: c.updatedAt || c.createdAt,
          });
        }
      }
    }

    return items;
  }, [rawCards, rawSessions, branches]);

  // ── Multi-criteria Filtering ───────────────────────────────
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNumber = item.physicalCardNumber.toLowerCase().includes(q);
        const matchesSessionId = item.session?.id.toLowerCase().includes(q) ?? false;
        const matchesBranch = item.branchName.toLowerCase().includes(q);
        if (!matchesNumber && !matchesSessionId && !matchesBranch) return false;
      }

      // 2. Card Status filter
      if (cardStatusFilter !== 'ALL') {
        if (item.cardStatus !== cardStatusFilter) return false;
      }

      // 3. Session Status filter
      if (sessionStatusFilter !== 'ALL') {
        if (item.sessionStatus !== sessionStatusFilter) return false;
      }

      // 4. Branch filter
      if (branchFilter !== 'ALL') {
        if (item.branchId !== branchFilter) return false;
      }

      // 5. Date Range filter
      if (dateRangeFilter !== 'ALL' && item.startedAt) {
        const itemDate = new Date(item.startedAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - itemDate) / (1000 * 60 * 60);

        if (dateRangeFilter === 'today' && diffHours > 24) return false;
        if (dateRangeFilter === '7d' && diffHours > 24 * 7) return false;
        if (dateRangeFilter === '30d' && diffHours > 24 * 30) return false;
      }

      return true;
    });
  }, [unifiedItems, searchQuery, cardStatusFilter, sessionStatusFilter, branchFilter, dateRangeFilter]);

  // ── Transaction Sub-filters for Detail Modal ───────────────
  const recharges = useMemo(
    () => sessionTxns.filter((t) => t.type === 'RECHARGE'),
    [sessionTxns],
  );

  const purchases = useMemo(
    () => sessionTxns.filter((t) => t.type === 'PURCHASE'),
    [sessionTxns],
  );

  const refundTxn = useMemo(
    () => sessionTxns.find((t) => t.type === 'REFUND'),
    [sessionTxns],
  );

  // ── KPI Metrics ───────────────────────────────────────────
  const activeCount = useMemo(
    () => unifiedItems.filter((i) => i.sessionStatus === 'ACTIVE').length,
    [unifiedItems],
  );

  const settledCount = useMemo(
    () => unifiedItems.filter((i) => i.sessionStatus === 'SETTLED').length,
    [unifiedItems],
  );

  const totalBalance = useMemo(
    () =>
      unifiedItems
        .filter((i) => i.sessionStatus === 'ACTIVE')
        .reduce((sum, i) => sum + i.balance, 0),
    [unifiedItems],
  );

  // ── Open Session Detail Inspection ─────────────────────────
  const handleOpenDetails = async (item: CardSessionItem) => {
    setSelectedItem(item);
    setDetailTab('overview');
    setShowDetailModal(true);
    setIsLoadingTxns(true);
    setSessionTxns([]);

    if (item.session) {
      try {
        const res = await apiService.sessions.getSessionTransactions(item.session.id);
        if (res.success) {
          setSessionTxns(res.data);
        }
      } catch {
        setSessionTxns([]);
      } finally {
        setIsLoadingTxns(false);
      }
    } else {
      setIsLoadingTxns(false);
    }
  };

  // ── Permission Guard ──────────────────────────────────────
  if (!hasPermission('SESSION_VIEW')) {
    return (
      <ErrorState
        title="Access Denied"
        message="You do not have the required SESSION_VIEW permission to monitor card sessions."
      />
    );
  }

  // ── Table Columns ─────────────────────────────────────────
  const columns = [
    {
      key: 'physicalCardNumber',
      header: 'Physical Card',
      render: (item: CardSessionItem) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <p className="font-mono text-sm font-bold text-slate-100">{item.physicalCardNumber}</p>
            {item.session ? (
              <p className="font-mono text-[11px] text-slate-500">Session: {item.session.id}</p>
            ) : (
              <p className="text-[11px] text-amber-400/80 font-medium">Ready for Session</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'cardStatus',
      header: 'Card Status',
      render: (item: CardSessionItem) => {
        let variant: 'default' | 'success' | 'danger' = 'default';
        if (item.cardStatus === 'ACTIVE') variant = 'success';
        if (item.cardStatus === 'BLOCKED') variant = 'danger';

        return (
          <Badge variant={variant} className="font-mono text-xs">
            {item.cardStatus}
          </Badge>
        );
      },
    },
    {
      key: 'sessionStatus',
      header: 'Session Status',
      render: (item: CardSessionItem) => {
        if (item.sessionStatus === 'ACTIVE') {
          return (
            <Badge variant="success" className="gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ACTIVE
            </Badge>
          );
        }
        if (item.sessionStatus === 'SETTLED') {
          return <Badge variant="outline">SETTLED</Badge>;
        }
        return (
          <Badge variant="outline" className="border-slate-700 text-slate-400">
            NO ACTIVE SESSION
          </Badge>
        );
      },
    },
    {
      key: 'balance',
      header: 'Session Balance',
      render: (item: CardSessionItem) => (
        <span
          className={`font-mono text-sm font-bold ${
            item.balance > 0 ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          {formatCurrency(item.balance)}
        </span>
      ),
    },
    {
      key: 'branch',
      header: 'Branch Location',
      render: (item: CardSessionItem) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="truncate max-w-[140px]">{item.branchName}</span>
        </div>
      ),
    },
    {
      key: 'startedAt',
      header: 'Started At',
      render: (item: CardSessionItem) => (
        <span className="text-xs text-slate-400">
          {item.startedAt ? formatDate(item.startedAt) : '—'}
        </span>
      ),
    },
    {
      key: 'settledAt',
      header: 'Settled At',
      render: (item: CardSessionItem) => (
        <span className="text-xs text-slate-500">
          {item.settledAt
            ? formatDate(item.settledAt)
            : item.sessionStatus === 'ACTIVE'
              ? 'In Progress'
              : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item: CardSessionItem) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleOpenDetails(item)}
          leftIcon={<Eye className="h-3.5 w-3.5" />}
        >
          Details
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
            <h1 className="text-2xl font-bold text-slate-100">Card Sessions & Status</h1>
            <Badge variant="outline" className="border-violet-500/30 text-violet-300">
              Admin Monitoring
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time visibility into organization physical cards, active sessions, wallet balances, and settlement lifecycle.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchCardSessionData}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Refresh Data
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Registered Cards"
          value={rawCards.length}
          icon={<CreditCard className="h-5 w-5 text-violet-400" />}
        />
        <StatCard
          label="Active Card Sessions"
          value={activeCount}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
        />
        <StatCard
          label="Settled / Closed Sessions"
          value={settledCount}
          icon={<Clock className="h-5 w-5 text-slate-400" />}
        />
        <StatCard
          label="Active Live Wallet Balance"
          value={formatCurrency(totalBalance)}
          icon={<Wallet className="h-5 w-5 text-emerald-400" />}
        />
      </div>

      {/* Multi-criteria Filter Bar */}
      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 pb-1">
          <SlidersHorizontal className="h-3.5 w-3.5 text-violet-400" />
          Filter Cards & Sessions
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1. Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search Card (MC-001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors focus:border-violet-500 focus:outline-none"
            />
          </div>

          {/* 2. Card Status Filter */}
          <div>
            <Select
              id="card-status-filter"
              value={cardStatusFilter}
              onChange={(e) => setCardStatusFilter(e.target.value as CardStatus | 'ALL')}
              options={[
                { value: 'ALL', label: 'All Card Statuses' },
                { value: 'AVAILABLE', label: 'AVAILABLE (Card)' },
                { value: 'ACTIVE', label: 'ACTIVE (Card)' },
                { value: 'BLOCKED', label: 'BLOCKED (Card)' },
              ]}
            />
          </div>

          {/* 3. Session Status Filter */}
          <div>
            <Select
              id="session-status-filter"
              value={sessionStatusFilter}
              onChange={(e) =>
                setSessionStatusFilter(
                  e.target.value as SessionStatus | 'NO_ACTIVE_SESSION' | 'ALL',
                )
              }
              options={[
                { value: 'ALL', label: 'All Session Statuses' },
                { value: 'ACTIVE', label: 'ACTIVE Session' },
                { value: 'SETTLED', label: 'SETTLED Session' },
                { value: 'NO_ACTIVE_SESSION', label: 'No Active Session' },
              ]}
            />
          </div>

          {/* 4. Branch Filter */}
          <div>
            <Select
              id="branch-filter"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Branches' },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>

          {/* 5. Date Range Filter */}
          <div>
            <Select
              id="date-filter"
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as 'ALL' | 'today' | '7d' | '30d')}
              options={[
                { value: 'ALL', label: 'All Time Range' },
                { value: 'today', label: 'Started Today' },
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
              ]}
            />
          </div>
        </div>

        {/* Active Filter Pills / Reset */}
        {(searchQuery ||
          cardStatusFilter !== 'ALL' ||
          sessionStatusFilter !== 'ALL' ||
          branchFilter !== 'ALL' ||
          dateRangeFilter !== 'ALL') && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 text-xs">
            <span className="text-slate-400">
              Showing <strong className="text-violet-300">{filteredItems.length}</strong> matching records
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCardStatusFilter('ALL');
                setSessionStatusFilter('ALL');
                setBranchFilter('ALL');
                setDateRangeFilter('ALL');
              }}
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      {isLoading ? (
        <LoadingState message="Loading card & session registry..." />
      ) : error ? (
        <ErrorState title="Failed to load sessions" message={error} onRetry={fetchCardSessionData} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-8 w-8 text-slate-500" />}
          title="No cards or sessions match filters"
          description="Try broadening your search query or resetting the status filters."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setCardStatusFilter('ALL');
                setSessionStatusFilter('ALL');
                setBranchFilter('ALL');
                setDateRangeFilter('ALL');
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : (
        <Card padding="none">
          <DataTable<CardSessionItem>
            data={filteredItems}
            columns={columns}
            keyExtractor={(item: CardSessionItem) => item.id}
          />
        </Card>
      )}

      {/* ── Session Details Inspection Modal ── */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Session Inspection: ${selectedItem?.physicalCardNumber || 'Card'}`}
        description="Comprehensive card status, live session wallet ledger, and audit history."
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-6 max-h-[66vh] overflow-y-auto pr-1">
            {/* Modal Top Overview Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-violet-300 font-mono">
                    {selectedItem.physicalCardNumber}
                  </h3>
                  <Badge variant={selectedItem.cardStatus === 'ACTIVE' ? 'success' : selectedItem.cardStatus === 'BLOCKED' ? 'danger' : 'default'}>
                    Card: {selectedItem.cardStatus}
                  </Badge>
                </div>
                {selectedItem.session ? (
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Session ID: {selectedItem.session.id}
                  </p>
                ) : (
                  <p className="text-xs text-amber-400 font-medium mt-1">
                    No active session running on this physical card
                  </p>
                )}
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400">Live Wallet Balance</span>
                <p className="font-mono text-2xl font-bold text-emerald-400">
                  {formatCurrency(selectedItem.balance)}
                </p>
              </div>
            </div>

            {/* If NO active session on this card */}
            {!selectedItem.session ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-200">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Physical Card Ready for Customer Activation
                </div>
                <p className="text-slate-400">
                  This physical card is registered in the organization registry. When a user presents this card at the POS or scans the card QR code, a new session with dedicated wallet balance will be instantiated.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-slate-300">
                  <div>
                    <span className="text-slate-500">Branch Authorization:</span>
                    <p className="font-semibold">{selectedItem.branchName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Card Registry Status:</span>
                    <p className="font-semibold">{selectedItem.cardStatus}</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Detail Tabs */}
                <div className="border-b border-slate-800">
                  <nav className="flex space-x-4 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setDetailTab('overview')}
                      className={`pb-2 border-b-2 transition-colors ${
                        detailTab === 'overview'
                          ? 'border-violet-500 text-violet-300'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab('transactions')}
                      className={`pb-2 border-b-2 transition-colors ${
                        detailTab === 'transactions'
                          ? 'border-violet-500 text-violet-300'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All Txns ({sessionTxns.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab('recharges')}
                      className={`pb-2 border-b-2 transition-colors ${
                        detailTab === 'recharges'
                          ? 'border-violet-500 text-violet-300'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Recharges ({recharges.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab('purchases')}
                      className={`pb-2 border-b-2 transition-colors ${
                        detailTab === 'purchases'
                          ? 'border-violet-500 text-violet-300'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Purchases ({purchases.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab('settlement')}
                      className={`pb-2 border-b-2 transition-colors ${
                        detailTab === 'settlement'
                          ? 'border-violet-500 text-violet-300'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Settlement Info
                    </button>
                  </nav>
                </div>

                {/* TAB CONTENT: OVERVIEW */}
                {detailTab === 'overview' && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <span className="text-slate-400">Branch Location</span>
                        <p className="font-semibold text-slate-200 mt-1">{selectedItem.branchName}</p>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <span className="text-slate-400">Session Status</span>
                        <div className="mt-1">
                          <Badge variant={selectedItem.sessionStatus === 'ACTIVE' ? 'success' : 'outline'}>
                            {selectedItem.sessionStatus}
                          </Badge>
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <span className="text-slate-400">Started At</span>
                        <p className="font-semibold text-slate-200 mt-1">
                          {selectedItem.startedAt ? formatDate(selectedItem.startedAt) : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                        <span className="text-slate-400">Settled / Closed At</span>
                        <p className="font-semibold text-slate-200 mt-1">
                          {selectedItem.settledAt ? formatDate(selectedItem.settledAt) : 'Session Active'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-400">
                      <SlidersHorizontal className="h-4 w-4 shrink-0 text-violet-400 mt-0.5" />
                      <span>
                        Card Session balance belongs exclusively to session ID <code className="font-mono text-violet-300">{selectedItem.session.id}</code>. Physical card numbers represent reusable NFC card tokens.
                      </span>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: ALL TRANSACTIONS */}
                {detailTab === 'transactions' && (
                  <div className="space-y-3">
                    {isLoadingTxns ? (
                      <LoadingState message="Loading session transactions..." />
                    ) : sessionTxns.length === 0 ? (
                      <EmptyState
                        icon={<Clock className="h-6 w-6 text-slate-500" />}
                        title="No transactions recorded"
                        description="No purchase or recharge activity has been processed in this session."
                      />
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {sessionTxns.map((txn) => (
                          <div
                            key={txn.id}
                            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              {txn.type === 'RECHARGE' ? (
                                <ArrowUpRight className="h-4 w-4 text-emerald-400 shrink-0" />
                              ) : txn.type === 'PURCHASE' ? (
                                <ShoppingBag className="h-4 w-4 text-violet-400 shrink-0" />
                              ) : (
                                <RotateCcw className="h-4 w-4 text-amber-400 shrink-0" />
                              )}
                              <div>
                                <span className="font-semibold text-slate-200 uppercase tracking-wider">{txn.type}</span>
                                <p className="text-[11px] text-slate-500 font-mono">{txn.id}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span
                                className={`font-mono font-bold ${
                                  txn.type === 'RECHARGE' ? 'text-emerald-400' : 'text-slate-200'
                                }`}
                              >
                                {txn.type === 'RECHARGE' ? '+' : '-'}{formatCurrency(txn.amount)}
                              </span>
                              <p className="text-[11px] text-slate-500">After: {formatCurrency(txn.balanceAfter ?? 0)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: RECHARGES */}
                {detailTab === 'recharges' && (
                  <div className="space-y-3 text-xs">
                    {recharges.length === 0 ? (
                      <EmptyState
                        icon={<Wallet className="h-6 w-6 text-slate-500" />}
                        title="No recharges recorded"
                        description="This session has not received any cash or UPI deposits."
                      />
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {recharges.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-emerald-400">Recharge</span>
                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
                                  {r.paymentMethod || 'CASH'}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">{r.id}</p>
                            </div>

                            <div className="text-right">
                              <span className="font-mono text-sm font-bold text-emerald-400">
                                +{formatCurrency(r.amount)}
                              </span>
                              <p className="text-[11px] text-slate-500">{formatDate(r.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: PURCHASES */}
                {detailTab === 'purchases' && (
                  <div className="space-y-3 text-xs">
                    {purchases.length === 0 ? (
                      <EmptyState
                        icon={<ShoppingBag className="h-6 w-6 text-slate-500" />}
                        title="No purchases recorded"
                        description="No product line items have been purchased in this session."
                      />
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {purchases.map((p) => (
                          <div key={p.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                              <span className="font-mono text-slate-400">{p.id}</span>
                              <span className="font-mono font-bold text-slate-100">{formatCurrency(p.amount)}</span>
                            </div>

                            {p.items && p.items.length > 0 ? (
                              <div className="space-y-1">
                                {p.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-[11px] text-slate-300">
                                    <span>
                                      {item.itemName || 'Product'} × {item.quantity}
                                    </span>
                                    <span className="font-mono">{formatCurrency(item.totalAmount ?? (item.unitPrice ? item.unitPrice * item.quantity : 0))}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500">POS Purchase Transaction</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: SETTLEMENT INFO */}
                {detailTab === 'settlement' && (
                  <div className="space-y-4 text-xs">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="text-slate-400">Settlement Lifecycle Status</span>
                        <Badge variant={selectedItem.sessionStatus === 'SETTLED' ? 'outline' : 'success'}>
                          {selectedItem.sessionStatus === 'SETTLED' ? 'SETTLED / CLOSED' : 'ACTIVE'}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="text-slate-400">Refund Amount Paid at Settlement</span>
                        <span className="font-mono font-bold text-amber-300">
                          {refundTxn ? formatCurrency(refundTxn.amount) : selectedItem.sessionStatus === 'SETTLED' ? formatCurrency(0) : 'Pending Settlement'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                        <span className="text-slate-400">Card Status After Settlement</span>
                        <Badge variant="outline" className="border-sky-500/30 text-sky-300">
                          {selectedItem.sessionStatus === 'SETTLED' ? 'AVAILABLE' : 'ACTIVE IN SESSION'}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Close / Settlement Timestamp</span>
                        <span className="text-slate-300">
                          {selectedItem.settledAt ? formatDate(selectedItem.settledAt) : 'Session remains open'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] text-amber-300">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                      <span>
                        Settlement & remaining balance refund operations are performed by Staff on POS hardware via Flutter.
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            <ModalFooter className="px-0 pb-0">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Close Inspection
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
}

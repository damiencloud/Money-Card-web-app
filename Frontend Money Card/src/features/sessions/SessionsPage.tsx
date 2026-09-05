
// ─── Customer History & Card Lifecycle Page ──────────────────────────────
// Real Customer Session History & Permanent Card Status Audit Trail.
// Multi-field Global Search by Customer Name, Phone Number, Physical Card (e.g. MC 105),
// and Event Action (Card Blocked, Card Unblocked).

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks';
import type {
  Card as CardEntity,
  SessionStatus,
  Transaction,
  Branch,
  CardSession,
  CustomerHistoryEvent,
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
import { toast } from 'sonner';
import { formatDate, formatCurrency, formatBlockedCardMessage, extractTransactionItems } from '@/utils';
import {
  CreditCard,
  Building2,
  Search,
  RefreshCw,
  Eye,
  Wallet,
  ArrowUpRight,
  ShoppingBag,
  RotateCcw,
  User,
  Phone,
  History,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  FileText,
  CheckCircle2,
} from 'lucide-react';

// ─── Customer Session Record Model ──────────────────────────────────
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

  const [activeTab, setActiveTab] = useState<'sessions' | 'card_events'>('sessions');

  const [rawCards, setRawCards] = useState<CardEntity[]>([]);
  const [rawSessions, setRawSessions] = useState<CardSession[]>([]);
  const [historyEvents, setHistoryEvents] = useState<CustomerHistoryEvent[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Filters State ────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<SessionStatus | 'ALL'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'today' | 'yesterday' | '7d' | '30d'>('ALL');

  // ─── Session Details Inspection Modal ─────────────────────────────
  const [selectedItem, setSelectedItem] = useState<CustomerHistoryItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sessionTxns, setSessionTxns] = useState<Transaction[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'timeline' | 'purchases' | 'recharges' | 'card_status'>('overview');

  // ─── Unblock Card State & Permission ──────────────────────────────
  const canUnblock = hasPermission('CARD_UNBLOCK');
  const [selectedCardToUnblock, setSelectedCardToUnblock] = useState<any | null>(null);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);

  const extractArray = <T,>(data: any): T[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.items)) return data.items;
    return [];
  };

  // ─── Fetch Sessions, Cards, History Events & Branches (Realtime) ──
  const fetchCustomerHistoryData = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const [sessionsRes, cardsRes, branchesRes, eventsRes] = await Promise.all([
        apiService.sessions.getSessions({ limit: 300 }),
        apiService.cards.getCards(),
        apiService.branches.getBranches(),
        apiService.cards.getCustomerHistoryEvents ? apiService.cards.getCustomerHistoryEvents({ limit: 200 }) : Promise.resolve({ success: true, data: { items: [] } } as any),
      ]);

      if (!sessionsRes.success) {
        if (!silent) setError(sessionsRes.error.message || 'Failed to load customer sessions');
        return;
      }

      setRawSessions(extractArray<CardSession>(sessionsRes.data));
      if (cardsRes.success) {
        setRawCards(extractArray<CardEntity>(cardsRes.data));
      }
      if (branchesRes.success) {
        setBranches(extractArray<Branch>(branchesRes.data));
      }
      if (eventsRes?.success) {
        setHistoryEvents(extractArray<CustomerHistoryEvent>(eventsRes.data));
      }
    } catch {
      if (!silent) setError('Unable to connect to the server. Please try again.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomerHistoryData(false);

    // Background polling every 3 seconds for realtime card status synchronization
    const interval = setInterval(() => {
      fetchCustomerHistoryData(true);
    }, 3000);

    // Window focus & custom event listeners
    const onFocus = () => fetchCustomerHistoryData(true);
    const onVisibility = () => {
      if (!document.hidden) fetchCustomerHistoryData(true);
    };
    const onCardsUpdated = () => fetchCustomerHistoryData(true);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('cards-updated', onCardsUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('cards-updated', onCardsUpdated);
    };
  }, [fetchCustomerHistoryData]);

  // ─── Build Customer History Records ──────────────────────────────
  const customerHistoryItems = useMemo<any[]>(() => {
    return rawSessions.map((s) => {
      const card = rawCards.find((c) => c.id === s.cardId || c.physicalCardNumber === s.physicalCardNumber);
      const branch = branches.find((b) => b.id === s.branchId);

      const physCard = s.physicalCardNumber || (card ? card.physicalCardNumber : 'MC-Card');
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
        balance: Number(s.balance) || 0,
        branchId: s.branchId,
        branchName: branch ? branch.name : ((s as any).branchName || (s as any).branch?.name || 'Main Cafeteria'),
        startedAt: s.startedAt || s.createdAt,
        settledAt: s.settledAt || null,
        issuedByName: (s as any).issuedBy?.name,
        lastActivityAt: s.updatedAt || s.createdAt || s.startedAt,
      };
    });
  }, [rawSessions, rawCards, branches]);

  // ─── Filter Customer Sessions ────────────────────────────────────
  const filteredSessions = useMemo(() => {
    return customerHistoryItems.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCustomerName = item.customerName?.toLowerCase().includes(q) ?? false;
        const matchesCustomerPhone = item.customerPhone?.toLowerCase().includes(q) ?? false;
        const matchesPhysicalNumber = item.physicalCardNumber.toLowerCase().includes(q);
        const matchesInternalNumber = item.sessionCardNumber.toLowerCase().includes(q);
        const matchesBranch = item.branchName.toLowerCase().includes(q);

        if (
          !matchesCustomerName &&
          !matchesCustomerPhone &&
          !matchesPhysicalNumber &&
          !matchesInternalNumber &&
          !matchesBranch
        ) {
          return false;
        }
      }

      if (sessionStatusFilter !== 'ALL' && item.sessionStatus !== sessionStatusFilter) {
        return false;
      }

      if (branchFilter !== 'ALL' && item.branchId !== branchFilter) {
        return false;
      }

      if (dateRangeFilter !== 'ALL' && item.startedAt) {
        const itemDate = new Date(item.startedAt);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const itemTime = itemDate.getTime();

        if (dateRangeFilter === 'today' && itemTime < startOfToday) return false;
        if (dateRangeFilter === 'yesterday') {
          const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
          if (itemTime < startOfYesterday || itemTime >= startOfToday) return false;
        }
        if (dateRangeFilter === '7d') {
          const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
          if (itemTime < sevenDaysAgo) return false;
        }
        if (dateRangeFilter === '30d') {
          const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
          if (itemTime < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [customerHistoryItems, searchQuery, sessionStatusFilter, branchFilter, dateRangeFilter]);

  // ─── Currently Blocked Cards Only ────────────────────────────────
  // Cards currently in BLOCKED status. If a card gets unblocked, it immediately goes away.
  const blockedCardItems = useMemo(() => {
    const blockedCards = rawCards.filter((c) => c.status === 'BLOCKED');

    return blockedCards.map((card) => {
      const matchingEvents = historyEvents
        .filter(
          (e) =>
            (e.cardId === card.id || e.physicalCardNumber === card.physicalCardNumber) &&
            e.action === 'CARD_BLOCKED',
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const latestBlockEvent = matchingEvents[0];
      const branchObj = branches.find((b) => b.id === card.currentBranchId);

      const customerName = card.activeSession?.customerName || latestBlockEvent?.customerName || null;
      const customerPhone = card.activeSession?.customerPhone || latestBlockEvent?.customerPhone || null;
      const reason = card.blockedReason || latestBlockEvent?.reason || 'Card Blocked';
      const performedByName = card.blockedBy || latestBlockEvent?.performedByName || 'Staff Member';
      const blockedAt = card.blockedAt || latestBlockEvent?.createdAt || card.updatedAt;

      return {
        id: card.id,
        cardId: card.id,
        physicalCardNumber: card.physicalCardNumber || card.qrToken,
        qrToken: card.qrToken,
        status: 'BLOCKED' as const,
        customerName,
        customerPhone,
        reason,
        performedByName,
        branchName: branchObj?.name || latestBlockEvent?.branchName || 'Main Cafeteria',
        branchId: card.currentBranchId || latestBlockEvent?.branchId,
        blockedAt,
      };
    });
  }, [rawCards, historyEvents, branches]);

  // ─── Filter Currently Blocked Cards ──────────────────────────────
  const filteredBlockedCards = useMemo(() => {
    return blockedCardItems.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCustomer = item.customerName?.toLowerCase().includes(q) ?? false;
        const matchesPhone = item.customerPhone?.toLowerCase().includes(q) ?? false;
        const matchesCard = item.physicalCardNumber.toLowerCase().includes(q);
        const matchesStaff = item.performedByName.toLowerCase().includes(q);
        const matchesReason = item.reason.toLowerCase().includes(q);
        const matchesBranch = item.branchName.toLowerCase().includes(q);

        if (!matchesCustomer && !matchesPhone && !matchesCard && !matchesStaff && !matchesReason && !matchesBranch) {
          return false;
        }
      }

      if (branchFilter !== 'ALL' && item.branchId && item.branchId !== branchFilter) {
        return false;
      }

      if (dateRangeFilter !== 'ALL' && item.blockedAt) {
        const itemDate = new Date(item.blockedAt);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const itemTime = itemDate.getTime();

        if (dateRangeFilter === 'today' && itemTime < startOfToday) return false;
        if (dateRangeFilter === 'yesterday') {
          const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
          if (itemTime < startOfYesterday || itemTime >= startOfToday) return false;
        }
        if (dateRangeFilter === '7d') {
          const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
          if (itemTime < sevenDaysAgo) return false;
        }
        if (dateRangeFilter === '30d') {
          const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
          if (itemTime < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [blockedCardItems, searchQuery, branchFilter, dateRangeFilter]);

  // ─── KPI Metrics (Business Logic) ────────────────────────────────
  const activeCount = useMemo(
    () => customerHistoryItems.filter((i) => i.sessionStatus === 'ACTIVE').length,
    [customerHistoryItems],
  );

  const availableCardsCount = useMemo(
    () => rawCards.filter((c) => c.status === 'AVAILABLE' && !c.activeSession).length,
    [rawCards],
  );

  const blockedCardsCount = useMemo(
    () => rawCards.filter((c) => c.status === 'BLOCKED').length,
    [rawCards],
  );

  const totalActiveBalance = useMemo(
    () =>
      customerHistoryItems
        .filter((i) => i.sessionStatus === 'ACTIVE')
        .reduce((sum, i) => sum + i.balance, 0),
    [customerHistoryItems],
  );

  // ─── Unblock Action Handler ──────────────────────────────────────
  const handleConfirmUnblock = async () => {
    if (!selectedCardToUnblock) return;
    setIsUnblocking(true);
    try {
      const res = await apiService.cards.unblockCard(selectedCardToUnblock.cardId);
      if (res.success) {
        toast.success(`Card ${selectedCardToUnblock.physicalCardNumber} has been unblocked.`);
        setShowUnblockModal(false);
        setSelectedCardToUnblock(null);
        fetchCustomerHistoryData(true);
        window.dispatchEvent(new Event('cards-updated'));
      } else {
        toast.error(res.error.message || 'Failed to unblock card');
      }
    } catch {
      toast.error('Network error while unblocking card');
    } finally {
      setIsUnblocking(false);
    }
  };

  // ─── Open Session Detail Inspection ──────────────────────────────
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

  // ─── Card Events for Selected Session Card ───────────────────────
  const selectedCardEvents = useMemo(() => {
    if (!selectedItem) return [];
    return historyEvents.filter(
      (e) => e.cardId === selectedItem.cardId || e.physicalCardNumber === selectedItem.physicalCardNumber,
    );
  }, [selectedItem, historyEvents]);

  // ─── Permission Guard ────────────────────────────────────────────
  if (!hasPermission('SESSION_VIEW')) {
    return (
      <ErrorState
        title="Access Denied"
        message="You do not have the required SESSION_VIEW permission to view customer history."
      />
    );
  }

  // ─── Columns for Sessions Table ──────────────────────────────────
  const sessionColumns = [
    {
      key: 'customerName',
      header: 'Customer',
      render: (item: CustomerHistoryItem) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-sm shrink-0">
            {item.customerName ? item.customerName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 dark:text-slate-100">
                {item.customerName || 'Walk-in Customer'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDetails(item);
                }}
                className="p-1 rounded-md text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 border border-slate-700/60 hover:border-emerald-500/30 transition-colors cursor-pointer"
                title="View customer session details"
                aria-label={`View session for ${item.customerName || 'Walk-in Customer'}`}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
            {item.customerPhone && (
              <p className="text-xs text-slate-300 dark:text-slate-300 font-medium flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3 text-slate-400" />
                {item.customerPhone}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'physicalCardNumber',
      header: 'Card Number',
      render: (item: CustomerHistoryItem) => (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-emerald-400" />
          <span className="font-mono font-bold text-slate-100 dark:text-slate-100">
            {item.physicalCardNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'sessionStatus',
      header: 'Status',
      render: (item: CustomerHistoryItem) => (
        <Badge variant={item.sessionStatus === 'ACTIVE' ? 'success' : 'outline'}>
          {item.sessionStatus}
        </Badge>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (item: CustomerHistoryItem) => (
        <span className="font-mono font-bold text-slate-100 dark:text-slate-100">
          {formatCurrency(item.balance)}
        </span>
      ),
    },
    {
      key: 'branchName',
      header: 'Branch',
      render: (item: CustomerHistoryItem) => (
        <span className="text-sm font-medium text-slate-200 dark:text-slate-200 flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-slate-300" />
          {item.branchName}
        </span>
      ),
    },
    {
      key: 'startedAt',
      header: 'Issued At',
      render: (item: CustomerHistoryItem) => (
        <span className="text-xs font-medium text-slate-200 dark:text-slate-200">
          {formatDate(item.startedAt)}
        </span>
      ),
    },
  ];

  // ─── Columns for Currently Blocked Cards ─────────────────────────
  const blockedCardColumns = [
    {
      key: 'physicalCardNumber',
      header: 'Card Number',
      render: (card: any) => (
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-400" />
          <span className="font-mono font-bold text-slate-100 dark:text-slate-100">
            {card.physicalCardNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer / Holder',
      render: (card: any) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300 font-bold text-xs">
            {card.customerName ? card.customerName.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
          </div>
          <div>
            <p className="font-bold text-slate-100 dark:text-slate-100 text-sm">
              {card.customerName || 'Unassigned / General Card'}
            </p>
            {card.customerPhone && (
              <p className="text-xs text-slate-300 dark:text-slate-300">{card.customerPhone}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: () => (
        <Badge variant="danger" className="gap-1 font-semibold text-xs">
          <Lock className="h-3 w-3" />
          Blocked
        </Badge>
      ),
    },
    {
      key: 'reason',
      header: 'Blocked Reason',
      render: (card: any) => {
        const displayReason = formatBlockedCardMessage(card.reason, card.performedByName);
        return (
          <span
            className="text-xs text-rose-300 font-medium max-w-xs truncate block"
            title={displayReason}
          >
            {displayReason || 'Card Blocked'}
          </span>
        );
      },
    },
    {
      key: 'performedByName',
      header: 'Blocked By',
      render: (card: any) => (
        <span className="text-sm font-semibold text-slate-100 dark:text-slate-100">
          {card.performedByName || 'Staff Member'}
        </span>
      ),
    },
    {
      key: 'branchName',
      header: 'Branch',
      render: (card: any) => (
        <span className="text-xs font-medium text-slate-200 dark:text-slate-200 flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          {card.branchName}
        </span>
      ),
    },
    {
      key: 'blockedAt',
      header: 'Blocked At',
      render: (card: any) => (
        <span className="text-xs font-medium text-slate-200 dark:text-slate-200">
          {formatDate(card.blockedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right whitespace-nowrap',
      render: (card: any) =>
        canUnblock ? (
          <Button
            variant="outline"
            size="sm"
            className="text-xs py-1 px-2.5 border-slate-700 text-emerald-400 hover:border-emerald-500 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
            onClick={() => {
              setSelectedCardToUnblock(card);
              setShowUnblockModal(true);
            }}
            leftIcon={<Unlock className="h-3.5 w-3.5" />}
          >
            Unblock
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Customer History & Audit Trail
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCustomerHistoryData()}
            isLoading={isLoading}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4 text-emerald-600" />
            <span>Refresh History</span>
          </Button>
        </div>
      </div>

      {/* ─── Top Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Customer Sessions"
          value={activeCount}
          icon={<Wallet className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="Active Floating Balance"
          value={formatCurrency(totalActiveBalance)}
          icon={<CreditCard className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Available Cards Ready for Issue"
          value={availableCardsCount}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
        />
        <StatCard
          title="Currently Blocked Cards"
          value={blockedCardsCount}
          icon={<ShieldAlert className="h-5 w-5 text-rose-600" />}
        />
      </div>

      {/* ─── Navigation Tabs ──────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
            activeTab === 'sessions'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Customer Sessions & Purchases ({filteredSessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('card_events')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
            activeTab === 'card_events'
              ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Blocked Cards ({filteredBlockedCards.length})</span>
        </button>
      </div>

      {/* ─── Filter Bar ───────────────────────────────────────────── */}
      <UiCard padding="md" className="border-slate-800 bg-slate-900/60">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search Bar (30 char limit) */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, phone, or card number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.slice(0, 30))}
              maxLength={30}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>

          {/* Second Field: Status Filter in Sessions / Active Blocked Status in Blocked Cards */}
          {activeTab === 'sessions' ? (
            <Select
              value={sessionStatusFilter}
              onChange={(e) => setSessionStatusFilter(e.target.value as any)}
              options={[
                { value: 'ALL', label: 'All Sessions' },
                { value: 'ACTIVE', label: 'In Use (Active Now)' },
                { value: 'SETTLED', label: 'Completed (Settled)' },
              ]}
            />
          ) : (
            <div className="flex items-center justify-center px-3 py-2 rounded-lg bg-rose-950/30 border border-rose-500/30 text-xs font-bold text-rose-300">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse mr-2" />
              <span>Currently Blocked Cards</span>
            </div>
          )}

          {/* Branch Filter */}
          <Select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Branches' },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />

          {/* Date Range Filter */}
          <Select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value as any)}
            options={[
              { value: 'ALL', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
            ]}
          />
        </div>
      </UiCard>

      {/* ─── Content Views ────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingState message="Loading customer history..." />
      ) : error ? (
        <ErrorState title="Error Loading History" message={error} onRetry={fetchCustomerHistoryData} />
      ) : activeTab === 'sessions' ? (
        filteredSessions.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-8 w-8 text-slate-400" />}
            title={searchQuery || sessionStatusFilter !== 'ALL' || branchFilter !== 'ALL' || dateRangeFilter !== 'ALL' ? "No matching sessions found" : "No customer sessions yet"}
            description={searchQuery || sessionStatusFilter !== 'ALL' || branchFilter !== 'ALL' || dateRangeFilter !== 'ALL' ? "Try adjusting your search or filters." : "Active and past cafeteria card sessions will appear here in real time."}
            action={
              searchQuery || sessionStatusFilter !== 'ALL' || branchFilter !== 'ALL' || dateRangeFilter !== 'ALL' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSessionStatusFilter('ALL');
                    setBranchFilter('ALL');
                    setDateRangeFilter('ALL');
                  }}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Clear Filters</span>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTable data={filteredSessions} columns={sessionColumns} />
        )
      ) : filteredBlockedCards.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-8 w-8 text-emerald-400" />}
          title={searchQuery || branchFilter !== 'ALL' || dateRangeFilter !== 'ALL' ? "No matching blocked cards" : "No currently blocked cards"}
          description={searchQuery || branchFilter !== 'ALL' || dateRangeFilter !== 'ALL' ? "Try clearing search or filters to see all blocked cards." : "All cards are currently active or ready in the registry. When a card is blocked, it will appear here."}
          action={
            searchQuery || branchFilter !== 'ALL' || dateRangeFilter !== 'ALL' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setBranchFilter('ALL');
                  setDateRangeFilter('ALL');
                }}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Clear Filters</span>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable data={filteredBlockedCards} columns={blockedCardColumns} keyExtractor={(c) => c.id} />
      )}

      {/* ─── Unblock Card Confirmation Modal ─────────────────────── */}
      {showUnblockModal && selectedCardToUnblock && (
        <Modal
          isOpen={showUnblockModal}
          onClose={() => {
            setShowUnblockModal(false);
            setSelectedCardToUnblock(null);
          }}
          title={`Unblock Card — ${selectedCardToUnblock.physicalCardNumber}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Are you sure you want to unblock card{' '}
              <strong className="text-white font-mono">{selectedCardToUnblock.physicalCardNumber}</strong>?
            </p>
            <p className="text-xs text-slate-400">
              This card will be restored to active operational status in the registry and will immediately be removed from the blocked cards list.
            </p>
            <ModalFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowUnblockModal(false);
                  setSelectedCardToUnblock(null);
                }}
                disabled={isUnblocking}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmUnblock}
                isLoading={isUnblocking}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold"
              >
                Confirm Unblock
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}

      {/* ─── Session & Card Inspection Modal ──────────────────────── */}
      {showDetailModal && selectedItem && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Customer Session — Card ${selectedItem.physicalCardNumber}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Customer & Card Summary Banner */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Customer Profile</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedItem.customerName || 'Walk-in Customer'}
                </h3>
                {selectedItem.customerPhone && (
                  <p className="text-xs text-slate-500">{selectedItem.customerPhone}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-500 uppercase">Session Balance</p>
                <p className="text-xl font-bold font-mono text-emerald-600">
                  {formatCurrency(selectedItem.balance)}
                </p>
                <Badge variant={selectedItem.sessionStatus === 'ACTIVE' ? 'success' : 'outline'}>
                  {selectedItem.sessionStatus}
                </Badge>
              </div>
            </div>

            {/* Modal Detail Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 text-sm">
              <button
                onClick={() => setDetailTab('overview')}
                className={`px-4 py-2 font-semibold border-b-2 ${
                  detailTab === 'overview'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setDetailTab('timeline')}
                className={`px-4 py-2 font-semibold border-b-2 ${
                  detailTab === 'timeline'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Transactions ({sessionTxns.length})
              </button>
              <button
                onClick={() => setDetailTab('card_status')}
                className={`px-4 py-2 font-semibold border-b-2 ${
                  detailTab === 'card_status'
                    ? 'border-rose-600 text-rose-600'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Card Audit Events ({selectedCardEvents.length})
              </button>
            </div>

            {/* Detail Tab Contents */}
            {detailTab === 'overview' && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Physical Card</p>
                  <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {selectedItem.physicalCardNumber}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Branch Location</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedItem.branchName}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Session Started</p>
                  <p className="text-slate-900 dark:text-slate-100">
                    {formatDate(selectedItem.startedAt)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Settled At</p>
                  <p className="text-slate-900 dark:text-slate-100">
                    {selectedItem.settledAt ? formatDate(selectedItem.settledAt) : 'Still Active'}
                  </p>
                </div>
              </div>
            )}

            {detailTab === 'timeline' && (
              isLoadingTxns ? (
                <LoadingState message="Loading transactions..." />
              ) : sessionTxns.length === 0 ? (
                <EmptyState
                  icon={<History className="h-6 w-6 text-slate-400" />}
                  title="No Transactions"
                  description="No purchase or recharge activity recorded for this session yet."
                />
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                  {sessionTxns.map((tx) => {
                    const isRecharge = tx.type === 'RECHARGE' || String(tx.type).startsWith('RECHARGE');
                    const isRefund = tx.type === 'REFUND' || String(tx.type).startsWith('REFUND');
                    const isPurchase = tx.type === 'PURCHASE';
                    const items = extractTransactionItems(tx.items);

                    let title = 'Transaction';
                    if (isPurchase) {
                      if (items.length > 0) {
                        title = items
                          .map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ''}${i.name}`)
                          .join(', ');
                      } else {
                        title = 'POS Purchase';
                      }
                    } else if (isRecharge) {
                      title =
                        tx.type === 'RECHARGE_UPI'
                          ? 'Wallet Recharge (UPI)'
                          : tx.type === 'RECHARGE_CASH'
                          ? 'Wallet Recharge (Cash)'
                          : 'Wallet Recharge';
                    } else if (isRefund) {
                      title = 'Settlement Refund';
                    }

                    return (
                      <div
                        key={tx.id}
                        className="flex items-start justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-3">
                          <div
                            className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                              isPurchase
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                                : isRecharge
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                            }`}
                          >
                            {isPurchase ? (
                              <ShoppingBag className="h-4 w-4" />
                            ) : isRecharge ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 leading-snug break-words">
                              {title}
                            </p>

                            {/* What all they bought chips / line item breakdown */}
                            {isPurchase && items.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {items.map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                  >
                                    <span>{item.quantity}× {item.name}</span>
                                    {item.total !== undefined ? (
                                      <span className="text-slate-400 dark:text-slate-500 font-mono">
                                        ({formatCurrency(item.total)})
                                      </span>
                                    ) : item.unitPrice !== undefined ? (
                                      <span className="text-slate-400 dark:text-slate-500 font-mono">
                                        (@{formatCurrency(item.unitPrice)})
                                      </span>
                                    ) : null}
                                  </span>
                                ))}
                              </div>
                            )}

                            <p className="text-xs text-slate-500 mt-1">{formatDate(tx.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`font-mono font-bold ${
                              isRecharge
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {isRecharge ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                          {tx.balanceAfter !== undefined && (
                            <p className="text-xs text-slate-400">Bal: {formatCurrency(tx.balanceAfter)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {detailTab === 'card_status' && (
              selectedCardEvents.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck className="h-6 w-6 text-emerald-500" />}
                  title="No Status Interventions"
                  description="This card has not had any manual block/unblock actions performed by staff."
                />
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {selectedCardEvents.map((e) => (
                    <div
                      key={e.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                            e.action === 'CARD_BLOCKED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {e.action === 'CARD_BLOCKED' ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                          {e.action === 'CARD_BLOCKED' ? 'Card Blocked' : 'Card Unblocked'}
                        </span>
                        <span className="text-xs text-slate-400">{formatDate(e.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Performed by: <strong>{e.performedByName}</strong>
                      </p>
                      {e.reason && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          <strong className="text-slate-600 dark:text-slate-300 not-italic">Reason:</strong>{' '}
                          {formatBlockedCardMessage(e.reason, e.performedByName)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )
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

import { formatCurrency, formatDate, cn, buildCardBlockReason, formatBlockedCardMessage } from '@/utils';
import { generateSecureToken } from '@/utils/cryptoRandom';
import { toast } from 'sonner';
// ─── Cards Management Page (M7) ──────────────────────────────
// External Bulk QR Import & Organization Card Number Management.
// Uses apiService abstraction strictly — does NOT import mock handlers directly.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiService } from '@/services/api';
import { usePermissions, useAuth } from '@/hooks';
import type {
  Card as CardEntity,
  CardStatus,
  CardAssignmentStatus,
  Branch,
  CardSession,
  Transaction,
  OrganizationOverview,
} from '@/types';
import {
  Button,
  Input,
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
import { UnauthorizedPage } from '@/features/auth';
import {
  CreditCard,
  Search,
  Lock,
  Unlock,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Copy,
  Check,
  Zap,
  Tag,
  ShieldAlert,
  Trash2,
  Camera,
  CameraOff,
  Scan,
  X,
  ChevronDown,
  ChevronUp,
  ArrowDown,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { CameraQrScanner } from '@/components/scanner/CameraQrScanner';
import { filterCards } from './cardsFilter';

export function CardsPage() {
  const { hasPermission } = usePermissions();
  const { user } = useAuth();

  const [blockReasonCategory, setBlockReasonCategory] = useState('Lost or Stolen Card');
  const [additionalBlockReason, setAdditionalBlockReason] = useState('');

  const canView = hasPermission('CARD_VIEW');
  const canIssue = hasPermission('CARD_ISSUE');
  const canBlock = hasPermission('CARD_BLOCK');
  const canUnblock = hasPermission('CARD_UNBLOCK');

  const [allCards, setAllCards] = useState<CardEntity[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [orgOverview, setOrgOverview] = useState<OrganizationOverview | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CardStatus | 'ALL'>('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<CardAssignmentStatus | 'ALL'>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  // Modals
  const [showQrImportModal, setShowQrImportModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteCardModal, setShowDeleteCardModal] = useState(false);
  const [deleteCardApiError, setDeleteCardApiError] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [selectedQrCard, setSelectedQrCard] = useState<CardEntity | null>(null);
  const [isCopiedToken, setIsCopiedToken] = useState(false);
  const [isCardsInUseOpen, setIsCardsInUseOpen] = useState(false);
  const [inUseSearchQuery, setInUseSearchQuery] = useState('');
  const [inUsePage, setInUsePage] = useState(1);

  // Selected Card for Details, Assign, or Block
  const [selectedCard, setSelectedCard] = useState<CardEntity | null>(null);
  const [_cardTransactions, setCardTransactions] = useState<Transaction[]>([]);
  const [cardHistorySessions, setCardHistorySessions] = useState<CardSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Individual Card Number Assignment Form State
  const [assignCardNumberInput, setAssignCardNumberInput] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Multi-QR Scan & Auto-Register State
  const [cardPrefix, setCardPrefix] = useState('MC-');
  const [startSequence, setStartSequence] = useState<number>(1);
  const padZeros = true;
  const autoRegisterOnScan = true;
  const [scannerInputValue, setScannerInputValue] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch Cards Data ─────────────────────────────────────────────
  const fetchCardsData = useCallback(async () => {
    setError(null);
    try {
      const [cardsRes, branchesRes, orgRes] = await Promise.all([
        apiService.cards.getCards({ limit: 1000 }),
        apiService.branches.getBranches(),
        apiService.organizations.getOrganization(),
      ]);

      if (!cardsRes.success) {
        setError(cardsRes.error.message || 'Failed to load card list');
        return;
      }

      const items = Array.isArray(cardsRes.data) ? cardsRes.data : (cardsRes.data?.items || []);
      setAllCards(items);
      if (branchesRes.success) {
        const bItems = Array.isArray(branchesRes.data) ? branchesRes.data : (branchesRes.data?.items || []);
        setBranches(bItems);
      }
      if (orgRes.success) setOrgOverview(orgRes.data);
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCardsData();
  }, [fetchCardsData]);

  // ─── Filtered Cards ────────────────────────────────────────────────
  const filteredCards = useMemo(() => {
    return filterCards(allCards, {
      searchQuery,
      statusFilter,
      assignmentFilter,
      branchFilter,
    });
  }, [allCards, searchQuery, statusFilter, assignmentFilter, branchFilter]);

  const isFiltered = useMemo(() => {
    return Boolean(
      searchQuery.trim() ||
      statusFilter !== 'ALL' ||
      assignmentFilter !== 'ALL' ||
      branchFilter !== 'ALL'
    );
  }, [searchQuery, statusFilter, assignmentFilter, branchFilter]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setAssignmentFilter('ALL');
    setBranchFilter('ALL');
  }, []);

  // Summary Metrics
  const totalCardsCount = allCards.length;
  const activeCardsList = useMemo(() => {
    return allCards.filter((c) => c.status === 'ACTIVE' || !!c.activeSession);
  }, [allCards]);
  const activeCardsCount = activeCardsList.length;
  const availableCardsCount = allCards.filter((c) => c.status === 'AVAILABLE' && !c.activeSession).length;
  const blockedCardsCount = allCards.filter((c) => c.status === 'BLOCKED').length;
  const effectiveCardLimit = (orgOverview as any)?.effectiveLimits?.cardLimit ?? 100;

  // ─── Filtered & Paginated In-Use Cards for Dropdown View ─────────
  const filteredInUseCards = useMemo(() => {
    if (!inUseSearchQuery.trim()) return activeCardsList;
    const q = inUseSearchQuery.toLowerCase().trim();
    return activeCardsList.filter((c) => {
      const cardNum = (c.physicalCardNumber || c.activeSession?.sessionCardNumber || '').toLowerCase();
      const name = (c.activeSession?.customerName || '').toLowerCase();
      const phone = (c.activeSession?.customerPhone || '').toLowerCase();
      return cardNum.includes(q) || name.includes(q) || phone.includes(q);
    });
  }, [activeCardsList, inUseSearchQuery]);

  const IN_USE_PAGE_SIZE = 12;
  const totalInUsePages = Math.max(1, Math.ceil(filteredInUseCards.length / IN_USE_PAGE_SIZE));
  const currentInUsePage = Math.min(inUsePage, totalInUsePages);

  const paginatedInUseCards = useMemo(() => {
    const start = (currentInUsePage - 1) * IN_USE_PAGE_SIZE;
    return filteredInUseCards.slice(start, start + IN_USE_PAGE_SIZE);
  }, [filteredInUseCards, currentInUsePage]);

  const handleInUseSearchChange = (val: string) => {
    setInUseSearchQuery(val.slice(0, 30));
    setInUsePage(1);
  };

  const handleViewAllInMainTable = () => {
    setAssignmentFilter('ASSIGNED');
    setStatusFilter('ACTIVE');
    const tableEl = document.getElementById('cards-table-container');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ─── Execute Individual Card Number Assignment ────────────────────
  const handleOpenAssignModal = (card: CardEntity) => {
    setSelectedCard(card);
    setAssignCardNumberInput(card.physicalCardNumber || '');
    setAssignError(null);
    setShowAssignModal(true);
  };

  const handleAssignCardNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCard) return;

    const clean = assignCardNumberInput.trim().toUpperCase();
    if (!clean) {
      setAssignError('Please enter a valid card number');
      return;
    }

    // Check existing card numbers in current org
    const exists = allCards.some(
      (c) => c.id !== selectedCard.id && c.physicalCardNumber?.toUpperCase() === clean,
    );
    if (exists) {
      setAssignError(`Card number '${clean}' is already assigned to another card in your organization.`);
      return;
    }

    setIsAssigning(true);
    setAssignError(null);
    try {
      const res = await apiService.cards.assignCardNumber(selectedCard.id, { cardNumber: clean });
      if (!res.success) {
        setAssignError(res.error.message || 'Failed to assign card number');
        return;
      }

      toast.success(`Card number ${clean} successfully assigned to QR ${selectedCard.qrToken}!`);
      setShowAssignModal(false);
      setSelectedCard(null);
      fetchCardsData();
    } catch {
      setAssignError('Network error while assigning card number');
    } finally {
      setIsAssigning(false);
    }
  };

  // ─── Multi-QR Scan, Camera & Auto-Register Logic ─────────────────
  const initSequenceForPrefix = useCallback(
    (prefix: string) => {
      const cleanPrefix = prefix.trim().toUpperCase();
      let maxNum = 0;
      for (const c of allCards) {
        if (c.physicalCardNumber) {
          const upper = c.physicalCardNumber.trim().toUpperCase();
          if (upper.startsWith(cleanPrefix)) {
            const numPart = upper.slice(cleanPrefix.length).trim();
            const val = parseInt(numPart, 10);
            if (!isNaN(val) && val > maxNum) {
              maxNum = val;
            }
          }
        }
      }
      return maxNum + 1;
    },
    [allCards],
  );

  const getNextAvailableNumber = useCallback(
    (prefix: string, baseSeq: number, excludeList: string[] = []): number => {
      const cleanPrefix = prefix.trim().toUpperCase();
      const existingNumbers = new Set(
        allCards
          .map((c) => (c.physicalCardNumber || '').trim().toUpperCase())
          .filter(Boolean),
      );
      excludeList.forEach((n) => existingNumbers.add(n.toUpperCase()));

      let current = Math.max(1, baseSeq);
      while (true) {
        const formatted = padZeros
          ? `${cleanPrefix}${String(current).padStart(3, '0')}`
          : `${cleanPrefix}${current}`;
        if (!existingNumbers.has(formatted)) {
          return current;
        }
        current++;
      }
    },
    [allCards, padZeros],
  );

  const playBeep = (isSuccess = true) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isSuccess ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(isSuccess ? 880 : 330, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (isSuccess ? 0.12 : 0.25));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (isSuccess ? 0.12 : 0.25));
    } catch {
      // Ignore audio policy restrictions
    }
  };

  const handleProcessScannedQr = async (rawQr: string) => {
    let cleanQr = rawQr.trim();
    if (!cleanQr) return;

    // Normalize QR if URL
    if (cleanQr.includes('/')) {
      const parts = cleanQr.split('/');
      cleanQr = parts[parts.length - 1].split('?')[0].trim();
    }

    // Check if already registered in organization
    const existingCard = allCards.find((c) => c.qrToken.toLowerCase() === cleanQr.toLowerCase());
    if (existingCard) {
      toast.error(
        `QR '${cleanQr}' is already registered (${existingCard.physicalCardNumber || 'Card'}).`,
      );
      playBeep(false);
      setScannerInputValue('');
      return;
    }

    // Quota check
    const plannedCount = allCards.length + 1;
    if (plannedCount > effectiveCardLimit) {
      toast.error(`Subscription limit reached (${effectiveCardLimit} cards max). Cannot register more.`);
      playBeep(false);
      setScannerInputValue('');
      return;
    }

    // Compute next card number
    const nextSeq = getNextAvailableNumber(cardPrefix, startSequence, []);
    const assignedCardNumber = padZeros
      ? `${cardPrefix.trim().toUpperCase()}${String(nextSeq).padStart(3, '0')}`
      : `${cardPrefix.trim().toUpperCase()}${nextSeq}`;

    setScannerInputValue('');

    if (autoRegisterOnScan) {
      try {
        const res = await apiService.cards.importQrCodes({
          mappings: [{ qrCode: cleanQr, cardNumber: assignedCardNumber }],
        });

        if (!res.success) {
          toast.error(res.error.message || 'Failed to auto-register card');
          playBeep(false);
          return;
        }

        playBeep(true);
        toast.success(`✓ Auto-Registered: ${assignedCardNumber}`);
        setStartSequence(nextSeq + 1);

        // Instant optimistic state update: 0ms UI lag
        const createdCard: CardEntity = (res.data as any)?.cards?.[0] || {
          id: generateSecureToken('card'),
          organizationId: user?.organizationId || '',
          qrToken: cleanQr,
          physicalCardNumber: assignedCardNumber,
          assignmentStatus: 'ASSIGNED',
          status: 'AVAILABLE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setAllCards((prev) => [createdCard, ...prev]);
      } catch {
        toast.error('Network error while auto-registering card');
        playBeep(false);
      }
    } else {
      // Queued mode
      playBeep(true);
      toast.info(`Scanned ${assignedCardNumber} (Queued)`);
      setStartSequence(nextSeq + 1);
    }

    scannerInputRef.current?.focus();
  };

  const handleOpenQrImportModal = () => {
    const nextSeq = initSequenceForPrefix(cardPrefix);
    setStartSequence(nextSeq);
    setIsCameraActive(false);
    setShowQrImportModal(true);
    setTimeout(() => scannerInputRef.current?.focus(), 150);
  };

  const handleCloseQrImportModal = () => {
    setShowQrImportModal(false);
    setIsCameraActive(false);
    setScannerInputValue('');
    fetchCardsData();
  };

  // ─── Inspect Card Details ─────────────────────────────────────────
  const handleOpenDetails = async (card: CardEntity) => {
    setSelectedCard(card);
    setShowDetailsModal(true);
    setIsLoadingHistory(true);
    setCardHistorySessions([]);
    setCardTransactions([]);

    try {
      const sessionsRes = await apiService.sessions.getSessions({ cardId: card.id, limit: 20 });
      if (sessionsRes.success) {
        const sItems = Array.isArray(sessionsRes.data) ? sessionsRes.data : (sessionsRes.data?.items || []);
        setCardHistorySessions(sItems);
      }
    } catch {
      // Ignore background load error
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // ─── Delete Card Action ───────────────────────────────────────────
  const handleOpenDeleteCard = (card: CardEntity) => {
    setSelectedCard(card);
    setDeleteCardApiError(null);
    setShowDeleteCardModal(true);
  };

  const handleDeleteCardSubmit = async () => {
    if (!selectedCard) return;
    setDeleteCardApiError(null);
    try {
      const res = await apiService.cards.deleteCard(selectedCard.id);
      if (!res.success) {
        setDeleteCardApiError(res.error.message || 'Failed to delete card');
        return;
      }

      toast.success(
        res.data?.archived
          ? `Card ${selectedCard.physicalCardNumber || selectedCard.qrToken} deactivated to preserve transaction history`
          : `Card ${selectedCard.physicalCardNumber || selectedCard.qrToken} permanently deleted`,
      );
      setShowDeleteCardModal(false);
      fetchCardsData();
    } catch {
      setDeleteCardApiError('Network error while deleting card');
    }
  };

  // ─── Block / Unblock Actions ──────────────────────────────────────
  const handleConfirmBlock = async () => {
    if (!selectedCard) return;
    try {
      const notes = additionalBlockReason.trim();
      const fullReason = buildCardBlockReason(
        blockReasonCategory,
        notes,
        user?.name,
        user?.role,
      );

      const res = await apiService.cards.blockCard(selectedCard.id, fullReason);
      if (res.success) {
        toast.success(`Card ${selectedCard.physicalCardNumber || selectedCard.qrToken} has been blocked.`);
        setShowBlockModal(false);
        setAdditionalBlockReason('');
        setBlockReasonCategory('Lost or Stolen Card');
        fetchCardsData();
        window.dispatchEvent(new CustomEvent('cards-updated'));
      } else {
        toast.error(res.error.message || 'Failed to block card');
      }
    } catch {
      toast.error('Network error while blocking card');
    }
  };

  const handleConfirmUnblock = async () => {
    if (!selectedCard) return;
    try {
      const res = await apiService.cards.unblockCard(selectedCard.id);
      if (res.success) {
        toast.success(`Card ${selectedCard.physicalCardNumber || selectedCard.qrToken} has been unblocked.`);
        setShowUnblockModal(false);
        fetchCardsData();
        window.dispatchEvent(new CustomEvent('cards-updated'));
      } else {
        toast.error(res.error.message || 'Failed to unblock card');
      }
    } catch {
      toast.error('Network error while unblocking card');
    }
  };

  if (!canView) {
    return <UnauthorizedPage />;
  }

  // ─── Table Columns ────────────────────────────────────────────────
  const cardColumns = [
    {
      key: 'physicalCardNumber',
      header: 'Card & QR',
      render: (card: CardEntity) => {
        const isAssigned = !!card.physicalCardNumber && card.assignmentStatus !== 'UNASSIGNED';
        return (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSelectedQrCard(card)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/60"
              title="Click to view QR code"
            >
              <QrCode className="h-4 w-4 text-emerald-400" />
            </button>
            <div>
              {isAssigned ? (
                <span className="font-mono font-bold text-slate-100 text-sm">
                  {card.physicalCardNumber}
                </span>
              ) : (
                <span className="inline-flex items-center text-amber-400 text-xs font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Unassigned
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (card: CardEntity) => {
        const isUnassigned = !card.physicalCardNumber || card.assignmentStatus === 'UNASSIGNED';
        if (card.status === 'BLOCKED') {
          const displayReason = formatBlockedCardMessage(card.blockedReason, card.blockedBy);
          return (
            <div className="flex flex-col gap-0.5">
              <Badge variant="danger">Blocked</Badge>
              {card.blockedReason && (
                <span className="text-[10px] text-rose-300 max-w-[180px] truncate" title={displayReason}>
                  {displayReason}
                </span>
              )}
            </div>
          );
        }
        if (isUnassigned) {
          return (
            <Badge variant="warning" className="gap-1 font-semibold text-xs">
              <AlertTriangle className="h-3 w-3" />
              Unassigned
            </Badge>
          );
        }
        if (card.status === 'ACTIVE') {
          return (
            <Badge variant="success" className="gap-1 font-semibold text-xs">
              <CheckCircle2 className="h-3 w-3" />
              In Use
            </Badge>
          );
        }
        return <Badge variant="outline">Ready</Badge>;
      },
    },
    {
      key: 'activeSession',
      header: 'Current User & Balance',
      render: (card: CardEntity) => {
        if (card.activeSession) {
          return (
            <div>
              <p className="font-semibold text-slate-200 text-xs sm:text-sm">
                {card.activeSession.customerName || 'Walk-in Customer'}
              </p>
              <p className="text-xs text-emerald-400 font-mono font-bold">
                {formatCurrency(card.activeSession.balance)}
              </p>
            </div>
          );
        }
        return <span className="text-xs text-slate-500">—</span>;
      },
    },
    {
      key: 'currentBranchId',
      header: 'Branch',
      render: (card: CardEntity) => {
        const branch = branches.find((b) => b.id === card.currentBranchId);
        return (
          <span className="text-xs text-slate-300">
            {branch ? branch.name : 'All Branches'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (card: CardEntity) => {
        const isUnassigned = !card.physicalCardNumber || card.assignmentStatus === 'UNASSIGNED';

        return (
          <div className="flex items-center gap-1.5">
            {isUnassigned ? (
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-1 px-2.5 shadow-sm"
                onClick={() => handleOpenAssignModal(card)}
              >
                <Tag className="h-3.5 w-3.5" />
                <span>Assign Card Number</span>
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs py-1 px-2"
                  onClick={() => handleOpenDetails(card)}
                >
                  <Eye className="h-3.5 w-3.5 text-slate-400" />
                  <span>Inspect</span>
                </Button>

                {canBlock && card.status !== 'BLOCKED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs py-1 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border-rose-900/40"
                    onClick={() => {
                      setSelectedCard(card);
                      setShowBlockModal(true);
                    }}
                  >
                    <Lock className="h-3 w-3" />
                  </Button>
                )}

                {canUnblock && card.status === 'BLOCKED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs py-1 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border-emerald-900/40"
                    onClick={() => {
                      setSelectedCard(card);
                      setShowUnblockModal(true);
                    }}
                  >
                    <Unlock className="h-3 w-3" />
                  </Button>
                )}
                {/* Delete / Deactivate Card */}
                {canBlock && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs py-1 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                    title="Delete / Deactivate Card"
                    onClick={() => handleOpenDeleteCard(card)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Page Header & Action Buttons ────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-emerald-400" />
            Physical Cards & QR Registry
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="md"
            className="gap-2"
            onClick={fetchCardsData}
            title="Refresh Registry"
          >
            <RefreshCw className="h-4 w-4 text-slate-400" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {canIssue && (
            <Button
              variant="primary"
              size="md"
              className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-950/50"
              onClick={handleOpenQrImportModal}
            >
              <Scan className="h-4 w-4" />
              <span>Import & Scan QR Codes</span>
            </Button>
          )}
        </div>
      </div>

      {/* ─── Metric Summary Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-start gap-4 p-4 sm:p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/60 text-emerald-400">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-slate-400">Total Registered Cards</p>
            <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-100">{totalCardsCount}</p>
          </div>
        </Card>

        <Card className="flex items-start gap-4 p-4 sm:p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/60 text-blue-400">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-slate-400">Cards In Use</p>
            <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-100">{activeCardsCount}</p>
          </div>
        </Card>

        <Card className="flex items-start gap-4 p-4 sm:p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/60 text-amber-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-slate-400">Ready to Issue</p>
            <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-100">{availableCardsCount}</p>
          </div>
        </Card>

        <Card className="flex items-start gap-4 p-4 sm:p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/60 text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-slate-400">Blocked / Disabled</p>
            <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-100">{blockedCardsCount}</p>
          </div>
        </Card>
      </div>

      {/* ─── Cards In Use Right Now (Collapsible Dropdown) ─────────── */}
      {!isLoading && activeCardsList.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 overflow-hidden transition-all duration-200 shadow-sm">
          {/* Collapsible Header Bar Button */}
          <button
            type="button"
            onClick={() => setIsCardsInUseOpen(!isCardsInUseOpen)}
            className="w-full flex items-center justify-between p-3.5 hover:bg-emerald-900/20 transition-colors text-left select-none cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="font-bold text-sm text-slate-100">
                Cards In Use Right Now ({activeCardsList.length})
              </h3>
              <span className="text-xs text-slate-400 font-normal hidden sm:inline">
                • {formatCurrency(activeCardsList.reduce((sum, c) => sum + (c.activeSession?.balance || 0), 0))} active balance
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <span>{isCardsInUseOpen ? 'Hide Cards' : 'View Cards'}</span>
              {isCardsInUseOpen ? (
                <ChevronUp className="h-4 w-4 transition-transform text-emerald-400" />
              ) : (
                <ChevronDown className="h-4 w-4 transition-transform text-emerald-400" />
              )}
            </div>
          </button>

          {/* Collapsible Content Grid with Capped Height, Search & Pagination */}
          {isCardsInUseOpen && (
            <div className="p-4 pt-2 border-t border-emerald-500/20 space-y-3">
              {/* Controls Toolbar inside Dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-emerald-500/20">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search in-use cards by #, diner, or phone..."
                    value={inUseSearchQuery}
                    maxLength={30}
                    onChange={(e) => handleInUseSearchChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                  {inUseSearchQuery && (
                    <button
                      type="button"
                      onClick={() => handleInUseSearchChange('')}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 text-[11px] hidden md:inline">
                    {filteredInUseCards.length} in-use card(s)
                  </span>
                  <button
                    type="button"
                    onClick={handleViewAllInMainTable}
                    className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    <span>View all in table below</span>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Cards Grid with Capped Max Height (prevents page going way down) */}
              <div className="max-h-[360px] overflow-y-auto pr-1">
                {paginatedInUseCards.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <p>No in-use cards match "{inUseSearchQuery}".</p>
                    <button
                      type="button"
                      onClick={() => handleInUseSearchChange('')}
                      className="mt-2 text-emerald-400 hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {paginatedInUseCards.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => handleOpenDetails(c)}
                        className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/90 hover:border-emerald-500/50 hover:bg-slate-900 transition-all text-left cursor-pointer select-none space-y-2.5 shadow-sm group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-extrabold text-emerald-300 group-hover:text-emerald-200">
                            {c.physicalCardNumber || c.activeSession?.sessionCardNumber || 'MC-Card'}
                          </span>
                          <Badge variant="success" className="text-[10px] py-0">Active</Badge>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-200 truncate">
                            {c.activeSession?.customerName || 'Customer'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {c.activeSession?.customerPhone || 'Cafeteria Diner'}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                          <span className="text-slate-400">Balance:</span>
                          <span className="font-mono font-bold text-violet-300">
                            {formatCurrency(c.activeSession?.balance || 0)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination Bar for High Card Volumes */}
              {totalInUsePages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20 text-xs text-slate-400">
                  <span>
                    Showing <strong className="text-slate-200">{((currentInUsePage - 1) * IN_USE_PAGE_SIZE) + 1}</strong>–<strong className="text-slate-200">{Math.min(currentInUsePage * IN_USE_PAGE_SIZE, filteredInUseCards.length)}</strong> of {filteredInUseCards.length} active cards
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setInUsePage((p) => Math.max(1, p - 1))}
                      disabled={currentInUsePage === 1}
                      className="px-2.5 py-1 rounded border border-slate-800 bg-slate-900 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="px-2 font-mono text-[11px] text-slate-300">
                      Page {currentInUsePage} of {totalInUsePages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setInUsePage((p) => Math.min(totalInUsePages, p + 1))}
                      disabled={currentInUsePage === totalInUsePages}
                      className="px-2.5 py-1 rounded border border-slate-800 bg-slate-900 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Search & Filter Bar ─────────────────────────────────────── */}
      <Card padding="md">
        <div id="cards-table-container" className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search card number, customer name, or phone..."
                value={searchQuery}
                maxLength={30}
                onChange={(e) => setSearchQuery(e.target.value.slice(0, 30))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-8 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Select
              id="card-assignment-filter"
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value as CardAssignmentStatus | 'ALL')}
              options={[
                { value: 'ALL', label: 'All Cards' },
                { value: 'ASSIGNED', label: 'Assigned Cards' },
                { value: 'UNASSIGNED', label: 'Unassigned Cards' },
              ]}
            />

            <Select
              id="card-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CardStatus | 'ALL')}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'AVAILABLE', label: 'Ready to Use' },
                { value: 'ACTIVE', label: 'In Use (Active Session)' },
                { value: 'BLOCKED', label: 'Blocked / Locked' },
              ]}
            />

            <Select
              id="card-branch-filter"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Branches' },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>

          {/* Active Filter Summary & Clear Action */}
          {isFiltered && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span>Showing</span>
                <span className="font-semibold text-emerald-400">
                  {filteredCards.length}
                </span>
                <span>of {allCards.length} cards matching criteria</span>
              </div>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 border border-slate-700/80 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
                <span>Clear All Filters</span>
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* ─── Cards Data Table ────────────────────────────────────────── */}
      {isLoading ? (
        <LoadingState message="Loading card registry..." />
      ) : error ? (
        <ErrorState title="Error Loading Cards" message={error} onRetry={fetchCardsData} />
      ) : filteredCards.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-8 w-8 text-slate-500" />}
          title={isFiltered ? "No matching cards found" : "No cards registered yet"}
          description={
            isFiltered
              ? 'No cards match your current search. Try clearing filters.'
              : 'Add or import your first batch of smart cards to get started.'
          }
          action={
            isFiltered ? (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="gap-2 border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Clear Filters</span>
              </Button>
            ) : canIssue ? (
              <Button
                variant="primary"
                onClick={() => setShowQrImportModal(true)}
                className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-950/50"
              >
                <QrCode className="h-4 w-4" />
                <span>Import & Scan Cards</span>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable data={filteredCards} columns={cardColumns} keyExtractor={(c) => c.id} />
      )}

      {/* ─── MODAL 1: Multi-QR Scanner & Bulk QR Import ───────────────── */}
      {showQrImportModal && (
        <Modal
          isOpen={showQrImportModal}
          onClose={handleCloseQrImportModal}
          title="Scan & Register Cards"
          size="lg"
        >
          <div className="space-y-4">
            {/* Next Card Indicator & Prefix */}
            <div className="flex flex-wrap items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 gap-3">
              <div>
                <span className="text-xs text-slate-400 font-medium">Next Card to be Registered:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xl font-extrabold text-emerald-300 tracking-wider">
                    {padZeros
                      ? `${cardPrefix.trim().toUpperCase()}${String(startSequence).padStart(3, '0')}`
                      : `${cardPrefix.trim().toUpperCase()}${startSequence}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Card Prefix:</span>
                <input
                  type="text"
                  value={cardPrefix}
                  onChange={(e) => {
                    const p = e.target.value;
                    setCardPrefix(p);
                    setStartSequence(initSequenceForPrefix(p));
                  }}
                  className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs text-center font-bold focus:border-emerald-400 focus:outline-none"
                  placeholder="MC-"
                />
              </div>
            </div>

            {/* Large Scan Input & Camera Trigger */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Scan className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
                  <input
                    ref={scannerInputRef}
                    type="text"
                    value={scannerInputValue}
                    onChange={(e) => setScannerInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (scannerInputValue.trim()) {
                          handleProcessScannedQr(scannerInputValue);
                        }
                      }
                    }}
                    placeholder="Scan or enter card QR code..."
                    className="w-full pl-11 pr-24 py-3 rounded-xl border-2 border-emerald-500/50 bg-slate-900 text-sm font-mono text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none shadow-inner"
                    autoFocus
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 font-bold"
                    disabled={!scannerInputValue.trim()}
                    onClick={() => {
                      if (scannerInputValue.trim()) {
                        handleProcessScannedQr(scannerInputValue);
                      }
                    }}
                  >
                    Register
                  </Button>
                </div>

                <Button
                  variant={isCameraActive ? 'danger' : 'outline'}
                  size="md"
                  onClick={() => setIsCameraActive(!isCameraActive)}
                  className={cn(
                    'gap-2 text-xs font-semibold shrink-0 py-3',
                    isCameraActive
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'border-slate-700 hover:border-slate-600 text-slate-300',
                  )}
                >
                  {isCameraActive ? (
                    <>
                      <CameraOff className="h-4 w-4" />
                      <span>Stop Camera</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 text-emerald-400" />
                      <span>Use Camera</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Live Camera Viewport */}
              {isCameraActive && (
                <CameraQrScanner
                  isActive={isCameraActive}
                  onScan={(decoded) => handleProcessScannedQr(decoded)}
                  onToggleActive={(active) => setIsCameraActive(active)}
                />
              )}
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={handleCloseQrImportModal}
            >
              Done / Close
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── MODAL 2: Assign Card Number to Unassigned Card ──────────── */}
      {showAssignModal && selectedCard && (
        <Modal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedCard(null);
          }}
          title="Assign Organization Card Number"
          size="md"
        >
          <form onSubmit={handleAssignCardNumber} className="space-y-4">
            <p className="text-sm text-slate-400">
              Link an organization-specific human-readable card number (e.g. <code>MC 105</code>, <code>STU-001</code>) to this physical QR card.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <p className="text-xs text-slate-500">Physical QR Identifier</p>
              <p className="font-mono text-sm font-bold text-slate-200 break-all">{selectedCard.qrToken}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Organization Card Number <span className="text-rose-400">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. MC 105, STU-001, EMP-450"
                value={assignCardNumberInput}
                onChange={(e) => setAssignCardNumberInput(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1">
                Must be unique within your organization. Staff will see this card number when scanning.
              </p>
            </div>

            {assignError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            <ModalFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedCard(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isAssigning || !assignCardNumberInput.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold"
              >
                {isAssigning ? 'Assigning...' : 'Assign Card Number'}
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* ─── MODAL 5: Single QR Code View Modal ──────────────────────── */}
      {selectedQrCard && (
        <Modal
          isOpen={!!selectedQrCard}
          onClose={() => setSelectedQrCard(null)}
          title={`QR Code — Card ${selectedQrCard.physicalCardNumber || 'Unassigned'}`}
          size="sm"
        >
          <div className="flex flex-col items-center p-4 text-center space-y-4">
            <div className="p-4 bg-white rounded-2xl shadow-xl">
              <QRCodeCanvas
                value={selectedQrCard.qrToken}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            <div>
              <p className="font-mono font-bold text-lg text-slate-100">
                {selectedCard?.physicalCardNumber || selectedQrCard.physicalCardNumber || 'Unassigned QR Code'}
              </p>
              <p className="font-mono text-xs text-slate-400 break-all max-w-xs mt-1">
                {selectedQrCard.qrToken}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                navigator.clipboard.writeText(selectedQrCard.qrToken);
                setIsCopiedToken(true);
                setTimeout(() => setIsCopiedToken(false), 2000);
              }}
            >
              {isCopiedToken ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{isCopiedToken ? 'Copied QR Value' : 'Copy QR String'}</span>
            </Button>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 6: Card Details & History ─────────────────────────── */}
      {showDetailsModal && selectedCard && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedCard(null);
          }}
          title={`Card Details — ${selectedCard.physicalCardNumber || 'Unassigned QR'}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div>
                <p className="text-slate-500">Card Number</p>
                <p className="font-bold text-slate-200 text-sm">{selectedCard.physicalCardNumber || 'Not Assigned'}</p>
              </div>
              <div>
                <p className="text-slate-500">Assignment Status</p>
                <p className="font-bold text-slate-200 text-sm">{selectedCard.assignmentStatus || 'UNASSIGNED'}</p>
              </div>
              <div>
                <p className="text-slate-500">Card Status</p>
                <p className="font-bold text-slate-200 text-sm">{selectedCard.status}</p>
              </div>
              <div>
                <p className="text-slate-500">QR Identifier</p>
                <p className="font-mono text-slate-300 truncate">{selectedCard.qrToken}</p>
              </div>

              {selectedCard.status === 'BLOCKED' && (
                <div className="col-span-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <p className="font-semibold text-rose-400">Card is Blocked</p>
                  <p className="mt-1 font-medium leading-relaxed">
                    {formatBlockedCardMessage(selectedCard.blockedReason, selectedCard.blockedBy)}
                  </p>
                  {selectedCard.blockedBy && (
                    <p className="mt-1 text-slate-400">Authorized By: {selectedCard.blockedBy}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Recent Customer Sessions
              </h4>
              {isLoadingHistory ? (
                <LoadingState message="Loading sessions..." />
              ) : cardHistorySessions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-slate-800 rounded-lg">
                  No sessions recorded for this card yet.
                </div>
              ) : (
                <div className="border border-slate-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-slate-400">
                      <tr>
                        <th className="p-2">Cycle</th>
                        <th className="p-2">Customer</th>
                        <th className="p-2">Balance</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Started At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {cardHistorySessions.map((s) => (
                        <tr key={s.id}>
                          <td className="p-2 font-mono">#{s.cycleNumber || 1}</td>
                          <td className="p-2 font-semibold text-slate-200">{s.customerName || 'Walk-in'}</td>
                          <td className="p-2 font-mono font-bold text-emerald-400">{formatCurrency(s.balance)}</td>
                          <td className="p-2"><Badge variant={s.status === 'ACTIVE' ? 'success' : 'outline'}>{s.status}</Badge></td>
                          <td className="p-2 text-slate-400">{formatDate(s.startedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── MODAL 7: Block Card Modal ───────────────────────────────── */}
      {showBlockModal && selectedCard && (
        <Modal
          isOpen={showBlockModal}
          onClose={() => setShowBlockModal(false)}
          title={`Block Card — ${selectedCard.physicalCardNumber || selectedCard.qrToken}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <p>
                Are you sure you want to block this card? It will immediately prevent all purchases, recharges, and session operations across all cafeteria counters.
              </p>
            </div>

            {/* Default Reason Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Primary Reason <span className="text-rose-400">*</span>
              </label>
              <select
                value={blockReasonCategory}
                onChange={(e) => setBlockReasonCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-rose-500 focus:outline-none"
              >
                <option value="Lost or Stolen Card">Lost or Stolen Card</option>
                <option value="Damaged / Hardware Fault">Damaged / Hardware Fault</option>
                <option value="Suspicious Activity / Fraud">Suspicious Activity / Fraud</option>
                <option value="Customer Request">Customer Request</option>
                <option value="Administrative Block">Administrative Block</option>
                <option value="Staff Discretion">Staff Discretion</option>
                <option value="Other Reason">Other Reason</option>
              </select>
            </div>

            {/* Additional Reason Option */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Additional Reason / Notes (Optional)
              </label>
              <textarea
                value={additionalBlockReason}
                onChange={(e) => setAdditionalBlockReason(e.target.value)}
                placeholder="Type additional reason, remarks, or context (e.g. customer misplaced wallet at cafeteria, reported via phone)..."
                rows={2}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none resize-none"
              />
            </div>

            {/* Live Business Logic Message Preview */}
            <div className="rounded-lg border border-rose-500/20 bg-rose-950/20 p-2.5 text-xs text-slate-300 space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 block">
                Recorded Business Reason & Policy:
              </span>
              <p className="text-rose-200 italic font-medium leading-relaxed">
                {buildCardBlockReason(blockReasonCategory, additionalBlockReason, user?.name, user?.role)}
              </p>
            </div>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowBlockModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmBlock} className="bg-rose-600 hover:bg-rose-500 font-bold">
              Confirm Block
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── MODAL 8: Unblock Card Modal ─────────────────────────────── */}
      {showUnblockModal && selectedCard && (
        <Modal
          isOpen={showUnblockModal}
          onClose={() => setShowUnblockModal(false)}
          title={`Unblock Card — ${selectedCard.physicalCardNumber || selectedCard.qrToken}`}
          size="sm"
        >
          <p className="text-sm text-slate-300">
            Are you sure you want to unblock this card? It will restore normal active/available operational status in the cafeteria registry.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowUnblockModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleConfirmUnblock} className="bg-emerald-600 hover:bg-emerald-500 font-bold">
              Confirm Unblock
            </Button>
          </ModalFooter>
        </Modal>
      )}
      {/* ── Delete Card Confirmation Modal ──────────────────────── */}
      <Modal
        isOpen={showDeleteCardModal}
        onClose={() => setShowDeleteCardModal(false)}
        title="Delete Card"
        description="Permanently delete unassigned card or safely deactivate"
        size="md"
      >
        <div className="space-y-4">
          {deleteCardApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Action Blocked</p>
                <p>{deleteCardApiError}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-2">
            <p className="text-sm text-slate-200 font-medium">
              Are you sure you want to remove card{' '}
              <span className="text-emerald-400 font-mono font-bold">
                {selectedCard?.physicalCardNumber || selectedCard?.qrToken}
              </span>
              ?
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cards with no session or transaction history will be permanently deleted from the organization registry. Cards with historical sessions/transactions will be safely deactivated/blocked so that previous customer statements and receipts remain intact.
            </p>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowDeleteCardModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteCardSubmit}>
              Confirm Deletion
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}

import { formatCurrency, formatDate, cn } from '@/utils';
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
  QrImportPreview,
  QrImportEntry,
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
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Copy,
  Check,
  Tag,
  ShieldAlert,
  Trash2,
  Camera,
  CameraOff,
  Scan,
  X,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { CameraQrScanner } from '@/components/scanner/CameraQrScanner';

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

  // Selected Card for Details, Assign, or Block
  const [selectedCard, setSelectedCard] = useState<CardEntity | null>(null);
  const [_cardTransactions, setCardTransactions] = useState<Transaction[]>([]);
  const [cardHistorySessions, setCardHistorySessions] = useState<CardSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Individual Card Number Assignment Form State
  const [assignCardNumberInput, setAssignCardNumberInput] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // External Bulk QR Import State
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<QrImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-QR Scan & Auto-Register with Prefix State
  const [importMode, setImportMode] = useState<'SCAN' | 'CSV'>('SCAN');
  const [cardPrefix, setCardPrefix] = useState('MC-');
  const [startSequence, setStartSequence] = useState<number>(1);
  const [padZeros, setPadZeros] = useState(true);
  const [autoRegisterOnScan, setAutoRegisterOnScan] = useState(true);
  const [scannerInputValue, setScannerInputValue] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannedCardsList, setScannedCardsList] = useState<
    Array<{
      id: string;
      qrCode: string;
      cardNumber: string;
      status: 'SUCCESS' | 'QUEUED' | 'ERROR';
      error?: string;
      timestamp: Date;
    }>
  >([]);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
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
    return allCards.filter((card) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNumber = (card.physicalCardNumber || '').toLowerCase().includes(q);
        const matchesQr = card.qrToken.toLowerCase().includes(q);
        const matchesCustomer = card.activeSession?.customerName?.toLowerCase().includes(q) ?? false;
        if (!matchesNumber && !matchesQr && !matchesCustomer) return false;
      }

      if (statusFilter !== 'ALL' && card.status !== statusFilter) {
        return false;
      }

      const assignmentStatus = card.assignmentStatus || (card.physicalCardNumber ? 'ASSIGNED' : 'UNASSIGNED');
      if (assignmentFilter !== 'ALL' && assignmentStatus !== assignmentFilter) {
        return false;
      }

      if (branchFilter !== 'ALL') {
        const cardBranch = card.activeSession?.branchId || card.currentBranchId;
        if (cardBranch !== branchFilter) return false;
      }

      return true;
    });
  }, [allCards, searchQuery, statusFilter, assignmentFilter, branchFilter]);

  // Summary Metrics
  const totalCardsCount = allCards.length;
  const assignedCardsCount = allCards.filter((c) => !!c.physicalCardNumber && c.assignmentStatus !== 'UNASSIGNED').length;
  const unassignedQrCount = allCards.filter((c) => !c.physicalCardNumber || c.assignmentStatus === 'UNASSIGNED').length;
  // const activeSessionsCount = allCards.filter((c) => c.status === 'ACTIVE').length;
  const blockedCardsCount = allCards.filter((c) => c.status === 'BLOCKED').length;

  const effectiveCardLimit = (orgOverview as any)?.effectiveLimits?.cardLimit ?? 100;
  const remainingQuota = Math.max(0, effectiveCardLimit - totalCardsCount);

  // ─── Handle File Parsing for QR Import ────────────────────────────
  const handleQrCsvSelect = (file: File) => {
    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        toast.error('The uploaded CSV file is empty');
        return;
      }

      // Check header row
      const firstLine = lines[0].toLowerCase();
      const hasHeader = firstLine.includes('qr') || firstLine.includes('code') || firstLine.includes('token');
      const dataRows = hasHeader ? lines.slice(1) : lines;

      const seenInFile = new Set<string>();
      const existingDbQrs = new Set(allCards.map((c) => c.qrToken.toLowerCase()));
      const existingDbNums = new Set(allCards.filter((c) => !!c.physicalCardNumber).map((c) => (c.physicalCardNumber || '').toLowerCase()));

      const entries: QrImportEntry[] = [];
      let validCount = 0;
      let duplicateCount = 0;
      let registeredCount = 0;

      dataRows.forEach((row, idx) => {
        const rowNum = idx + (hasHeader ? 2 : 1);
        const parts = row.split(',').map((p) => p.trim());
        const rawQr = parts[0] ? parts[0].replace(/^["']|["']$/g, '') : '';
        const rawCardNum = parts[1] ? parts[1].replace(/^["']|["']$/g, '').toUpperCase() : undefined;

        if (!rawQr) {
          entries.push({
            rowNumber: rowNum,
            qrCode: '',
            status: 'INVALID_FORMAT',
            errorMessage: 'Empty QR code value in row',
          });
          return;
        }

        if (seenInFile.has(rawQr.toLowerCase())) {
          duplicateCount++;
          entries.push({
            rowNumber: rowNum,
            qrCode: rawQr,
            cardNumber: rawCardNum,
            status: 'DUPLICATE_IN_FILE',
            errorMessage: `Duplicate QR code '${rawQr}' found multiple times in uploaded file`,
          });
          return;
        }
        seenInFile.add(rawQr.toLowerCase());

        if (existingDbQrs.has(rawQr.toLowerCase())) {
          registeredCount++;
          entries.push({
            rowNumber: rowNum,
            qrCode: rawQr,
            cardNumber: rawCardNum,
            status: 'ALREADY_REGISTERED',
            errorMessage: `QR code '${rawQr}' is already registered in the platform registry`,
          });
          return;
        }

        if (rawCardNum && existingDbNums.has(rawCardNum.toLowerCase())) {
          entries.push({
            rowNumber: rowNum,
            qrCode: rawQr,
            cardNumber: rawCardNum,
            status: 'ALREADY_REGISTERED',
            errorMessage: `Card number '${rawCardNum}' is already assigned in your organization`,
          });
          return;
        }

        validCount++;
        entries.push({
          rowNumber: rowNum,
          qrCode: rawQr,
          cardNumber: rawCardNum,
          status: 'VALID',
        });
      });

      const exceedsLimit = validCount > remainingQuota;
      setImportPreview({
        totalRows: dataRows.length,
        validCount,
        duplicateCount,
        registeredCount,
        errorCount: dataRows.length - validCount,
        entries,
        exceedsPlanLimit: exceedsLimit,
        effectiveLimit: effectiveCardLimit,
        currentCount: totalCardsCount,
      });
    };

    reader.readAsText(file);
  };

  // ─── Execute QR Import ────────────────────────────────────────────
  const handleConfirmQrImport = async () => {
    if (!importPreview || importPreview.validCount === 0) return;
    if (importPreview.exceedsPlanLimit) {
      toast.error(`Import exceeds organization card limit (${importPreview.validCount} valid vs ${remainingQuota} remaining quota)`);
      return;
    }

    setIsImporting(true);
    try {
      const validEntries = importPreview.entries.filter((e) => e.status === 'VALID');
      const mappings = validEntries.map((e) => ({
        qrCode: e.qrCode,
        cardNumber: e.cardNumber,
      }));

      const res = await apiService.cards.importQrCodes({ mappings });
      if (!res.success) {
        toast.error(res.error.message || 'Failed to import QR codes');
        return;
      }

      toast.success(`Successfully imported ${res.data.importedCount} external QR codes! (${res.data.unassignedCount} unassigned, ${res.data.assignedCount} pre-assigned)`);
      setShowQrImportModal(false);
      setImportPreview(null);
      setImportFileName(null);
      fetchCardsData();
    } catch {
      toast.error('Network error during import. Please try again.');
    } finally {
      setIsImporting(false);
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

    // Check duplicate in current scanned session
    if (scannedCardsList.some((s) => s.qrCode.toLowerCase() === cleanQr.toLowerCase())) {
      toast.warning(`QR code '${cleanQr}' has already been scanned in this session.`);
      playBeep(false);
      setScannerInputValue('');
      return;
    }

    // Check if already registered in organization
    const existingCard = allCards.find((c) => c.qrToken.toLowerCase() === cleanQr.toLowerCase());
    if (existingCard) {
      toast.error(
        `QR '${cleanQr}' is already registered (Card Number: ${existingCard.physicalCardNumber || 'Unassigned'}).`,
      );
      playBeep(false);
      setScannerInputValue('');
      return;
    }

    // Quota check
    const plannedCount = allCards.length + (autoRegisterOnScan ? 1 : scannedCardsList.length + 1);
    if (plannedCount > effectiveCardLimit) {
      toast.error(`Subscription limit reached (${effectiveCardLimit} cards max). Cannot register more.`);
      playBeep(false);
      setScannerInputValue('');
      return;
    }

    // Compute next card number
    const queuedNumbers = scannedCardsList.map((s) => s.cardNumber);
    const nextSeq = getNextAvailableNumber(cardPrefix, startSequence, queuedNumbers);
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
          setScannedCardsList((prev) => [
            {
              id: Math.random().toString(),
              qrCode: cleanQr,
              cardNumber: assignedCardNumber,
              status: 'ERROR',
              error: res.error.message,
              timestamp: new Date(),
            },
            ...prev,
          ]);
          return;
        }

        playBeep(true);
        toast.success(`✓ Auto-Registered: ${assignedCardNumber}`);
        setScannedCardsList((prev) => [
          {
            id: Math.random().toString(),
            qrCode: cleanQr,
            cardNumber: assignedCardNumber,
            status: 'SUCCESS',
            timestamp: new Date(),
          },
          ...prev,
        ]);
        setStartSequence(nextSeq + 1);
        fetchCardsData();
      } catch {
        toast.error('Network error while auto-registering card');
        playBeep(false);
      }
    } else {
      // Queued mode
      playBeep(true);
      toast.info(`Scanned ${assignedCardNumber} (Queued)`);
      setScannedCardsList((prev) => [
        {
          id: Math.random().toString(),
          qrCode: cleanQr,
          cardNumber: assignedCardNumber,
          status: 'QUEUED',
          timestamp: new Date(),
        },
        ...prev,
      ]);
      setStartSequence(nextSeq + 1);
    }

    setTimeout(() => {
      scannerInputRef.current?.focus();
    }, 50);
  };

  const handleOpenQrImportModal = () => {
    const nextSeq = initSequenceForPrefix(cardPrefix);
    setStartSequence(nextSeq);
    setImportMode('SCAN');
    setImportFileName(null);
    setImportPreview(null);
    setIsCameraActive(false);
    setShowQrImportModal(true);
    setTimeout(() => scannerInputRef.current?.focus(), 150);
  };

  const handleCloseQrImportModal = () => {
    setShowQrImportModal(false);
    setIsCameraActive(false);
    setImportPreview(null);
    setImportFileName(null);
    setScannerInputValue('');
  };

  const handleRegisterBatchQueued = async () => {
    const queued = scannedCardsList.filter((s) => s.status === 'QUEUED');
    if (queued.length === 0) return;

    setIsSubmittingBatch(true);
    try {
      const mappings = queued.map((s) => ({ qrCode: s.qrCode, cardNumber: s.cardNumber }));
      const res = await apiService.cards.importQrCodes({ mappings });

      if (!res.success) {
        toast.error(res.error.message || 'Failed to register cards');
        return;
      }

      toast.success(`Successfully registered ${res.data.importedCount} cards with prefix!`);
      setScannedCardsList((prev) =>
        prev.map((item) => (item.status === 'QUEUED' ? { ...item, status: 'SUCCESS' } : item)),
      );
      fetchCardsData();
    } catch {
      toast.error('Network error registering batch');
    } finally {
      setIsSubmittingBatch(false);
    }
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
      const blockerStr = user ? `${user.name} (${user.role === 'ORG_ADMIN' ? 'Org Admin' : user.role})` : 'Org Admin';
      const notes = additionalBlockReason.trim();
      const fullReason = notes
        ? `[Blocked by ${blockerStr}] ${blockReasonCategory}: ${notes}`
        : `[Blocked by ${blockerStr}] ${blockReasonCategory}`;

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
      header: 'Card Number',
      render: (card: CardEntity) => {
        const isAssigned = !!card.physicalCardNumber && card.assignmentStatus !== 'UNASSIGNED';
        return isAssigned ? (
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="font-mono font-bold text-slate-100 text-sm">
              {card.physicalCardNumber}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-amber-400 font-mono text-xs font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Not Assigned
            </span>
          </div>
        );
      },
    },
    {
      key: 'qrToken',
      header: 'QR Code Identifier',
      render: (card: CardEntity) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedQrCard(card)}
            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="View QR Code"
          >
            <QrCode className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-xs text-slate-300 max-w-[180px] truncate" title={card.qrToken}>
            {card.qrToken}
          </span>
        </div>
      ),
    },
    {
      key: 'assignmentStatus',
      header: 'Assignment',
      render: (card: CardEntity) => {
        const isAssigned = !!card.physicalCardNumber && card.assignmentStatus !== 'UNASSIGNED';
        return isAssigned ? (
          <Badge variant="success" className="gap-1 font-semibold text-xs">
            <CheckCircle2 className="h-3 w-3" />
            Assigned
          </Badge>
        ) : (
          <Badge variant="warning" className="gap-1 font-semibold text-xs">
            <AlertTriangle className="h-3 w-3" />
            Unassigned
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Card Status',
      render: (card: CardEntity) => {
        if (card.status === 'ACTIVE') return <Badge variant="success">Active</Badge>;
        if (card.status === 'BLOCKED') {
          return (
            <div className="flex flex-col gap-0.5">
              <Badge variant="danger">Blocked</Badge>
              {card.blockedReason && (
                <span className="text-[10px] text-rose-300 max-w-[150px] truncate" title={card.blockedReason}>
                  {card.blockedReason}
                </span>
              )}
            </div>
          );
        }
        return <Badge variant="outline">Available</Badge>;
      },
    },
    {
      key: 'activeSession',
      header: 'Current Session / User',
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
      key: 'createdAt',
      header: 'Imported / Created',
      render: (card: CardEntity) => (
        <span className="text-xs text-slate-400">
          {formatDate(card.createdAt)}
        </span>
      ),
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
          <p className="mt-1 text-sm text-slate-400">
            Import externally generated bulk QR cards and assign organization-specific card numbers.
          </p>
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
            <p className="mt-1 text-xs text-slate-500">Plan limit: {effectiveCardLimit} cards</p>
          </div>
        </Card>

        <Card className="flex items-start gap-4 p-4 sm:p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/60 text-blue-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-slate-400">Assigned Card Numbers</p>
            <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-100">{assignedCardsCount}</p>
            <p className="mt-1 text-xs text-slate-500">Ready for cafeteria issuance</p>
          </div>
        </Card>

        <Card className="flex items-start gap-4 p-4 sm:p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/60 text-amber-400">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-slate-400">Unassigned QR Codes</p>
            <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-100">{unassignedQrCount}</p>
            <p className="mt-1 text-xs text-slate-500">Requires card number assignment</p>
          </div>
        </Card>

        <Card className="flex items-start gap-4 p-4 sm:p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/60 text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-medium text-slate-400">Blocked / Disabled</p>
            <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-100">{blockedCardsCount}</p>
            <p className="mt-1 text-xs text-slate-500">Locked for fraud/loss prevention</p>
          </div>
        </Card>
      </div>

      {/* ─── Search & Filter Bar ─────────────────────────────────────── */}
      <Card padding="md">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search card number, QR, customer..."
              value={searchQuery}
              maxLength={30}
              onChange={(e) => setSearchQuery(e.target.value.slice(0, 30))}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <Select
            value={assignmentFilter}
            onChange={(val) => setAssignmentFilter(val as any)}
            options={[
              { value: 'ALL', label: 'All Assignments (All Cards)' },
              { value: 'ASSIGNED', label: 'Assigned Cards Only' },
              { value: 'UNASSIGNED', label: 'Unassigned QR Codes Only' },
            ]}
          />

          <Select
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
            options={[
              { value: 'ALL', label: 'All Card Statuses' },
              { value: 'AVAILABLE', label: 'Available Only' },
              { value: 'ACTIVE', label: 'Active Sessions Only' },
              { value: 'BLOCKED', label: 'Blocked Cards Only' },
            ]}
          />

          <Select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Branches' },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
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
          title="No Cards Found"
          description={
            searchQuery || statusFilter !== 'ALL' || assignmentFilter !== 'ALL'
              ? 'No cards match your current search and filter criteria.'
              : 'No cards imported yet. Click "Import QR Codes" to upload your bulk QR inventory.'
          }
          action={
            canIssue && (
              <Button
                variant="primary"
                onClick={() => setShowQrImportModal(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500"
              >
                <QrCode className="h-4 w-4" />
                <span>Import QR Codes</span>
              </Button>
            )
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
          title="Import & Scan Physical Cards"
          size="lg"
        >
          <div className="space-y-4">
            {/* Mode Selector Tabs */}
            <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setImportMode('SCAN')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer',
                  importMode === 'SCAN'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
                )}
              >
                <Scan className="h-4 w-4" />
                <span>⚡ Multi-QR Scanner & Auto-Register</span>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  Live
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportMode('CSV');
                  setIsCameraActive(false);
                }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer',
                  importMode === 'CSV'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
                )}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>📁 Upload CSV Spreadsheet</span>
              </button>
            </div>

            {/* Quota Banner */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400">
                Organization Quota: <strong className="text-slate-200">{totalCardsCount} / {effectiveCardLimit}</strong> cards registered
              </span>
              <span className={cn('font-bold', remainingQuota > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {remainingQuota} remaining quota
              </span>
            </div>

            {importMode === 'SCAN' ? (
              <div className="space-y-3.5">
                {/* Prefix & Auto-Increment Configuration Bar */}
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3.5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Card Number Prefix & Auto-Assignment
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={autoRegisterOnScan}
                        onChange={(e) => setAutoRegisterOnScan(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      <span className="font-semibold text-emerald-300">Auto-Register Immediately on Scan</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Card Number Prefix <span className="text-rose-400">*</span>
                      </label>
                      <Input
                        type="text"
                        value={cardPrefix}
                        placeholder="e.g. MC-, CARD-, STU-"
                        onChange={(e) => {
                          const p = e.target.value;
                          setCardPrefix(p);
                          setStartSequence(initSequenceForPrefix(p));
                        }}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Next Sequence Number
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={startSequence}
                        onChange={(e) => setStartSequence(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-9 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Next Card Number
                      </label>
                      <div className="h-9 flex items-center justify-between px-3 rounded-lg border border-emerald-500/40 bg-emerald-950/30 text-xs">
                        <span className="font-mono font-extrabold text-emerald-300 text-sm tracking-wide">
                          {padZeros
                            ? `${cardPrefix.trim().toUpperCase()}${String(startSequence).padStart(3, '0')}`
                            : `${cardPrefix.trim().toUpperCase()}${startSequence}`}
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-400">
                          <input
                            type="checkbox"
                            checked={padZeros}
                            onChange={(e) => setPadZeros(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-800 text-emerald-500 h-3 w-3"
                          />
                          <span>Pad 001</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Continuous Barcode & Camera Scanner Input Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Scan className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
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
                        placeholder="Scan with handheld 2D QR gun or type token & press Enter..."
                        className="w-full pl-10 pr-24 py-2.5 rounded-xl border-2 border-emerald-500/50 bg-slate-900 text-sm font-mono text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none shadow-inner"
                        autoFocus
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-500 font-bold"
                        disabled={!scannerInputValue.trim()}
                        onClick={() => {
                          if (scannerInputValue.trim()) {
                            handleProcessScannedQr(scannerInputValue);
                          }
                        }}
                      >
                        Enter
                      </Button>
                    </div>

                    <Button
                      variant={isCameraActive ? 'danger' : 'outline'}
                      size="md"
                      onClick={() => setIsCameraActive(!isCameraActive)}
                      className={cn(
                        'gap-1.5 text-xs font-semibold shrink-0',
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

                  {/* Live Camera Viewport (powered by Html5Qrcode) */}
                  {isCameraActive && (
                    <CameraQrScanner
                      isActive={isCameraActive}
                      onScan={(decoded) => handleProcessScannedQr(decoded)}
                      onToggleActive={(active) => setIsCameraActive(active)}
                    />
                  )}
                </div>

                {/* Session Scanned Cards Registry Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>
                        Scanned Cards ({scannedCardsList.length} total
                        {scannedCardsList.filter((s) => s.status === 'SUCCESS').length > 0 &&
                          `, ${scannedCardsList.filter((s) => s.status === 'SUCCESS').length} registered`}
                        )
                      </span>
                    </span>
                    {scannedCardsList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setScannedCardsList([])}
                        className="text-slate-400 hover:text-rose-400 text-[11px] underline cursor-pointer"
                      >
                        Clear session list
                      </button>
                    )}
                  </div>

                  <div className="border border-slate-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {scannedCardsList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                        <Scan className="h-6 w-6 mx-auto text-slate-600 mb-2" />
                        <p className="font-medium text-slate-300">Ready for continuous scanning</p>
                        <p>
                          Point your 2D barcode scanner gun at card QR codes. Each scanned code will automatically be registered as{' '}
                          <strong className="text-emerald-400 font-mono">
                            {padZeros
                              ? `${cardPrefix.trim().toUpperCase()}${String(startSequence).padStart(3, '0')}`
                              : `${cardPrefix.trim().toUpperCase()}${startSequence}`}
                          </strong>
                          , then increment automatically.
                        </p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400">
                          <tr>
                            <th className="p-2">#</th>
                            <th className="p-2">Card Number</th>
                            <th className="p-2">Scanned QR Token</th>
                            <th className="p-2">Status</th>
                            <th className="p-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {scannedCardsList.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-900/40">
                              <td className="p-2 font-mono text-slate-500">{scannedCardsList.length - idx}</td>
                              <td className="p-2 font-mono font-bold text-emerald-400">{item.cardNumber}</td>
                              <td className="p-2 font-mono text-slate-300 max-w-[180px] truncate" title={item.qrCode}>
                                {item.qrCode}
                              </td>
                              <td className="p-2">
                                {item.status === 'SUCCESS' && (
                                  <Badge variant="success" className="text-2xs py-0.5">
                                    ✓ Registered
                                  </Badge>
                                )}
                                {item.status === 'QUEUED' && (
                                  <Badge variant="outline" className="text-2xs py-0.5 text-amber-400 border-amber-500/40">
                                    Queued
                                  </Badge>
                                )}
                                {item.status === 'ERROR' && (
                                  <span title={item.error}>
                                    <Badge variant="danger" className="text-2xs py-0.5">
                                      Error
                                    </Badge>
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => setScannedCardsList((prev) => prev.filter((s) => s.id !== item.id))}
                                  className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                                  title="Remove from session list"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* CSV Upload Zone */
              <div className="space-y-4">
                {!importPreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition-all text-center group"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform mb-3">
                      <Upload className="h-7 w-7" />
                    </div>
                    <p className="text-sm font-semibold text-slate-200">
                      Click to select CSV or drag and drop
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Accepts CSV containing <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded">qrCode</code> column (or 2-column <code className="text-slate-300">qrCode,cardNumber</code>)
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleQrCsvSelect(file);
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                        <div>
                          <p className="font-semibold text-slate-200 text-sm">{importFileName}</p>
                          <p className="text-xs text-slate-400">{importPreview.totalRows} total rows found in file</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setImportPreview(null);
                          setImportFileName(null);
                        }}
                      >
                        Change File
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-900/50">
                        <p className="text-xs font-medium text-emerald-400">Valid</p>
                        <p className="text-xl font-bold text-emerald-300">{importPreview.validCount}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/50">
                        <p className="text-xs font-medium text-rose-400">Errors</p>
                        <p className="text-xl font-bold text-rose-300">{importPreview.errorCount}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <p className="text-xs font-medium text-slate-400">Quota</p>
                        <p className="text-xl font-bold text-slate-200">{remainingQuota}</p>
                      </div>
                    </div>

                    <div className="border border-slate-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400">
                          <tr>
                            <th className="p-2">Row</th>
                            <th className="p-2">QR Code</th>
                            <th className="p-2">Card Number</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {importPreview.entries.map((e: any, idx: number) => (
                            <tr key={idx} className={e.status === 'VALID' ? 'hover:bg-slate-900/40' : 'bg-rose-950/20'}>
                              <td className="p-2 font-mono text-slate-500">{e.rowNumber}</td>
                              <td className="p-2 font-mono text-slate-200">{e.qrCode || '—'}</td>
                              <td className="p-2 font-mono text-slate-300">{e.cardNumber || <span className="text-slate-500 italic">Unassigned</span>}</td>
                              <td className="p-2">
                                {e.status === 'VALID' ? (
                                  <Badge variant="success" className="text-2xs py-0.5">Valid</Badge>
                                ) : (
                                  <span className="text-rose-400 text-xs flex items-center gap-1" title={e.errorMessage}>
                                    <AlertTriangle className="h-3 w-3 shrink-0" />
                                    {e.errorMessage || e.status}
                                  </span>
                                )}
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

          <ModalFooter>
            {importMode === 'SCAN' ? (
              <>
                {scannedCardsList.some((s) => s.status === 'QUEUED') && (
                  <Button
                    variant="primary"
                    disabled={isSubmittingBatch}
                    onClick={handleRegisterBatchQueued}
                    className="bg-emerald-600 hover:bg-emerald-500 font-bold"
                  >
                    {isSubmittingBatch
                      ? 'Registering...'
                      : `Register All Queued (${scannedCardsList.filter((s) => s.status === 'QUEUED').length})`}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleCloseQrImportModal}
                >
                  Done / Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportPreview(null);
                    setImportFileName(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={!importPreview || importPreview.validCount === 0 || importPreview.exceedsPlanLimit || isImporting}
                  onClick={handleConfirmQrImport}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {isImporting ? 'Importing...' : `Import ${importPreview?.validCount ?? 0} QR Codes`}
                </Button>
              </>
            )}
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
                  <p className="mt-1">{selectedCard.blockedReason || 'Blocked by Administrator'}</p>
                  {selectedCard.blockedBy && (
                    <p className="mt-0.5 text-slate-400">Blocked By: {selectedCard.blockedBy}</p>
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

            {/* Blocked By (Default: who is blocking) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Blocked By (Default)
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-200">
                <ShieldAlert className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-medium">
                  {user ? `${user.name} (${user.role === 'ORG_ADMIN' ? 'Org Admin' : user.role})` : 'Org Admin'}
                </span>
                <span className="ml-auto text-[11px] text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
                  Current Operator
                </span>
              </div>
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

            {/* Summary preview */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Audit Record Preview: </span>
              <span className="text-rose-300">
                {`[Blocked by ${user ? `${user.name} (${user.role === 'ORG_ADMIN' ? 'Org Admin' : user.role})` : 'Org Admin'}] ${blockReasonCategory}${additionalBlockReason.trim() ? `: ${additionalBlockReason.trim()}` : ''}`}
              </span>
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

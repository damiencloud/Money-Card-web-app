import { formatCurrency, formatDate, cn } from '@/utils';
import { toast } from 'sonner';
// ─── Cards Management Page (M7) ──────────────────────────────
// External Bulk QR Import & Organization Card Number Management.
// Uses apiService abstraction strictly — does NOT import mock handlers directly.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks';
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
  Plus,
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
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export function CardsPage() {
  const { hasPermission } = usePermissions();

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
  const [showSingleRegisterModal, setShowSingleRegisterModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteCardModal, setShowDeleteCardModal] = useState(false);
  const [deleteCardApiError, setDeleteCardApiError] = useState<string | null>(null);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
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

  // Single Card Registration Form State
  const [singleCardNumber, setSingleCardNumber] = useState('');
  const [singleCustomQr, setSingleCustomQr] = useState('');
  const [singleRegError, setSingleRegError] = useState<string | null>(null);
  const [isSingleRegistering, setIsSingleRegistering] = useState(false);

  // External Bulk QR Import State
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<QrImportPreview | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Assign CSV Mapping State
  const [bulkAssignFileName, setBulkAssignFileName] = useState<string | null>(null);
  const [bulkAssignMappings, setBulkAssignMappings] = useState<{ qrCode: string; cardNumber: string; valid: boolean; error?: string }[]>([]);
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const bulkAssignInputRef = useRef<HTMLInputElement>(null);

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

  // ─── Execute Single Card Registration ─────────────────────────────
  const handleSingleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = singleCardNumber.trim().toUpperCase();
    if (!cleanNum) {
      setSingleRegError('Card number is required');
      return;
    }

    setIsSingleRegistering(true);
    setSingleRegError(null);
    try {
      const res = await apiService.cards.createCard({
        physicalCardNumber: cleanNum,
        qrToken: singleCustomQr.trim() || undefined,
      });

      if (!res.success) {
        setSingleRegError(res.error.message || 'Failed to register card');
        return;
      }

      toast.success(`Card ${cleanNum} registered successfully!`);
      setShowSingleRegisterModal(false);
      setSingleCardNumber('');
      setSingleCustomQr('');
      fetchCardsData();
    } catch {
      setSingleRegError('Network error while registering card');
    } finally {
      setIsSingleRegistering(false);
    }
  };

  // ─── Execute Bulk Assignment CSV Upload ───────────────────────────
  const handleBulkAssignCsvSelect = (file: File) => {
    setBulkAssignFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const hasHeader = lines[0].toLowerCase().includes('qr') || lines[0].toLowerCase().includes('card');
      const dataRows = hasHeader ? lines.slice(1) : lines;

      const existingNums = new Set(allCards.filter((c) => !!c.physicalCardNumber).map((c) => (c.physicalCardNumber || '').toUpperCase()));
      const seenNums = new Set<string>();

      const mappings = dataRows.map((row) => {
        const parts = row.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
        const qr = parts[0] || '';
        const num = (parts[1] || '').toUpperCase();

        if (!qr || !num) {
          return { qrCode: qr, cardNumber: num, valid: false, error: 'Missing QR code or Card Number' };
        }

        const card = allCards.find((c) => c.qrToken.toLowerCase() === qr.toLowerCase());
        if (!card) {
          return { qrCode: qr, cardNumber: num, valid: false, error: 'QR Code not found in organization registry' };
        }

        if (seenNums.has(num)) {
          return { qrCode: qr, cardNumber: num, valid: false, error: 'Duplicate card number in upload batch' };
        }
        seenNums.add(num);

        if (existingNums.has(num) && card.physicalCardNumber?.toUpperCase() !== num) {
          return { qrCode: qr, cardNumber: num, valid: false, error: 'Card number already in use by another card' };
        }

        return { qrCode: qr, cardNumber: num, valid: true };
      });

      setBulkAssignMappings(mappings);
    };

    reader.readAsText(file);
  };

  const handleConfirmBulkAssign = async () => {
    const validList = bulkAssignMappings.filter((m) => m.valid);
    if (validList.length === 0) return;

    setIsBulkAssigning(true);
    try {
      const assignments = validList.map((m) => ({ qrCode: m.qrCode, cardNumber: m.cardNumber }));
      const res = await apiService.cards.bulkAssignCardNumbers({ assignments });

      if (!res.success) {
        toast.error(res.error.message || 'Failed to bulk assign card numbers');
        return;
      }

      toast.success(`Successfully assigned ${res.data.assignedCount} card numbers!`);
      setShowBulkAssignModal(false);
      setBulkAssignMappings([]);
      setBulkAssignFileName(null);
      fetchCardsData();
    } catch {
      toast.error('Network error during bulk assignment');
    } finally {
      setIsBulkAssigning(false);
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
      const res = await apiService.cards.blockCard(selectedCard.id);
      if (res.success) {
        toast.success(`Card ${selectedCard.physicalCardNumber || selectedCard.qrToken} has been blocked.`);
        setShowBlockModal(false);
        fetchCardsData();
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
        if (card.status === 'BLOCKED') return <Badge variant="danger">Blocked</Badge>;
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

          <Button
            variant="outline"
            size="md"
            className="gap-2 border-slate-700 hover:border-slate-600 text-slate-200"
            onClick={() => setShowBulkAssignModal(true)}
          >
            <FileSpreadsheet className="h-4 w-4 text-blue-400" />
            <span>Bulk Assign Numbers</span>
          </Button>

          <Button
            variant="outline"
            size="md"
            className="gap-2 border-slate-700 hover:border-slate-600 text-slate-200"
            onClick={() => {
              setSingleCardNumber('');
              setSingleCustomQr('');
              setSingleRegError(null);
              setShowSingleRegisterModal(true);
            }}
          >
            <Plus className="h-4 w-4 text-slate-400" />
            <span>Register Card</span>
          </Button>

          {canIssue && (
            <Button
              variant="primary"
              size="md"
              className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-950/50"
              onClick={() => {
                setImportFileName(null);
                setImportPreview(null);
                setShowQrImportModal(true);
              }}
            >
              <QrCode className="h-4 w-4" />
              <span>Import QR Codes</span>
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

      {/* ─── MODAL 1: External Bulk QR Import ────────────────────────── */}
      {showQrImportModal && (
        <Modal
          isOpen={showQrImportModal}
          onClose={() => {
            setShowQrImportModal(false);
            setImportPreview(null);
            setImportFileName(null);
          }}
          title="Import External Bulk QR Codes"
          size="lg"
        >
          <div className="space-y-5">
            <p className="text-sm text-slate-400">
              Upload externally generated QR codes in CSV format. QR codes will be registered in your organization as <strong>Unassigned</strong>, ready for card number assignment.
            </p>

            {/* Quota Banner */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400">
                Organization Quota: <strong className="text-slate-200">{totalCardsCount} / {effectiveCardLimit}</strong> cards registered
              </span>
              <span className={cn('font-bold', remainingQuota > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {remainingQuota} remaining quota
              </span>
            </div>

            {/* CSV File Upload Zone */}
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
              <div className="space-y-4">
                {/* File summary & stats */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800">
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

                {/* Validation Counts */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/50 text-center">
                    <p className="text-xs font-medium text-emerald-400">Valid & Ready</p>
                    <p className="text-2xl font-bold text-emerald-300 mt-0.5">{importPreview.validCount}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/50 text-center">
                    <p className="text-xs font-medium text-rose-400">Duplicates / Errors</p>
                    <p className="text-2xl font-bold text-rose-300 mt-0.5">{importPreview.errorCount}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
                    <p className="text-xs font-medium text-slate-400">Remaining Quota</p>
                    <p className="text-2xl font-bold text-slate-200 mt-0.5">{remainingQuota}</p>
                  </div>
                </div>

                {importPreview.exceedsPlanLimit && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Importing {importPreview.validCount} cards exceeds your remaining quota of {remainingQuota} cards. Please upgrade your plan or select a smaller batch.
                    </span>
                  </div>
                )}

                {/* Preview Table */}
                <div className="border border-slate-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="p-2.5">Row</th>
                        <th className="p-2.5">QR Code Value</th>
                        <th className="p-2.5">Mapped Card Number</th>
                        <th className="p-2.5">Validation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {importPreview.entries.map((e: any, idx: number) => (
                        <tr key={idx} className={e.status === 'VALID' ? 'hover:bg-slate-900/40' : 'bg-rose-950/20'}>
                          <td className="p-2.5 font-mono text-slate-500">{e.rowNumber}</td>
                          <td className="p-2.5 font-mono font-semibold text-slate-200">{e.qrCode || '—'}</td>
                          <td className="p-2.5 font-mono text-slate-300">{e.cardNumber || <span className="text-slate-500 italic">Unassigned</span>}</td>
                          <td className="p-2.5">
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

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowQrImportModal(false);
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

      {/* ─── MODAL 3: Bulk Assign Numbers CSV Mapping ────────────────── */}
      {showBulkAssignModal && (
        <Modal
          isOpen={showBulkAssignModal}
          onClose={() => {
            setShowBulkAssignModal(false);
            setBulkAssignMappings([]);
            setBulkAssignFileName(null);
          }}
          title="Bulk Assign Card Numbers (CSV Mapping)"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Upload a 2-column CSV mapping (<code>qrCode,cardNumber</code>) to assign card numbers to multiple unassigned QR cards in batch.
            </p>

            {!bulkAssignFileName ? (
              <div
                onClick={() => bulkAssignInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition-all text-center group"
              >
                <FileSpreadsheet className="h-8 w-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-semibold text-slate-200">Select Mapping CSV</p>
                <p className="text-xs text-slate-500 mt-1">Format: <code>qrCode,cardNumber</code></p>
                <input
                  ref={bulkAssignInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBulkAssignCsvSelect(file);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <span className="font-semibold text-slate-200">{bulkAssignFileName} ({bulkAssignMappings.length} mappings)</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBulkAssignMappings([]);
                      setBulkAssignFileName(null);
                    }}
                  >
                    Change File
                  </Button>
                </div>

                <div className="border border-slate-800 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="p-2">QR Code</th>
                        <th className="p-2">Target Card Number</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {bulkAssignMappings.map((m, idx) => (
                        <tr key={idx} className={m.valid ? '' : 'bg-rose-950/20'}>
                          <td className="p-2 font-mono text-slate-200">{m.qrCode}</td>
                          <td className="p-2 font-mono font-bold text-emerald-400">{m.cardNumber}</td>
                          <td className="p-2">
                            {m.valid ? (
                              <Badge variant="success" className="text-2xs py-0.5">Ready</Badge>
                            ) : (
                              <span className="text-rose-400 text-xs">{m.error}</span>
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

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkAssignModal(false);
                setBulkAssignMappings([]);
                setBulkAssignFileName(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={bulkAssignMappings.filter((m) => m.valid).length === 0 || isBulkAssigning}
              onClick={handleConfirmBulkAssign}
              className="bg-blue-600 hover:bg-blue-500 font-bold"
            >
              {isBulkAssigning ? 'Assigning...' : `Assign ${bulkAssignMappings.filter((m) => m.valid).length} Numbers`}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* ─── MODAL 4: Single Card Registration ────────────────────────── */}
      {showSingleRegisterModal && (
        <Modal
          isOpen={showSingleRegisterModal}
          onClose={() => setShowSingleRegisterModal(false)}
          title="Register Single Physical Card"
          size="md"
        >
          <form onSubmit={handleSingleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Card Number <span className="text-rose-400">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. MC 105"
                value={singleCardNumber}
                onChange={(e) => setSingleCardNumber(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Custom Pre-Printed QR (Optional)
              </label>
              <Input
                type="text"
                placeholder="Leave blank to auto-generate unique cryptographic QR token"
                value={singleCustomQr}
                onChange={(e) => setSingleCustomQr(e.target.value)}
              />
            </div>

            {singleRegError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {singleRegError}
              </div>
            )}

            <ModalFooter>
              <Button variant="outline" type="button" onClick={() => setShowSingleRegisterModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isSingleRegistering || !singleCardNumber.trim()}>
                {isSingleRegistering ? 'Registering...' : 'Register Card'}
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
          size="sm"
        >
          <p className="text-sm text-slate-300">
            Are you sure you want to block this card? It will immediately prevent all purchases, recharges, and session operations across all cafeteria counters.
          </p>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowBlockModal(false)}>Cancel</Button>
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

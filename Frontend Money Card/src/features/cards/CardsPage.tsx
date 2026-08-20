// ─── Cards Management Page (M7) ────────────────────────────
// Web Card Administration for ORG_ADMIN & SUPER_ADMIN.
// Uses apiService abstraction strictly — does NOT import mock handlers directly.

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks';
import type {
  Card as CardEntity,
  CardStatus,
  Branch,
  CardSession,
  OrganizationOverview,
  CardImportPreview,
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
import { notify, formatDate, formatCurrency, cn } from '@/utils';
import { QrCodeView } from './QrCodeView';
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
  Building2,
  History,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
} from 'lucide-react';

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
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);

  // Selected State for Details & History
  const [selectedCard, setSelectedCard] = useState<CardEntity | null>(null);
  const [cardHistorySessions, setCardHistorySessions] = useState<CardSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Issue Form State (Supports Selection from Available vs Manual Entry)
  const [issueMode, setIssueMode] = useState<'select' | 'manual'>('select');
  const [selectedAvailableCardNumber, setSelectedAvailableCardNumber] = useState('');
  const [cardNumberInput, setCardNumberInput] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [numberError, setNumberError] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Card Import State
  const [importBranchId, setImportBranchId] = useState('');
  const [importPreview, setImportPreview] = useState<CardImportPreview | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'ERRORS'>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch Cards Data ──────────────────────────────────────
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

      setAllCards(cardsRes.data.items);
      if (branchesRes.success) setBranches(branchesRes.data.items);
      if (orgRes.success) setOrgOverview(orgRes.data);
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
        const [cardsRes, branchesRes, orgRes] = await Promise.all([
          apiService.cards.getCards({ limit: 1000 }),
          apiService.branches.getBranches(),
          apiService.organizations.getOrganization(),
        ]);
        if (isCancelled) return;

        if (!cardsRes.success) {
          setError(cardsRes.error.message || 'Failed to load card list');
          return;
        }

        setAllCards(cardsRes.data.items);
        if (branchesRes.success) setBranches(branchesRes.data.items);
        if (orgRes.success) setOrgOverview(orgRes.data);
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

  // Branch-scoped cards for counting
  const branchScopedCards = useMemo(() => {
    if (branchFilter === 'ALL') return allCards;
    return allCards.filter((c) => c.currentBranchId === branchFilter);
  }, [allCards, branchFilter]);

  const totalCount = branchScopedCards.length;
  const availableCount = branchScopedCards.filter((c) => c.status === 'AVAILABLE').length;
  const activeCount = branchScopedCards.filter((c) => c.status === 'ACTIVE').length;
  const blockedCount = branchScopedCards.filter((c) => c.status === 'BLOCKED').length;

  // Filtered Cards to display in the table
  const cards = useMemo(() => {
    let result = [...branchScopedCards];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => c.physicalCardNumber.toLowerCase().includes(q));
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((c) => c.status === statusFilter);
    }

    return result;
  }, [branchScopedCards, searchQuery, statusFilter]);

  // Available cards for issuing (status = AVAILABLE across org)
  const availableCards = useMemo(() => {
    return allCards.filter((c) => c.status === 'AVAILABLE');
  }, [allCards]);

  // Block unauthorized users
  if (!canView) {
    return <UnauthorizedPage />;
  }

  // ── Open Issue Card Modal ─────────────────────────────────
  const handleOpenIssue = () => {
    const hasAvailable = availableCards.length > 0;
    setIssueMode(hasAvailable ? 'select' : 'manual');
    setSelectedAvailableCardNumber(hasAvailable ? availableCards[0].physicalCardNumber : '');

    const nextNum = `MC-${String(cards.length + 1).padStart(3, '0')}`;
    setCardNumberInput(nextNum);
    setSelectedBranchId(branches[0]?.id || '');
    setNumberError(null);
    setBranchError(null);
    setModalApiError(null);
    setShowIssueModal(true);
  };

  // ── Submit Issue Card ─────────────────────────────────────
  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let targetCardNumber = '';

    if (issueMode === 'select') {
      if (!selectedAvailableCardNumber) {
        setNumberError('Please select an available physical card');
        return;
      }
      targetCardNumber = selectedAvailableCardNumber.trim();
    } else {
      if (!cardNumberInput.trim()) {
        setNumberError('Physical card number is required');
        return;
      }
      targetCardNumber = cardNumberInput.trim();
    }

    if (!selectedBranchId) {
      setBranchError('Branch selection is required');
      return;
    }

    setNumberError(null);
    setBranchError(null);
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      // If card already exists as AVAILABLE, we confirm or associate with branch
      const existingAvailable = availableCards.find(
        (c) => c.physicalCardNumber.toLowerCase() === targetCardNumber.toLowerCase(),
      );

      if (existingAvailable) {
        notify.success(`Card ${existingAvailable.physicalCardNumber} is ready for session activation at ${branches.find((b) => b.id === selectedBranchId)?.name || 'selected branch'}`);
        setShowIssueModal(false);
        fetchCardsData();
        return;
      }

      // Otherwise create new card
      const res = await apiService.cards.createCard({
        physicalCardNumber: targetCardNumber,
        branchId: selectedBranchId,
      });

      if (!res.success) {
        if (res.error.code === 'PLAN_LIMIT_REACHED') {
          setModalApiError(
            res.error.message ||
              'Card limit reached for your active subscription. Please upgrade your plan to register more cards.',
          );
        } else {
          setModalApiError(res.error.message || 'Failed to issue card');
        }
        return;
      }

      notify.success(`Card ${res.data.physicalCardNumber} issued successfully`);
      setShowIssueModal(false);
      fetchCardsData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Bulk Card Import Modal ───────────────────────────
  const handleOpenImport = () => {
    setImportBranchId(branches[0]?.id || '');
    setImportPreview(null);
    setImportFileName(null);
    setModalApiError(null);
    setPreviewFilter('ALL');
    setShowImportModal(true);
  };

  // ── Download Sample CSV ───────────────────────────────────
  const handleDownloadSampleCsv = () => {
    const sampleContent = 'cardNumber\nMC-101\nMC-102\nMC-103\nMC-104\nMC-105\nMC-106\nMC-107\nMC-108\nMC-109\nMC-110\n';
    const blob = new Blob([sampleContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_cards_import.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    notify.success('Sample CSV template downloaded');
  };

  // ── Parse & Validate Uploaded CSV ─────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setModalApiError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setModalApiError('Uploaded file is empty.');
          return;
        }

        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length === 0) {
          setModalApiError('CSV file does not contain any data rows.');
          return;
        }

        // Determine if first line is a header
        let startIndex = 0;
        const firstLineLower = lines[0].toLowerCase();
        if (
          firstLineLower.includes('card') ||
          firstLineLower.includes('number') ||
          firstLineLower.includes('identifier')
        ) {
          startIndex = 1;
        }

        const existingCardSet = new Set(cards.map((c) => c.physicalCardNumber.toLowerCase()));
        const seenInFile = new Set<string>();

        const validCards: string[] = [];
        const duplicateCards: string[] = [];
        const invalidCards: { rowNumber: number; cardNumber: string; reason: string }[] = [];

        for (let i = startIndex; i < lines.length; i++) {
          const rowNum = i + 1;
          const rawVal = lines[i].split(',')[0]?.replace(/["']/g, '').trim();

          if (!rawVal) {
            invalidCards.push({
              rowNumber: rowNum,
              cardNumber: '(empty)',
              reason: 'Card number is missing or blank',
            });
            continue;
          }

          // Format validation: 2-30 characters alphanumeric / hyphen
          if (!/^[A-Za-z0-9\-_]{2,30}$/.test(rawVal)) {
            invalidCards.push({
              rowNumber: rowNum,
              cardNumber: rawVal,
              reason: 'Invalid format (allowed: 2-30 characters, alphanumeric and hyphens)',
            });
            continue;
          }

          const lower = rawVal.toLowerCase();

          // Duplicate in same file
          if (seenInFile.has(lower)) {
            duplicateCards.push(rawVal);
            invalidCards.push({
              rowNumber: rowNum,
              cardNumber: rawVal,
              reason: 'Duplicate card number within the CSV file',
            });
            continue;
          }

          // Already exists in organization
          if (existingCardSet.has(lower)) {
            duplicateCards.push(rawVal);
            invalidCards.push({
              rowNumber: rowNum,
              cardNumber: rawVal,
              reason: 'Card already exists in your organization registry',
            });
            continue;
          }

          seenInFile.add(lower);
          validCards.push(rawVal);
        }

        setImportPreview({
          totalRows: lines.length - startIndex,
          validCards,
          duplicateCards,
          invalidCards,
        });
      } catch {
        setModalApiError('Failed to parse CSV file. Please ensure it is a valid UTF-8 CSV.');
      }
    };

    reader.readAsText(file);
  };

  // ── Confirm Bulk Card Import ──────────────────────────────
  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.validCards.length === 0) return;

    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.cards.importCards({
        branchId: importBranchId || undefined,
        cardNumbers: importPreview.validCards,
      });

      if (!res.success) {
        if (res.error.code === 'PLAN_LIMIT_REACHED') {
          setModalApiError(
            res.error.message ||
              'Imported cards exceed your subscription quota. Please upgrade your plan or reduce the batch size.',
          );
        } else {
          setModalApiError(res.error.message || 'Failed to import cards');
        }
        return;
      }

      notify.success(
        `Successfully imported ${res.data.importedCount} physical cards into the organization registry!`,
      );
      setShowImportModal(false);
      fetchCardsData();
    } catch {
      setModalApiError('An unexpected error occurred during card import.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Details & Fetch Card Sessions History ─────────────
  const handleOpenDetails = async (card: CardEntity) => {
    setSelectedCard(card);
    setShowDetailsModal(true);
    setIsLoadingHistory(true);
    setCardHistorySessions([]);

    try {
      const res = await apiService.sessions.getSessions({ cardId: card.id });
      if (res.success) {
        setCardHistorySessions(res.data.items);
      }
    } catch {
      // Keep empty history array on error
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // ── Block Card ────────────────────────────────────────────
  const handleOpenBlock = (card: CardEntity) => {
    setSelectedCard(card);
    setModalApiError(null);
    setShowBlockModal(true);
  };

  const handleBlockSubmit = async () => {
    if (!selectedCard) return;
    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.cards.blockCard(selectedCard.id);
      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to block card');
        return;
      }

      notify.success(`Card ${selectedCard.physicalCardNumber} has been blocked`);
      setShowBlockModal(false);
      fetchCardsData();
    } catch {
      setModalApiError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Unblock Card ──────────────────────────────────────────
  const handleOpenUnblock = (card: CardEntity) => {
    setSelectedCard(card);
    setModalApiError(null);
    setShowUnblockModal(true);
  };

  const handleUnblockSubmit = async () => {
    if (!selectedCard) return;
    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.cards.unblockCard(selectedCard.id);
      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to unblock card');
        return;
      }

      notify.success(`Card ${selectedCard.physicalCardNumber} unblocked successfully`);
      setShowUnblockModal(false);
      fetchCardsData();
    } catch {
      setModalApiError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Data Table Columns ────────────────────────────────────
  const columns = [
    {
      key: 'physicalCardNumber',
      header: 'Physical Card Number',
      render: (card: CardEntity) => (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <p className="font-mono text-sm font-bold text-slate-100">
              {card.physicalCardNumber}
            </p>
            <p className="text-[11px] text-slate-500 font-mono truncate max-w-[140px]">
              ID: {card.id}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (card: CardEntity) => {
        let variant: 'default' | 'success' | 'danger' = 'default';
        if (card.status === 'ACTIVE') variant = 'success';
        if (card.status === 'BLOCKED') variant = 'danger';

        return <Badge variant={variant}>{card.status}</Badge>;
      },
    },
    {
      key: 'branch',
      header: 'Branch Location',
      render: (card: CardEntity) => {
        const branch = branches.find((b) => b.id === card.currentBranchId);
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>{branch?.name || 'All Branches'}</span>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Registered Date',
      render: (card: CardEntity) => (
        <span className="text-xs text-slate-400">{formatDate(card.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (card: CardEntity) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDetails(card)}
            leftIcon={<Eye className="h-3.5 w-3.5" />}
          >
            Details
          </Button>

          {card.status !== 'BLOCKED' && canBlock && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenBlock(card)}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              leftIcon={<Lock className="h-3.5 w-3.5" />}
            >
              Block
            </Button>
          )}

          {card.status === 'BLOCKED' && canUnblock && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenUnblock(card)}
              leftIcon={<Unlock className="h-3.5 w-3.5" />}
            >
              Unblock
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Cards Administration</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage organization physical cards, bulk CSV importing, and issuing workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canIssue && (
            <Button
              variant="outline"
              onClick={handleOpenImport}
              leftIcon={<Upload className="h-4 w-4 text-violet-400" />}
            >
              Import Cards
            </Button>
          )}

          {canIssue && (
            <Button variant="primary" onClick={handleOpenIssue} leftIcon={<Plus className="h-4 w-4" />}>
              Issue Card
            </Button>
          )}
        </div>
      </div>

      {/* Plan Card Limit Usage Indicator */}
      {orgOverview?.usage && (
        <Card padding="sm" className="bg-slate-900/40">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-400">
              Active Card Registry ({orgOverview.plan?.name || 'Active Plan'}):
            </span>
            <span className="text-slate-200">
              <strong className="text-violet-400">{allCards.length}</strong> /{' '}
              {orgOverview.usage.cardLimit} registered cards
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-violet-500 transition-all duration-300"
              style={{
                width: `${Math.min(
                  (allCards.length / orgOverview.usage.cardLimit) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
        </Card>
      )}

      {/* ── Status Count Filter Tabs (Merged Available Count into Filters) ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
            statusFilter === 'ALL'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
              : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200',
          )}
        >
          <span>All</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
              statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400',
            )}
          >
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('AVAILABLE')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
            statusFilter === 'AVAILABLE'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200',
          )}
        >
          <span>Available</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
              statusFilter === 'AVAILABLE'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
            )}
          >
            {availableCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ACTIVE')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
            statusFilter === 'ACTIVE'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
              : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200',
          )}
        >
          <span>Active</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
              statusFilter === 'ACTIVE'
                ? 'bg-white/20 text-white'
                : 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
            )}
          >
            {activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('BLOCKED')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
            statusFilter === 'BLOCKED'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
              : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200',
          )}
        >
          <span>Blocked</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
              statusFilter === 'BLOCKED'
                ? 'bg-white/20 text-white'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
            )}
          >
            {blockedCount}
          </span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by card number (e.g. MC-001)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Branch Filter */}
        <div className="w-full sm:w-52">
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

        <Button variant="outline" size="md" onClick={fetchCardsData} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Refresh
        </Button>
      </div>

      {/* Content Table */}
      {isLoading ? (
        <LoadingState message="Loading card registry..." />
      ) : error ? (
        <ErrorState title="Failed to load cards" message={error} onRetry={fetchCardsData} />
      ) : cards.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-8 w-8 text-slate-500" />}
          title="No cards found"
          description={
            searchQuery || statusFilter !== 'ALL' || branchFilter !== 'ALL'
              ? 'No cards matching the selected filters.'
              : 'Import cards via CSV or issue your first physical card to begin.'
          }
          action={
            canIssue && !searchQuery ? (
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleOpenImport} leftIcon={<Upload className="h-4 w-4" />}>
                  Import Cards
                </Button>
                <Button variant="primary" onClick={handleOpenIssue} leftIcon={<Plus className="h-4 w-4" />}>
                  Issue Card
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <Card padding="none">
          <DataTable<CardEntity> data={cards} columns={columns} keyExtractor={(item: CardEntity) => item.id} />
        </Card>
      )}

      {/* ── 1. ISSUE CARD MODAL (WITH AVAILABLE SELECTION + MANUAL ENTRY) ── */}
      <Modal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        title="Issue Physical Card"
        description="Select an imported available card or manually enter a physical card number."
        size="lg"
      >
        <form onSubmit={handleIssueSubmit} noValidate className="space-y-5">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIssueMode('select')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  issueMode === 'select'
                    ? 'bg-violet-600 text-white shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Select Available ({availableCards.length})
              </button>

              <button
                type="button"
                onClick={() => setIssueMode('manual')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  issueMode === 'manual'
                    ? 'bg-violet-600 text-white shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                Enter Manually
              </button>
            </div>

            {availableCards.length > 0 && issueMode === 'manual' && (
              <button
                type="button"
                onClick={() => setIssueMode('select')}
                className="text-xs text-violet-400 hover:text-violet-300 font-medium"
              >
                Choose from {availableCards.length} available →
              </button>
            )}
          </div>

          {/* Option A: Select Available Card */}
          {issueMode === 'select' && (
            <div className="space-y-3">
              {availableCards.length === 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    No Available Physical Cards Found
                  </div>
                  <p>
                    All registered cards are currently assigned or active. You can switch to manual entry or import a new batch of physical cards via CSV.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIssueMode('manual')}
                    className="mt-1"
                  >
                    Switch to Manual Entry
                  </Button>
                </div>
              ) : (
                <Select
                  id="issue-select-available-card"
                  label="Select Available Physical Card"
                  value={selectedAvailableCardNumber}
                  onChange={(e) => {
                    setSelectedAvailableCardNumber(e.target.value);
                    if (numberError) setNumberError(null);
                  }}
                  options={availableCards.map((c) => ({
                    value: c.physicalCardNumber,
                    label: `${c.physicalCardNumber} (AVAILABLE)`,
                  }))}
                  error={numberError ?? undefined}
                  disabled={isSubmitting}
                />
              )}
            </div>
          )}

          {/* Option B: Enter Manually */}
          {issueMode === 'manual' && (
            <Input
              id="issue-card-number-manual"
              label="Physical Card Number"
              placeholder="e.g. MC-004"
              value={cardNumberInput}
              onChange={(e) => {
                setCardNumberInput(e.target.value);
                if (numberError) setNumberError(null);
              }}
              error={numberError ?? undefined}
              disabled={isSubmitting}
              autoFocus
            />
          )}

          {/* Branch Location */}
          <Select
            id="issue-card-branch"
            label="Assigned Branch Location"
            value={selectedBranchId}
            onChange={(e) => {
              setSelectedBranchId(e.target.value);
              if (branchError) setBranchError(null);
            }}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
            error={branchError ?? undefined}
            disabled={isSubmitting}
          />

          <p className="text-xs text-slate-400">
            Physical card will be registered with a cryptographically secure opaque QR credential.
          </p>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowIssueModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting || (issueMode === 'select' && availableCards.length === 0)}
            >
              Issue Physical Card
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── 2. BULK CARD IMPORT MODAL ── */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Physical Cards via CSV"
        description="Bulk import pre-printed physical card numbers into your organization registry."
        size="xl"
      >
        <div className="space-y-6">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          {/* Download Sample & Branch Selection */}
          <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                Default Branch Assignment
              </label>
              <Select
                id="import-card-branch"
                value={importBranchId}
                onChange={(e) => setImportBranchId(e.target.value)}
                options={[
                  { value: '', label: 'Unassigned / Global Org' },
                  ...branches.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </div>

            <div className="flex flex-col justify-end">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleDownloadSampleCsv}
                leftIcon={<Download className="h-4 w-4 text-violet-400" />}
              >
                Download Sample CSV
              </Button>
            </div>
          </div>

          {/* Upload Dropzone */}
          {!importPreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/60 p-8 text-center cursor-pointer transition-colors hover:border-violet-500 hover:bg-violet-950/10"
            >
              <FileSpreadsheet className="h-10 w-10 text-violet-400 mb-3" />
              <p className="font-semibold text-slate-200 text-sm">
                Click to upload or drag and drop CSV file
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Accepts .csv with a single <code className="text-violet-300">cardNumber</code> column
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Import Summary Badges */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Valid Cards</span>
                  </div>
                  <p className="font-mono text-xl font-bold text-emerald-400">
                    {importPreview.validCards.length}
                  </p>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Duplicates</span>
                  </div>
                  <p className="font-mono text-xl font-bold text-amber-400">
                    {importPreview.duplicateCards.length}
                  </p>
                </div>

                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-rose-300">
                    <XCircle className="h-4 w-4" />
                    <span>Invalid Format</span>
                  </div>
                  <p className="font-mono text-xl font-bold text-rose-400">
                    {importPreview.invalidCards.filter((i) => !i.reason.includes('Duplicate') && !i.reason.includes('already exists')).length}
                  </p>
                </div>
              </div>

              {/* Preview Filter Tabs */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">
                    File: <strong className="text-slate-200">{importFileName || 'cards.csv'}</strong>
                  </span>
                  <span className="text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('ALL')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      previewFilter === 'ALL'
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({importPreview.totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('VALID')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      previewFilter === 'VALID'
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Valid ({importPreview.validCards.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('ERRORS')}
                    className={`px-2.5 py-1 rounded font-medium ${
                      previewFilter === 'ERRORS'
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Issues ({importPreview.invalidCards.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setImportPreview(null);
                    setImportFileName(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Choose Different File
                </button>
              </div>

              {/* Preview Cards List (Natural scroll with bounded height) */}
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 rounded-xl border border-slate-800 bg-slate-950 p-3">
                {/* Valid Rows */}
                {(previewFilter === 'ALL' || previewFilter === 'VALID') &&
                  importPreview.validCards.map((num) => (
                    <div
                      key={num}
                      className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-violet-400" />
                        <span className="font-mono font-bold text-slate-200">{num}</span>
                      </div>
                      <Badge variant="success" className="text-[10px]">
                        READY TO IMPORT
                      </Badge>
                    </div>
                  ))}

                {/* Error Rows */}
                {(previewFilter === 'ALL' || previewFilter === 'ERRORS') &&
                  importPreview.invalidCards.map((err, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold">{err.cardNumber}</span>
                        <span className="text-[11px] text-rose-400">(Row {err.rowNumber})</span>
                      </div>
                      <span className="text-[11px] text-rose-300 truncate max-w-[220px]">
                        {err.reason}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportModal(false);
                setImportPreview(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmImport}
              isLoading={isSubmitting}
              disabled={isSubmitting || !importPreview || importPreview.validCards.length === 0}
            >
              Confirm Import ({importPreview?.validCards.length || 0} Cards)
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── 3. CARD DETAILS & HISTORY MODAL (CONTAINED LAYOUT) ── */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={`Card Details: ${selectedCard?.physicalCardNumber}`}
        description="Physical card parameters, secure QR credential representation, and session audit history."
        size="lg"
      >
        {selectedCard && (
          <div className="space-y-6 max-h-[66vh] overflow-y-auto pr-1">
            {/* Header Info Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <div>
                <span className="text-xs text-slate-500">Physical Identifier:</span>
                <h3 className="font-mono text-xl font-bold text-violet-300 break-all">
                  {selectedCard.physicalCardNumber}
                </h3>
              </div>
              <Badge
                variant={
                  selectedCard.status === 'ACTIVE'
                    ? 'success'
                    : selectedCard.status === 'BLOCKED'
                      ? 'danger'
                      : 'default'
                }
              >
                {selectedCard.status}
              </Badge>
            </div>

            {/* QR Credential Box */}
            <QrCodeView
              physicalCardNumber={selectedCard.physicalCardNumber}
              qrToken={selectedCard.qrToken}
            />

            {/* Session & Card History */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <History className="h-4 w-4 text-violet-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Card Session Lifetime History
                </h4>
              </div>

              {isLoadingHistory ? (
                <LoadingState message="Loading card session history..." />
              ) : cardHistorySessions.length === 0 ? (
                <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-4 text-center text-xs text-slate-500">
                  No sessions recorded for this card yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cardHistorySessions.map((session) => {
                    const sessionBranch = branches.find((b) => b.id === session.branchId);

                    return (
                      <div
                        key={session.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-slate-200">ID: {session.id}</span>
                            <Badge
                              variant={session.status === 'ACTIVE' ? 'success' : 'outline'}
                              className="text-[10px]"
                            >
                              {session.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Branch: {sessionBranch?.name || 'Main Branch'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-violet-300">
                            {formatCurrency(session.balance)}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Started: {formatDate(session.startedAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <ModalFooter className="px-0 pb-0">
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* ── 4. BLOCK CONFIRMATION MODAL ── */}
      <Modal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        title={`Block Card ${selectedCard?.physicalCardNumber}`}
      >
        <div className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <p className="text-sm text-slate-300">
            Are you sure you want to block physical card{' '}
            <span className="font-mono font-bold text-rose-400">
              {selectedCard?.physicalCardNumber}
            </span>
            ?
          </p>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
            <p className="font-semibold">Important M0 Rule:</p>
            <p>
              Blocking a card prevents further transactions, but does <strong>NOT</strong> automatically refund or settle its active session.
            </p>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowBlockModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBlockSubmit} isLoading={isSubmitting} disabled={isSubmitting}>
              Block Card
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── 5. UNBLOCK CONFIRMATION MODAL ── */}
      <Modal
        isOpen={showUnblockModal}
        onClose={() => setShowUnblockModal(false)}
        title={`Unblock Card ${selectedCard?.physicalCardNumber}`}
      >
        <div className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <p className="text-sm text-slate-300">
            Are you sure you want to unblock physical card{' '}
            <span className="font-mono font-bold text-violet-300">
              {selectedCard?.physicalCardNumber}
            </span>
            ?
          </p>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowUnblockModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUnblockSubmit} isLoading={isSubmitting} disabled={isSubmitting}>
              Unblock Card
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}

import { toast } from 'sonner';
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
  Transaction,
  OrganizationOverview,
  CardImportMode,
  ImportCardEntry,
  CardImportValidationError,
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
  Activity,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  History,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  QrCode,
  ArrowLeft,
  Printer,
  Copy,
  Check,
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
  const [cardTransactions, setCardTransactions] = useState<Transaction[]>([]);
  const [detailsTab, setDetailsTab] = useState<'ACTIVE' | 'SETTLED' | 'TRANSACTIONS'>('ACTIVE');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Issue Form State (Supports Selection from Available vs Manual Entry)
  const [issueMode, setIssueMode] = useState<'select' | 'manual'>('select');
  const [selectedAvailableCardNumber, setSelectedAvailableCardNumber] = useState('');
  const [cardNumberInput, setCardNumberInput] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [numberError, setNumberError] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Card Import State (Explicit 2-Option Flow)
  const [selectedImportMode, setSelectedImportMode] = useState<CardImportMode | null>(null);
  const [importBranchId, setImportBranchId] = useState('');
  const [importPreview, setImportPreview] = useState<CardImportPreview | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'ERRORS'>('ALL');
  const [importedCardsSuccess, setImportedCardsSuccess] = useState<CardEntity[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single Card QR View Modal State
  const [selectedQrCard, setSelectedQrCard] = useState<CardEntity | null>(null);
  const [isCopiedToken, setIsCopiedToken] = useState(false);

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
        const sessionRes = await apiService.sessions.createSession({
          cardId: existingAvailable.id,
          branchId: selectedBranchId,
          customerName: customerNameInput.trim() || undefined,
          customerPhone: customerPhoneInput.trim() || undefined,
        } as any);

        if (!sessionRes.success) {
          setModalApiError(sessionRes.error.message || 'Failed to activate card session');
          return;
        }

        notify.success(`Card ${existingAvailable.physicalCardNumber} activated and issued successfully${customerNameInput.trim() ? ` to ${customerNameInput.trim()}` : ''}`);
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
    const sampleContent = 'cardNumber,qrCode\nMC-101,\nMC-102,\nMC-103,VENDOR_QR_TOKEN_103\nMC-104,\nMC-105,\n';
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
          setModalApiError('CSV file is empty');
          return;
        }

        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length === 0) {
          setModalApiError('CSV file does not contain any data rows.');
          return;
        }

        const mode = selectedImportMode || 'AUTO_GENERATED_QR';
        let startIndex = 0;
        const firstLineLower = lines[0].toLowerCase();

        // Check header validation per mode
        if (
          firstLineLower.includes('card') ||
          firstLineLower.includes('number') ||
          firstLineLower.includes('qr')
        ) {
          startIndex = 1;
          if (mode === 'PREPRINTED_QR' && !firstLineLower.includes('qr')) {
            setModalApiError(
              "This CSV does not match the selected import method: missing required 'qrCode' column. Please download the Pre-Printed QR sample CSV.",
            );
            return;
          }
        } else if (mode === 'PREPRINTED_QR') {
          const firstLineParts = lines[0].split(',');
          if (firstLineParts.length < 2 || !firstLineParts[1].trim()) {
            setModalApiError(
              "This CSV does not match the selected import method: missing required 'qrCode' column. Please download the Pre-Printed QR sample CSV.",
            );
            return;
          }
        }

        const existingCardSet = new Set(cards.map((c) => c.physicalCardNumber.toLowerCase()));
        const existingQrSet = new Set(cards.map((c) => c.qrToken.toLowerCase()));
        const seenCardsInFile = new Set<string>();
        const seenQrsInFile = new Set<string>();

        const validCards: string[] = [];
        const validEntries: ImportCardEntry[] = [];
        const duplicateCards: string[] = [];
        const invalidCards: CardImportValidationError[] = [];

        for (let i = startIndex; i < lines.length; i++) {
          const rowNum = i + 1;
          const parts = lines[i].split(',').map((s: string) => s.replace(/["']/g, '').trim());
          const rawCardNum = parts[0];
          const rawQr = parts[1] || '';

          if (!rawCardNum) {
            invalidCards.push({
              rowNumber: rowNum,
              cardNumber: '(empty)',
              reason: 'Card number is missing or blank',
            });
            continue;
          }

          // Format validation: 2-30 characters alphanumeric / hyphen
          if (!/^[A-Za-z0-9\-_]{2,30}$/.test(rawCardNum)) {
            invalidCards.push({
              rowNumber: rowNum,
              cardNumber: rawCardNum,
              reason: 'Invalid card number format (allowed: 2-30 characters, alphanumeric and hyphens)',
            });
            continue;
          }

          const lowerCard = rawCardNum.toLowerCase();

          // Check duplicate card in file
          if (seenCardsInFile.has(lowerCard)) {
            duplicateCards.push(rawCardNum);
            invalidCards.push({
              rowNumber: rowNum,
              cardNumber: rawCardNum,
              reason: 'Duplicate card number within this CSV file',
            });
            continue;
          }

          // Check duplicate card in organization
          if (existingCardSet.has(lowerCard)) {
            duplicateCards.push(rawCardNum);
            invalidCards.push({
              rowNumber: rowNum,
              cardNumber: rawCardNum,
              reason: 'Card already exists in your organization registry',
            });
            continue;
          }

          // MODE SPECIFIC VALIDATION
          if (mode === 'AUTO_GENERATED_QR') {
            if (rawQr && rawQr.length > 0) {
              invalidCards.push({
                rowNumber: rowNum,
                cardNumber: rawCardNum,
                reason: 'Auto QR mode accepts card numbers only. Remove QR code or switch to Pre-Printed QR mode.',
              });
              continue;
            }

            seenCardsInFile.add(lowerCard);
            validCards.push(rawCardNum);
            validEntries.push({ cardNumber: rawCardNum });
          } else {
            if (!rawQr) {
              invalidCards.push({
                rowNumber: rowNum,
                cardNumber: rawCardNum,
                reason: 'Missing required pre-printed QR code for this card',
              });
              continue;
            }

            const lowerQr = rawQr.toLowerCase();

            if (seenQrsInFile.has(lowerQr)) {
              invalidCards.push({
                rowNumber: rowNum,
                cardNumber: rawCardNum,
                qrCode: rawQr,
                reason: `Duplicate QR code '${rawQr}' within this CSV file`,
              });
              continue;
            }

            if (existingQrSet.has(lowerQr)) {
              invalidCards.push({
                rowNumber: rowNum,
                cardNumber: rawCardNum,
                qrCode: rawQr,
                reason: `QR code '${rawQr}' is already assigned to another card`,
              });
              continue;
            }

            seenCardsInFile.add(lowerCard);
            seenQrsInFile.add(lowerQr);
            validCards.push(rawCardNum);
            validEntries.push({ cardNumber: rawCardNum, qrToken: rawQr });
          }
        }

        setImportPreview({
          mode,
          totalRows: lines.length - startIndex,
          validCards,
          validEntries,
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
  // Helper to export CSV
  const exportCardsToCsv = (cardsToExport: CardEntity[], filename: string) => {
    const headers = 'cardNumber,qrCode,status,branchName,createdAt\n';
    const rows = cardsToExport.map((c) => {
      const branchName = branches.find((b) => b.id === c.currentBranchId)?.name || 'Unassigned';
      const created = new Date(c.createdAt).toLocaleDateString();
      return `"${c.physicalCardNumber}","${c.qrToken}","${c.status}","${branchName}","${created}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${cardsToExport.length} cards to ${filename}`);
  };

  // Helper to print QR codes sheet
  const printQrSheet = (cardsToPrint: CardEntity[], sheetTitle: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Unable to open print window. Please allow popups.');
      return;
    }

    const cardsHtml = cardsToPrint.map((c) => {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(c.qrToken)}`;
      return `
        <div style="border: 1.5px solid #334155; border-radius: 10px; padding: 12px; text-align: center; background: #ffffff; break-inside: avoid; display: flex; flex-direction: column; align-items: center;">
          <div style="font-family: sans-serif; font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; margin-bottom: 6px;">MONEY CARD</div>
          <img src="${qrApiUrl}" alt="${c.physicalCardNumber}" style="width: 130px; height: 130px; margin-bottom: 8px; border: 1px solid #e2e8f0; padding: 4px; border-radius: 6px;" />
          <div style="font-family: monospace; font-size: 13px; font-weight: 700; color: #0f172a;">${c.physicalCardNumber}</div>
          <div style="font-family: monospace; font-size: 9px; color: #64748b; margin-top: 2px; word-break: break-all; max-width: 130px;">${c.qrToken.length > 18 ? c.qrToken.substring(0, 16) + '...' : c.qrToken}</div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${sheetTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f8fafc; color: #0f172a; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #cbd5e1; padding-bottom: 12px; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 16px; }
          @media print {
            body { background: #ffffff; margin: 0; }
            .no-print { display: none; }
            .grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0 0 4px;">Money Card — Physical Cards QR Sheet</h2>
          <p style="margin: 0; font-size: 13px; color: #64748b;">Batch Total: <strong>${cardsToPrint.length} Cards</strong> | Generated on ${new Date().toLocaleString()}</p>
          <button class="no-print" onclick="window.print()" style="margin-top: 10px; padding: 8px 18px; background: #7c3aed; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Print QR Sheet</button>
        </div>
        <div class="grid">
          ${cardsHtml}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Helper to download single card QR as PNG
  const downloadSingleCardQrPng = (cardNumber: string) => {
    const canvas = document.getElementById(`qr-canvas-${cardNumber}`) as HTMLCanvasElement;
    if (!canvas) {
      toast.error('Could not find QR canvas');
      return;
    }
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `QR_${cardNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded QR for ${cardNumber}`);
  };

  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.validCards.length === 0 || !selectedImportMode) return;

    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.cards.importCards({
        branchId: importBranchId || undefined,
        importMode: selectedImportMode,
        cardNumbers: importPreview.validCards,
        cards: importPreview.validEntries,
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
    setCardTransactions([]);
    setDetailsTab('ACTIVE');

    try {
      const res = await apiService.sessions.getSessions({ cardId: card.id });
      if (res.success && res.data?.items) {
        const sessions: CardSession[] = res.data.items;
        setCardHistorySessions(sessions);

        // Fetch / aggregate transactions across all sessions
        const allTx: Transaction[] = [];
        for (const s of sessions) {
          if (s.transactions && s.transactions.length > 0) {
            allTx.push(...s.transactions);
          } else {
            try {
              const txRes = await apiService.sessions.getSessionTransactions(s.id);
              if (txRes.success && txRes.data) {
                allTx.push(...txRes.data);
              }
            } catch {
              // ignore single session error
            }
          }
        }
        allTx.sort((a, b) => new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime());
        setCardTransactions(allTx);
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
            onClick={() => {
              setSelectedQrCard(card);
              setIsCopiedToken(false);
            }}
            className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
            leftIcon={<QrCode className="h-3.5 w-3.5" />}
          >
            QR
          </Button>

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

          {/* Customer Details (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
            <Input
              id="issue-customer-name"
              label="Customer Name (Optional)"
              placeholder="e.g. John Doe"
              value={customerNameInput}
              onChange={(e) => setCustomerNameInput(e.target.value)}
              disabled={isSubmitting}
            />

            <Input
              id="issue-customer-phone"
              label="Phone Number (10 Digits)"
              placeholder="e.g. 9876543210"
              value={customerPhoneInput}
              maxLength={10}
              onChange={(e) => setCustomerPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
              disabled={isSubmitting}
            />
          </div>

          <p className="text-xs text-slate-400">
            Physical card will be registered and activated with an active customer session until returned.
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
        onClose={() => {
          setShowImportModal(false);
          setSelectedImportMode(null);
          setImportPreview(null);
          setImportFileName(null);
          setModalApiError(null);
        }}
        title={
          !selectedImportMode
            ? 'Import Cards'
            : selectedImportMode === 'AUTO_GENERATED_QR'
            ? 'Import Cards with Auto-Generated QR'
            : 'Import Cards with Pre-Printed QR'
        }
        description={
          !selectedImportMode
            ? 'Choose how your physical cards will be imported into your organization registry.'
            : selectedImportMode === 'AUTO_GENERATED_QR'
            ? 'Upload card numbers only. Money Card will automatically generate unique secure QR codes for every card.'
            : 'Upload card numbers together with the QR codes already printed by your card manufacturer.'
        }
        size="lg"
      >
        <div className="space-y-6">
          {modalApiError && (
            <div
              className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <p className="text-sm text-rose-300">{modalApiError}</p>
            </div>
          )}

                    {/* SUCCESS & EXPORT SCREEN: Shown immediately after successful import */}
          {importedCardsSuccess ? (
            <div className="space-y-6 py-2">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-100">
                  {importedCardsSuccess.length} Cards Imported Successfully!
                </h3>
                <p className="text-xs text-slate-400 max-w-md">
                  {selectedImportMode === 'AUTO_GENERATED_QR'
                    ? 'Unique cryptographic QR codes have been generated for all cards. Download the QR mapping file or print sheet to imprint on your physical cards.'
                    : 'Your pre-printed card numbers and vendor QR codes have been registered into the organization.'}
                </p>
              </div>

              {/* Action Cards for Export */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-violet-400 font-semibold text-sm">
                      <Download className="h-4 w-4" />
                      <span>Download QR Mapping CSV</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Export CSV containing <code>cardNumber</code> and <code>qrCode</code> to send to your card printing manufacturer.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => exportCardsToCsv(importedCardsSuccess, `imported_cards_qr_${new Date().toISOString().slice(0, 10)}.csv`)}
                    leftIcon={<Download className="h-4 w-4" />}
                  >
                    Export QR Mapping CSV
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
                      <Printer className="h-4 w-4 text-violet-400" />
                      <span>Print QR Code Sheet</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Open a formatted, print-ready grid sheet of QR codes and card numbers for sticker or card imprinting.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => printQrSheet(importedCardsSuccess, `Money Card QR Batch (${importedCardsSuccess.length} Cards)`)}
                    leftIcon={<Printer className="h-4 w-4 text-violet-400" />}
                  >
                    Open Printable QR Sheet
                  </Button>
                </div>
              </div>

              {/* Preview of Imported Cards */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400">Imported Cards Summary:</span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-slate-800 bg-slate-950 p-2.5">
                  {importedCardsSuccess.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-1.5 text-xs">
                      <span className="font-mono font-bold text-slate-200">{c.physicalCardNumber}</span>
                      <span className="font-mono text-[11px] text-violet-400 truncate max-w-[200px]">QR: {c.qrToken}</span>
                    </div>
                  ))}
                </div>
              </div>

              <ModalFooter>
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowImportModal(false);
                    setSelectedImportMode(null);
                    setImportPreview(null);
                    setImportFileName(null);
                    setImportedCardsSuccess(null);
                  }}
                >
                  Done
                </Button>
              </ModalFooter>
            </div>
          ) : !selectedImportMode ? (
            /* INITIAL SCREEN: Explicit 2-Option Choice */
            <div className="space-y-4">
              <div className="text-center pb-2">
                <p className="text-sm text-slate-300 font-medium">
                  Select your card manufacturing and QR assignment method to proceed:
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* OPTION 1: Auto-Generate QR */}
                <div
                  onClick={() => {
                    setSelectedImportMode('AUTO_GENERATED_QR');
                    setModalApiError(null);
                  }}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 cursor-pointer transition-all hover:border-violet-500 hover:bg-violet-950/20 hover:shadow-lg hover:shadow-violet-500/10"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-violet-500/10 border border-violet-500/30 px-2.5 py-0.5 text-[11px] font-bold text-violet-400">
                        OPTION 1
                      </span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform">
                        <CreditCard className="h-5 w-5" />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-100 group-hover:text-violet-300 transition-colors">
                        Auto-Generate QR
                      </h4>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                        Upload card numbers only. Money Card will automatically generate a unique, cryptographically secure QR code for every card.
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-2.5 font-mono text-[11px] text-slate-400">
                      <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold mb-1">
                        CSV Format:
                      </span>
                      cardNumber<br />
                      asd-001<br />
                      asd-002
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="w-full justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImportMode('AUTO_GENERATED_QR');
                        setModalApiError(null);
                      }}
                    >
                      Select Auto QR Import
                    </Button>
                  </div>
                </div>

                {/* OPTION 2: Pre-Printed Vendor QR */}
                <div
                  onClick={() => {
                    setSelectedImportMode('PREPRINTED_QR');
                    setModalApiError(null);
                  }}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-5 cursor-pointer transition-all hover:border-violet-500 hover:bg-violet-950/20 hover:shadow-lg hover:shadow-violet-500/10"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-violet-500/10 border border-violet-500/30 px-2.5 py-0.5 text-[11px] font-bold text-violet-400">
                        OPTION 2
                      </span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform">
                        <QrCode className="h-5 w-5" />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-100 group-hover:text-violet-300 transition-colors">
                        Use Pre-Printed QR
                      </h4>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                        Upload card numbers together with the QR codes already printed on the physical cards by your third-party card vendor.
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-950/60 border border-slate-800/80 p-2.5 font-mono text-[11px] text-slate-400">
                      <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold mb-1">
                        CSV Format:
                      </span>
                      cardNumber,qrCode<br />
                      asd-001,VENDOR_QR_001<br />
                      asd-002,VENDOR_QR_002
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="w-full justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImportMode('PREPRINTED_QR');
                        setModalApiError(null);
                      }}
                    >
                      Select Pre-Printed QR Import
                    </Button>
                  </div>
                </div>
              </div>

              <ModalFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImportModal(false);
                    setSelectedImportMode(null);
                    setImportPreview(null);
                  }}
                >
                  Cancel
                </Button>
              </ModalFooter>
            </div>
          ) : (
            /* STEP 2: Selected Import Interface */
            <div className="space-y-5">
              {/* Navigation Header with Back Button */}
              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImportMode(null);
                    setImportPreview(null);
                    setImportFileName(null);
                    setModalApiError(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Choice
                </button>

                <Badge variant="info" className="text-xs">
                  {selectedImportMode === 'AUTO_GENERATED_QR'
                    ? 'Option 1: Auto-Generate QR Mode'
                    : 'Option 2: Pre-Printed Vendor QR Mode'}
                </Badge>
              </div>

              {/* Branch Assignment & Sample CSV Download */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Select
                    id="import-branch"
                    label="Assign to Branch (Optional)"
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
                    Download {selectedImportMode === 'AUTO_GENERATED_QR' ? 'Auto QR' : 'Pre-Printed QR'} Sample CSV
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
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedImportMode === 'AUTO_GENERATED_QR' ? (
                      <>Accepts .csv with a single <code className="text-violet-300">cardNumber</code> column</>
                    ) : (
                      <>Accepts .csv with both <code className="text-violet-300">cardNumber</code> and <code className="text-violet-300">qrCode</code> columns</>
                    )}
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

                  {/* Preview Cards List */}
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 rounded-xl border border-slate-800 bg-slate-950 p-3">
                    {/* Valid Rows */}
                    {(previewFilter === 'ALL' || previewFilter === 'VALID') &&
                      importPreview.validEntries.map((entry) => (
                        <div
                          key={entry.cardNumber}
                          className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5 text-violet-400" />
                            <span className="font-mono font-bold text-slate-200">{entry.cardNumber}</span>
                            {selectedImportMode === 'PREPRINTED_QR' && entry.qrToken ? (
                              <span className="font-mono text-[11px] text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                                QR: {entry.qrToken}
                              </span>
                            ) : (
                              <span className="text-[11px] text-violet-400/90 font-medium">
                                QR: Auto-Generated
                              </span>
                            )}
                          </div>
                          <Badge variant="success" className="text-[10px]">
                            Ready to Import
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
                            {err.qrCode && <span className="font-mono text-[11px]">({err.qrCode})</span>}
                            <span className="text-[11px] text-rose-400">(Row {err.rowNumber})</span>
                          </div>
                          <span className="text-[11px] text-rose-300 truncate max-w-[240px]">
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
                    setSelectedImportMode(null);
                    setImportPreview(null);
                    setImportFileName(null);
                  }}
                  disabled={isSubmitting}
                >
                  Back
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
          )}
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

            {/* Session History & Ledger Tabs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-violet-400" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Session & Transaction History
                  </h4>
                </div>
              </div>

              {/* Sub-tab Switcher: Active Session | Settled Sessions | Transaction History */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
                <button
                  type="button"
                  onClick={() => setDetailsTab('ACTIVE')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                    detailsTab === 'ACTIVE'
                      ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  )}
                >
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Active Session</span>
                  {cardHistorySessions.some((s) => s.status === 'ACTIVE') && (
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setDetailsTab('SETTLED')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                    detailsTab === 'SETTLED'
                      ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>Settled ({cardHistorySessions.filter((s) => s.status === 'SETTLED').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailsTab('TRANSACTIONS')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                    detailsTab === 'TRANSACTIONS'
                      ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  )}
                >
                  <Receipt className="h-3.5 w-3.5 text-violet-400" />
                  <span>Transactions ({cardTransactions.length})</span>
                </button>
              </div>

              {isLoadingHistory ? (
                <LoadingState message="Loading card history & transactions..." />
              ) : (
                <>
                  {/* TAB 1: ACTIVE SESSION */}
                  {detailsTab === 'ACTIVE' && (
                    <div className="space-y-3">
                      {cardHistorySessions.find((s) => s.status === 'ACTIVE') ? (
                        (() => {
                          const activeSession = cardHistorySessions.find((s) => s.status === 'ACTIVE')!;
                          const sessionBranch = branches.find((b) => b.id === activeSession.branchId);

                          return (
                            <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="success" className="text-[11px]">ACTIVE SESSION</Badge>
                                  {(activeSession.sessionCardNumber || activeSession.cycleNumber) && (
                                    <Badge variant="outline" className="text-[10px] font-mono text-emerald-300 border-emerald-500/40 bg-emerald-950/40">
                                      Internal: {activeSession.sessionCardNumber || `${selectedCard?.physicalCardNumber}_${activeSession.cycleNumber}`}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-slate-300 font-medium">
                                    {sessionBranch?.name || 'Main Branch'}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400">Live Balance</span>
                                  <p className="text-lg font-bold text-emerald-400 font-mono">
                                    {formatCurrency(activeSession.balance)}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs border-t border-emerald-900/30 pt-3">
                                <div>
                                  <span className="text-slate-500">Customer:</span>
                                  <p className="font-medium text-slate-200">
                                    {activeSession.customerName || 'Guest User'}
                                    {activeSession.customerPhone ? ` (${activeSession.customerPhone})` : ''}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Session Started:</span>
                                  <p className="font-medium text-slate-300">{formatDate(activeSession.startedAt)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-6 text-center text-xs text-slate-500 space-y-1">
                          <CreditCard className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                          <p className="font-semibold text-slate-400 text-sm">No Active Session</p>
                          <p>This physical card currently has no active session and is ready for issuance.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: SETTLED SESSIONS */}
                  {detailsTab === 'SETTLED' && (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {cardHistorySessions.filter((s) => s.status === 'SETTLED').length === 0 ? (
                        <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-6 text-center text-xs text-slate-500">
                          No settled sessions recorded for this card yet.
                        </div>
                      ) : (
                        cardHistorySessions
                          .filter((s) => s.status === 'SETTLED')
                          .map((session) => {
                            const sessionBranch = branches.find((b) => b.id === session.branchId);

                            return (
                              <div
                                key={session.id}
                                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs"
                              >
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                                      SETTLED
                                    </Badge>
                                    {(session.sessionCardNumber || session.cycleNumber) && (
                                      <Badge variant="outline" className="text-[10px] font-mono text-cyan-300 border-cyan-700/60 bg-cyan-950/40">
                                        Internal: {session.sessionCardNumber || `${selectedCard?.physicalCardNumber}_${session.cycleNumber}`}
                                      </Badge>
                                    )}
                                    <span className="text-[11px] font-medium text-slate-300">
                                      {sessionBranch?.name || 'Main Branch'}
                                    </span>
                                  </div>
                                  {session.customerName && (
                                    <p className="text-[11px] text-slate-400">
                                      Customer: {session.customerName} {session.customerPhone ? `(${session.customerPhone})` : ''}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-slate-500">
                                    Opened: {formatDate(session.startedAt)}
                                    {session.settledAt ? ` • Settled: ${formatDate(session.settledAt)}` : ''}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-500">Closing Balance</span>
                                  <p className="font-bold text-slate-300 font-mono">
                                    {formatCurrency(session.balance)}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}

                  {/* TAB 3: TRANSACTION HISTORY */}
                  {detailsTab === 'TRANSACTIONS' && (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {cardTransactions.length === 0 ? (
                        <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-6 text-center text-xs text-slate-500">
                          No transactions recorded for this card yet.
                        </div>
                      ) : (
                        cardTransactions.map((tx) => {
                          const isRecharge = tx.type === 'RECHARGE' || tx.type === 'ISSUANCE';
                          const isPurchase = tx.type === 'PURCHASE';
                          // const isRefund = tx.type === 'REFUND';

                          return (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    'p-2 rounded-full',
                                    isRecharge
                                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                                      : isPurchase
                                        ? 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                                        : 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                                  )}
                                >
                                  {isRecharge ? (
                                    <ArrowDownLeft className="h-4 w-4" />
                                  ) : isPurchase ? (
                                    <ArrowUpRight className="h-4 w-4" />
                                  ) : (
                                    <RotateCcw className="h-4 w-4" />
                                  )}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-200">
                                      {tx.type === 'ISSUANCE'
                                        ? 'Initial Card Issuance'
                                        : tx.type === 'RECHARGE'
                                          ? 'Card Recharge Top-up'
                                          : tx.type === 'PURCHASE'
                                            ? 'POS Purchase'
                                            : 'Card Settlement & Refund'}
                                    </span>
                                    {tx.paymentMethod && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-700 text-slate-400">
                                        {tx.paymentMethod}
                                      </Badge>
                                    )}
                                  </div>
                                  {tx.items && tx.items.length > 0 ? (
                                    <p className="text-[11px] text-slate-400">
                                      {tx.items.map((i) => `${i.quantity}x ${i.itemName}`).join(', ')}
                                    </p>
                                  ) : tx.notes ? (
                                    <p className="text-[11px] text-slate-400">{tx.notes}</p>
                                  ) : null}
                                  <p className="text-[10px] text-slate-500">
                                    {formatDate(tx.timestamp || tx.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p
                                  className={cn(
                                    'font-bold font-mono text-sm',
                                    isRecharge
                                      ? 'text-emerald-400'
                                      : isPurchase
                                        ? 'text-rose-400'
                                        : 'text-amber-400'
                                  )}
                                >
                                  {isRecharge ? '+' : isPurchase ? '-' : ''}
                                  {formatCurrency(tx.amount)}
                                </p>
                                {tx.balanceAfter !== undefined && (
                                  <p className="text-[10px] text-slate-500">
                                    Bal: {formatCurrency(tx.balanceAfter)}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </>
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
          {/* ── Modal: Single Card QR View & Download ── */}
      {selectedQrCard && (
        <Modal
          isOpen={!!selectedQrCard}
          onClose={() => setSelectedQrCard(null)}
          title={`Card QR Code: ${selectedQrCard.physicalCardNumber}`}
          description="High-resolution QR code for physical card printing and scanning."
          size="sm"
        >
          <div className="flex flex-col items-center space-y-5 py-3">
            {/* White card container for high QR scanner contrast */}
            <div className="flex flex-col items-center rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
              <QRCodeCanvas
                id={`qr-canvas-${selectedQrCard.physicalCardNumber}`}
                value={selectedQrCard.qrToken}
                size={200}
                level="H"
                includeMargin={true}
              />
              <div className="mt-3 font-mono text-base font-bold text-slate-900">
                {selectedQrCard.physicalCardNumber}
              </div>
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                {branches.find((b) => b.id === selectedQrCard.currentBranchId)?.name || 'MONEY CARD'}
              </div>
            </div>

            {/* Token payload with copy button */}
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>QR Token Payload</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedQrCard.qrToken);
                    setIsCopiedToken(true);
                    toast.success('QR Token copied to clipboard');
                    setTimeout(() => setIsCopiedToken(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300"
                >
                  {isCopiedToken ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{isCopiedToken ? 'Copied!' : 'Copy Token'}</span>
                </button>
              </div>
              <div className="rounded-lg bg-slate-950 border border-slate-800 p-2.5 font-mono text-xs text-slate-300 break-all select-all">
                {selectedQrCard.qrToken}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex w-full gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                className="flex-1 justify-center"
                onClick={() => printQrSheet([selectedQrCard], `QR Card - ${selectedQrCard.physicalCardNumber}`)}
                leftIcon={<Printer className="h-4 w-4 text-violet-400" />}
              >
                Print Label
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1 justify-center"
                onClick={() => downloadSingleCardQrPng(selectedQrCard.physicalCardNumber)}
                leftIcon={<Download className="h-4 w-4" />}
              >
                Download PNG
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

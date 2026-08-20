// ─── CSV Import Modal Component (M8) ───────────────────────
// Full 6-Stage CSV import workflow for Organization Admin.
// Download Template → User fills CSV → Upload → Validate → Preview → Confirm → Import
// Includes [ Download CSV Template ] and [ Download Current Data ]

import { useState } from 'react';
import { apiService } from '@/services/api';
import type { CsvImportPreview, Branch } from '@/types';
import {
  Button,
  Modal,
  ModalFooter,
  Badge,
  LoadingState,
  Select,
} from '@/components/ui';
import { notify, formatCurrency } from '@/utils';
import {
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Building2,
} from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: Branch[];
  currentBranchId?: string | null;
  onSuccess: () => void;
}

export function CsvImportModal({
  isOpen,
  onClose,
  branches,
  currentBranchId,
  onSuccess,
}: CsvImportModalProps) {
  const [overrideBranchId, setOverrideBranchId] = useState<string>('');
  const selectedBranchId = overrideBranchId || currentBranchId || branches[0]?.id || '';

  const [step, setStep] = useState<'UPLOAD' | 'PREVIEW' | 'IMPORTING'>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>('');

  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingCurrent, setIsExportingCurrent] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Reset modal state
  const handleReset = () => {
    setStep('UPLOAD');
    setFile(null);
    setCsvText('');
    setPreview(null);
    setApiError(null);
    setOverrideBranchId('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Stage 1: Download CSV Template
  const handleDownloadTemplate = async () => {
    try {
      const res = await apiService.inventory.getImportTemplate();
      if (!res.success) {
        notify.error('Failed to generate CSV template');
        return;
      }

      const blob = new Blob([res.data.templateCsv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', res.data.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notify.success('CSV import template downloaded');
    } catch {
      notify.error('An error occurred while downloading template.');
    }
  };

  // Optional: Download Current Branch Data in Template Schema
  const handleDownloadCurrentData = async () => {
    if (!selectedBranchId) {
      notify.error('Please select a branch first to download current data');
      return;
    }
    setIsExportingCurrent(true);
    try {
      const res = await apiService.products.getProducts({ branchId: selectedBranchId, limit: 200 });
      if (!res.success) {
        notify.error('Failed to fetch current branch products');
        return;
      }

      const products = res.data.items;
      const csvRows = [
        'itemName,category,price',
        ...products.map((p) => {
          const nameSafe = p.itemName.includes(',') ? `"${p.itemName.replace(/"/g, '""')}"` : p.itemName;
          const catList = Array.isArray(p.category) ? p.category : [p.category || 'General'];
          const catSafe = catList.join('|');
          const catFormatted = catSafe.includes(',') ? `"${catSafe.replace(/"/g, '""')}"` : catSafe;
          return `${nameSafe},${catFormatted},${p.price}`;
        }),
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const selectedBranchName = branches.find((b) => b.id === selectedBranchId)?.name || 'branch';
      const cleanBranch = selectedBranchName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      link.setAttribute('download', `current_products_${cleanBranch}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notify.success(`Exported ${products.length} current branch products to CSV`);
    } catch {
      notify.error('An error occurred while exporting current data.');
    } finally {
      setIsExportingCurrent(false);
    }
  };

  // Stage 2: Handle File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv') {
      setApiError('Only .csv files are supported. Please upload a valid CSV file.');
      return;
    }

    setApiError(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
    };
    reader.readAsText(selectedFile);
  };

  // Stage 3 & 4: Validate & Preview
  const handleValidateAndPreview = async () => {
    if (!selectedBranchId) {
      setApiError('Please select a target branch for the CSV import.');
      return;
    }

    if (!csvText || csvText.trim() === '') {
      setApiError('Selected CSV file is empty. Please select a valid file.');
      return;
    }

    setApiError(null);
    setIsValidating(true);

    try {
      const res = await apiService.inventory.importInventory({
        branchId: selectedBranchId,
        csvContent: csvText,
      });

      if (!res.success) {
        setApiError(res.error.message || 'CSV validation failed.');
        return;
      }

      // Check if response is CsvImportPreview
      if ('validRows' in res.data) {
        setPreview(res.data as CsvImportPreview);
        setStep('PREVIEW');
      } else {
        setApiError('Unexpected response format during CSV validation.');
      }
    } catch {
      setApiError('An unexpected error occurred during CSV validation.');
    } finally {
      setIsValidating(false);
    }
  };

  // Stage 5 & 6: Confirm & Import
  const handleConfirmImport = async () => {
    if (!preview || !preview.previewToken) return;

    if (preview.invalidRows.length > 0) {
      setApiError('Cannot import CSV with invalid rows. Fix validation errors and re-upload.');
      return;
    }

    setApiError(null);
    setIsImporting(true);
    setStep('IMPORTING');

    try {
      const res = await apiService.inventory.importInventory({
        branchId: selectedBranchId,
        confirm: true,
        previewToken: preview.previewToken,
      });

      if (!res.success) {
        setApiError(res.error.message || 'Failed to execute CSV import');
        setStep('PREVIEW');
        return;
      }

      const result = res.data as { importedCount: number; createsCount: number; updatesCount: number };
      notify.success(
        `CSV Import Complete: ${result.createsCount} created, ${result.updatesCount} updated.`,
      );
      onSuccess();
      handleClose();
    } catch {
      setApiError('An unexpected error occurred during CSV import.');
      setStep('PREVIEW');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Product & Inventory CSV Import"
      size="lg"
    >
      <div className="space-y-6 py-2">
        {apiError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span>{apiError}</span>
          </div>
        )}

        {/* ── STEP 1: UPLOAD STAGE ── */}
        {step === 'UPLOAD' && (
          <div className="space-y-6">
            {/* Target Branch Selector */}
            <Select
              id="csv-branch-select"
              label="Target Branch Location"
              value={selectedBranchId}
              onChange={(e) => setOverrideBranchId(e.target.value)}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />

            {/* Template Download Prompt */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Official CSV Template
                  </h4>
                  <p className="mt-1 text-xs text-slate-400">
                    Download the template, fill in your product/inventory data, then upload the completed CSV.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    leftIcon={<Download className="h-3.5 w-3.5 text-violet-400" />}
                  >
                    Download CSV Template
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadCurrentData}
                    isLoading={isExportingCurrent}
                    disabled={isExportingCurrent}
                    leftIcon={<FileDown className="h-3.5 w-3.5 text-indigo-400" />}
                  >
                    Download Current Data
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-slate-950 px-3 py-2 border border-slate-800/80 font-mono text-[11px] text-slate-300 flex items-center justify-between">
                <span>Header Schema: <strong className="text-violet-300">itemName,category,price</strong></span>
                <span className="text-[10px] text-slate-500">M0 V10 Contract Compliant</span>
              </div>
            </div>

            {/* File Drop Area */}
            <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-800 bg-slate-950/60 p-8 text-center transition-colors hover:border-violet-500/50">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-200">
                {file ? file.name : 'Click or drag CSV file here to upload'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports standard UTF-8 .csv files'}
              </p>
            </div>

            <ModalFooter className="px-0 pb-0">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleValidateAndPreview}
                disabled={!file || isValidating}
                isLoading={isValidating}
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Validate & Preview
              </Button>
            </ModalFooter>
          </div>
        )}

        {/* ── STEP 2: PREVIEW STAGE ── */}
        {step === 'PREVIEW' && preview && (
          <div className="space-y-6">
            {/* Target Branch Confirmation Banner */}
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Building2 className="h-4 w-4 text-violet-400 shrink-0" />
                <span>Target Branch:</span>
                <strong className="text-white">
                  {branches.find((b) => b.id === preview.branchId)?.name || preview.branchId}
                </strong>
              </div>
              <span className="font-mono text-[11px] text-slate-500">Branch ID: {preview.branchId}</span>
            </div>

            {/* Validation Summary Metrics */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-400">Total Rows:</span>
                <p className="mt-1 text-lg font-bold text-slate-100">{preview.totalRows}</p>
              </div>

              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <span className="text-emerald-400 font-medium">Valid Actions:</span>
                <p className="mt-1 text-lg font-bold text-emerald-300">
                  {preview.createsCount} <span className="text-xs font-normal text-slate-400">Creates</span> /{' '}
                  {preview.updatesCount} <span className="text-xs font-normal text-slate-400">Updates</span>
                </p>
              </div>

              <div
                className={`rounded-lg border p-3 ${
                  preview.invalidRows.length > 0
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <span>Invalid / Rejected:</span>
                <p className="mt-1 text-lg font-bold">
                  {preview.invalidRows.length} <span className="text-xs">rows</span>
                </p>
              </div>
            </div>

            {/* Validation Warnings / Error Banner */}
            {preview.invalidRows.length > 0 && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Validation Errors Found (All-or-Nothing Import Blocked)</span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 text-xs text-rose-300">
                  {preview.invalidRows.map((err, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="font-mono text-slate-400">Row {err.rowNumber}:</span>
                      <span>{err.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Valid Rows Action Preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Action Preview (Same-Name Update / New Create)
              </h4>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/60 font-semibold text-slate-400">
                    <tr>
                      <th className="p-2.5">Row</th>
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Price</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {preview.validRows.map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-slate-900/30">
                        <td className="p-2.5 font-mono text-slate-500">#{row.rowNumber}</td>
                        <td className="p-2.5 font-semibold text-slate-200">{row.itemName}</td>
                        <td className="p-2.5 text-slate-300">
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(row.category) ? row.category : [row.category]).map((c) => (
                              <Badge key={c} variant="outline" className="text-[10px]">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-2.5 font-mono text-violet-300">
                          {formatCurrency(row.price)}
                        </td>
                        <td className="p-2.5 text-right">
                          <Badge variant="outline" className="text-[10px]">
                            VALID
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <ModalFooter className="px-0 pb-0">
              <Button variant="outline" onClick={handleReset}>
                Re-upload CSV
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmImport}
                disabled={preview.invalidRows.length > 0 || isImporting}
                isLoading={isImporting}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Confirm Import
              </Button>
            </ModalFooter>
          </div>
        )}

        {/* ── STEP 3: IMPORTING STAGE ── */}
        {step === 'IMPORTING' && (
          <div className="py-8">
            <LoadingState message="Executing CSV import & updating catalog..." />
          </div>
        )}
      </div>
    </Modal>
  );
}

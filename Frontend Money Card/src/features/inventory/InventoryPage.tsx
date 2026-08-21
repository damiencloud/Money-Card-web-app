// ─── Inventory Management Page (M8) ─────────────────────────
// Complete Inventory & Stock Control for ORG_ADMIN & SUPER_ADMIN.
// Uses apiService abstraction strictly — does NOT import mock handlers directly.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { useBranch, usePermissions } from '@/hooks';
import type { InventoryItem, ProductWithInventory, Branch } from '@/types';
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
import { notify, formatDate, formatCurrency } from '@/utils';
import { CsvImportModal } from './CsvImportModal';
import { UnauthorizedPage } from '@/features/auth';
import {
  Warehouse,
  Search,
  Sliders,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  Building2,
  Package,
  Download,
} from 'lucide-react';

export interface InventoryItemWithDetails extends InventoryItem {
  productName: string;
  category: string[];
  price: number;
  branchName: string;
}

export function InventoryPage() {
  const { currentBranch } = useBranch();
  const { hasPermission } = usePermissions();

  const canView = hasPermission('INVENTORY_VIEW');
  const canManage = hasPermission('INVENTORY_MANAGE');
  const canImport = hasPermission('INVENTORY_IMPORT');

  const [inventoryList, setInventoryList] = useState<InventoryItemWithDetails[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  // Modals
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<InventoryItemWithDetails | null>(
    null,
  );

  // Form State
  const [adjustQtyInput, setAdjustQtyInput] = useState('');
  const [qtyError, setQtyError] = useState<string | null>(null);
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch Inventory & Products ────────────────────────────
  const fetchInventoryData = useCallback(async () => {
    setError(null);
    try {
      const targetBranch = branchFilter !== 'ALL' ? branchFilter : currentBranch?.id;
      const [invRes, prodRes, branchRes] = await Promise.all([
        apiService.inventory.getInventory({ branchId: targetBranch }),
        apiService.products.getProducts({ branchId: targetBranch }),
        apiService.branches.getBranches(),
      ]);

      if (!invRes.success) {
        setError(invRes.error.message || 'Failed to load inventory stock');
        return;
      }

      const productsMap = new Map<string, ProductWithInventory>();
      if (prodRes.success) {
        prodRes.data.items.forEach((p) => productsMap.set(p.id, p));
      }

      const branchMap = new Map<string, Branch>();
      if (branchRes.success) {
        setBranches(branchRes.data.items);
        branchRes.data.items.forEach((b) => branchMap.set(b.id, b));
      }

      // Combine inventory items with product & branch details
      let combined: InventoryItemWithDetails[] = invRes.data.items.map((item) => {
        const prod = productsMap.get(item.productId);
        const br = branchMap.get(item.branchId);

        return {
          ...item,
          productName: prod?.itemName || `Product ${item.productId}`,
          category: prod?.category || ['General'],
          price: prod?.price || 0,
          branchName: br?.name || 'Main Branch',
        };
      });

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        combined = combined.filter((i) => i.productName.toLowerCase().includes(q));
      }

      setInventoryList(combined);
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, branchFilter, currentBranch]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const targetBranch = branchFilter !== 'ALL' ? branchFilter : currentBranch?.id;
        const [invRes, prodRes, branchRes] = await Promise.all([
          apiService.inventory.getInventory({ branchId: targetBranch }),
          apiService.products.getProducts({ branchId: targetBranch }),
          apiService.branches.getBranches(),
        ]);
        if (isCancelled) return;

        if (!invRes.success) {
          setError(invRes.error.message || 'Failed to load inventory stock');
          return;
        }

        const productsMap = new Map<string, ProductWithInventory>();
        if (prodRes.success) {
          prodRes.data.items.forEach((p) => productsMap.set(p.id, p));
        }

        const branchMap = new Map<string, Branch>();
        if (branchRes.success) {
          setBranches(branchRes.data.items);
          branchRes.data.items.forEach((b) => branchMap.set(b.id, b));
        }

        let combined: InventoryItemWithDetails[] = invRes.data.items.map((item) => {
          const prod = productsMap.get(item.productId);
          const br = branchMap.get(item.branchId);

          return {
            ...item,
            productName: prod?.itemName || `Product ${item.productId}`,
            category: prod?.category || ['General'],
            price: prod?.price || 0,
            branchName: br?.name || 'Main Branch',
          };
        });

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          combined = combined.filter((i) => i.productName.toLowerCase().includes(q));
        }

        setInventoryList(combined);
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
  }, [searchQuery, branchFilter, currentBranch]);

  if (!canView) {
    return <UnauthorizedPage />;
  }

  // ── Open Adjust Modal ─────────────────────────────────────
  const handleOpenAdjust = (item: InventoryItemWithDetails) => {
    setSelectedInventory(item);
    setAdjustQtyInput(String(item.quantity));
    setQtyError(null);
    setModalApiError(null);
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventory) return;

    const newQty = parseInt(adjustQtyInput, 10);
    if (isNaN(newQty)) {
      setQtyError('Please enter a valid numeric quantity');
      return;
    }

    if (newQty < 0) {
      setQtyError('Stock quantity cannot be negative (M0 Section 1)');
      return;
    }

    setQtyError(null);
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.inventory.updateInventoryQuantity(selectedInventory.id, newQty);

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to adjust stock quantity');
        return;
      }

      notify.success(`Stock for ${selectedInventory.productName} updated to ${newQty}`);
      setShowAdjustModal(false);
      fetchInventoryData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Columns ───────────────────────────────────────────────
  const columns = [
    {
      key: 'productName',
      header: 'Product Item',
      render: (item: InventoryItemWithDetails) => (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-100">{item.productName}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category / Attributes',
      render: (item: InventoryItemWithDetails) => (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(item.category) ? item.category : [item.category || 'General']).map((c, idx) => (
            <Badge key={idx} variant="outline" className="capitalize text-slate-300">
              {c}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'branchName',
      header: 'Branch Location',
      render: (item: InventoryItemWithDetails) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>{item.branchName}</span>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Stock Quantity',
      render: (item: InventoryItemWithDetails) => (
        <span
          className={`font-mono text-sm font-bold ${
            item.quantity === 0
              ? 'text-rose-400 font-bold'
              : item.quantity < 10
                ? 'text-amber-400'
                : 'text-emerald-400'
          }`}
        >
          {item.quantity} units
        </span>
      ),
    },
    {
      key: 'stockValue',
      header: 'Stock Value',
      render: (item: InventoryItemWithDetails) => (
        <span className="font-mono text-xs text-slate-300">
          {formatCurrency(item.quantity * item.price)}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (item: InventoryItemWithDetails) => (
        <span className="text-xs text-slate-400">{formatDate(item.updatedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item: InventoryItemWithDetails) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenAdjust(item)}
              leftIcon={<Sliders className="h-3.5 w-3.5" />}
            >
              Adjust Stock
            </Button>
          )}
        </div>
      ),
    },
  ];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Inventory & Stock Control</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor real-time product stock levels and perform branch inventory adjustments.
          </p>
        </div>

        {canImport && (
          <div className="flex flex-col sm:items-end gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                leftIcon={<Download className="h-4 w-4 text-violet-400" />}
              >
                Download CSV Template
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowCsvModal(true)}
                leftIcon={<FileSpreadsheet className="h-4 w-4" />}
              >
                Import CSV
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              Download the template, fill in your product/inventory data, then upload the completed CSV.
            </p>
          </div>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search stock by product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Branch Filter */}
        <div className="w-full sm:w-48">
          <Select
            id="branch-filter-inv"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Branches' },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
        </div>

        <Button variant="outline" size="md" onClick={fetchInventoryData} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Refresh
        </Button>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <LoadingState message="Loading inventory stock levels..." />
      ) : error ? (
        <ErrorState title="Failed to load inventory" message={error} onRetry={fetchInventoryData} />
      ) : inventoryList.length === 0 ? (
        <EmptyState
          icon={<Warehouse className="h-8 w-8 text-slate-500" />}
          title="No inventory records found"
          description={
            searchQuery || branchFilter !== 'ALL'
              ? 'No stock records matching the selected branch or search query.'
              : 'Add products or perform a CSV import to establish stock records.'
          }
        />
      ) : (
        <Card padding="none">
          <DataTable<InventoryItemWithDetails>
            data={inventoryList}
            columns={columns}
            keyExtractor={(item: InventoryItemWithDetails) => item.id}
          />
        </Card>
      )}

      {/* ── Adjust Stock Modal ── */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title={`Adjust Stock: ${selectedInventory?.productName}`}
      >
        <form onSubmit={handleAdjustSubmit} noValidate className="space-y-4">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          {selectedInventory && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Branch Location:</span>
                <span className="font-semibold text-slate-200">{selectedInventory.branchName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Unit Price:</span>
                <span className="font-semibold text-violet-300">
                  {formatCurrency(selectedInventory.price)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Stock Quantity:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedInventory.quantity} units
                </span>
              </div>
            </div>
          )}

          <Input
            id="adjust-qty-input"
            type="number"
            min="0"
            label="New Stock Quantity"
            placeholder="Enter new total quantity"
            value={adjustQtyInput}
            onChange={(e) => {
              setAdjustQtyInput(e.target.value);
              if (qtyError) setQtyError(null);
            }}
            error={qtyError ?? undefined}
            autoFocus
            disabled={isSubmitting}
          />

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowAdjustModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              Update Stock Quantity
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── CSV Import Modal ── */}
      <CsvImportModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        branches={branches}
        currentBranchId={branchFilter !== 'ALL' ? branchFilter : currentBranch?.id || branches[0]?.id}
        onSuccess={fetchInventoryData}
      />
    </div>
  );
}

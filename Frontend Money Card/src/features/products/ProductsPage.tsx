// ─── Products Management Page (M8) ──────────────────────────
// Complete Product Management for ORG_ADMIN & SUPER_ADMIN.
// Uses apiService abstraction strictly — does NOT import mock handlers directly.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { useBranch, usePermissions } from '@/hooks';
import type { ProductWithInventory, Branch } from '@/types';
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
import { notify, formatCurrency } from '@/utils';
import { CsvImportModal } from '@/features/inventory/CsvImportModal';
import { UnauthorizedPage } from '@/features/auth';
import { CategorySelector } from './CategorySelector';
import {
  Package,
  Plus,
  Search,
  Edit2,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  Power,
  Download,
} from 'lucide-react';

export function ProductsPage() {
  const { currentBranch } = useBranch();
  const { hasPermission } = usePermissions();

  const canView = hasPermission('PRODUCT_VIEW');
  const canManage = hasPermission('PRODUCT_MANAGE');
  const canImport = hasPermission('INVENTORY_IMPORT');

  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | null>(null);

  // Form state
  const [formItemName, setFormItemName] = useState('');
  const [formCategories, setFormCategories] = useState<string[]>(['Veg']);
  const [formPrice, setFormPrice] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formInitialQty, setFormInitialQty] = useState('0');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch Products & Branches ─────────────────────────────
  const fetchProductsData = useCallback(async () => {
    setError(null);
    try {
      const targetBranch = branchFilter !== 'ALL' ? branchFilter : currentBranch?.id;
      const [prodRes, branchRes] = await Promise.all([
        apiService.products.getProducts({
          search: searchQuery,
          branchId: targetBranch,
        }),
        apiService.branches.getBranches(),
      ]);

      if (!prodRes.success) {
        setError(prodRes.error.message || 'Failed to load product catalog');
        return;
      }

      let filtered = prodRes.data.items;
      if (categoryFilter !== 'ALL') {
        const catLower = categoryFilter.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            Array.isArray(p.category) &&
            p.category.some((c) => c.toLowerCase() === catLower),
        );
      }

      setProducts(filtered);
      if (branchRes.success) setBranches(branchRes.data.items);
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, categoryFilter, branchFilter, currentBranch]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const targetBranch = branchFilter !== 'ALL' ? branchFilter : currentBranch?.id;
        const [prodRes, branchRes] = await Promise.all([
          apiService.products.getProducts({
            search: searchQuery,
            branchId: targetBranch,
          }),
          apiService.branches.getBranches(),
        ]);
        if (isCancelled) return;

        if (!prodRes.success) {
          setError(prodRes.error.message || 'Failed to load product catalog');
          return;
        }

        let filtered = prodRes.data.items;
        if (categoryFilter !== 'ALL') {
          const catLower = categoryFilter.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              Array.isArray(p.category) &&
              p.category.some((c) => c.toLowerCase() === catLower),
          );
        }

        setProducts(filtered);
        if (branchRes.success) setBranches(branchRes.data.items);
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
  }, [searchQuery, categoryFilter, branchFilter, currentBranch]);

  // Categories extraction for header filter dropdown
  const allAvailableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (Array.isArray(p.category)) {
        for (const c of p.category) set.add(c);
      } else if (p.category) {
        set.add(p.category);
      }
    }
    return Array.from(set).filter(Boolean);
  }, [products]);

  if (!canView) {
    return <UnauthorizedPage />;
  }

  // ── Open Create ───────────────────────────────────────────
  const handleOpenCreate = () => {
    setFormItemName('');
    setFormCategories(['Veg', 'Fast Food']);
    setFormPrice('120');
    setFormBranchId(currentBranch?.id || branches[0]?.id || '');
    setFormInitialQty('25');
    setFormErrors({});
    setModalApiError(null);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formItemName.trim()) errors.itemName = 'Item name is required';
    if (formCategories.length === 0) errors.category = 'Please select at least one category or attribute';

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.price = 'Price must be a valid non-negative number';
    }

    const qtyNum = parseInt(formInitialQty, 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      errors.initialQuantity = 'Stock quantity cannot be negative';
    }

    if (!formBranchId) errors.branchId = 'Branch location is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.products.createProduct({
        branchId: formBranchId,
        itemName: formItemName.trim(),
        category: formCategories,
        price: priceNum,
        initialQuantity: qtyNum,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to create product');
        return;
      }

      notify.success(`Product ${res.data.itemName} created successfully`);
      setShowCreateModal(false);
      fetchProductsData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Edit ─────────────────────────────────────────────
  const handleOpenEdit = (product: ProductWithInventory) => {
    setSelectedProduct(product);
    setFormItemName(product.itemName);

    const initialCategories = Array.isArray(product.category)
      ? [...product.category]
      : [product.category || 'Veg'];

    setFormCategories(initialCategories);
    setFormPrice(String(product.price));
    setFormStatus(product.status);
    setFormErrors({});
    setModalApiError(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const errors: Record<string, string> = {};
    if (!formItemName.trim()) errors.itemName = 'Item name is required';
    if (formCategories.length === 0) errors.category = 'Please select at least one category or attribute';

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.price = 'Price must be a valid non-negative number';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.products.updateProduct(selectedProduct.id, {
        itemName: formItemName.trim(),
        category: formCategories,
        price: priceNum,
        status: formStatus,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update product');
        return;
      }

      notify.success('Product updated successfully');
      setShowEditModal(false);
      fetchProductsData();
    } catch {
      setModalApiError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Toggle Status ─────────────────────────────────────────
  const handleToggleStatus = async (product: ProductWithInventory) => {
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await apiService.products.updateProduct(product.id, { status: newStatus });
      if (res.success) {
        notify.success(`Product status changed to ${newStatus}`);
        fetchProductsData();
      }
    } catch {
      notify.error('Failed to change product status');
    }
  };

  // ── Table Columns ─────────────────────────────────────────
  const columns = [
    {
      key: 'itemName',
      header: 'Product Name',
      render: (product: ProductWithInventory) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-100">{product.itemName}</p>
            <p className="text-xs text-slate-500">ID: {product.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categories & Attributes',
      render: (product: ProductWithInventory) => {
        const displayedCats = Array.isArray(product.category)
          ? product.category
          : [product.category || 'General'];

        return (
          <div className="flex flex-wrap gap-1 max-w-[240px]">
            {displayedCats.map((cat, idx) => (
              <Badge key={idx} variant="outline" className="text-[11px] text-slate-300 py-0.5 px-1.5">
                {cat}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: 'price',
      header: 'Price',
      render: (product: ProductWithInventory) => (
        <span className="font-mono text-sm font-bold text-violet-300">
          {formatCurrency(product.price)}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Stock Qty',
      render: (product: ProductWithInventory) => (
        <span
          className={`font-mono text-xs font-semibold ${
            product.quantity === 0
              ? 'text-rose-400 font-bold'
              : product.quantity < 10
                ? 'text-amber-400'
                : 'text-emerald-400'
          }`}
        >
          {product.quantity} in stock
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (product: ProductWithInventory) => (
        <Badge variant={product.status === 'ACTIVE' ? 'success' : 'danger'}>
          {product.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (product: ProductWithInventory) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {canManage && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenEdit(product)}
                leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              >
                Edit
              </Button>

              <Button
                variant={product.status === 'ACTIVE' ? 'ghost' : 'outline'}
                size="sm"
                onClick={() => handleToggleStatus(product)}
                leftIcon={<Power className="h-3.5 w-3.5" />}
              >
                {product.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </Button>
            </>
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
          <h1 className="text-2xl font-bold text-slate-100">Products Catalog</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage organization product items, pricing, inventory stock, and CSV import.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canImport && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                leftIcon={<Download className="h-4 w-4 text-violet-400" />}
              >
                Download CSV Template
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCsvModal(true)}
                leftIcon={<FileSpreadsheet className="h-4 w-4" />}
              >
                Import CSV
              </Button>
            </>
          )}

          {canManage && (
            <Button variant="primary" size="sm" onClick={handleOpenCreate} leftIcon={<Plus className="h-4 w-4" />}>
              Create Product
            </Button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search products by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Category Filter */}
        <div className="w-full sm:w-44">
          <Select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Categories' },
              ...allAvailableCategories.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>

        {/* Branch Filter */}
        <div className="w-full sm:w-48">
          <Select
            id="branch-filter-prod"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Branches' },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
        </div>

        <Button variant="outline" size="md" onClick={fetchProductsData} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Refresh
        </Button>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <LoadingState message="Loading product catalog..." />
      ) : error ? (
        <ErrorState title="Failed to load products" message={error} onRetry={fetchProductsData} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8 text-slate-500" />}
          title="No products found"
          description={
            searchQuery || categoryFilter !== 'ALL' || branchFilter !== 'ALL'
              ? 'No products matching the selected filters.'
              : 'Add your first catalog product or import via CSV.'
          }
          action={
            canManage && !searchQuery ? (
              <Button variant="primary" onClick={handleOpenCreate} leftIcon={<Plus className="h-4 w-4" />}>
                Create Product
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card padding="none">
          <DataTable<ProductWithInventory>
            data={products}
            columns={columns}
            keyExtractor={(item: ProductWithInventory) => item.id}
          />
        </Card>
      )}

      {/* ── Create Product Modal ── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Product"
        size="xl"
      >
        <form onSubmit={handleCreateSubmit} noValidate className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="prod-name-create"
              label="Product Item Name"
              placeholder="e.g. Veg Burger, Cold Coffee"
              value={formItemName}
              onChange={(e) => setFormItemName(e.target.value)}
              error={formErrors.itemName}
              disabled={isSubmitting}
            />

            <Input
              id="prod-price-create"
              type="number"
              step="0.01"
              label="Price (₹)"
              placeholder="120"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              error={formErrors.price}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="prod-branch-create"
              label="Branch Location"
              value={formBranchId}
              onChange={(e) => setFormBranchId(e.target.value)}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              error={formErrors.branchId}
              disabled={isSubmitting}
            />

            <Input
              id="prod-qty-create"
              type="number"
              label="Initial Stock Quantity"
              placeholder="25"
              value={formInitialQty}
              onChange={(e) => setFormInitialQty(e.target.value)}
              error={formErrors.initialQuantity}
              disabled={isSubmitting}
            />
          </div>

          {/* Multi-Select Category & Attributes Selector (Staff Permissions Pattern) */}
          <CategorySelector
            selectedCategories={formCategories}
            onChange={(cats) => {
              setFormCategories(cats);
              if (formErrors.category) {
                setFormErrors((prev) => ({ ...prev, category: '' }));
              }
            }}
            error={formErrors.category}
            disabled={isSubmitting}
          />

          <ModalFooter className="px-0 pb-0 pt-3">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              Create Product
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Edit Product Modal ── */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Product"
        size="xl"
      >
        <form onSubmit={handleEditSubmit} noValidate className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Input
                id="prod-name-edit"
                label="Product Item Name"
                value={formItemName}
                onChange={(e) => setFormItemName(e.target.value)}
                error={formErrors.itemName}
                disabled={isSubmitting}
              />
            </div>

            <Input
              id="prod-price-edit"
              type="number"
              step="0.01"
              label="Price (₹)"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              error={formErrors.price}
              disabled={isSubmitting}
            />
          </div>

          <Select
            id="prod-status-edit"
            label="Status"
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
            options={[
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'INACTIVE', label: 'INACTIVE' },
            ]}
            disabled={isSubmitting}
          />

          {/* Multi-Select Category & Attributes Selector (Staff Permissions Pattern) */}
          <CategorySelector
            selectedCategories={formCategories}
            onChange={(cats) => {
              setFormCategories(cats);
              if (formErrors.category) {
                setFormErrors((prev) => ({ ...prev, category: '' }));
              }
            }}
            error={formErrors.category}
            disabled={isSubmitting}
          />

          <ModalFooter className="px-0 pb-0 pt-3">
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              Save Product Changes
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
        onSuccess={fetchProductsData}
      />
    </div>
  );
}

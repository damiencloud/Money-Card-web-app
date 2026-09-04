// ─── Products & Inventory Unified Hub (Org Admin) ──────────────────────────
// Merged single view: Product catalog, live branch stock, pricing, and adjustments.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '@/services/api';
import { useBranch, usePermissions } from '@/hooks';
import type { ProductWithInventory, Branch, InventoryItem } from '@/types';
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
import { notify, formatCurrency } from '@/utils';
import { UnauthorizedPage } from '@/features/auth';
import { CategorySelector } from './CategorySelector';
import {
  Package,
  Plus,
  AlertCircle,
  Power,
  Sliders,
  TrendingUp,
  AlertTriangle,
  Layers,
  Trash2,
  Search,
} from 'lucide-react';

export interface InventoryItemWithDetails extends InventoryItem {
  productName: string;
  category: string[];
  price: number;
  branchName: string;
}

export interface UnifiedProductItem extends ProductWithInventory {
  inventoryId?: string;
}

interface ProductsPageProps {
  defaultTab?: string;
}

export function ProductsPage({ defaultTab: _defaultTab }: ProductsPageProps = {}) {
  const { currentBranch } = useBranch();
  const { hasPermission } = usePermissions();

  const canViewProducts = hasPermission('PRODUCT_VIEW');
  const canManageProducts = hasPermission('PRODUCT_MANAGE');
  const canViewInventory = hasPermission('INVENTORY_VIEW');
  const canManageInventory = hasPermission('INVENTORY_MANAGE');

  // Shared state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  // Products & Inventory Data
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItemWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusStockFilter, setStatusStockFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProductToDelete, setSelectedProductToDelete] = useState<UnifiedProductItem | null>(null);
  const [selectedInventory, setSelectedInventory] = useState<InventoryItemWithDetails | null>(null);

  // Create Product Form State
  const [formItemName, setFormItemName] = useState('');
  const [formCategories, setFormCategories] = useState<string[]>(['Veg']);
  const [formPrice, setFormPrice] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formStockQty, setFormStockQty] = useState('0');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stock Adjustment Form State
  const [adjustQtyInput, setAdjustQtyInput] = useState('');
  const [qtyError, setQtyError] = useState<string | null>(null);

  // ─── Unified Data Fetching ────────────────────────────────────────────────
  const fetchUnifiedData = useCallback(async () => {
    setLoadError(null);
    try {
      const targetBranch = branchFilter !== 'ALL' ? branchFilter : currentBranch?.id;
      const [prodRes, invRes, branchRes] = await Promise.all([
        apiService.products.getProducts({
          branchId: targetBranch,
        }),
        apiService.inventory.getInventory({ branchId: targetBranch }),
        apiService.branches.getBranches(),
      ]);

      if (!prodRes.success) {
        setLoadError(prodRes.error.message || 'Failed to load products');
        return;
      }

      if (branchRes.success) {
        const bItems = Array.isArray(branchRes.data) ? branchRes.data : (branchRes.data?.items || []);
        setBranches(bItems);
      }

      const rawProducts: ProductWithInventory[] = Array.isArray(prodRes.data)
        ? prodRes.data
        : prodRes.data?.items || [];

      const rawInventory: InventoryItem[] = invRes.success
        ? Array.isArray(invRes.data)
          ? invRes.data
          : invRes.data?.items || []
        : [];

      // Map branches
      const branchMap = new Map<string, string>();
      if (branchRes.success) {
        const bItems = Array.isArray(branchRes.data) ? branchRes.data : (branchRes.data?.items || []);
        bItems.forEach((b) => branchMap.set(b.id, b.name));
      }

      // Map inventory
      const invDetailsList: InventoryItemWithDetails[] = rawInventory.map((item) => {
        const prod = rawProducts.find((p) => p.id === item.productId);
        return {
          ...item,
          productName: prod?.itemName || (item as any).productName || `Product ${item.productId}`,
          category: prod?.category || (item as any).category || ['General'],
          price: prod?.price ?? (item as any).price ?? 0,
          branchName: branchMap.get(item.branchId) || 'Main Branch',
        };
      });

      setProducts(rawProducts);
      setInventoryList(invDetailsList);
    } catch {
      setLoadError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [branchFilter, currentBranch]);

  useEffect(() => {
    fetchUnifiedData();
  }, [fetchUnifiedData]);

  // ─── Combined Unified Product Items ───────────────────────────────────────
  const unifiedProducts = useMemo<UnifiedProductItem[]>(() => {
    return products.map((product) => {
      // Find matching inventory items
      const matchingInv = inventoryList.filter((i) => i.productId === product.id);
      const totalQty = matchingInv.length > 0
        ? matchingInv.reduce((sum, i) => sum + i.quantity, 0)
        : (product.quantity || 0);

      const branchName = product.branchName || (matchingInv[0]?.branchName) || undefined;
      const inventoryId = matchingInv[0]?.id;

      return {
        ...product,
        quantity: totalQty,
        branchName,
        inventoryId,
      };
    });
  }, [products, inventoryList]);

  // ─── Filtered Products ────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return unifiedProducts.filter((product) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = product.itemName.toLowerCase().includes(q);
        const matchesCat = Array.isArray(product.category) && product.category.some((c) => c.toLowerCase().includes(q));
        if (!matchesName && !matchesCat) return false;
      }

      // 2. Category filter
      if (categoryFilter !== 'ALL') {
        const catLower = categoryFilter.toLowerCase();
        const hasCat = Array.isArray(product.category) && product.category.some((c) => c.toLowerCase() === catLower);
        if (!hasCat) return false;
      }

      // 3. Status & Stock filter
      if (statusStockFilter === 'ACTIVE' && product.status !== 'ACTIVE') return false;
      if (statusStockFilter === 'INACTIVE' && product.status !== 'INACTIVE') return false;
      if (statusStockFilter === 'IN_STOCK' && product.quantity < 10) return false;
      if (statusStockFilter === 'LOW_STOCK' && (product.quantity <= 0 || product.quantity >= 10)) return false;
      if (statusStockFilter === 'OUT_OF_STOCK' && product.quantity > 0) return false;

      return true;
    });
  }, [unifiedProducts, searchQuery, categoryFilter, statusStockFilter]);

  // ─── Summary Metrics ──────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalProducts = unifiedProducts.length;
    const activeProducts = unifiedProducts.filter((p) => p.status === 'ACTIVE').length;
    const totalUnits = unifiedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalValuation = unifiedProducts.reduce((sum, p) => sum + ((p.quantity || 0) * p.price), 0);
    const lowStock = unifiedProducts.filter((p) => p.quantity > 0 && p.quantity < 10).length;
    const outOfStock = unifiedProducts.filter((p) => p.quantity === 0).length;

    return { totalProducts, activeProducts, totalUnits, totalValuation, lowStock, outOfStock };
  }, [unifiedProducts]);

  // ─── Handlers: Add Product ────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setFormItemName('');
    setFormCategories(['Veg']);
    setFormPrice('');
    setFormBranchId(currentBranch?.id || branches[0]?.id || '');
    setFormStockQty('0');
    setFormStatus('ACTIVE');
    setFormErrors({});
    setModalApiError(null);
    setShowCreateModal(true);
  };

  const validateProductForm = () => {
    const errs: Record<string, string> = {};
    if (!formItemName.trim()) errs.itemName = 'Product name is required';
    if (formItemName.trim().length > 30) errs.itemName = 'Product name must be 30 characters or less';
    if (!formCategories || formCategories.length === 0) errs.categories = 'Select at least one category';

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) errs.price = 'Price must be greater than 0';

    const qtyNum = parseInt(formStockQty, 10);
    if (isNaN(qtyNum) || qtyNum < 0) errs.stockQty = 'Initial stock quantity must be 0 or more';

    if (!formBranchId) {
      errs.branchId = 'Please select an initial branch';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProductForm()) return;

    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.products.createProduct({
        itemName: formItemName.trim(),
        category: formCategories,
        price: Math.round(parseFloat(formPrice)),
        branchId: formBranchId,
        initialQuantity: parseInt(formStockQty, 10),
        status: formStatus,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to create product');
        return;
      }

      notify.success(`Product "${res.data.itemName}" created successfully`);
      setShowCreateModal(false);
      fetchUnifiedData();
    } catch {
      setModalApiError('An unexpected network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Handlers: Toggle Status ──────────────────────────────────────────────
  const handleToggleStatus = async (product: UnifiedProductItem) => {
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await apiService.products.updateProduct(product.id, { status: newStatus });
      if (!res.success) {
        notify.error(res.error.message || `Failed to ${newStatus.toLowerCase()} product`);
        return;
      }
      notify.success(`Product "${product.itemName}" set to ${newStatus}`);
      fetchUnifiedData();
    } catch {
      notify.error('Network error. Unable to change status.');
    }
  };

  // ─── Handlers: Adjust Stock ───────────────────────────────────────────────
  const handleOpenAdjust = (product: UnifiedProductItem) => {
    const invItem = inventoryList.find((i) => i.productId === product.id);
    if (invItem) {
      setSelectedInventory(invItem);
      setAdjustQtyInput(invItem.quantity.toString());
    } else {
      setSelectedInventory({
        id: product.inventoryId || product.id,
        productId: product.id,
        branchId: product.branchId || currentBranch?.id || (branches[0]?.id || ''),
        quantity: product.quantity || 0,
        productName: product.itemName,
        category: product.category,
        price: product.price,
        branchName: product.branchName || currentBranch?.name || 'Main Cafeteria',
        updatedAt: new Date().toISOString(),
      });
      setAdjustQtyInput((product.quantity || 0).toString());
    }
    setQtyError(null);
    setModalApiError(null);
    setShowAdjustModal(true);
  };

  const handleStepAdjustment = (delta: number) => {
    const current = parseInt(adjustQtyInput, 10) || 0;
    const nextVal = Math.max(0, current + delta);
    setAdjustQtyInput(nextVal.toString());
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
      setQtyError('Stock quantity cannot be negative');
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

      notify.success(`Stock for ${selectedInventory.productName} updated to ${newQty} units`);
      setShowAdjustModal(false);
      fetchUnifiedData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Handlers: Delete Product ─────────────────────────────────────────────
  const handleOpenDeleteProduct = (product: UnifiedProductItem) => {
    setSelectedProductToDelete(product);
    setModalApiError(null);
    setShowDeleteModal(true);
  };

  const handleDeleteProductSubmit = async () => {
    if (!selectedProductToDelete) return;
    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.products.deleteProduct(selectedProductToDelete.id);
      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to archive product');
        return;
      }

      notify.success(`Product '${selectedProductToDelete.itemName}' archived successfully`);
      setShowDeleteModal(false);
      fetchUnifiedData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Guard Check ──────────────────────────────────────────────────────────
  if (!canViewProducts && !canViewInventory) {
    return <UnauthorizedPage />;
  }



  return (
    <div className="space-y-6">
      {/* ─── Page Header & Global Controls ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Menu</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Filter Selector */}
          <div className="w-48">
            <Select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Branches' },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>

          {canManageProducts && (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* ─── Unified Summary Metric Cards (5-Card Grid) ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Total Products</p>
            <p className="text-lg font-bold text-slate-100">{metrics.totalProducts}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Active for Sale</p>
            <p className="text-lg font-bold text-emerald-400">{metrics.activeProducts}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Units in Stock</p>
            <p className="text-lg font-bold text-blue-400">{metrics.totalUnits}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Stock Valuation</p>
            <p className="text-lg font-bold text-indigo-300">
              {formatCurrency(metrics.totalValuation)}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-4 col-span-2 sm:col-span-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Stock Alerts</p>
            <p className="text-lg font-bold text-amber-400">
              {metrics.lowStock + metrics.outOfStock}{' '}
              <span className="text-[11px] font-normal text-slate-400">
                ({metrics.outOfStock} out)
              </span>
            </p>
          </div>
        </Card>
      </div>

      {/* ─── Search & Filters Control Bar ─── */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-300">
            Menu Catalog & Live Branch Stock
          </span>
          <span className="text-xs text-slate-400">
            Showing <strong className="text-slate-200">{filteredProducts.length}</strong> of {unifiedProducts.length} products
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-3 border-t border-slate-800/60">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search food or product item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.slice(0, 30))}
              maxLength={30}
              className="pl-9"
            />
          </div>

          <Select
            value={statusStockFilter}
            onChange={(e) => setStatusStockFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Statuses & Stock Levels' },
              { value: 'ACTIVE', label: 'Active for Sale' },
              { value: 'INACTIVE', label: 'Inactive / Hidden' },
              { value: 'IN_STOCK', label: 'In Stock (>= 10 units)' },
              { value: 'LOW_STOCK', label: 'Low Stock (< 10 units)' },
              { value: 'OUT_OF_STOCK', label: 'Out of Stock (0 units)' },
            ]}
          />

          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Categories' },
              { value: 'Veg', label: 'Veg' },
              { value: 'Non-Veg', label: 'Non-Veg' },
              { value: 'Beverage', label: 'Beverage' },
              { value: 'Snack', label: 'Snack' },
              { value: 'Breakfast', label: 'Breakfast' },
              { value: 'Lunch', label: 'Lunch' },
            ]}
          />
        </div>
      </Card>

      {/* ─── Unified Products & Inventory Display ─── */}
      <Card className="p-0">
        {isLoading ? (
          <div className="py-12">
            <LoadingState message="Loading menu & inventory stock..." />
          </div>
        ) : loadError ? (
          <div className="p-6">
            <ErrorState message={loadError} onRetry={fetchUnifiedData} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title={searchQuery || statusStockFilter !== 'ALL' || categoryFilter !== 'ALL' ? "No matching products found" : "No products in menu yet"}
              description={searchQuery || statusStockFilter !== 'ALL' || categoryFilter !== 'ALL' ? "Try clearing your search or category filters." : "Add food items and stock quantities to start selling at cafeteria counters."}
              action={
                searchQuery || statusStockFilter !== 'ALL' || categoryFilter !== 'ALL' ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusStockFilter('ALL');
                      setCategoryFilter('ALL');
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : canManageProducts ? (
                  <Button variant="primary" onClick={handleOpenCreate}>
                    Add First Product
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 p-4">
            {filteredProducts.map((p) => {
              const isVeg = Array.isArray(p.category) && p.category.some((c) => c.toLowerCase() === 'veg');
              const isNonVeg = Array.isArray(p.category) && p.category.some((c) => c.toLowerCase() === 'non-veg');
              const isBeverage = Array.isArray(p.category) && p.category.some((c) => c.toLowerCase() === 'beverage' || c.toLowerCase() === 'drink');

              return (
                <div
                  key={p.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4.5 transition-all shadow-md ${
                    p.status === 'ACTIVE'
                      ? 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900'
                      : 'border-slate-800/60 bg-slate-950/40 opacity-75'
                  }`}
                >
                  <div>
                    {/* Header: Category pills & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isVeg && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            🟢 Veg
                          </span>
                        )}
                        {isNonVeg && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            🔴 Non-Veg
                          </span>
                        )}
                        {isBeverage && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                            ☕ Drink
                          </span>
                        )}
                        {!isVeg && !isNonVeg && !isBeverage && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {Array.isArray(p.category) ? p.category[0] || 'Food' : 'Food'}
                          </span>
                        )}
                      </div>

                      <Badge variant={p.status === 'ACTIVE' ? 'success' : 'danger'} className="text-[10px]">
                        {p.status}
                      </Badge>
                    </div>

                    {/* Food Name & Price */}
                    <h4 className="font-bold text-base text-slate-100 line-clamp-1">
                      {p.itemName}
                    </h4>
                    {p.branchName && (
                      <p className="text-xs text-slate-400 mt-0.5">🏪 {p.branchName}</p>
                    )}
                    <p className="mt-1 font-mono text-xl font-extrabold text-violet-300">
                      {formatCurrency(p.price)}
                    </p>
                  </div>

                  {/* Stock Level & Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Stock Level:</span>
                      {p.quantity === 0 ? (
                        <span className="font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                          Out of stock (0)
                        </span>
                      ) : p.quantity < 10 ? (
                        <span className="font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                          Low: {p.quantity} units
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          {p.quantity} in stock
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {canManageInventory && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs py-1 border-slate-700 text-slate-200 hover:border-violet-500"
                          onClick={() => handleOpenAdjust(p)}
                          leftIcon={<Sliders className="h-3.5 w-3.5" />}
                        >
                          Stock
                        </Button>
                      )}

                      {canManageProducts && (
                        <Button
                          variant={p.status === 'ACTIVE' ? 'ghost' : 'outline'}
                          size="sm"
                          className="flex-1 text-xs py-1"
                          onClick={() => handleToggleStatus(p)}
                          leftIcon={<Power className="h-3.5 w-3.5" />}
                        >
                          {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}

                      {canManageProducts && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeleteProduct(p)}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 px-2"
                          title="Delete product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ─── CREATE PRODUCT MODAL ─── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Product"
        size="lg"
      >
        <form onSubmit={handleCreateProductSubmit} className="space-y-4">
          {modalApiError && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400 border border-rose-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{modalApiError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Name <span className="text-rose-400">*</span>
            </label>
            <Input
              placeholder="e.g. Chicken Roll, Veg Burger"
              value={formItemName}
              maxLength={40}
              onChange={(e) => setFormItemName(e.target.value.slice(0, 40))}
              error={formErrors.itemName}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Categories & Attributes <span className="text-rose-400">*</span>
            </label>
            <CategorySelector
              selectedCategories={formCategories}
              onChange={(cats) => setFormCategories(cats)}
            />
            {formErrors.categories && (
              <p className="mt-1 text-xs text-rose-400">{formErrors.categories}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Selling Price (₹) <span className="text-rose-400">*</span>
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                placeholder="e.g. ₹120.00"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                error={formErrors.price}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Initial Branch <span className="text-rose-400">*</span>
              </label>
              <Select
                value={formBranchId}
                onChange={(e) => setFormBranchId(e.target.value)}
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
                error={formErrors.branchId}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Initial Stock Quantity (Units)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 50"
                value={formStockQty}
                onChange={(e) => setFormStockQty(e.target.value)}
                error={formErrors.stockQty}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Status
              </label>
              <Select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                options={[
                  { value: 'ACTIVE', label: 'ACTIVE (Available for sale)' },
                  { value: 'INACTIVE', label: 'INACTIVE (Hidden from POS)' },
                ]}
              />
            </div>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Create Product
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ─── ADJUST STOCK MODAL ─── */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Adjust Branch Stock"
        size="md"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          {modalApiError && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400 border border-rose-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{modalApiError}</span>
            </div>
          )}

          {selectedInventory && (
            <div className="rounded-lg bg-slate-800/60 p-3 border border-slate-700">
              <p className="font-semibold text-slate-100">{selectedInventory.productName}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Branch: <span className="text-slate-200">{selectedInventory.branchName}</span> • Current: <span className="text-emerald-400 font-bold">{selectedInventory.quantity} units</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              New Stock Quantity (Units)
            </label>
            <Input
              type="number"
              min="0"
              value={adjustQtyInput}
              onChange={(e) => setAdjustQtyInput(e.target.value)}
              error={qtyError || undefined}
            />
          </div>

          {/* Quick Adjust Steppers */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => handleStepAdjustment(-10)}>
              -10
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => handleStepAdjustment(-5)}>
              -5
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => handleStepAdjustment(-1)}>
              -1
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => handleStepAdjustment(1)}>
              +1
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => handleStepAdjustment(5)}>
              +5
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => handleStepAdjustment(10)}>
              +10
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => handleStepAdjustment(50)}>
              +50
            </Button>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowAdjustModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Confirm Stock Update
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ─── DELETE PRODUCT CONFIRMATION MODAL ─── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isSubmitting && setShowDeleteModal(false)}
        title="Delete Product"
        description="Archive product from master catalog"
        size="md"
      >
        <div className="space-y-4">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Action Failed</p>
                <p>{modalApiError}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-2">
            <p className="text-sm text-slate-200 font-medium">
              Are you sure you want to delete <span className="text-violet-300 font-bold font-mono">{selectedProductToDelete?.itemName}</span>?
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              This product will be archived and hidden from POS sale menus. All historical receipts, purchase items, and past financial reports will continue to safely preserve this product's name and accounting history.
            </p>
          </div>

          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteProductSubmit}
              isLoading={isSubmitting}
            >
              Archive & Delete Product
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}

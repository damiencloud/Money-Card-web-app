// ─── Products & Inventory Unified Hub (Org Admin) ──────────────────────────
// Clean Separation of Responsibilities:
// 1. PRODUCT CATALOG: View products, Add product, View details, Activate/Deactivate.
// 2. INVENTORY & STOCK CONTROL: View real-time stock levels, Adjust stock, Valuation.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { DataTable } from '@/components/tables';
import { notify, formatCurrency } from '@/utils';
import { UnauthorizedPage } from '@/features/auth';
import { CategorySelector } from './CategorySelector';
import {
  Package,
  Warehouse,
  Plus,
  Search,
  AlertCircle,
  Power,
  Building2,
  Sliders,
  TrendingUp,
  AlertTriangle,
  Layers,
} from 'lucide-react';

export interface InventoryItemWithDetails extends InventoryItem {
  productName: string;
  category: string[];
  price: number;
  branchName: string;
}

interface ProductsPageProps {
  defaultTab?: 'products' | 'inventory';
}

export function ProductsPage({ defaultTab }: ProductsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentBranch } = useBranch();
  const { hasPermission } = usePermissions();

  const canViewProducts = hasPermission('PRODUCT_VIEW');
  const canManageProducts = hasPermission('PRODUCT_MANAGE');
  const canViewInventory = hasPermission('INVENTORY_VIEW');
  const canManageInventory = hasPermission('INVENTORY_MANAGE');

  // Tab state (syncs with query param ?tab=products | ?tab=inventory)
  const initialTab = defaultTab || (searchParams.get('tab') === 'inventory' ? 'inventory' : 'products');
  const [activeTab, setActiveTab] = useState<'products' | 'inventory'>(initialTab);

  const handleTabChange = (tab: 'products' | 'inventory') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Shared state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>('ALL');

  // ─── Tab 1: Product Catalog State ─────────────────────────────────────────
  const [products, setProducts] = useState<ProductWithInventory[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('ALL');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [formItemName, setFormItemName] = useState('');
  const [formCategories, setFormCategories] = useState<string[]>(['Veg']);
  const [formPrice, setFormPrice] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formStockQty, setFormStockQty] = useState('0');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [productModalApiError, setProductModalApiError] = useState<string | null>(null);
  const [isProductSubmitting, setIsProductSubmitting] = useState(false);

  // ─── Tab 2: Branch Stock & Valuation State ────────────────────────────────
  const [inventoryList, setInventoryList] = useState<InventoryItemWithDetails[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState('ALL');

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<InventoryItemWithDetails | null>(null);

  const [adjustQtyInput, setAdjustQtyInput] = useState('');
  const [qtyError, setQtyError] = useState<string | null>(null);
  const [inventoryModalApiError, setInventoryModalApiError] = useState<string | null>(null);
  const [isInventorySubmitting, setIsInventorySubmitting] = useState(false);

  // ─── Fetch Product Catalog ────────────────────────────────────────────────
  const fetchProductsData = useCallback(async () => {
    setProductsError(null);
    try {
      const targetBranch = branchFilter !== 'ALL' ? branchFilter : currentBranch?.id;
      const [prodRes, branchRes] = await Promise.all([
        apiService.products.getProducts({
          search: productSearch,
          branchId: targetBranch,
          status: productStatusFilter,
        }),
        apiService.branches.getBranches(),
      ]);

      if (!prodRes.success) {
        setProductsError(prodRes.error.message || 'Failed to load product catalog');
        return;
      }

      let filtered = prodRes.data.items;
      if (productCategoryFilter !== 'ALL') {
        const catLower = productCategoryFilter.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            Array.isArray(p.category) &&
            p.category.some((c) => c.toLowerCase() === catLower),
        );
      }

      setProducts(filtered);
      if (branchRes.success) setBranches(branchRes.data.items);
    } catch {
      setProductsError('Unable to connect to the server. Please try again.');
    } finally {
      setIsProductsLoading(false);
    }
  }, [productSearch, productStatusFilter, productCategoryFilter, branchFilter, currentBranch]);

  // ─── Fetch Branch Inventory ───────────────────────────────────────────────
  const fetchInventoryData = useCallback(async () => {
    setInventoryError(null);
    try {
      const targetBranch = branchFilter !== 'ALL' ? branchFilter : currentBranch?.id;
      const [invRes, prodRes, branchRes] = await Promise.all([
        apiService.inventory.getInventory({ branchId: targetBranch }),
        apiService.products.getProducts({ branchId: targetBranch }),
        apiService.branches.getBranches(),
      ]);

      if (!invRes.success) {
        setInventoryError(invRes.error.message || 'Failed to load inventory stock');
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
          productName: prod?.itemName || item.productName || `Product ${item.productId}`,
          category: prod?.category || item.category || ['General'],
          price: prod?.price || item.price || 0,
          branchName: br?.name || item.branchName || 'Main Branch',
        };
      });

      if (inventorySearch) {
        const q = inventorySearch.toLowerCase();
        combined = combined.filter((i) => i.productName.toLowerCase().includes(q));
      }

      if (inventoryStatusFilter === 'LOW_STOCK') {
        combined = combined.filter((i) => i.quantity > 0 && i.quantity < 10);
      } else if (inventoryStatusFilter === 'OUT_OF_STOCK') {
        combined = combined.filter((i) => i.quantity === 0);
      } else if (inventoryStatusFilter === 'IN_STOCK') {
        combined = combined.filter((i) => i.quantity >= 10);
      }

      setInventoryList(combined);
    } catch {
      setInventoryError('Unable to connect to the server. Please try again.');
    } finally {
      setIsInventoryLoading(false);
    }
  }, [inventorySearch, inventoryStatusFilter, branchFilter, currentBranch]);

  useEffect(() => {
    fetchProductsData();
  }, [fetchProductsData]);

  useEffect(() => {
    fetchInventoryData();
  }, [fetchInventoryData]);

  // ─── Product Catalog Handlers ─────────────────────────────────────────────
  const handleOpenCreate = () => {
    setFormItemName('');
    setFormCategories(['Veg']);
    setFormPrice('');
    setFormBranchId(currentBranch?.id || branches[0]?.id || '');
    setFormStockQty('0');
    setFormStatus('ACTIVE');
    setFormErrors({});
    setProductModalApiError(null);
    setShowCreateModal(true);
  };

  const validateProductForm = () => {
    const errs: Record<string, string> = {};
    if (!formItemName.trim()) errs.itemName = 'Product name is required';
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

    setProductModalApiError(null);
    setIsProductSubmitting(true);

    try {
      const res = await apiService.products.createProduct({
        itemName: formItemName.trim(),
        category: formCategories,
        price: parseFloat(formPrice),
        branchId: formBranchId,
        initialQuantity: parseInt(formStockQty, 10),
        status: formStatus,
      });

      if (!res.success) {
        setProductModalApiError(res.error.message || 'Failed to create product');
        return;
      }

      notify.success(`Product "${res.data.itemName}" created successfully`);
      setShowCreateModal(false);
      fetchProductsData();
      fetchInventoryData();
    } catch {
      setProductModalApiError('An unexpected network error occurred.');
    } finally {
      setIsProductSubmitting(false);
    }
  };

  const handleToggleStatus = async (product: ProductWithInventory) => {
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await apiService.products.updateProduct(product.id, { status: newStatus });
      if (!res.success) {
        notify.error(res.error.message || `Failed to ${newStatus.toLowerCase()} product`);
        return;
      }
      notify.success(`Product "${product.itemName}" set to ${newStatus}`);
      fetchProductsData();
    } catch {
      notify.error('Network error. Unable to change status.');
    }
  };

  // ─── Inventory Adjustment Handlers ────────────────────────────────────────
  const handleOpenAdjust = (item: InventoryItemWithDetails) => {
    setSelectedInventory(item);
    setAdjustQtyInput(item.quantity.toString());
    setQtyError(null);
    setInventoryModalApiError(null);
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
    setInventoryModalApiError(null);
    setIsInventorySubmitting(true);

    try {
      const res = await apiService.inventory.updateInventoryQuantity(selectedInventory.id, newQty);

      if (!res.success) {
        setInventoryModalApiError(res.error.message || 'Failed to adjust stock quantity');
        return;
      }

      notify.success(`Stock for ${selectedInventory.productName} updated to ${newQty}`);
      setShowAdjustModal(false);
      fetchInventoryData();
      fetchProductsData();
    } catch {
      setInventoryModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsInventorySubmitting(false);
    }
  };

  // ─── Metrics Calculations (Clean 3-Card Grid) ─────────────────────────────
  const productMetrics = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.status === 'ACTIVE').length;
    const inactive = products.filter((p) => p.status === 'INACTIVE').length;
    return { total, active, inactive };
  }, [products]);

  const inventoryMetrics = useMemo(() => {
    const totalUnits = inventoryList.reduce((acc, i) => acc + i.quantity, 0);
    const totalValuation = inventoryList.reduce((acc, i) => acc + i.quantity * i.price, 0);
    const lowStock = inventoryList.filter((i) => i.quantity > 0 && i.quantity < 10).length;
    const outOfStock = inventoryList.filter((i) => i.quantity === 0).length;
    return { totalUnits, totalValuation, lowStock, outOfStock };
  }, [inventoryList]);

  // ─── Guard Check ──────────────────────────────────────────────────────────
  if (!canViewProducts && !canViewInventory) {
    return <UnauthorizedPage />;
  }

  // ─── Product Catalog Columns (Clean: No Edit & No Stock Buttons) ──────────
  const productColumns = [
    {
      key: 'itemName',
      header: 'Product Item',
      render: (product: ProductWithInventory) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-100">{product.itemName}</p>
            {product.branchName && (
              <p className="text-xs text-slate-400">🏪 {product.branchName}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (product: ProductWithInventory) => (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(product.category) ? product.category : [product.category || 'General']).map((c, idx) => {
            const isVeg = c.toLowerCase() === 'veg';
            const isNonVeg = c.toLowerCase() === 'non-veg';
            return (
              <Badge
                key={idx}
                variant={isVeg ? 'success' : isNonVeg ? 'danger' : 'outline'}
                className="capitalize"
              >
                {c}
              </Badge>
            );
          })}
        </div>
      ),
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
      header: 'Status Action',
      className: 'text-right',
      render: (product: ProductWithInventory) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          {canManageProducts && (
            <Button
              variant={product.status === 'ACTIVE' ? 'ghost' : 'outline'}
              size="sm"
              onClick={() => handleToggleStatus(product)}
              leftIcon={<Power className="h-3.5 w-3.5" />}
            >
              {product.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  // ─── Inventory & Stock Control Columns ────────────────────────────────────
  const inventoryColumns = [
    {
      key: 'productName',
      header: 'Product Item',
      render: (item: InventoryItemWithDetails) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
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
      header: 'Category',
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
      header: 'Stock Valuation',
      render: (item: InventoryItemWithDetails) => (
        <span className="font-mono text-xs font-semibold text-violet-300">
          {formatCurrency(item.quantity * item.price)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: InventoryItemWithDetails) => {
        if (item.quantity === 0) return <Badge variant="danger">Out of Stock</Badge>;
        if (item.quantity < 10) return <Badge variant="warning">Low Stock</Badge>;
        return <Badge variant="success">In Stock</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Stock Action',
      className: 'text-right',
      render: (item: InventoryItemWithDetails) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          {canManageInventory && (
            <Button
              variant="ghost"
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

  return (
    <div className="space-y-6">
      {/* ─── Page Header & Global Controls ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Products & Inventory</h1>
          <p className="mt-1 text-sm text-slate-400">
            {activeTab === 'products'
              ? 'View organization master product catalog, categories, pricing, and sale availability.'
              : 'Monitor multi-branch physical stock levels, asset valuation, and stock adjustments.'}
          </p>
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

          {activeTab === 'products' && canManageProducts && (
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

      {/* ─── Modern Tab Switcher ─── */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => handleTabChange('products')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'products'
              ? 'border-violet-500 text-violet-400 bg-violet-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Product Catalog</span>
          <span className="ml-1.5 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
            {products.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('inventory')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'inventory'
              ? 'border-violet-500 text-violet-400 bg-violet-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Warehouse className="h-4 w-4" />
          <span>Inventory & Stock Control</span>
          <span className="ml-1.5 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
            {inventoryList.length}
          </span>
        </button>
      </div>

      {/* ─── TAB 1: PRODUCT CATALOG ─── */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Summary Metric Cards (Clean 3-Card Grid) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Products</p>
                <p className="text-lg font-bold text-slate-100">{productMetrics.total}</p>
              </div>
            </Card>

            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Active for Sale</p>
                <p className="text-lg font-bold text-emerald-400">{productMetrics.active}</p>
              </div>
            </Card>

            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                <Power className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Archived / Inactive</p>
                <p className="text-lg font-bold text-slate-300">{productMetrics.inactive}</p>
              </div>
            </Card>
          </div>

          {/* Filters Bar */}
          <Card className="p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                placeholder="Search food or product item..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4 text-slate-400" />}
              />

              <Select
                value={productStatusFilter}
                onChange={(e) => setProductStatusFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'ACTIVE', label: 'Active Only' },
                  { value: 'INACTIVE', label: 'Inactive Only' },
                ]}
              />

              <Select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
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

          {/* Catalog Data Table */}
          <Card className="p-0">
            {isProductsLoading ? (
              <div className="py-12">
                <LoadingState message="Loading master product catalog..." />
              </div>
            ) : productsError ? (
              <div className="p-6">
                <ErrorState message={productsError} onRetry={fetchProductsData} />
              </div>
            ) : products.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No Products Found"
                  description="No menu or catalog items match your filter criteria."
                  action={
                    canManageProducts ? (
                      <Button variant="primary" onClick={handleOpenCreate}>
                        Add First Product
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <DataTable columns={productColumns} data={products} keyExtractor={(p) => p.id} />
            )}
          </Card>
        </div>
      )}

      {/* ─── TAB 2: INVENTORY & STOCK CONTROL ─── */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Units in Stock</p>
                <p className="text-lg font-bold text-slate-100">{inventoryMetrics.totalUnits}</p>
              </div>
            </Card>

            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Stock Valuation</p>
                <p className="text-lg font-bold text-violet-400">
                  {formatCurrency(inventoryMetrics.totalValuation)}
                </p>
              </div>
            </Card>

            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Low Stock Alerts</p>
                <p className="text-lg font-bold text-amber-400">{inventoryMetrics.lowStock}</p>
              </div>
            </Card>

            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Out of Stock</p>
                <p className="text-lg font-bold text-rose-400">{inventoryMetrics.outOfStock}</p>
              </div>
            </Card>
          </div>

          {/* Filters Bar */}
          <Card className="p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                placeholder="Search stock records by product name..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4 text-slate-400" />}
              />

              <Select
                value={inventoryStatusFilter}
                onChange={(e) => setInventoryStatusFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Stock Levels' },
                  { value: 'IN_STOCK', label: 'In Stock (>= 10 units)' },
                  { value: 'LOW_STOCK', label: 'Low Stock (< 10 units)' },
                  { value: 'OUT_OF_STOCK', label: 'Out of Stock (0 units)' },
                ]}
              />
            </div>
          </Card>

          {/* Inventory Data Table */}
          <Card className="p-0">
            {isInventoryLoading ? (
              <div className="py-12">
                <LoadingState message="Loading multi-branch stock levels..." />
              </div>
            ) : inventoryError ? (
              <div className="p-6">
                <ErrorState message={inventoryError} onRetry={fetchInventoryData} />
              </div>
            ) : inventoryList.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No Stock Records Found"
                  description="No branch stock items match the current filters."
                />
              </div>
            ) : (
              <DataTable columns={inventoryColumns} data={inventoryList} keyExtractor={(i) => i.id} />
            )}
          </Card>
        </div>
      )}

      {/* ─── CREATE PRODUCT MODAL ─── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Product"
        size="lg"
      >
        <form onSubmit={handleCreateProductSubmit} className="space-y-4">
          {productModalApiError && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400 border border-rose-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{productModalApiError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Name <span className="text-rose-400">*</span>
            </label>
            <Input
              placeholder="e.g. Chicken Roll, Veg Burger"
              value={formItemName}
              onChange={(e) => setFormItemName(e.target.value)}
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
                step="0.01"
                min="0.01"
                placeholder="e.g. 120.00"
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
            <Button variant="primary" type="submit" isLoading={isProductSubmitting}>
              Create Product
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ─── ADJUST STOCK MODAL (INVENTORY & STOCK CONTROL TAB ONLY) ─── */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Adjust Branch Stock"
        size="md"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          {inventoryModalApiError && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400 border border-rose-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{inventoryModalApiError}</span>
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
            <Button variant="primary" type="submit" isLoading={isInventorySubmitting}>
              Confirm Stock Update
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}

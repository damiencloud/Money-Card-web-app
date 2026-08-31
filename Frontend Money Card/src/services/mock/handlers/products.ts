// ─── Products API Mock Handler (M0 V10 Section 7 & 18) ────────────
// Products are branch-scoped.
// V10: Category is a multi-select string array (string[]). Tags field is removed.

import { mockStore } from '../store';
import { mockDelay, createMockSuccess, createMockError, paginateArray } from '../utils';
import { mockAuthHandlers } from './auth';
import type {
  ApiResult,
  Product,
  PaginatedData,
  PaginationParams,
  CreateProductRequest,
  UpdateProductRequest,
  ProductWithInventory,
} from '@/types';

export const mockProductsHandlers = {
  async deleteProduct(id: string): Promise<ApiResult<any>> {
    await mockDelay();
    const product = mockStore.products.find((p) => p.id === id);
    if (!product) return createMockError('NOT_FOUND', 'Product not found');
    product.status = 'INACTIVE';
    return createMockSuccess({ deleted: true, message: 'Product archived.' });
  },

  // GET /api/v1/products
  async getProducts(
    params?: PaginationParams & { category?: string },
  ): Promise<ApiResult<PaginatedData<ProductWithInventory>>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    let products = mockStore.products;

    if (params?.branchId) {
      products = products.filter((p) => p.branchId === params.branchId);
    } else if (currentUser.role === 'STAFF' && currentUser.assignedBranchIds.length > 0) {
      products = products.filter((p) => currentUser.assignedBranchIds.includes(p.branchId));
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.itemName.toLowerCase().includes(q) ||
          (Array.isArray(p.category) && p.category.some((c) => c.toLowerCase().includes(q))),
      );
    }

    if (params?.category) {
      const catQuery = params.category.toLowerCase();
      products = products.filter(
        (p) =>
          Array.isArray(p.category) &&
          p.category.some((c) => c.toLowerCase() === catQuery),
      );
    }

    if (params?.status) {
      products = products.filter((p) => p.status === params.status);
    }

    const itemsWithQty: ProductWithInventory[] = products.map((p) => {
      const inv = mockStore.inventory.find(
        (i) => i.productId === p.id && i.branchId === p.branchId,
      );
      return {
        ...p,
        quantity: inv ? inv.quantity : 0,
      };
    });

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    return createMockSuccess(paginateArray(itemsWithQty, page, limit));
  },

  // GET /api/v1/products/:id
  async getProductById(id: string): Promise<ApiResult<ProductWithInventory>> {
    await mockDelay();
    const product = mockStore.products.find((p) => p.id === id);
    if (!product) {
      return createMockError('NOT_FOUND', `Product '${id}' not found`);
    }

    const inv = mockStore.inventory.find(
      (i) => i.productId === product.id && i.branchId === product.branchId,
    );

    return createMockSuccess({
      ...product,
      quantity: inv ? inv.quantity : 0,
    });
  },

  // POST /api/v1/products
  async createProduct(req: CreateProductRequest): Promise<ApiResult<ProductWithInventory>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const categoriesArray = Array.isArray(req.category)
      ? req.category.filter(Boolean)
      : (typeof req.category === 'string' ? [req.category] : ['General']);

    if (!req.itemName || categoriesArray.length === 0 || req.price === undefined || req.price < 0) {
      return createMockError(
        'VALIDATION_ERROR',
        'Valid product itemName, category selection, and non-negative price are required',
      );
    }

    const newProductId = mockStore.generateId('PRODUCT');
    const newProduct: Product = {
      id: newProductId,
      branchId: req.branchId,
      itemName: req.itemName.trim(),
      category: categoriesArray,
      price: req.price,
      status: req.status || 'ACTIVE',
      createdAt: mockStore.getTimestamp(),
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.products.push(newProduct);

    const initialQuantity = req.initialQuantity || 0;
    const newInventoryItem = {
      id: mockStore.generateId('INV'),
      branchId: req.branchId,
      productId: newProductId,
      quantity: initialQuantity,
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.inventory.push(newInventoryItem);

    return createMockSuccess({
      ...newProduct,
      quantity: initialQuantity,
    });
  },

  // PATCH /api/v1/products/:id
  async updateProduct(
    id: string,
    req: UpdateProductRequest,
  ): Promise<ApiResult<ProductWithInventory>> {
    await mockDelay();
    const index = mockStore.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return createMockError('NOT_FOUND', `Product '${id}' not found`);
    }

    const existing = mockStore.products[index];
    const categoriesArray = req.category
      ? (Array.isArray(req.category) ? req.category.filter(Boolean) : [req.category])
      : existing.category;

    const updated: Product = {
      ...existing,
      ...(req.itemName !== undefined ? { itemName: req.itemName.trim() } : {}),
      ...(req.category !== undefined ? { category: categoriesArray } : {}),
      ...(req.price !== undefined ? { price: req.price } : {}),
      ...(req.status !== undefined ? { status: req.status } : {}),
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.products[index] = updated;

    const inv = mockStore.inventory.find(
      (i) => i.productId === updated.id && i.branchId === updated.branchId,
    );

    return createMockSuccess({
      ...updated,
      quantity: inv ? inv.quantity : 0,
    });
  },
};

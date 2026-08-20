// ─── Product & Inventory Entities (M0 V10 Section 3, 4 & 19) ──────
// Products and inventory are branch-scoped.
// V10: Category is multi-select string array. Tags field is removed.

export interface Product {
  id: string;
  branchId: string;
  itemName: string;
  category: string[];
  price: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  branchId: string;
  productId: string;
  quantity: number;
  updatedAt: string;
}

export interface ProductWithInventory extends Product {
  quantity: number;
  inventoryUpdatedAt?: string;
  branchName?: string;
}

// ─── CSV Import Specification (M0 V10 Section 12 & 19) ─────────
// Required columns: itemName, category, price. Tags is removed.

export interface CsvRowInput {
  rowNumber: number;
  itemName: string;
  category: string[];
  price: number;
}

export interface CsvValidationError {
  rowNumber: number;
  field: string;
  reason: string;
}

export interface CsvImportPreview {
  branchId: string;
  totalRows: number;
  validRows: CsvRowInput[];
  invalidRows: CsvValidationError[];
  createsCount: number;
  updatesCount: number;
  previewToken: string;
}

export interface CreateProductRequest {
  branchId: string;
  itemName: string;
  category: string[];
  price: number;
  status?: 'ACTIVE' | 'INACTIVE';
  initialQuantity?: number;
}

export interface UpdateProductRequest {
  itemName?: string;
  category?: string[];
  price?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateInventoryRequest {
  quantity: number;
}

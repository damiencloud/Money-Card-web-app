// ─── Inventory & CSV Import API Mock Handler (M0 V10 Section 7, 12, 18 & 19) ─
// Inventory is branch-scoped.
// V10: CSV schema is 'itemName,category,price'. Tags is removed. Category is multi-select array.

import { mockStore } from '../store';
import { mockDelay, createMockSuccess, createMockError, paginateArray } from '../utils';
import { mockAuthHandlers } from './auth';
import { generateSecureToken } from '@/utils/cryptoRandom';
import type {
  ApiResult,
  InventoryItem,
  PaginatedData,
  PaginationParams,
  CsvRowInput,
  CsvValidationError,
  CsvImportPreview,
} from '@/types';

const storedPreviews: Map<string, CsvImportPreview> = new Map();

export const mockInventoryHandlers = {
  async deleteInventory(id: string): Promise<ApiResult<any>> {
    await mockDelay();
    mockStore.inventory = mockStore.inventory.filter((i) => i.id !== id);
    return createMockSuccess({ deleted: true, message: 'Inventory item removed.' });
  },

  async deleteInventoryByBranchAndProduct(branchId: string, productId: string): Promise<ApiResult<any>> {
    await mockDelay();
    mockStore.inventory = mockStore.inventory.filter((i) => !(i.branchId === branchId && i.productId === productId));
    return createMockSuccess({ deleted: true, message: 'Inventory item removed.' });
  },

  // GET /api/v1/inventory
  async getInventory(params?: PaginationParams): Promise<ApiResult<PaginatedData<InventoryItem>>> {
    await mockDelay();
    let inventory = mockStore.inventory;

    if (params?.branchId) {
      inventory = inventory.filter((i) => i.branchId === params.branchId);
    }

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    return createMockSuccess(paginateArray(inventory, page, limit));
  },

  // PATCH /api/v1/inventory/:id
  async updateInventoryQuantity(id: string, quantity: number): Promise<ApiResult<InventoryItem>> {
    await mockDelay();
    if (quantity < 0) {
      return createMockError(
        'INSUFFICIENT_INVENTORY',
        'Inventory stock quantity cannot become negative (M0 Section 1)',
      );
    }

    const index = mockStore.inventory.findIndex((i) => i.id === id);
    if (index === -1) {
      return createMockError('NOT_FOUND', `Inventory record '${id}' not found`);
    }

    mockStore.inventory[index].quantity = quantity;
    mockStore.inventory[index].updatedAt = mockStore.getTimestamp();

    return createMockSuccess(mockStore.inventory[index]);
  },

  // GET /api/v1/inventory/import/template (M0 V10 Section 12 & 20)
  async getImportTemplate(): Promise<ApiResult<{ templateCsv: string; filename: string }>> {
    await mockDelay();
    const templateCsv = `itemName,category,price
Sample Veg Burger,Veg|Fast Food,120`;

    return createMockSuccess({
      templateCsv,
      filename: 'inventory_import_template.csv',
    });
  },

  // POST /api/v1/inventory/import (M0 V10 Section 7, 12 & 19)
  // Preserves full workflow: upload -> validate -> preview -> confirm -> import
  async importInventory(req: {
    branchId: string;
    csvContent?: string;
    confirm?: boolean;
    previewToken?: string;
  }): Promise<ApiResult<CsvImportPreview | { importedCount: number; createsCount: number; updatesCount: number }>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    // Step 2: Confirm & Import Step
    if (req.confirm || req.previewToken) {
      const token = req.previewToken || '';
      const preview = storedPreviews.get(token);

      if (!preview) {
        return createMockError(
          'VALIDATION_ERROR',
          'Invalid or expired CSV import preview. Please upload and validate CSV again.',
        );
      }

      // Re-verify branch authority
      const targetBranch = mockStore.branches.find((b) => b.id === preview.branchId);
      if (!targetBranch) {
        return createMockError(
          'NOT_FOUND',
          `Import failed: Target branch '${preview.branchId}' could not be resolved.`,
        );
      }

      if (currentUser.role !== 'SUPER_ADMIN' && targetBranch.organizationId !== currentUser.organizationId) {
        return createMockError(
          'ORGANIZATION_ACCESS_DENIED',
          `Import failed: Selected branch '${targetBranch.name}' does not belong to this organization.`,
        );
      }

      // M0 Section 19: Invalid rows report row number and NO partial import occurs
      if (preview.invalidRows.length > 0) {
        return createMockError(
          'CSV_VALIDATION_ERROR',
          `Cannot commit CSV import: ${preview.invalidRows.length} invalid rows found. Fix errors and re-upload.`,
          { invalidRows: preview.invalidRows },
        );
      }

      let created = 0;
      let updated = 0;

      for (const row of preview.validRows) {
        const existingIndex = mockStore.products.findIndex(
          (p) =>
            p.branchId === preview.branchId &&
            p.itemName.toLowerCase() === row.itemName.toLowerCase(),
        );

        if (existingIndex !== -1) {
          // UPDATE existing product in the target branch
          mockStore.products[existingIndex] = {
            ...mockStore.products[existingIndex],
            category: row.category,
            price: row.price,
            updatedAt: mockStore.getTimestamp(),
          };

          // Ensure inventory record exists for this branch and product
          const invIndex = mockStore.inventory.findIndex(
            (i) => i.productId === mockStore.products[existingIndex].id && i.branchId === preview.branchId,
          );
          if (invIndex === -1) {
            mockStore.inventory.push({
              id: mockStore.generateId('INV'),
              branchId: preview.branchId,
              productId: mockStore.products[existingIndex].id,
              quantity: 0,
              updatedAt: mockStore.getTimestamp(),
            });
          }
          updated++;
        } else {
          // CREATE new product in the target branch
          const newProdId = mockStore.generateId('PRODUCT');
          const newProd = {
            id: newProdId,
            branchId: preview.branchId,
            itemName: row.itemName,
            category: row.category,
            price: row.price,
            status: 'ACTIVE' as const,
            createdAt: mockStore.getTimestamp(),
            updatedAt: mockStore.getTimestamp(),
          };

          mockStore.products.push(newProd);

          mockStore.inventory.push({
            id: mockStore.generateId('INV'),
            branchId: preview.branchId,
            productId: newProdId,
            quantity: 0,
            updatedAt: mockStore.getTimestamp(),
          });

          created++;
        }
      }

      storedPreviews.delete(token);

      // Audit Log
      mockStore.auditLogs.push({
        id: mockStore.generateId('audit'),
        branchId: preview.branchId,
        actorStaffId: currentUser.id,
        action: 'INVENTORY_IMPORT',
        resourceType: 'Inventory',
        resourceId: preview.branchId,
        metadata: { totalImported: preview.validRows.length, created, updated, branchName: targetBranch.name },
        createdAt: mockStore.getTimestamp(),
      });

      return createMockSuccess({
        importedCount: preview.validRows.length,
        createsCount: created,
        updatesCount: updated,
      });
    }

    // Step 1: Upload, Validate & Preview Step
    if (!req.branchId || req.branchId.trim() === '') {
      return createMockError('VALIDATION_ERROR', 'Import failed: Branch context is required for CSV import.');
    }

    const trimmedBranchInput = req.branchId.trim();
    const targetBranch = mockStore.branches.find(
      (b) =>
        b.id === trimmedBranchInput ||
        b.name.toLowerCase() === trimmedBranchInput.toLowerCase(),
    );

    if (!targetBranch) {
      return createMockError(
        'NOT_FOUND',
        `Import failed: '${trimmedBranchInput}' branch could not be resolved.`,
      );
    }

    // Authoritative organization isolation check
    if (currentUser.role !== 'SUPER_ADMIN' && targetBranch.organizationId !== currentUser.organizationId) {
      return createMockError(
        'ORGANIZATION_ACCESS_DENIED',
        `Import failed: Selected branch '${targetBranch.name}' does not belong to this organization.`,
      );
    }

    // Branch access check for restricted staff
    if (
      currentUser.role !== 'SUPER_ADMIN' &&
      currentUser.role !== 'ORG_ADMIN' &&
      currentUser.assignedBranchIds &&
      currentUser.assignedBranchIds.length > 0 &&
      !currentUser.assignedBranchIds.includes(targetBranch.id)
    ) {
      return createMockError(
        'BRANCH_ACCESS_DENIED',
        `Import failed: You do not have access permissions for branch '${targetBranch.name}'.`,
      );
    }

    const resolvedBranchId = targetBranch.id;

    if (!req.csvContent || req.csvContent.trim() === '') {
      return createMockError('CSV_VALIDATION_ERROR', 'CSV file content is empty');
    }

    const lines = req.csvContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length <= 1) {
      return createMockError(
        'CSV_VALIDATION_ERROR',
        'CSV file must contain a header row and at least one data row',
      );
    }

    const header = lines[0].toLowerCase().replace(/\s/g, '');
    if (!header.includes('itemname') || !header.includes('price')) {
      return createMockError(
        'CSV_VALIDATION_ERROR',
        "Invalid CSV headers. Required headers: 'itemName', 'category', 'price'",
      );
    }

    const validRows: CsvRowInput[] = [];
    const invalidRows: CsvValidationError[] = [];
    const seenNamesInCsv = new Set<string>();

    let createsCount = 0;
    let updatesCount = 0;

    const existingBranchProducts = mockStore.products.filter((p) => p.branchId === resolvedBranchId);

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(',').map((c) => c.trim());
      const rowNum = i + 1;

      const itemName = cols[0] || '';
      const categoryRaw = cols[1] || 'General';
      const priceRaw = cols[2];

      if (!itemName) {
        invalidRows.push({
          rowNumber: rowNum,
          field: 'itemName',
          reason: 'Item name cannot be empty',
        });
        continue;
      }

      const price = parseFloat(priceRaw);
      if (isNaN(price) || price < 0) {
        invalidRows.push({
          rowNumber: rowNum,
          field: 'price',
          reason: `Invalid non-negative price format '${priceRaw}'`,
        });
        continue;
      }

      const nameKey = itemName.toLowerCase();
      if (seenNamesInCsv.has(nameKey)) {
        invalidRows.push({
          rowNumber: rowNum,
          field: 'itemName',
          reason: `Duplicate item name '${itemName}' found within the same CSV file`,
        });
        continue;
      }
      seenNamesInCsv.add(nameKey);

      const category = categoryRaw
        .split('|')
        .map((t) => t.trim())
        .filter(Boolean);

      if (category.length === 0) {
        category.push('General');
      }

      validRows.push({
        rowNumber: rowNum,
        itemName,
        category,
        price,
      });

      const exists = existingBranchProducts.some(
        (p) => p.itemName.toLowerCase() === nameKey,
      );
      if (exists) {
        updatesCount++;
      } else {
        createsCount++;
      }
    }

    const previewToken = generateSecureToken('preview_token');
    const previewData: CsvImportPreview = {
      branchId: resolvedBranchId,
      totalRows: lines.length - 1,
      validRows,
      invalidRows,
      createsCount,
      updatesCount,
      previewToken,
    };

    storedPreviews.set(previewToken, previewData);

    return createMockSuccess(previewData);
  },
};

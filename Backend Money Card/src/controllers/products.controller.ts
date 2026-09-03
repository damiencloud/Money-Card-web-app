import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { ProductStatus } from '@prisma/client';

export interface InventoryMovementRecord {
  id: string;
  inventoryId: string;
  productId: string;
  productName: string;
  branchId: string;
  changeQuantity: number;
  balanceAfter: number;
  type: 'RESTOCK' | 'MANUAL_ADJUSTMENT' | 'PURCHASE' | 'DAMAGE';
  reason: string;
  createdAt: string;
  staffName: string;
}

export const inventoryMovementsStore: InventoryMovementRecord[] = [];

export function recordInventoryMovement(movement: Omit<InventoryMovementRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) {
  const entry: InventoryMovementRecord = {
    id: movement.id || `mov-${Date.now()}-${randomUUID().slice(0, 8)}`,
    inventoryId: movement.inventoryId,
    productId: movement.productId,
    productName: movement.productName,
    branchId: movement.branchId,
    changeQuantity: movement.changeQuantity,
    balanceAfter: movement.balanceAfter,
    type: movement.type,
    reason: movement.reason,
    createdAt: movement.createdAt || new Date().toISOString(),
    staffName: movement.staffName,
  };
  inventoryMovementsStore.unshift(entry); // newest first
  if (inventoryMovementsStore.length > 1000) {
    inventoryMovementsStore.pop();
  }
  return entry;
}



export async function getProducts(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { search, category, status, branchId } = req.query as Record<string, string>;

  const whereClause: any = {
    organizationId: orgId,
    // Do NOT filter by ARCHIVED products (soft-deleted), but show both ACTIVE and INACTIVE
    status: { not: ProductStatus.ARCHIVED },
  };

  // If a specific status filter is requested (ACTIVE or INACTIVE), apply it
  if (status && status !== 'ALL' && (status === 'ACTIVE' || status === 'INACTIVE')) {
    whereClause.status = status as ProductStatus;
  }

  if (search) {
    whereClause.itemName = { contains: search, mode: 'insensitive' };
  }

  if (category) {
    whereClause.category = { has: category };
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    include: {
      inventoryItems: { include: { branch: true } },
    },
    orderBy: { itemName: 'asc' },
  });

  const formatted = products.map((p) => {
    // Find branch-specific inventory if branchId is provided
    const targetBranchInv = branchId && branchId !== 'ALL'
      ? p.inventoryItems.find((inv) => inv.branchId === branchId)
      : p.inventoryItems[0];

    const currentQty = targetBranchInv ? targetBranchInv.quantity : 0;
    const threshold = targetBranchInv ? targetBranchInv.lowStockThreshold : 10;

    return {
      id: p.id,
      productId: p.id,
      branchId: branchId || targetBranchInv?.branchId || '',
      branchName: targetBranchInv?.branch?.name || '',
      itemName: p.itemName,
      name: p.itemName,
      productName: p.itemName,
      price: p.price,
      category: p.category,
      description: p.description,
      imageUrl: p.imageUrl,
      status: p.status,
      quantity: currentQty,
      currentStock: currentQty,
      stock: currentQty,
      lowStockThreshold: threshold,
      reorderLevel: threshold,
      isLowStock: currentQty <= threshold && currentQty > 0,
      isOutOfStock: currentQty <= 0,
      inventory: p.inventoryItems.map((inv) => ({
        branchId: inv.branchId,
        branchName: inv.branch.name,
        quantity: inv.quantity,
        lowStockThreshold: inv.lowStockThreshold,
      })),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  return sendSuccess(res, formatted);
}

export async function createProduct(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { itemName, price, category, description, imageUrl, initialStock = 0 } = req.body;

  if (!itemName || !itemName.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Item name is required');
  }

  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Price must be a positive number');
  }

  const categoryList: string[] = Array.isArray(category)
    ? category
    : typeof category === 'string'
    ? category.split(',').map((s) => s.trim()).filter(Boolean)
    : ['General'];

  const stockQty = Math.max(
    0,
    parseInt(String(req.body.initialQuantity ?? initialStock ?? 0), 10) || 0,
  );
  const targetBranchId = req.body.branchId;

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        organizationId: orgId,
        itemName: itemName.trim(),
        price: numPrice,
        category: categoryList,
        description,
        imageUrl,
        status: req.body.status === 'INACTIVE' ? ProductStatus.INACTIVE : ProductStatus.ACTIVE,
      },
    });

    // If a specific branchId is provided, initialize inventory for that branch and other branches
    const allBranches = await tx.branch.findMany({ where: { organizationId: orgId } });
    for (const b of allBranches) {
      const isTarget = targetBranchId && targetBranchId !== 'ALL' ? b.id === targetBranchId : true;
      const initialQty = isTarget ? stockQty : 0;
      const inv = await tx.branchInventory.upsert({
        where: {
          branchId_productId: {
            branchId: b.id,
            productId: p.id,
          },
        },
        update: { quantity: initialQty },
        create: {
          branchId: b.id,
          productId: p.id,
          quantity: initialQty,
          lowStockThreshold: 10,
        },
      });

      if (initialQty > 0) {
        recordInventoryMovement({
          inventoryId: inv.id,
          productId: p.id,
          productName: p.itemName,
          branchId: b.id,
          changeQuantity: initialQty,
          balanceAfter: initialQty,
          type: 'RESTOCK',
          reason: 'Initial Product Stock Allocation',
          staffName: (req as any).user?.name || 'Org Admin',
        });
      }
    }

    return p;
  });

  return sendSuccess(res, product, 201);
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  const { itemName, price, category, description, imageUrl, status } = req.body;

  const product = await prisma.product.findFirst({
    where: { id, organizationId: orgId || undefined },
  });

  if (!product) {
    return sendError(res, 404, 'NOT_FOUND', 'Product not found');
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(itemName ? { itemName: itemName.trim() } : {}),
      ...(price !== undefined ? { price: parseFloat(price) } : {}),
      ...(category ? { category: Array.isArray(category) ? category : [category] } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(status ? { status } : {}),
    },
  });

  return sendSuccess(res, updated);
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  const product = await prisma.product.findFirst({
    where: { id, organizationId: orgId || undefined },
  });

  if (!product) {
    return sendError(res, 404, 'NOT_FOUND', 'Product not found');
  }

  await prisma.product.update({
    where: { id },
    data: { status: ProductStatus.ARCHIVED },
  });

  return sendSuccess(res, { message: 'Product archived successfully' });
}

export async function getInventory(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { branchId, search, status } = req.query as Record<string, string>;

  // 1. Fetch active products for organization
  const prodWhere: any = {
    organizationId: orgId,
    status: ProductStatus.ACTIVE,
  };
  if (search) {
    prodWhere.itemName = { contains: search, mode: 'insensitive' };
  }

  const [products, branch] = await Promise.all([
    prisma.product.findMany({
      where: prodWhere,
      orderBy: { itemName: 'asc' },
    }),
    branchId && branchId !== 'ALL'
      ? prisma.branch.findFirst({ where: { id: branchId, organizationId: orgId } })
      : null,
  ]);

  // 2. Fetch inventory records for this branch/org
  const invWhere: any = {
    product: { organizationId: orgId, status: ProductStatus.ACTIVE },
    branch: { organizationId: orgId },
  };
  if (branchId && branchId !== 'ALL') {
    invWhere.branchId = branchId;
  }

  const inventoryRecords = await prisma.branchInventory.findMany({
    where: invWhere,
    include: { branch: true, product: true },
  });

  const invMap = new Map<string, any>();
  inventoryRecords.forEach((inv) => {
    invMap.set(`${inv.branchId}_${inv.productId}`, inv);
  });

  // 3. For target branch, construct complete inventory entries for ALL active products
  const targetBranchId = branch?.id || (branchId && branchId !== 'ALL' ? branchId : undefined);
  const targetBranchName = branch?.name || 'Main Branch';

  const results: any[] = [];

  if (targetBranchId) {
    for (const prod of products) {
      const inv = invMap.get(`${targetBranchId}_${prod.id}`);
      const qty = inv ? inv.quantity : 0;
      const threshold = inv ? inv.lowStockThreshold : 10;
      const derivedStatus = qty <= 0 ? 'OUT_OF_STOCK' : (qty <= threshold ? 'LOW_STOCK' : 'IN_STOCK');

      if (status && status !== 'ALL' && derivedStatus !== status) {
        continue;
      }

      results.push({
        id: inv ? inv.id : `inv-${targetBranchId}-${prod.id}`,
        branchId: targetBranchId,
        branchName: inv?.branch?.name || targetBranchName,
        productId: prod.id,
        itemName: prod.itemName,
        productName: prod.itemName,
        name: prod.itemName,
        price: prod.price,
        category: prod.category,
        quantity: qty,
        currentStock: qty,
        stock: qty,
        lowStockThreshold: threshold,
        reorderLevel: threshold,
        isLowStock: qty <= threshold && qty > 0,
        isOutOfStock: qty <= 0,
        status: derivedStatus,
        updatedAt: inv?.updatedAt || prod.updatedAt,
        product: {
          id: prod.id,
          itemName: prod.itemName,
          name: prod.itemName,
          price: prod.price,
          category: prod.category,
          status: prod.status,
        },
      });
    }
  } else {
    for (const inv of inventoryRecords) {
      const qty = inv.quantity;
      const threshold = inv.lowStockThreshold;
      const derivedStatus = qty <= 0 ? 'OUT_OF_STOCK' : (qty <= threshold ? 'LOW_STOCK' : 'IN_STOCK');

      if (status && status !== 'ALL' && derivedStatus !== status) {
        continue;
      }

      results.push({
        id: inv.id,
        branchId: inv.branchId,
        branchName: inv.branch.name,
        productId: inv.productId,
        itemName: inv.product.itemName,
        productName: inv.product.itemName,
        name: inv.product.itemName,
        price: inv.product.price,
        category: inv.product.category,
        quantity: qty,
        currentStock: qty,
        stock: qty,
        lowStockThreshold: threshold,
        reorderLevel: threshold,
        isLowStock: qty <= threshold && qty > 0,
        isOutOfStock: qty <= 0,
        status: derivedStatus,
        updatedAt: inv.updatedAt,
        product: {
          id: inv.product.id,
          itemName: inv.product.itemName,
          name: inv.product.itemName,
          price: inv.product.price,
          category: inv.product.category,
          status: inv.product.status,
        },
      });
    }
  }

  return sendSuccess(res, results);
}

export async function adjustInventoryStock(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { id } = req.params;
  const { adjustment, quantity, reason, branchId, productId } = req.body;

  try {
    let targetInventory: any = null;

    // 1. Try finding by Inventory ID UUID
    if (id && !id.startsWith('inv-')) {
      targetInventory = await prisma.branchInventory.findFirst({
        where: { id },
        include: { product: true, branch: true },
      });
    }

    // 2. If composite ID or direct parameters
    if (!targetInventory) {
      let bId = branchId;
      let pId = productId;

      if (id && id.startsWith('inv-')) {
        const raw = id.replace('inv-', '');
        // Check if raw contains known delimiter or try locating by product & branch
        const branches = await prisma.branch.findMany({ where: { organizationId: orgId } });
        for (const b of branches) {
          if (raw.startsWith(b.id)) {
            bId = b.id;
            pId = raw.substring(b.id.length + 1);
            break;
          }
        }
      }

      if (bId && pId) {
        targetInventory = await prisma.branchInventory.findFirst({
          where: { branchId: bId, productId: pId },
          include: { product: true, branch: true },
        });

        if (!targetInventory) {
          const [branchExists, prodExists] = await Promise.all([
            prisma.branch.findFirst({ where: { id: bId, organizationId: orgId } }),
            prisma.product.findFirst({ where: { id: pId, organizationId: orgId } }),
          ]);

          if (branchExists && prodExists) {
            targetInventory = await prisma.branchInventory.create({
              data: {
                branchId: bId,
                productId: pId,
                quantity: 0,
                lowStockThreshold: 10,
              },
              include: { product: true, branch: true },
            });
          }
        }
      }
    }

    if (!targetInventory) {
      return sendError(res, 404, 'NOT_FOUND', 'Inventory record or product not found');
    }

    // Calculate new quantity
    let newQty: number;
    if (adjustment !== undefined) {
      newQty = Math.max(0, targetInventory.quantity + parseInt(String(adjustment), 10));
    } else if (quantity !== undefined) {
      newQty = Math.max(0, parseInt(String(quantity), 10));
    } else {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Adjustment delta or quantity required');
    }

    const updated = await prisma.branchInventory.update({
      where: { id: targetInventory.id },
      data: { quantity: newQty },
      include: { product: true, branch: true },
    });

    const changeQty = newQty - targetInventory.quantity;
    recordInventoryMovement({
      inventoryId: updated.id,
      productId: updated.productId,
      productName: updated.product.itemName,
      branchId: updated.branchId,
      changeQuantity: changeQty,
      balanceAfter: newQty,
      type: changeQty >= 0 ? 'RESTOCK' : (reason?.toLowerCase().includes('damage') || reason?.toLowerCase().includes('waste') ? 'DAMAGE' : 'MANUAL_ADJUSTMENT'),
      reason: reason || (changeQty >= 0 ? 'Restock / Fresh Batch' : 'Stock Adjustment'),
      staffName: (req as any).user?.name || 'Staff',
    });

    const threshold = updated.lowStockThreshold;
    const formatted = {
      id: updated.id,
      branchId: updated.branchId,
      branchName: updated.branch.name,
      productId: updated.productId,
      itemName: updated.product.itemName,
      productName: updated.product.itemName,
      name: updated.product.itemName,
      price: updated.product.price,
      category: updated.product.category,
      quantity: updated.quantity,
      currentStock: updated.quantity,
      stock: updated.quantity,
      lowStockThreshold: threshold,
      reorderLevel: threshold,
      isLowStock: updated.quantity <= threshold && updated.quantity > 0,
      isOutOfStock: updated.quantity <= 0,
      status: updated.quantity <= 0 ? 'OUT_OF_STOCK' : (updated.quantity <= threshold ? 'LOW_STOCK' : 'IN_STOCK'),
      updatedAt: updated.updatedAt,
      product: {
        id: updated.product.id,
        itemName: updated.product.itemName,
        name: updated.product.itemName,
        price: updated.product.price,
        category: updated.product.category,
        status: updated.product.status,
      },
    };

    return sendSuccess(res, formatted);
  } catch (err: any) {
    return sendError(res, 500, 'INTERNAL_ERROR', err.message || 'Failed to adjust stock');
  }
}

export async function updateInventoryStock(req: Request, res: Response) {
  return adjustInventoryStock(req, res);
}

export async function getInventoryMovements(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { branchId, inventoryId, limit = '50' } = req.query as Record<string, string>;

  if (!branchId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Branch ID is required');
  }

  let branchMovements = inventoryMovementsStore.filter(
    (m) => m.branchId === branchId && (m.changeQuantity > 0 || m.type === 'RESTOCK')
  );

  if (inventoryId) {
    branchMovements = branchMovements.filter((m) => m.inventoryId === inventoryId);
  }

  // If no movements recorded yet for this branch, auto-synthesize from active inventory items
  if (branchMovements.length === 0) {
    const invRecords = await prisma.branchInventory.findMany({
      where: {
        branchId,
        branch: { organizationId: orgId },
        quantity: { gt: 0 },
      },
      include: { product: true },
      orderBy: { updatedAt: 'desc' },
    });

    for (const inv of invRecords) {
      const initialEntry = recordInventoryMovement({
        inventoryId: inv.id,
        productId: inv.productId,
        productName: inv.product.itemName,
        branchId: inv.branchId,
        changeQuantity: inv.quantity,
        balanceAfter: inv.quantity,
        type: 'RESTOCK',
        reason: 'Initial Product Stock Allocation',
        createdAt: inv.updatedAt.toISOString(),
        staffName: 'Org Admin',
      });
      branchMovements.push(initialEntry);
    }
  }

  const numLimit = parseInt(limit, 10) || 50;
  return sendSuccess(res, branchMovements.slice(0, numLimit));
}

export async function getCsvTemplate(_req: Request, res: Response) {
  const templateCsv = `itemName,category,price\nVeg Burger,"Veg, Snacks",120\nCold Coffee,Beverages,80\nDeluxe Thali,"Veg, Lunch, Dinner",220`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="inventory_template.csv"');
  return res.send(templateCsv);
}

export async function importInventoryCsv(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { branchId, mode = 'preview', rows = [] } = req.body;

  if (!branchId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Target branchId is required for CSV import');
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId: orgId },
  });

  if (!branch) {
    return sendError(res, 404, 'NOT_FOUND', 'Target branch not found in organization');
  }

  const validRows: any[] = [];
  const invalidRows: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;

    const itemName = row.itemName?.trim();
    const price = parseFloat(row.price);

    if (!itemName) {
      invalidRows.push({ rowNumber, field: 'itemName', reason: 'Item name is required' });
      continue;
    }

    if (isNaN(price) || price < 0) {
      invalidRows.push({ rowNumber, field: 'price', reason: 'Price must be a valid positive number' });
      continue;
    }

    const categoryList = Array.isArray(row.category)
      ? row.category
      : typeof row.category === 'string'
      ? row.category.split(',').map((s: string) => s.trim()).filter(Boolean)
      : ['General'];

    validRows.push({
      rowNumber,
      itemName,
      price,
      category: categoryList,
    });
  }

  if (mode === 'preview') {
    return sendSuccess(res, {
      totalRows: rows.length,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      validRows,
      invalidRows,
    });
  }

  // Execute Import
  const createdProducts: any[] = [];
  await prisma.$transaction(async (tx) => {
    for (const item of validRows) {
      let product = await tx.product.findFirst({
        where: { organizationId: orgId, itemName: item.itemName },
      });

      if (!product) {
        product = await tx.product.create({
          data: {
            organizationId: orgId,
            itemName: item.itemName,
            price: item.price,
            category: item.category,
            status: ProductStatus.ACTIVE,
          },
        });
      }

      await tx.branchInventory.upsert({
        where: {
          branchId_productId: {
            branchId,
            productId: product.id,
          },
        },
        update: { quantity: 10 },
        create: {
          branchId,
          productId: product.id,
          quantity: 10,
          lowStockThreshold: 10,
        },
      });

      createdProducts.push(product);
    }
  });

  return sendSuccess(res, {
    message: `Successfully imported ${createdProducts.length} items to branch ${branch.name}`,
    importedCount: createdProducts.length,
  });
}

export async function deleteInventoryItem(req: Request, res: Response) {
  const { branchId, productId, id } = req.params;
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  let inventoryRecord = null;

  if (id) {
    inventoryRecord = await prisma.branchInventory.findFirst({
      where: {
        id,
        branch: { organizationId: orgId },
      },
      include: { branch: true, product: true },
    });
  } else if (branchId && productId) {
    inventoryRecord = await prisma.branchInventory.findFirst({
      where: {
        branchId,
        productId,
        branch: { organizationId: orgId },
      },
      include: { branch: true, product: true },
    });
  }

  if (!inventoryRecord) {
    return sendError(res, 404, 'NOT_FOUND', 'Inventory item not found');
  }

  await prisma.branchInventory.delete({
    where: { id: inventoryRecord.id },
  });

  return sendSuccess(res, {
    deleted: true,
    message: `Inventory stock removed for product "${inventoryRecord.product.itemName}" at branch "${inventoryRecord.branch.name}". Catalog product preserved.`,
  });
}

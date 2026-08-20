import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { ProductStatus } from '@prisma/client';

export async function getProducts(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { search, category, status } = req.query as Record<string, string>;

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

  const formatted = products.map((p) => ({
    id: p.id,
    itemName: p.itemName,
    price: p.price,
    category: p.category,
    description: p.description,
    imageUrl: p.imageUrl,
    status: p.status,
    inventory: p.inventoryItems.map((inv) => ({
      branchId: inv.branchId,
      branchName: inv.branch.name,
      quantity: inv.quantity,
      lowStockThreshold: inv.lowStockThreshold,
    })),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

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

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        organizationId: orgId,
        itemName: itemName.trim(),
        price: numPrice,
        category: categoryList,
        description,
        imageUrl,
        status: ProductStatus.ACTIVE,
      },
    });

    // Auto-create inventory record for all active branches in the organization
    const branches = await tx.branch.findMany({ where: { organizationId: orgId } });
    for (const b of branches) {
      await tx.branchInventory.create({
        data: {
          branchId: b.id,
          productId: p.id,
          quantity: Math.max(0, parseInt(initialStock, 10) || 0),
          lowStockThreshold: 10,
        },
      });
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

  const { branchId } = req.query as Record<string, string>;

  const inventory = await prisma.branchInventory.findMany({
    where: {
      branch: {
        organizationId: orgId,
        id: branchId || undefined,
      },
    },
    include: {
      branch: true,
      product: true,
    },
    orderBy: { product: { itemName: 'asc' } },
  });

  const formatted = inventory.map((inv) => ({
    id: inv.id,
    branchId: inv.branchId,
    branchName: inv.branch.name,
    productId: inv.productId,
    itemName: inv.product.itemName,
    price: inv.product.price,
    category: inv.product.category,
    quantity: inv.quantity,
    lowStockThreshold: inv.lowStockThreshold,
    isLowStock: inv.quantity <= inv.lowStockThreshold,
    updatedAt: inv.updatedAt,
  }));

  return sendSuccess(res, formatted);
}

export async function updateInventoryStock(req: Request, res: Response) {
  const { branchId, productId } = req.params;
  const { quantity, lowStockThreshold } = req.body;

  const updated = await prisma.branchInventory.upsert({
    where: {
      branchId_productId: { branchId, productId },
    },
    create: {
      branchId,
      productId,
      quantity: Math.max(0, parseInt(quantity, 10) || 0),
      lowStockThreshold: lowStockThreshold !== undefined ? parseInt(lowStockThreshold, 10) : 10,
    },
    update: {
      ...(quantity !== undefined ? { quantity: Math.max(0, parseInt(quantity, 10)) } : {}),
      ...(lowStockThreshold !== undefined ? { lowStockThreshold: parseInt(lowStockThreshold, 10) } : {}),
    },
  });

  return sendSuccess(res, updated);
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
    return sendError(res, 400, 'VALIDATION_ERROR', 'branchId is required for inventory import');
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'No CSV rows provided');
  }

  const validRows: any[] = [];
  const errors: string[] = [];

  rows.forEach((row: any, idx: number) => {
    const lineNum = idx + 1;
    const name = row.itemName || row.item_name || row.name;
    const price = parseFloat(row.price);
    const cat = row.category || 'General';

    if (!name || !name.trim()) {
      errors.push(`Row ${lineNum}: Missing item name`);
      return;
    }

    if (isNaN(price) || price < 0) {
      errors.push(`Row ${lineNum}: Invalid price for '${name}'`);
      return;
    }

    const categories = typeof cat === 'string'
      ? cat.split(',').map((s) => s.trim()).filter(Boolean)
      : Array.isArray(cat) ? cat : ['General'];

    validRows.push({
      itemName: name.trim(),
      price,
      category: categories,
      initialQuantity: parseInt(row.quantity, 10) || 50,
    });
  });

  if (mode === 'preview') {
    return sendSuccess(res, {
      totalRows: rows.length,
      validRowsCount: validRows.length,
      isValid: errors.length === 0,
      errors,
      preview: validRows.slice(0, 5),
    });
  }

  if (errors.length > 0) {
    return sendError(res, 400, 'CSV_VALIDATION_FAILED', 'CSV validation failed', { errors });
  }

  // Atomic database commit
  const importedCount = await prisma.$transaction(async (tx) => {
    let count = 0;
    for (const r of validRows) {
      // Upsert product
      const product = await tx.product.create({
        data: {
          organizationId: orgId,
          itemName: r.itemName,
          price: r.price,
          category: r.category,
          status: ProductStatus.ACTIVE,
        },
      });

      await tx.branchInventory.upsert({
        where: {
          branchId_productId: { branchId, productId: product.id },
        },
        create: {
          branchId,
          productId: product.id,
          quantity: r.initialQuantity,
          lowStockThreshold: 10,
        },
        update: {
          quantity: { increment: r.initialQuantity },
        },
      });

      count++;
    }
    return count;
  });

  return sendSuccess(res, {
    message: `Successfully imported ${importedCount} items`,
    importedCount,
  });
}

import { Router } from 'express';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getInventory,
  updateInventoryStock,
  getCsvTemplate,
  importInventoryCsv,
} from '../controllers/products.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { PermissionCode } from '@prisma/client';

export const productsRouter = Router();
productsRouter.use(requireAuth);
productsRouter.get('/', requirePermission(PermissionCode.PRODUCT_VIEW), getProducts);
productsRouter.post('/', requirePermission(PermissionCode.PRODUCT_MANAGE), createProduct);
productsRouter.patch('/:id', requirePermission(PermissionCode.PRODUCT_MANAGE), updateProduct);
productsRouter.delete('/:id', requirePermission(PermissionCode.PRODUCT_MANAGE), deleteProduct);

export const inventoryRouter = Router();
inventoryRouter.get('/import/template', getCsvTemplate);

inventoryRouter.use(requireAuth);
inventoryRouter.get('/', requirePermission(PermissionCode.INVENTORY_VIEW), getInventory);
inventoryRouter.patch('/:branchId/:productId', requirePermission(PermissionCode.INVENTORY_MANAGE), updateInventoryStock);
inventoryRouter.patch('/:id', requirePermission(PermissionCode.INVENTORY_MANAGE), updateInventoryStock);
inventoryRouter.post('/import', requirePermission(PermissionCode.INVENTORY_IMPORT), importInventoryCsv);

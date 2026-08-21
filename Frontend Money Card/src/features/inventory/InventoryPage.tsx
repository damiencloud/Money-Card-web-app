// ─── Inventory Page (Re-directed to Unified Products & Inventory Hub) ───────
import { ProductsPage } from '@/features/products/ProductsPage';

export function InventoryPage() {
  return <ProductsPage defaultTab="inventory" />;
}

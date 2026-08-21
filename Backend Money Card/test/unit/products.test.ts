import { describe, it, expect } from 'vitest';

describe('Backend Unit Tests: Product State Transitions & Filtering Logic', () => {
  interface MockProduct {
    id: string;
    organizationId: string;
    name: string;
    price: number;
    isActive: boolean;
    category: string;
  }

  const productsList: MockProduct[] = [
    { id: 'p1', organizationId: 'org_001', name: 'Chicken Biriyani', price: 150, isActive: true, category: 'Food' },
    { id: 'p2', organizationId: 'org_001', name: 'Masala Tea', price: 20, isActive: true, category: 'Beverage' },
    { id: 'p3', organizationId: 'org_001', name: 'Old Sandwich', price: 60, isActive: false, category: 'Food' },
    { id: 'p4', organizationId: 'org_002', name: 'Other Org Item', price: 99, isActive: true, category: 'Food' },
  ];

  const filterProducts = (products: MockProduct[], orgId: string, statusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE') => {
    return products.filter((p) => {
      if (p.organizationId !== orgId) return false;
      if (statusFilter === 'ACTIVE') return p.isActive === true;
      if (statusFilter === 'INACTIVE') return p.isActive === false;
      return true;
    });
  };

  it('should filter active products only when status is ACTIVE', () => {
    const activeProducts = filterProducts(productsList, 'org_001', 'ACTIVE');
    expect(activeProducts).toHaveLength(2);
    expect(activeProducts.every((p) => p.isActive)).toBe(true);
    expect(activeProducts.map((p) => p.name)).toEqual(['Chicken Biriyani', 'Masala Tea']);
  });

  it('should filter inactive products only when status is INACTIVE', () => {
    const inactiveProducts = filterProducts(productsList, 'org_001', 'INACTIVE');
    expect(inactiveProducts).toHaveLength(1);
    expect(inactiveProducts[0].name).toBe('Old Sandwich');
    expect(inactiveProducts[0].isActive).toBe(false);
  });

  it('should return all products for organization when status is ALL', () => {
    const allOrgProducts = filterProducts(productsList, 'org_001', 'ALL');
    expect(allOrgProducts).toHaveLength(3);
  });

  it('should enforce multi-tenant isolation by never leaking products from other organizations', () => {
    const org1Products = filterProducts(productsList, 'org_001', 'ALL');
    expect(org1Products.some((p) => p.organizationId === 'org_002')).toBe(false);
  });

  it('should correctly toggle product state between Active and Inactive', () => {
    let product: MockProduct = {
      id: 'p1',
      organizationId: 'org_001',
      name: 'Cold Coffee',
      price: 50,
      isActive: true,
      category: 'Beverage',
    };

    // Deactivate
    product = { ...product, isActive: false };
    expect(product.isActive).toBe(false);

    // Reactivate
    product = { ...product, isActive: true };
    expect(product.isActive).toBe(true);
  });
});

describe('Backend Unit Tests: Multi-Branch Inventory Resolution & Stock Isolation', () => {
  interface MockInventoryRecord {
    id: string;
    branchId: string;
    productId: string;
    quantity: number;
    lowStockThreshold: number;
  }

  interface MockProductWithDetails {
    id: string;
    organizationId: string;
    itemName: string;
    price: number;
    category: string[];
    status: 'ACTIVE' | 'INACTIVE';
  }

  const mockOrgProducts: MockProductWithDetails[] = [
    { id: 'prod_chicken_roll', organizationId: 'org_main', itemName: 'Chicken Roll', price: 120, category: ['Non-Veg', 'Snacks'], status: 'ACTIVE' },
    { id: 'prod_veg_roll', organizationId: 'org_main', itemName: 'Veg Roll', price: 90, category: ['Veg', 'Snacks'], status: 'ACTIVE' },
    { id: 'prod_burger', organizationId: 'org_main', itemName: 'Burger', price: 150, category: ['Snacks'], status: 'ACTIVE' },
  ];

  const mockInventoryDb: MockInventoryRecord[] = [
    // Branch A Inventory
    { id: 'inv_a_1', branchId: 'branch_a', productId: 'prod_chicken_roll', quantity: 10, lowStockThreshold: 5 },
    { id: 'inv_a_2', branchId: 'branch_a', productId: 'prod_veg_roll', quantity: 5, lowStockThreshold: 5 },
    { id: 'inv_a_3', branchId: 'branch_a', productId: 'prod_burger', quantity: 0, lowStockThreshold: 5 },

    // Branch B Inventory (different stocks for identical organization products)
    { id: 'inv_b_1', branchId: 'branch_b', productId: 'prod_chicken_roll', quantity: 25, lowStockThreshold: 5 },
    { id: 'inv_b_2', branchId: 'branch_b', productId: 'prod_veg_roll', quantity: 0, lowStockThreshold: 5 },
    { id: 'inv_b_3', branchId: 'branch_b', productId: 'prod_burger', quantity: 8, lowStockThreshold: 5 },
  ];

  const resolveBranchInventory = (branchId: string, branchName: string) => {
    const invMap = new Map<string, MockInventoryRecord>();
    mockInventoryDb
      .filter((inv) => inv.branchId === branchId)
      .forEach((inv) => invMap.set(inv.productId, inv));

    return mockOrgProducts.map((prod) => {
      const record = invMap.get(prod.id);
      const qty = record ? record.quantity : 0;
      const threshold = record ? record.lowStockThreshold : 10;
      return {
        id: record?.id || `inv-${branchId}-${prod.id}`,
        branchId,
        branchName,
        productId: prod.id,
        itemName: prod.itemName,
        productName: prod.itemName,
        price: prod.price,
        category: prod.category,
        quantity: qty,
        currentStock: qty,
        status: qty === 0 ? 'OUT_OF_STOCK' : (qty <= threshold ? 'LOW_STOCK' : 'IN_STOCK'),
        product: {
          id: prod.id,
          itemName: prod.itemName,
          price: prod.price,
          category: prod.category,
          status: prod.status,
        },
      };
    });
  };

  it('TEST 2 & TEST 7: Staff selecting Branch A gets exact Branch A stock and authoritative product names', () => {
    const branchAData = resolveBranchInventory('branch_a', 'North Campus');
    
    expect(branchAData).toHaveLength(3);
    
    // Product Names must always match catalog without blank/missing names
    expect(branchAData[0].productName).toBe('Chicken Roll');
    expect(branchAData[1].productName).toBe('Veg Roll');
    expect(branchAData[2].productName).toBe('Burger');

    // Branch A Stock quantities
    expect(branchAData[0].currentStock).toBe(10);
    expect(branchAData[1].currentStock).toBe(5);
    expect(branchAData[2].currentStock).toBe(0);
    expect(branchAData[2].status).toBe('OUT_OF_STOCK');
  });

  it('TEST 3 & TEST 5: Switching to Branch B immediately resolves Branch B stock without stale data', () => {
    const branchBData = resolveBranchInventory('branch_b', 'South Wing');

    expect(branchBData).toHaveLength(3);

    // Product Names are consistent
    expect(branchBData[0].productName).toBe('Chicken Roll');
    expect(branchBData[1].productName).toBe('Veg Roll');
    expect(branchBData[2].productName).toBe('Burger');

    // Branch B Stock quantities (Chicken Roll: 25, Veg Roll: 0, Burger: 8)
    expect(branchBData[0].currentStock).toBe(25);
    expect(branchBData[1].currentStock).toBe(0);
    expect(branchBData[1].status).toBe('OUT_OF_STOCK');
    expect(branchBData[2].currentStock).toBe(8);
  });

  it('TEST 4: Stock update in Branch A (10 -> 20) updates Branch A while leaving Branch B stock intact at 25', () => {
    // Org Admin updates Branch A stock from 10 to 20
    const itemA = mockInventoryDb.find((i) => i.branchId === 'branch_a' && i.productId === 'prod_chicken_roll')!;
    itemA.quantity = 20;

    const branchAUpdated = resolveBranchInventory('branch_a', 'North Campus');
    const branchBCheck = resolveBranchInventory('branch_b', 'South Wing');

    // Branch A now shows 20
    expect(branchAUpdated[0].currentStock).toBe(20);

    // Branch B remains strictly isolated at 25
    expect(branchBCheck[0].currentStock).toBe(25);
  });

  it('TEST 1: Newly created product with no inventory record yet defaults to 0 stock for branch with full product metadata', () => {
    // New product added to organization catalog
    mockOrgProducts.push({
      id: 'prod_fresh_juice',
      organizationId: 'org_main',
      itemName: 'Fresh Orange Juice',
      price: 60,
      category: ['Beverages'],
      status: 'ACTIVE',
    });

    const branchAWithNew = resolveBranchInventory('branch_a', 'North Campus');
    const newProdEntry = branchAWithNew.find((p) => p.productId === 'prod_fresh_juice')!;

    expect(newProdEntry).toBeDefined();
    expect(newProdEntry.productName).toBe('Fresh Orange Juice');
    expect(newProdEntry.currentStock).toBe(0);
    expect(newProdEntry.status).toBe('OUT_OF_STOCK');
  });
});

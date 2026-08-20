import { describe, it, expect } from 'vitest';

describe('Frontend Unit Tests: Product Active/Inactive Filter & Search Logic', () => {
  const products = [
    { id: 'p1', name: 'Chicken Biriyani', category: 'Food', price: 150, isActive: true },
    { id: 'p2', name: 'Mutton Biriyani', category: 'Food', price: 250, isActive: false },
    { id: 'p3', name: 'Masala Chai', category: 'Beverage', price: 20, isActive: true },
    { id: 'p4', name: 'Cold Coffee', category: 'Beverage', price: 60, isActive: false },
  ];

  const applyProductFilters = (
    list: typeof products,
    statusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE',
    searchQuery: string = '',
    categoryFilter: string = 'ALL'
  ) => {
    return list.filter((item) => {
      // 1. Status Filter
      if (statusFilter === 'ACTIVE' && !item.isActive) return false;
      if (statusFilter === 'INACTIVE' && item.isActive) return false;

      // 2. Category Filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;

      // 3. Search Query
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCategory = item.category.toLowerCase().includes(query);
        if (!matchesName && !matchesCategory) return false;
      }

      return true;
    });
  };

  it('should filter only active products on the ACTIVE tab', () => {
    const result = applyProductFilters(products, 'ACTIVE');
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.name)).toEqual(['Chicken Biriyani', 'Masala Chai']);
  });

  it('should filter only inactive products on the INACTIVE tab', () => {
    const result = applyProductFilters(products, 'INACTIVE');
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.name)).toEqual(['Mutton Biriyani', 'Cold Coffee']);
  });

  it('should return all products on the ALL tab', () => {
    const result = applyProductFilters(products, 'ALL');
    expect(result).toHaveLength(4);
  });

  it('should combine status filter with search query', () => {
    const result = applyProductFilters(products, 'ACTIVE', 'Biriyani');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Chicken Biriyani');
  });

  it('should combine status filter with category filter', () => {
    const result = applyProductFilters(products, 'INACTIVE', '', 'Beverage');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Cold Coffee');
  });
});

import { describe, it, expect } from 'vitest';
import { filterCards } from '../features/cards/cardsFilter';
import type { Card as CardEntity } from '@/types';

describe('Frontend Unit Tests: Org Admin Cards Filter & Search Functionality', () => {
  const sampleCards: CardEntity[] = [
    {
      id: 'card-1',
      organizationId: 'org-1',
      physicalCardNumber: 'MC 101',
      qrToken: 'qr_token_101',
      status: 'AVAILABLE',
      assignmentStatus: 'ASSIGNED',
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'card-2',
      organizationId: 'org-1',
      physicalCardNumber: 'MC 102',
      qrToken: 'qr_token_102',
      status: 'ACTIVE',
      assignmentStatus: 'ASSIGNED',
      currentBranchId: 'branch-north',
      activeSession: {
        id: 'sess-1',
        branchId: 'branch-north',
        sessionCardNumber: 'MC 102_1',
        customerName: 'Alice Smith',
        customerPhone: '9876543210',
        balance: 450,
        issuedAt: '2026-09-02T08:00:00Z',
      },
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'card-3',
      organizationId: 'org-1',
      physicalCardNumber: 'MC 105',
      qrToken: 'qr_token_105',
      status: 'BLOCKED',
      assignmentStatus: 'ASSIGNED',
      blockedReason: 'Customer reported lost',
      currentBranchId: 'branch-south',
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'card-4',
      organizationId: 'org-1',
      physicalCardNumber: 'MC 105_ACT',
      qrToken: 'qr_token_105_act',
      status: 'ACTIVE',
      assignmentStatus: 'ASSIGNED',
      currentBranchId: 'branch-north',
      activeSession: {
        id: 'sess-2',
        branchId: 'branch-north',
        sessionCardNumber: 'MC 105_ACT_1',
        customerName: 'Bob Jones',
        customerPhone: '9123456789',
        balance: 100,
        issuedAt: '2026-09-02T09:00:00Z',
      },
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'card-5',
      organizationId: 'org-1',
      physicalCardNumber: undefined,
      qrToken: 'qr_raw_batch_001',
      status: 'AVAILABLE',
      assignmentStatus: 'UNASSIGNED',
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    },
  ];

  // ─── 1. Basic Status Filtering ─────────────────────────────────────
  it('should return all cards when statusFilter is "ALL"', () => {
    const result = filterCards(sampleCards, { statusFilter: 'ALL' });
    expect(result).toHaveLength(5);
  });

  it('should return only ACTIVE cards when statusFilter is "ACTIVE"', () => {
    const result = filterCards(sampleCards, { statusFilter: 'ACTIVE' });
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.status === 'ACTIVE')).toBe(true);
    expect(result.map((c) => c.physicalCardNumber)).toEqual(['MC 102', 'MC 105_ACT']);
  });

  it('should return only BLOCKED cards when statusFilter is "BLOCKED"', () => {
    const result = filterCards(sampleCards, { statusFilter: 'BLOCKED' });
    expect(result).toHaveLength(1);
    expect(result[0].physicalCardNumber).toBe('MC 105');
    expect(result[0].status).toBe('BLOCKED');
  });

  it('should return only AVAILABLE cards when statusFilter is "AVAILABLE"', () => {
    const result = filterCards(sampleCards, { statusFilter: 'AVAILABLE' });
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.status === 'AVAILABLE')).toBe(true);
    expect(result.map((c) => c.id)).toEqual(['card-1', 'card-5']);
  });

  it('should return non-active cards when statusFilter is "INACTIVE" alias', () => {
    const result = filterCards(sampleCards, { statusFilter: 'INACTIVE' });
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.status === 'AVAILABLE')).toBe(true);
  });

  // ─── 2. Assignment Status Filtering ────────────────────────────────
  it('should return only ASSIGNED cards when assignmentFilter is "ASSIGNED"', () => {
    const result = filterCards(sampleCards, { assignmentFilter: 'ASSIGNED' });
    expect(result).toHaveLength(4);
    expect(result.every((c) => !!c.physicalCardNumber)).toBe(true);
  });

  it('should return only UNASSIGNED cards when assignmentFilter is "UNASSIGNED"', () => {
    const result = filterCards(sampleCards, { assignmentFilter: 'UNASSIGNED' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('card-5');
  });

  // ─── 3. Branch Filtering ───────────────────────────────────────────
  it('should filter cards by branchId', () => {
    const northCards = filterCards(sampleCards, { branchFilter: 'branch-north' });
    expect(northCards).toHaveLength(2);
    expect(northCards.map((c) => c.id)).toEqual(['card-2', 'card-4']);

    const southCards = filterCards(sampleCards, { branchFilter: 'branch-south' });
    expect(southCards).toHaveLength(1);
    expect(southCards[0].id).toBe('card-3');
  });

  // ─── 4. Search Functionality ───────────────────────────────────────
  it('should search by physical card number', () => {
    const result = filterCards(sampleCards, { searchQuery: 'MC 102' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('card-2');
  });

  it('should search by QR token', () => {
    const result = filterCards(sampleCards, { searchQuery: 'qr_raw_batch' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('card-5');
  });

  it('should search by active session customer name', () => {
    const result = filterCards(sampleCards, { searchQuery: 'Alice' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('card-2');
  });

  it('should search by customer phone number', () => {
    const result = filterCards(sampleCards, { searchQuery: '9123456789' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('card-4');
  });

  // ─── 5. Combination of Filter + Search ─────────────────────────────
  it('should combine Status = Active + Search = "MC 105" to return only matching Active cards', () => {
    // There is an Active "MC 105_ACT" and a Blocked "MC 105"
    const result = filterCards(sampleCards, {
      statusFilter: 'ACTIVE',
      searchQuery: 'MC 105',
    });
    expect(result).toHaveLength(1);
    expect(result[0].physicalCardNumber).toBe('MC 105_ACT');
    expect(result[0].status).toBe('ACTIVE');
  });

  it('should combine Status = Blocked + Search = "MC 105" to return only matching Blocked cards', () => {
    const result = filterCards(sampleCards, {
      statusFilter: 'BLOCKED',
      searchQuery: 'MC 105',
    });
    expect(result).toHaveLength(1);
    expect(result[0].physicalCardNumber).toBe('MC 105');
    expect(result[0].status).toBe('BLOCKED');
  });

  it('should preserve selected filter when search is empty', () => {
    const result = filterCards(sampleCards, {
      statusFilter: 'BLOCKED',
      searchQuery: '',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('card-3');
  });

  it('should preserve search results when filter is "ALL"', () => {
    const result = filterCards(sampleCards, {
      statusFilter: 'ALL',
      searchQuery: '105',
    });
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.physicalCardNumber)).toEqual(['MC 105', 'MC 105_ACT']);
  });

  // ─── 6. Clear Filters / Reset ──────────────────────────────────────
  it('should return all 5 cards when clearing all filters and search', () => {
    const initialFiltered = filterCards(sampleCards, {
      statusFilter: 'BLOCKED',
      searchQuery: '105',
    });
    expect(initialFiltered).toHaveLength(1);

    // Reset all
    const cleared = filterCards(sampleCards, {
      statusFilter: 'ALL',
      assignmentFilter: 'ALL',
      branchFilter: 'ALL',
      searchQuery: '',
    });
    expect(cleared).toHaveLength(5);
  });

  // ─── 7. Normalization & Edge Cases ─────────────────────────────────
  it('should normalize lowercase and mixed-case status values', () => {
    const lowerResult = filterCards(sampleCards, {
      statusFilter: 'active' as any,
    });
    expect(lowerResult).toHaveLength(2);

    const blockedLower = filterCards(sampleCards, {
      statusFilter: 'blocked' as any,
    });
    expect(blockedLower).toHaveLength(1);
  });

  it('should return empty array when no cards match criteria', () => {
    const result = filterCards(sampleCards, {
      statusFilter: 'BLOCKED',
      searchQuery: 'NonExistent999',
    });
    expect(result).toHaveLength(0);
  });
});

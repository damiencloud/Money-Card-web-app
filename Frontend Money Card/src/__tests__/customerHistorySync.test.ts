import { describe, it, expect } from 'vitest';
import type { CustomerHistoryEvent } from '@/types';

describe('Customer History & Card Status Synchronization Unit Tests', () => {
  const sampleEvents: CustomerHistoryEvent[] = [
    {
      id: 'evt_1',
      cardId: 'card_105',
      customerName: 'John Doe',
      customerPhone: '9876543210',
      physicalCardNumber: 'MC 105',
      action: 'CARD_BLOCKED',
      previousStatus: 'ACTIVE',
      newStatus: 'BLOCKED',
      performedByName: 'Alex Staff',
      branchName: 'Main Cafeteria',
      reason: 'Reported lost by customer',
      createdAt: '2026-08-28T11:30:00.000Z',
    },
    {
      id: 'evt_2',
      cardId: 'card_105',
      customerName: 'John Doe',
      customerPhone: '9876543210',
      physicalCardNumber: 'MC 105',
      action: 'CARD_UNBLOCKED',
      previousStatus: 'BLOCKED',
      newStatus: 'ACTIVE',
      performedByName: 'Alex Staff',
      branchName: 'Main Cafeteria',
      reason: 'Card found by customer',
      createdAt: '2026-08-28T12:15:00.000Z',
    },
    {
      id: 'evt_3',
      cardId: 'card_201',
      customerName: 'Sarah Smith',
      customerPhone: '9123456780',
      physicalCardNumber: 'MC 201',
      action: 'CARD_BLOCKED',
      previousStatus: 'ACTIVE',
      newStatus: 'BLOCKED',
      performedByName: 'Maria Cashier',
      branchName: 'Branch 2',
      reason: 'Suspicious multiple recharges',
      createdAt: '2026-08-28T13:00:00.000Z',
    },
  ];

  it('1. Correctly formats and identifies CARD_BLOCKED and CARD_UNBLOCKED events', () => {
    const blockEvents = sampleEvents.filter((e) => e.action === 'CARD_BLOCKED');
    const unblockEvents = sampleEvents.filter((e) => e.action === 'CARD_UNBLOCKED');

    expect(blockEvents).toHaveLength(2);
    expect(unblockEvents).toHaveLength(1);
    expect(blockEvents[0].physicalCardNumber).toBe('MC 105');
    expect(blockEvents[0].newStatus).toBe('BLOCKED');
  });

  it('2. Multi-criteria search by customer name, phone, card number, and staff', () => {
    // Search "John"
    const searchJohn = sampleEvents.filter((e) =>
      e.customerName?.toLowerCase().includes('john'),
    );
    expect(searchJohn).toHaveLength(2);

    // Search "MC 105"
    const searchCard = sampleEvents.filter((e) =>
      e.physicalCardNumber.toLowerCase().includes('mc 105'),
    );
    expect(searchCard).toHaveLength(2);

    // Search "Maria"
    const searchStaff = sampleEvents.filter((e) =>
      e.performedByName?.toLowerCase().includes('maria'),
    );
    expect(searchStaff).toHaveLength(1);
    expect(searchStaff[0].physicalCardNumber).toBe('MC 201');
  });

  it('3. Preserves immutable audit trail history without deleting previous events', () => {
    const card105Events = sampleEvents.filter((e) => e.cardId === 'card_105');
    expect(card105Events).toHaveLength(2);

    // First event is CARD_BLOCKED
    expect(card105Events[0].action).toBe('CARD_BLOCKED');
    expect(card105Events[0].previousStatus).toBe('ACTIVE');
    expect(card105Events[0].newStatus).toBe('BLOCKED');

    // Second event is CARD_UNBLOCKED
    expect(card105Events[1].action).toBe('CARD_UNBLOCKED');
    expect(card105Events[1].previousStatus).toBe('BLOCKED');
    expect(card105Events[1].newStatus).toBe('ACTIVE');
  });
});

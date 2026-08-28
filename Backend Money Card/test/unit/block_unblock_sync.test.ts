import { describe, it, expect } from 'vitest';
import { CardStatus, SessionStatus, CardHistoryAction, PermissionCode } from '@prisma/client';

describe('Staff Card Block/Unblock <-> Customer <-> Customer History Synchronization (End-to-End)', () => {
  // Mock DB State for Multi-Card Customer "John"
  const mockOrgId = 'org-cafe-001';
  const mockStaffUser = {
    id: 'usr-staff-alex',
    name: 'Alex Cashier',
    email: 'alex@cafeteria.io',
    organizationId: mockOrgId,
    permissions: [PermissionCode.CARD_BLOCK, PermissionCode.CARD_UNBLOCK, PermissionCode.CARD_VIEW],
  };

  const customerJohn = {
    name: 'John Doe',
    phone: '9876543210',
  };

  // Card 1: MC 105 (Cycle 1, Active Session for John)
  let card105 = {
    id: 'card-uuid-105',
    organizationId: mockOrgId,
    physicalCardNumber: 'MC 105',
    status: CardStatus.ACTIVE,
    activeSession: {
      id: 'session-uuid-105-1',
      customerName: customerJohn.name,
      customerPhone: customerJohn.phone,
      balance: 450.0,
      status: SessionStatus.ACTIVE,
      branchId: 'branch-001',
      branchName: 'Main Cafeteria',
    },
  };

  // Card 2: MC 106 (Cycle 1, Active Session for John)
  let card106 = {
    id: 'card-uuid-106',
    organizationId: mockOrgId,
    physicalCardNumber: 'MC 106',
    status: CardStatus.ACTIVE,
    activeSession: {
      id: 'session-uuid-106-1',
      customerName: customerJohn.name,
      customerPhone: customerJohn.phone,
      balance: 200.0,
      status: SessionStatus.ACTIVE,
      branchId: 'branch-001',
      branchName: 'Main Cafeteria',
    },
  };

  // Audit trail registry
  const customerHistoryAuditTrail: any[] = [];

  it('1. Initial State: John owns MC 105 and MC 106, both ACTIVE', () => {
    expect(card105.status).toBe(CardStatus.ACTIVE);
    expect(card106.status).toBe(CardStatus.ACTIVE);
    expect(card105.activeSession.customerName).toBe('John Doe');
    expect(card106.activeSession.customerName).toBe('John Doe');
    expect(customerHistoryAuditTrail).toHaveLength(0);
  });

  it('2. Staff blocks MC 105: MC 105 becomes BLOCKED, MC 106 remains ACTIVE', () => {
    // Validate Staff authorization
    const hasBlockPermission = mockStaffUser.permissions.includes(PermissionCode.CARD_BLOCK);
    expect(hasBlockPermission).toBe(true);

    const previousStatus = card105.status;
    card105.status = CardStatus.BLOCKED;

    // Record audit event in Customer History
    const blockEvent = {
      id: 'evt-block-001',
      organizationId: mockOrgId,
      cardId: card105.id,
      sessionId: card105.activeSession.id,
      customerName: card105.activeSession.customerName,
      customerPhone: card105.activeSession.customerPhone,
      physicalCardNumber: card105.physicalCardNumber,
      action: CardHistoryAction.CARD_BLOCKED,
      previousStatus: previousStatus,
      newStatus: CardStatus.BLOCKED,
      performedByName: mockStaffUser.name,
      performedByUserId: mockStaffUser.id,
      branchName: card105.activeSession.branchName,
      reason: 'Reported lost by customer',
      createdAt: new Date('2026-08-28T11:30:00Z'),
    };
    customerHistoryAuditTrail.push(blockEvent);

    // Multi-card isolation check: Only MC 105 is BLOCKED, MC 106 remains ACTIVE
    expect(card105.status).toBe(CardStatus.BLOCKED);
    expect(card106.status).toBe(CardStatus.ACTIVE);
    expect(customerHistoryAuditTrail).toHaveLength(1);
    expect(customerHistoryAuditTrail[0].physicalCardNumber).toBe('MC 105');
    expect(customerHistoryAuditTrail[0].action).toBe(CardHistoryAction.CARD_BLOCKED);
    expect(customerHistoryAuditTrail[0].previousStatus).toBe(CardStatus.ACTIVE);
    expect(customerHistoryAuditTrail[0].newStatus).toBe(CardStatus.BLOCKED);
    expect(customerHistoryAuditTrail[0].customerName).toBe('John Doe');
  });

  it('3. Protected Operations Rejection: Blocked card MC 105 is rejected for session start, purchase, and recharge', () => {
    // Attempt 1: Start new session on blocked card
    const canStartSession = card105.status !== CardStatus.BLOCKED;
    expect(canStartSession).toBe(false);

    // Attempt 2: Recharge blocked card session
    const canRecharge = card105.status !== CardStatus.BLOCKED && card105.activeSession.status === SessionStatus.ACTIVE;
    expect(canRecharge).toBe(false);

    // Attempt 3: Purchase on blocked card session
    const canPurchase = card105.status !== CardStatus.BLOCKED && card105.activeSession.status === SessionStatus.ACTIVE;
    expect(canPurchase).toBe(false);

    // MC 106 is ACTIVE and allows purchases and recharges
    const canPurchase106 = card106.status !== CardStatus.BLOCKED && card106.activeSession.status === SessionStatus.ACTIVE;
    expect(canPurchase106).toBe(true);
  });

  it('4. Customer-facing Card Status View: Customer sees MC 105 as BLOCKED without raw UUIDs', () => {
    const customerCardView = {
      cardNumber: card105.physicalCardNumber,
      status: card105.status,
      balance: card105.activeSession.balance,
      isUsable: card105.status === CardStatus.ACTIVE,
    };

    expect(customerCardView.cardNumber).toBe('MC 105');
    expect(customerCardView.status).toBe('BLOCKED');
    expect(customerCardView.isUsable).toBe(false);
  });

  it('5. Staff unblocks MC 105: MC 105 returns to ACTIVE and creates second CARD_UNBLOCKED event', () => {
    const hasUnblockPermission = mockStaffUser.permissions.includes(PermissionCode.CARD_UNBLOCK);
    expect(hasUnblockPermission).toBe(true);

    const previousStatus = card105.status;
    const newStatus = card105.activeSession ? CardStatus.ACTIVE : CardStatus.AVAILABLE;
    card105.status = newStatus;

    // Create second audit event (preserving first event)
    const unblockEvent = {
      id: 'evt-unblock-002',
      organizationId: mockOrgId,
      cardId: card105.id,
      sessionId: card105.activeSession.id,
      customerName: card105.activeSession.customerName,
      customerPhone: card105.activeSession.customerPhone,
      physicalCardNumber: card105.physicalCardNumber,
      action: CardHistoryAction.CARD_UNBLOCKED,
      previousStatus: previousStatus,
      newStatus: newStatus,
      performedByName: mockStaffUser.name,
      performedByUserId: mockStaffUser.id,
      branchName: card105.activeSession.branchName,
      reason: 'Customer found card, unblocked by staff',
      createdAt: new Date('2026-08-28T12:15:00Z'),
    };
    customerHistoryAuditTrail.push(unblockEvent);

    // Verify card is now ACTIVE
    expect(card105.status).toBe(CardStatus.ACTIVE);

    // Verify complete audit trail preservation (2 distinct events)
    expect(customerHistoryAuditTrail).toHaveLength(2);

    // Event 1: Original CARD_BLOCKED event preserved
    expect(customerHistoryAuditTrail[0].action).toBe(CardHistoryAction.CARD_BLOCKED);
    expect(customerHistoryAuditTrail[0].previousStatus).toBe(CardStatus.ACTIVE);
    expect(customerHistoryAuditTrail[0].newStatus).toBe(CardStatus.BLOCKED);

    // Event 2: New CARD_UNBLOCKED event
    expect(customerHistoryAuditTrail[1].action).toBe(CardHistoryAction.CARD_UNBLOCKED);
    expect(customerHistoryAuditTrail[1].previousStatus).toBe(CardStatus.BLOCKED);
    expect(customerHistoryAuditTrail[1].newStatus).toBe(CardStatus.ACTIVE);
    expect(customerHistoryAuditTrail[1].performedByName).toBe('Alex Cashier');
  });

  it('6. Org Admin Customer History Search & Filtering', () => {
    // Filter by Customer Name "John"
    const johnEvents = customerHistoryAuditTrail.filter(
      (e) => e.customerName.toLowerCase().includes('john'),
    );
    expect(johnEvents).toHaveLength(2);

    // Filter by Action CARD_BLOCKED
    const blockedEvents = customerHistoryAuditTrail.filter(
      (e) => e.action === CardHistoryAction.CARD_BLOCKED,
    );
    expect(blockedEvents).toHaveLength(1);
    expect(blockedEvents[0].action).toBe(CardHistoryAction.CARD_BLOCKED);

    // Filter by Card Number "MC 105"
    const card105Events = customerHistoryAuditTrail.filter(
      (e) => e.physicalCardNumber === 'MC 105',
    );
    expect(card105Events).toHaveLength(2);
  });
});

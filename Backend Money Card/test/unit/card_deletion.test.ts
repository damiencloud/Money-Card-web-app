import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/database.js';
import { CardStatus, CardAssignmentStatus, CardHistoryAction, SessionStatus } from '@prisma/client';

describe('Card Deletion and Customer History Preservation', () => {
  const testOrgId = 'org-deletion-test-' + Date.now();
  let testCardId: string;
  const testCardNum = 'DEL-TEST-001';

  beforeAll(async () => {
    // Create test organization
    await prisma.organization.create({
      data: {
        id: testOrgId,
        name: 'Deletion Test Org',
      },
    });

    // Create test card
    const card = await prisma.card.create({
      data: {
        organizationId: testOrgId,
        physicalCardNumber: testCardNum,
        qrToken: 'qtk_deltest_' + Date.now(),
        assignmentStatus: CardAssignmentStatus.ASSIGNED,
        status: CardStatus.AVAILABLE,
      },
    });
    testCardId = card.id;

    // Create a history event (e.g. CARD_BLOCKED)
    await prisma.customerHistoryEvent.create({
      data: {
        organizationId: testOrgId,
        cardId: testCardId,
        physicalCardNumber: testCardNum,
        action: CardHistoryAction.CARD_BLOCKED,
        previousStatus: CardStatus.AVAILABLE,
        newStatus: CardStatus.BLOCKED,
        performedByName: 'Admin Tester',
        reason: 'Testing block before delete',
      },
    });
  });

  afterAll(async () => {
    // Clean up test org data
    await prisma.customerHistoryEvent.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.cardSession.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.card.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
  });

  it('should preserve past customer history events when card is deleted', async () => {
    // 1. Verify history event exists before deletion
    const eventsBefore = await prisma.customerHistoryEvent.findMany({
      where: { organizationId: testOrgId, physicalCardNumber: testCardNum },
    });
    expect(eventsBefore.length).toBe(1);
    expect(eventsBefore[0].cardId).toBe(testCardId);

    // 2. Record CARD_DELETED event and delete card
    await prisma.$transaction(async (tx) => {
      await tx.customerHistoryEvent.create({
        data: {
          organizationId: testOrgId,
          cardId: null,
          physicalCardNumber: testCardNum,
          action: CardHistoryAction.CARD_DELETED,
          previousStatus: CardStatus.AVAILABLE,
          newStatus: CardStatus.AVAILABLE,
          performedByName: 'Admin Tester',
          reason: 'Card permanently deleted by administrator',
        },
      });
      await tx.card.delete({ where: { id: testCardId } });
    });

    // 3. Verify card is deleted
    const deletedCard = await prisma.card.findUnique({ where: { id: testCardId } });
    expect(deletedCard).toBeNull();

    // 4. Verify all customer history events are preserved!
    const eventsAfter = await prisma.customerHistoryEvent.findMany({
      where: { organizationId: testOrgId, physicalCardNumber: testCardNum },
      orderBy: { createdAt: 'asc' },
    });

    // Both previous CARD_BLOCKED and new CARD_DELETED events must exist
    expect(eventsAfter.length).toBe(2);
    expect(eventsAfter[0].action).toBe(CardHistoryAction.CARD_BLOCKED);
    expect(eventsAfter[0].cardId).toBeNull(); // Foreign key ON DELETE SET NULL worked!
    expect(eventsAfter[0].physicalCardNumber).toBe(testCardNum);

    expect(eventsAfter[1].action).toBe(CardHistoryAction.CARD_DELETED);
    expect(eventsAfter[1].cardId).toBeNull();
    expect(eventsAfter[1].physicalCardNumber).toBe(testCardNum);
  });
});

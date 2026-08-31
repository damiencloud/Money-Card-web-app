import { mockStore } from '../store';
import { mockDelay, createMockSuccess, createMockError } from '../utils';
import { mockAuthHandlers } from './auth';
import type {
  ApiResult,
  Card,
  PaginationParams,
  PaginatedData,
  CreateCardRequest,
  ResolveQrResponseData,
  ImportCardsRequest,
  ImportCardsResponseData,
  CustomerHistoryEvent,
  ImportQrCodesRequest,
  ImportQrCodesResponseData,
  AssignCardNumberRequest,
  BulkAssignCardNumbersRequest,
  BulkAssignCardNumbersResponseData,
} from '@/types';

export const mockCardsHandlers = {
  async deleteCard(id: string): Promise<ApiResult<any>> {
    await mockDelay();
    const card = mockStore.cards.find((c) => c.id === id);
    if (!card) return createMockError('NOT_FOUND', 'Card not found');
    mockStore.cards = mockStore.cards.filter((c) => c.id !== id);
    return createMockSuccess({ deleted: true, message: 'Card permanently deleted.' });
  },

  // GET /api/v1/cards
  async getCards(params?: PaginationParams): Promise<ApiResult<PaginatedData<Card>>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const orgId = currentUser.organizationId || 'org_001';
    let cards = mockStore.cards.filter((c) => c.organizationId === orgId);

    if ((currentUser as any).branchId && currentUser.role === 'STAFF') {
      cards = cards.filter(
        (c) =>
          !c.currentBranchId ||
          c.currentBranchId === (currentUser as any).branchId ||
          (c.physicalCardNumber || '').toLowerCase().includes('global'),
      );
    }

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const total = cards.length;
    const items = cards.slice((page - 1) * limit, page * limit);

    return createMockSuccess({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  },

  // GET /api/v1/cards/:id
  async getCardById(id: string): Promise<ApiResult<Card>> {
    await mockDelay();
    const card = mockStore.cards.find((c) => c.id === id);
    if (!card) {
      return createMockError('CARD_NOT_FOUND', `Card with ID '${id}' was not found`);
    }
    return createMockSuccess(card);
  },

  // POST /api/v1/cards (Create single card)
  async createCard(req: CreateCardRequest): Promise<ApiResult<Card>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const orgId = currentUser.organizationId || 'org_001';

    // Duplicate checks
    if (req.physicalCardNumber) {
      const existingNum = mockStore.cards.find(
        (c) =>
          c.organizationId === orgId &&
          c.physicalCardNumber &&
          c.physicalCardNumber.toLowerCase() === req.physicalCardNumber!.toLowerCase(),
      );
      if (existingNum) {
        return createMockError(
          'VALIDATION_ERROR',
          `Card with number '${req.physicalCardNumber}' already exists in this organization`,
        );
      }
    }

    // Subscription Limit Check
    const subscription = mockStore.subscriptions.find((s) => s.organizationId === orgId);
    if (subscription) {
      const plan = mockStore.plans.find((p) => p.id === subscription.planId);
      if (plan) {
        const effectiveCardLimit = subscription.overrides?.cardLimit ?? plan.cardLimit;
        const currentCount = mockStore.cards.filter((c) => c.organizationId === orgId).length;
        if (currentCount >= effectiveCardLimit) {
          return createMockError(
            'PLAN_LIMIT_REACHED',
            `Card limit of ${effectiveCardLimit} reached for your active subscription`,
          );
        }
      }
    }

    const numClean = req.physicalCardNumber
      ? req.physicalCardNumber.toLowerCase().replace(/[^a-z0-9]/g, '')
      : 'card';
    const randomQrToken = `qr_token_${numClean}_${Math.random().toString(36).substring(2, 8)}`;

    const newCard: Card = {
      id: mockStore.generateId('card'),
      organizationId: orgId,
      physicalCardNumber: req.physicalCardNumber || null,
      qrToken: randomQrToken,
      status: 'AVAILABLE',
      currentBranchId: req.branchId || null,
      createdAt: mockStore.getTimestamp(),
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.cards.push(newCard);
    return createMockSuccess(newCard);
  },

  // POST /api/v1/cards/import-qr (Bulk Import QR Codes)
  async importQrCodes(req: ImportQrCodesRequest): Promise<ApiResult<ImportQrCodesResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    let targetEntries: { qrCode: string; cardNumber?: string }[] = [];
    if (req.qrCodes && req.qrCodes.length > 0) {
      targetEntries = req.qrCodes.map((q: string) => ({ qrCode: q.trim() }));
    } else if (req.mappings && req.mappings.length > 0) {
      targetEntries = req.mappings.map((m: any) => ({
        qrCode: m.qrCode.trim(),
        cardNumber: m.cardNumber ? m.cardNumber.trim().toUpperCase() : undefined,
      }));
    } else if ((req.cards || []) && (req.cards || []).length > 0) {
      targetEntries = (req.cards || []).map((c: any) => ({
        qrCode: (c.qrCode || '').trim(),
        cardNumber: c.cardNumber ? c.cardNumber.trim().toUpperCase() : undefined,
      }));
    } else if (req.cardNumbers && req.cardNumbers.length > 0) {
      targetEntries = req.cardNumbers.map((num: string) => ({
        qrCode: `https://moneycard.app/scan/${num.trim().toLowerCase()}_${Math.random().toString(36).substring(2, 8)}`,
        cardNumber: num.trim().toUpperCase(),
      }));
    }

    if (targetEntries.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No QR codes or card numbers provided for import');
    }

    const createdCards: Card[] = [];
    let assignedCount = 0;
    let unassignedCount = 0;

    for (const entry of targetEntries) {
      const isAssigned = !!entry.cardNumber;
      const newCard: Card = {
        id: mockStore.generateId('card'),
        organizationId: orgId,
        physicalCardNumber: entry.cardNumber || null,
        qrToken: entry.qrCode,
        assignmentStatus: isAssigned ? 'ASSIGNED' : 'UNASSIGNED',
        status: 'AVAILABLE',
        currentBranchId: req.branchId || null,
        createdAt: mockStore.getTimestamp(),
        updatedAt: mockStore.getTimestamp(),
      };

      if (isAssigned) assignedCount++;
      else unassignedCount++;

      mockStore.cards.push(newCard);
      createdCards.push(newCard);
    }

    return createMockSuccess({
      importedCount: createdCards.length,
      unassignedCount,
      assignedCount,
      cards: createdCards,
    });
  },

  // PATCH /api/v1/cards/:id/assign-number
  async assignCardNumber(id: string, req: AssignCardNumberRequest): Promise<ApiResult<Card>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) return createMockError('UNAUTHORIZED', 'Authentication required');

    const card = mockStore.cards.find((c) => c.id === id);
    if (!card) return createMockError('CARD_NOT_FOUND', 'Card not found');

    const cleanNum = req.cardNumber.trim().toUpperCase();
    card.physicalCardNumber = cleanNum;
    card.assignmentStatus = 'ASSIGNED';
    card.updatedAt = mockStore.getTimestamp();

    return createMockSuccess(card);
  },

  // POST /api/v1/cards/bulk-assign-numbers
  

  async bulkAssignCardNumbers(req: BulkAssignCardNumbersRequest): Promise<ApiResult<BulkAssignCardNumbersResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) return createMockError('UNAUTHORIZED', 'Authentication required');

    const assignedCards: Card[] = [];
    for (const assignment of req.assignments) {
      const card = mockStore.cards.find(
        (c) =>
          (assignment.cardId && c.id === assignment.cardId) ||
          (assignment.qrCode && c.qrToken === assignment.qrCode),
      );

      if (card) {
        card.physicalCardNumber = assignment.cardNumber.trim().toUpperCase();
        card.assignmentStatus = 'ASSIGNED';
        card.updatedAt = mockStore.getTimestamp();
        assignedCards.push(card);
      }
    }

    return createMockSuccess({
      assignedCount: assignedCards.length,
      cards: assignedCards,
    });
  },

  // GET /api/v1/cards/resolve/:qrToken
  async resolveCard(qrToken: string): Promise<ApiResult<ResolveQrResponseData>> {
    return this.resolveQrToken(qrToken);
  },

  async resolveQrToken(qrToken: string): Promise<ApiResult<ResolveQrResponseData>> {
    await mockDelay();
    const card = mockStore.cards.find((c) => c.qrToken === qrToken);

    if (!card) {
      return createMockError('CARD_NOT_FOUND', 'Unrecognized QR code. No card found for this token.');
    }

    if (card.status === 'BLOCKED') {
      return createMockError('CARD_BLOCKED', 'This card has been blocked by an administrator.');
    }

    const activeSession = mockStore.sessions.find(
      (s: any) => s.cardId === card.id && s.status === 'ACTIVE',
    );

    return createMockSuccess({
      card: {
        id: card.id,
        organizationId: card.organizationId,
        physicalCardNumber: card.physicalCardNumber || null,
        qrToken: card.qrToken,
        status: card.status,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
      },
      session: activeSession || null,
    });
  },

  // POST /api/v1/cards/:id/block
  async blockCard(id: string, reason = 'Blocked by Staff'): Promise<ApiResult<Card>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) return createMockError('UNAUTHORIZED', 'Authentication required');

    const card = mockStore.cards.find((c) => c.id === id);
    if (!card) return createMockError('CARD_NOT_FOUND', 'Card not found');

    card.status = 'BLOCKED';
    card.updatedAt = mockStore.getTimestamp();

    mockStore.customerHistoryEvents.unshift({
      id: mockStore.generateId('evt'),
      organizationId: card.organizationId,
      branchId: card.currentBranchId || (currentUser as any).branchId || 'branch_001',
      branchName: 'Main Branch',
      cardId: card.id,
      physicalCardNumber: card.physicalCardNumber || 'UNASSIGNED',
      action: 'CARD_BLOCKED',
      reason,
      performedByUserId: currentUser.id,
      performedByName: currentUser.name,
      createdAt: mockStore.getTimestamp(),
    });

    return createMockSuccess(card);
  },

  // POST /api/v1/cards/:id/unblock
  async unblockCard(id: string, reason = 'Unblocked by Staff'): Promise<ApiResult<Card>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) return createMockError('UNAUTHORIZED', 'Authentication required');

    const card = mockStore.cards.find((c) => c.id === id);
    if (!card) return createMockError('CARD_NOT_FOUND', 'Card not found');

    card.status = 'ACTIVE';
    card.updatedAt = mockStore.getTimestamp();

    mockStore.customerHistoryEvents.unshift({
      id: mockStore.generateId('evt'),
      organizationId: card.organizationId,
      branchId: card.currentBranchId || (currentUser as any).branchId || 'branch_001',
      branchName: 'Main Branch',
      cardId: card.id,
      physicalCardNumber: card.physicalCardNumber || 'UNASSIGNED',
      action: 'CARD_UNBLOCKED',
      reason,
      performedByUserId: currentUser.id,
      performedByName: currentUser.name,
      createdAt: mockStore.getTimestamp(),
    });

    return createMockSuccess(card);
  },

  // GET /api/v1/customer-history
  async getCustomerHistoryEvents(params?: any): Promise<ApiResult<PaginatedData<CustomerHistoryEvent>>> {
    await mockDelay();
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const total = mockStore.customerHistoryEvents.length;
    const items = mockStore.customerHistoryEvents.slice((page - 1) * limit, page * limit);

    return createMockSuccess({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  },

  // POST /api/v1/cards/import
  async importCards(req: ImportCardsRequest): Promise<ApiResult<ImportCardsResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) return createMockError('UNAUTHORIZED', 'Authentication required');
    const orgId = currentUser.organizationId || 'org_001';

    const createdCards: Card[] = [];
    for (const entry of (req.cards || [])) {
      const numClean = entry.cardNumber
        ? entry.cardNumber.toLowerCase().replace(/[^a-z0-9]/g, '')
        : 'card';
      const randomQrToken = `qr_token_${numClean}_${Math.random().toString(36).substring(2, 8)}`;

      const newCard: Card = {
        id: mockStore.generateId('card'),
        organizationId: orgId,
        physicalCardNumber: entry.cardNumber || null,
        qrToken: randomQrToken,
        assignmentStatus: entry.cardNumber ? 'ASSIGNED' : 'UNASSIGNED',
        status: 'AVAILABLE',
        currentBranchId: req.branchId || null,
        createdAt: mockStore.getTimestamp(),
        updatedAt: mockStore.getTimestamp(),
      };

      mockStore.cards.push(newCard);
      createdCards.push(newCard);
    }

    return createMockSuccess({
      importedCount: createdCards.length,
      cards: createdCards,
    });
  },
};

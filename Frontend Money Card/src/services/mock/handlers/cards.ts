import { mockStore } from '../store';
import { mockDelay, createMockSuccess, createMockError, paginateArray } from '../utils';
import { mockAuthHandlers } from './auth';
import type {
  ApiResult,
  Card,
  PaginatedData,
  PaginationParams,
  CreateCardRequest,
  ResolveQrResponseData,
  ImportCardsRequest,
  ImportCardsResponseData,
  ImportQrCodesRequest,
  ImportQrCodesResponseData,
  AssignCardNumberRequest,
  BulkAssignCardNumbersRequest,
  BulkAssignCardNumbersResponseData,
  CustomerHistoryEvent,
} from '@/types';

export const mockCardsHandlers = {
  async getCards(params?: PaginationParams): Promise<ApiResult<PaginatedData<Card>>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    let cards = mockStore.cards;

    if (currentUser.role !== 'SUPER_ADMIN') {
      cards = cards.filter((c) => c.organizationId === currentUser.organizationId);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      cards = cards.filter((c) => c.physicalCardNumber.toLowerCase().includes(q));
    }

    if (params?.status) {
      cards = cards.filter((c) => c.status === params.status);
    }

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    return createMockSuccess(paginateArray(cards, page, limit));
  },

  async getCardById(id: string): Promise<ApiResult<Card>> {
    await mockDelay();
    const card = mockStore.cards.find((c) => c.id === id);
    if (!card) {
      return createMockError('CARD_NOT_FOUND', `Card with ID '${id}' not found`);
    }
    return createMockSuccess(card);
  },

  async createCard(req: CreateCardRequest): Promise<ApiResult<Card>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const orgId = currentUser.organizationId || 'org_001';

    // Uniqueness check for physical card number
    const numberExists = mockStore.cards.some(
      (c) =>
        c.organizationId === orgId &&
        c.physicalCardNumber.toLowerCase() === req.physicalCardNumber.toLowerCase(),
    );
    if (numberExists) {
      return createMockError(
        'VALIDATION_ERROR',
        `Physical card number '${req.physicalCardNumber}' already exists in this organization`,
      );
    }

    // Check Plan Card Limit (respecting organization-specific overrides)
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

    // Opaque non-guessable QR token (M0 Rule 15)
    const randomQrToken = `qr_token_${req.physicalCardNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).substring(2, 8)}`;

    const newCard: Card = {
      id: mockStore.generateId('card'),
      organizationId: orgId,
      physicalCardNumber: req.physicalCardNumber,
      qrToken: randomQrToken,
      status: 'AVAILABLE',
      currentBranchId: req.branchId || null,
      createdAt: mockStore.getTimestamp(),
      updatedAt: mockStore.getTimestamp(),
      async importQrCodes(req: ImportQrCodesRequest): Promise<ApiResult<ImportQrCodesResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    let targetEntries: { qrCode: string; cardNumber?: string }[] = [];
    if (req.qrCodes && req.qrCodes.length > 0) {
      targetEntries = req.qrCodes.map((q) => ({ qrCode: q.trim() }));
    } else if (req.mappings && req.mappings.length > 0) {
      targetEntries = req.mappings.map((m) => ({
        qrCode: m.qrCode.trim(),
        cardNumber: m.cardNumber ? m.cardNumber.trim().toUpperCase() : undefined,
      }));
    } else if (req.cards && req.cards.length > 0) {
      targetEntries = req.cards.map((c) => ({
        qrCode: (c.qrCode || '').trim(),
        cardNumber: c.cardNumber ? c.cardNumber.trim().toUpperCase() : undefined,
      }));
    }

    targetEntries = targetEntries.filter((e) => !!e.qrCode);
    if (targetEntries.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No QR codes provided for import');
    }

    // Plan Card Limit check
    const subscription = mockStore.subscriptions.find((s) => s.organizationId === orgId);
    if (subscription) {
      const plan = mockStore.plans.find((p) => p.id === subscription.planId);
      if (plan) {
        const effectiveCardLimit = subscription.overrides?.cardLimit ?? plan.cardLimit;
        const currentCount = mockStore.cards.filter((c) => c.organizationId === orgId).length;
        if (currentCount + targetEntries.length > effectiveCardLimit) {
          return createMockError(
            'PLAN_LIMIT_REACHED',
            `Importing ${targetEntries.length} QR code(s) exceeds your subscription card limit of ${effectiveCardLimit} (currently ${currentCount} registered)`,
          );
        }
      }
    }

    const existingQrs = new Set(mockStore.cards.map((c) => c.qrToken.toLowerCase()));
    const existingNums = new Set(
      mockStore.cards
        .filter((c) => c.organizationId === orgId && !!c.physicalCardNumber)
        .map((c) => (c.physicalCardNumber || '').toLowerCase()),
    );

    const createdCards: Card[] = [];
    for (const entry of targetEntries) {
      if (existingQrs.has(entry.qrCode.toLowerCase())) {
        return createMockError('DUPLICATE_QR', `QR code '${entry.qrCode}' is already registered in the platform`);
      }
      existingQrs.add(entry.qrCode.toLowerCase());

      if (entry.cardNumber) {
        if (existingNums.has(entry.cardNumber.toLowerCase())) {
          return createMockError('DUPLICATE_CARD', `Card number '${entry.cardNumber}' already exists in this organization`);
        }
        existingNums.add(entry.cardNumber.toLowerCase());
      }

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
      createdCards.push(newCard);
    }

    mockStore.cards.push(...createdCards);
    const unassignedCount = createdCards.filter((c) => c.assignmentStatus === 'UNASSIGNED').length;

    return createMockSuccess({
      importedCount: createdCards.length,
      unassignedCount,
      assignedCount: createdCards.length - unassignedCount,
      cards: createdCards,
    });
  },

  async assignCardNumber(id: string, req: AssignCardNumberRequest): Promise<ApiResult<Card>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';
    const cleanNum = (req.cardNumber || '').trim().toUpperCase();

    if (!cleanNum) {
      return createMockError('VALIDATION_ERROR', 'Card number is required');
    }

    const card = mockStore.cards.find((c) => c.id === id && c.organizationId === orgId);
    if (!card) {
      return createMockError('NOT_FOUND', 'Card not found in your organization');
    }

    const duplicate = mockStore.cards.find(
      (c) => c.organizationId === orgId && c.physicalCardNumber?.toLowerCase() === cleanNum.toLowerCase() && c.id !== id,
    );
    if (duplicate) {
      return createMockError('DUPLICATE_CARD_NUMBER', `Card number '${cleanNum}' is already assigned to another card in your organization`);
    }

    card.physicalCardNumber = cleanNum;
    card.assignmentStatus = 'ASSIGNED';
    card.updatedAt = mockStore.getTimestamp();

    return createMockSuccess(card);
  },

  async bulkAssignCardNumbers(req: BulkAssignCardNumbersRequest): Promise<ApiResult<BulkAssignCardNumbersResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    if (!req.assignments || req.assignments.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No assignments provided');
    }

    const updated: Card[] = [];
    for (const a of req.assignments) {
      const cleanNum = (a.cardNumber || '').trim().toUpperCase();
      const card = mockStore.cards.find(
        (c) => c.organizationId === orgId && (c.id === a.cardId || c.qrToken.toLowerCase() === (a.qrCode || '').toLowerCase()),
      );
      if (card) {
        card.physicalCardNumber = cleanNum;
        card.assignmentStatus = 'ASSIGNED';
        card.updatedAt = mockStore.getTimestamp();
        updated.push(card);
      }
    }

    return createMockSuccess({
      assignedCount: updated.length,
      cards: updated,
    });
  },
};

    mockStore.cards.push(newCard);
    return createMockSuccess(newCard);
  },

  async resolveCard(qrToken: string): Promise<ApiResult<ResolveQrResponseData>> {
    return this.resolveQrToken(qrToken);
  },

  async resolveQrToken(qrToken: string): Promise<ApiResult<ResolveQrResponseData>> {
    await mockDelay();
    if (!qrToken) {
      return createMockError('VALIDATION_ERROR', 'QR token is required');
    }

    // M0 Section 15: Opaque QR URL token resolves Card -> check status -> active session
    const card = mockStore.cards.find((c) => c.qrToken === qrToken);
    if (!card) {
      return createMockError('CARD_NOT_FOUND', 'Invalid or unrecognized QR token');
    }

    if (card.status === 'BLOCKED') {
      return createMockError(
        'CARD_BLOCKED',
        `Card '${card.physicalCardNumber}' is currently blocked and cannot be used`,
      );
    }

    const activeSession =
      mockStore.sessions.find((s) => s.cardId === card.id && s.status === 'ACTIVE') || null;

    return createMockSuccess({
      card,
      session: activeSession,
    });
  },

  async blockCard(id: string, reason = 'Blocked by Staff'): Promise<ApiResult<Card>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    const index = mockStore.cards.findIndex((c) => c.id === id);
    if (index === -1) {
      return createMockError('CARD_NOT_FOUND', `Card '${id}' not found`);
    }

    const existing = mockStore.cards[index];
    const activeSession = mockStore.sessions.find((s) => s.cardId === id && s.status === 'ACTIVE');
    const branch = mockStore.branches.find((b) => b.id === (activeSession?.branchId || existing.currentBranchId));

    const updated: Card = {
      ...existing,
      status: 'BLOCKED',
      updatedAt: mockStore.getTimestamp(),
      async importQrCodes(req: ImportQrCodesRequest): Promise<ApiResult<ImportQrCodesResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    let targetEntries: { qrCode: string; cardNumber?: string }[] = [];
    if (req.qrCodes && req.qrCodes.length > 0) {
      targetEntries = req.qrCodes.map((q) => ({ qrCode: q.trim() }));
    } else if (req.mappings && req.mappings.length > 0) {
      targetEntries = req.mappings.map((m) => ({
        qrCode: m.qrCode.trim(),
        cardNumber: m.cardNumber ? m.cardNumber.trim().toUpperCase() : undefined,
      }));
    } else if (req.cards && req.cards.length > 0) {
      targetEntries = req.cards.map((c) => ({
        qrCode: (c.qrCode || '').trim(),
        cardNumber: c.cardNumber ? c.cardNumber.trim().toUpperCase() : undefined,
      }));
    }

    targetEntries = targetEntries.filter((e) => !!e.qrCode);
    if (targetEntries.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No QR codes provided for import');
    }

    // Plan Card Limit check
    const subscription = mockStore.subscriptions.find((s) => s.organizationId === orgId);
    if (subscription) {
      const plan = mockStore.plans.find((p) => p.id === subscription.planId);
      if (plan) {
        const effectiveCardLimit = subscription.overrides?.cardLimit ?? plan.cardLimit;
        const currentCount = mockStore.cards.filter((c) => c.organizationId === orgId).length;
        if (currentCount + targetEntries.length > effectiveCardLimit) {
          return createMockError(
            'PLAN_LIMIT_REACHED',
            `Importing ${targetEntries.length} QR code(s) exceeds your subscription card limit of ${effectiveCardLimit} (currently ${currentCount} registered)`,
          );
        }
      }
    }

    const existingQrs = new Set(mockStore.cards.map((c) => c.qrToken.toLowerCase()));
    const existingNums = new Set(
      mockStore.cards
        .filter((c) => c.organizationId === orgId && !!c.physicalCardNumber)
        .map((c) => (c.physicalCardNumber || '').toLowerCase()),
    );

    const createdCards: Card[] = [];
    for (const entry of targetEntries) {
      if (existingQrs.has(entry.qrCode.toLowerCase())) {
        return createMockError('DUPLICATE_QR', `QR code '${entry.qrCode}' is already registered in the platform`);
      }
      existingQrs.add(entry.qrCode.toLowerCase());

      if (entry.cardNumber) {
        if (existingNums.has(entry.cardNumber.toLowerCase())) {
          return createMockError('DUPLICATE_CARD', `Card number '${entry.cardNumber}' already exists in this organization`);
        }
        existingNums.add(entry.cardNumber.toLowerCase());
      }

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
      createdCards.push(newCard);
    }

    mockStore.cards.push(...createdCards);
    const unassignedCount = createdCards.filter((c) => c.assignmentStatus === 'UNASSIGNED').length;

    return createMockSuccess({
      importedCount: createdCards.length,
      unassignedCount,
      assignedCount: createdCards.length - unassignedCount,
      cards: createdCards,
    });
  },

  async assignCardNumber(id: string, req: AssignCardNumberRequest): Promise<ApiResult<Card>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';
    const cleanNum = (req.cardNumber || '').trim().toUpperCase();

    if (!cleanNum) {
      return createMockError('VALIDATION_ERROR', 'Card number is required');
    }

    const card = mockStore.cards.find((c) => c.id === id && c.organizationId === orgId);
    if (!card) {
      return createMockError('NOT_FOUND', 'Card not found in your organization');
    }

    const duplicate = mockStore.cards.find(
      (c) => c.organizationId === orgId && c.physicalCardNumber?.toLowerCase() === cleanNum.toLowerCase() && c.id !== id,
    );
    if (duplicate) {
      return createMockError('DUPLICATE_CARD_NUMBER', `Card number '${cleanNum}' is already assigned to another card in your organization`);
    }

    card.physicalCardNumber = cleanNum;
    card.assignmentStatus = 'ASSIGNED';
    card.updatedAt = mockStore.getTimestamp();

    return createMockSuccess(card);
  },

  async bulkAssignCardNumbers(req: BulkAssignCardNumbersRequest): Promise<ApiResult<BulkAssignCardNumbersResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    if (!req.assignments || req.assignments.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No assignments provided');
    }

    const updated: Card[] = [];
    for (const a of req.assignments) {
      const cleanNum = (a.cardNumber || '').trim().toUpperCase();
      const card = mockStore.cards.find(
        (c) => c.organizationId === orgId && (c.id === a.cardId || c.qrToken.toLowerCase() === (a.qrCode || '').toLowerCase()),
      );
      if (card) {
        card.physicalCardNumber = cleanNum;
        card.assignmentStatus = 'ASSIGNED';
        card.updatedAt = mockStore.getTimestamp();
        updated.push(card);
      }
    }

    return createMockSuccess({
      assignedCount: updated.length,
      cards: updated,
    });
  },
};

    mockStore.cards[index] = updated;

    // Record audit event in Customer History
    const historyEvent: CustomerHistoryEvent = {
      id: `evt_block_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      cardId: existing.id,
      sessionId: activeSession?.id || null,
      customerName: activeSession?.customerName || null,
      customerPhone: activeSession?.customerPhone || null,
      physicalCardNumber: existing.physicalCardNumber,
      action: 'CARD_BLOCKED',
      previousStatus: existing.status,
      newStatus: 'BLOCKED',
      performedByName: currentUser?.name || 'Staff User',
      performedByUserId: currentUser?.id || null,
      branchId: branch?.id || null,
      branchName: branch?.name || 'Main Cafeteria',
      reason,
      createdAt: new Date().toISOString(),
      async importQrCodes(req: ImportQrCodesRequest): Promise<ApiResult<ImportQrCodesResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    let targetEntries: { qrCode: string; cardNumber?: string }[] = [];
    if (req.qrCodes && req.qrCodes.length > 0) {
      targetEntries = req.qrCodes.map((q) => ({ qrCode: q.trim() }));
    } else if (req.mappings && req.mappings.length > 0) {
      targetEntries = req.mappings.map((m) => ({
        qrCode: m.qrCode.trim(),
        cardNumber: m.cardNumber ? m.cardNumber.trim().toUpperCase() : undefined,
      }));
    } else if (req.cards && req.cards.length > 0) {
      targetEntries = req.cards.map((c) => ({
        qrCode: (c.qrCode || '').trim(),
        cardNumber: c.cardNumber ? c.cardNumber.trim().toUpperCase() : undefined,
      }));
    }

    targetEntries = targetEntries.filter((e) => !!e.qrCode);
    if (targetEntries.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No QR codes provided for import');
    }

    // Plan Card Limit check
    const subscription = mockStore.subscriptions.find((s) => s.organizationId === orgId);
    if (subscription) {
      const plan = mockStore.plans.find((p) => p.id === subscription.planId);
      if (plan) {
        const effectiveCardLimit = subscription.overrides?.cardLimit ?? plan.cardLimit;
        const currentCount = mockStore.cards.filter((c) => c.organizationId === orgId).length;
        if (currentCount + targetEntries.length > effectiveCardLimit) {
          return createMockError(
            'PLAN_LIMIT_REACHED',
            `Importing ${targetEntries.length} QR code(s) exceeds your subscription card limit of ${effectiveCardLimit} (currently ${currentCount} registered)`,
          );
        }
      }
    }

    const existingQrs = new Set(mockStore.cards.map((c) => c.qrToken.toLowerCase()));
    const existingNums = new Set(
      mockStore.cards
        .filter((c) => c.organizationId === orgId && !!c.physicalCardNumber)
        .map((c) => (c.physicalCardNumber || '').toLowerCase()),
    );

    const createdCards: Card[] = [];
    for (const entry of targetEntries) {
      if (existingQrs.has(entry.qrCode.toLowerCase())) {
        return createMockError('DUPLICATE_QR', `QR code '${entry.qrCode}' is already registered in the platform`);
      }
      existingQrs.add(entry.qrCode.toLowerCase());

      if (entry.cardNumber) {
        if (existingNums.has(entry.cardNumber.toLowerCase())) {
          return createMockError('DUPLICATE_CARD', `Card number '${entry.cardNumber}' already exists in this organization`);
        }
        existingNums.add(entry.cardNumber.toLowerCase());
      }

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
      createdCards.push(newCard);
    }

    mockStore.cards.push(...createdCards);
    const unassignedCount = createdCards.filter((c) => c.assignmentStatus === 'UNASSIGNED').length;

    return createMockSuccess({
      importedCount: createdCards.length,
      unassignedCount,
      assignedCount: createdCards.length - unassignedCount,
      cards: createdCards,
    });
  },

  async assignCardNumber(id: string, req: AssignCardNumberRequest): Promise<ApiResult<Card>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';
    const cleanNum = (req.cardNumber || '').trim().toUpperCase();

    if (!cleanNum) {
      return createMockError('VALIDATION_ERROR', 'Card number is required');
    }

    const card = mockStore.cards.find((c) => c.id === id && c.organizationId === orgId);
    if (!card) {
      return createMockError('NOT_FOUND', 'Card not found in your organization');
    }

    const duplicate = mockStore.cards.find(
      (c) => c.organizationId === orgId && c.physicalCardNumber?.toLowerCase() === cleanNum.toLowerCase() && c.id !== id,
    );
    if (duplicate) {
      return createMockError('DUPLICATE_CARD_NUMBER', `Card number '${cleanNum}' is already assigned to another card in your organization`);
    }

    card.physicalCardNumber = cleanNum;
    card.assignmentStatus = 'ASSIGNED';
    card.updatedAt = mockStore.getTimestamp();

    return createMockSuccess(card);
  },

  async bulkAssignCardNumbers(req: BulkAssignCardNumbersRequest): Promise<ApiResult<BulkAssignCardNumbersResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    if (!req.assignments || req.assignments.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No assignments provided');
    }

    const updated: Card[] = [];
    for (const a of req.assignments) {
      const cleanNum = (a.cardNumber || '').trim().toUpperCase();
      const card = mockStore.cards.find(
        (c) => c.organizationId === orgId && (c.id === a.cardId || c.qrToken.toLowerCase() === (a.qrCode || '').toLowerCase()),
      );
      if (card) {
        card.physicalCardNumber = cleanNum;
        card.assignmentStatus = 'ASSIGNED';
        card.updatedAt = mockStore.getTimestamp();
        updated.push(card);
      }
    }

    return createMockSuccess({
      assignedCount: updated.length,
      cards: updated,
    });
  },
};
    mockStore.customerHistoryEvents.unshift(historyEvent);

    return createMockSuccess(updated);
  },

  async unblockCard(id: string, reason = 'Unblocked by Staff'): Promise<ApiResult<Card>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    const index = mockStore.cards.findIndex((c) => c.id === id);
    if (index === -1) {
      return createMockError('CARD_NOT_FOUND', `Card '${id}' not found`);
    }

    const existing = mockStore.cards[index];
    const activeSession = mockStore.sessions.find(
      (s) => s.cardId === id && s.status === 'ACTIVE',
    );
    const branch = mockStore.branches.find((b) => b.id === (activeSession?.branchId || existing.currentBranchId));
    const newStatus = activeSession ? 'ACTIVE' : 'AVAILABLE';

    const updated: Card = {
      ...existing,
      status: newStatus,
      updatedAt: mockStore.getTimestamp(),
      async importQrCodes(req: ImportQrCodesRequest): Promise<ApiResult<ImportQrCodesResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    let targetEntries: { qrCode: string; cardNumber?: string }[] = [];
    if (req.qrCodes && req.qrCodes.length > 0) {
      targetEntries = req.qrCodes.map((q) => ({ qrCode: q.trim() }));
    } else if (req.mappings && req.mappings.length > 0) {
      targetEntries = req.mappings.map((m) => ({
        qrCode: m.qrCode.trim(),
        cardNumber: m.cardNumber ? m.cardNumber.trim().toUpperCase() : undefined,
      }));
    } else if (req.cards && req.cards.length > 0) {
      targetEntries = req.cards.map((c) => ({
        qrCode: (c.qrCode || '').trim(),
        cardNumber: c.cardNumber ? c.cardNumber.trim().toUpperCase() : undefined,
      }));
    }

    targetEntries = targetEntries.filter((e) => !!e.qrCode);
    if (targetEntries.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No QR codes provided for import');
    }

    // Plan Card Limit check
    const subscription = mockStore.subscriptions.find((s) => s.organizationId === orgId);
    if (subscription) {
      const plan = mockStore.plans.find((p) => p.id === subscription.planId);
      if (plan) {
        const effectiveCardLimit = subscription.overrides?.cardLimit ?? plan.cardLimit;
        const currentCount = mockStore.cards.filter((c) => c.organizationId === orgId).length;
        if (currentCount + targetEntries.length > effectiveCardLimit) {
          return createMockError(
            'PLAN_LIMIT_REACHED',
            `Importing ${targetEntries.length} QR code(s) exceeds your subscription card limit of ${effectiveCardLimit} (currently ${currentCount} registered)`,
          );
        }
      }
    }

    const existingQrs = new Set(mockStore.cards.map((c) => c.qrToken.toLowerCase()));
    const existingNums = new Set(
      mockStore.cards
        .filter((c) => c.organizationId === orgId && !!c.physicalCardNumber)
        .map((c) => (c.physicalCardNumber || '').toLowerCase()),
    );

    const createdCards: Card[] = [];
    for (const entry of targetEntries) {
      if (existingQrs.has(entry.qrCode.toLowerCase())) {
        return createMockError('DUPLICATE_QR', `QR code '${entry.qrCode}' is already registered in the platform`);
      }
      existingQrs.add(entry.qrCode.toLowerCase());

      if (entry.cardNumber) {
        if (existingNums.has(entry.cardNumber.toLowerCase())) {
          return createMockError('DUPLICATE_CARD', `Card number '${entry.cardNumber}' already exists in this organization`);
        }
        existingNums.add(entry.cardNumber.toLowerCase());
      }

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
      createdCards.push(newCard);
    }

    mockStore.cards.push(...createdCards);
    const unassignedCount = createdCards.filter((c) => c.assignmentStatus === 'UNASSIGNED').length;

    return createMockSuccess({
      importedCount: createdCards.length,
      unassignedCount,
      assignedCount: createdCards.length - unassignedCount,
      cards: createdCards,
    });
  },

  async assignCardNumber(id: string, req: AssignCardNumberRequest): Promise<ApiResult<Card>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';
    const cleanNum = (req.cardNumber || '').trim().toUpperCase();

    if (!cleanNum) {
      return createMockError('VALIDATION_ERROR', 'Card number is required');
    }

    const card = mockStore.cards.find((c) => c.id === id && c.organizationId === orgId);
    if (!card) {
      return createMockError('NOT_FOUND', 'Card not found in your organization');
    }

    const duplicate = mockStore.cards.find(
      (c) => c.organizationId === orgId && c.physicalCardNumber?.toLowerCase() === cleanNum.toLowerCase() && c.id !== id,
    );
    if (duplicate) {
      return createMockError('DUPLICATE_CARD_NUMBER', `Card number '${cleanNum}' is already assigned to another card in your organization`);
    }

    card.physicalCardNumber = cleanNum;
    card.assignmentStatus = 'ASSIGNED';
    card.updatedAt = mockStore.getTimestamp();

    return createMockSuccess(card);
  },

  async bulkAssignCardNumbers(req: BulkAssignCardNumbersRequest): Promise<ApiResult<BulkAssignCardNumbersResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    if (!req.assignments || req.assignments.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No assignments provided');
    }

    const updated: Card[] = [];
    for (const a of req.assignments) {
      const cleanNum = (a.cardNumber || '').trim().toUpperCase();
      const card = mockStore.cards.find(
        (c) => c.organizationId === orgId && (c.id === a.cardId || c.qrToken.toLowerCase() === (a.qrCode || '').toLowerCase()),
      );
      if (card) {
        card.physicalCardNumber = cleanNum;
        card.assignmentStatus = 'ASSIGNED';
        card.updatedAt = mockStore.getTimestamp();
        updated.push(card);
      }
    }

    return createMockSuccess({
      assignedCount: updated.length,
      cards: updated,
    });
  },
};

    mockStore.cards[index] = updated;

    // Record new unblock audit event in Customer History (preserving previous events)
    const historyEvent: CustomerHistoryEvent = {
      id: `evt_unblock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      cardId: existing.id,
      sessionId: activeSession?.id || null,
      customerName: activeSession?.customerName || null,
      customerPhone: activeSession?.customerPhone || null,
      physicalCardNumber: existing.physicalCardNumber,
      action: 'CARD_UNBLOCKED',
      previousStatus: existing.status,
      newStatus,
      performedByName: currentUser?.name || 'Staff User',
      performedByUserId: currentUser?.id || null,
      branchId: branch?.id || null,
      branchName: branch?.name || 'Main Cafeteria',
      reason,
      createdAt: new Date().toISOString(),
      async importQrCodes(req: ImportQrCodesRequest): Promise<ApiResult<ImportQrCodesResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    let targetEntries: { qrCode: string; cardNumber?: string }[] = [];
    if (req.qrCodes && req.qrCodes.length > 0) {
      targetEntries = req.qrCodes.map((q) => ({ qrCode: q.trim() }));
    } else if (req.mappings && req.mappings.length > 0) {
      targetEntries = req.mappings.map((m) => ({
        qrCode: m.qrCode.trim(),
        cardNumber: m.cardNumber ? m.cardNumber.trim().toUpperCase() : undefined,
      }));
    } else if (req.cards && req.cards.length > 0) {
      targetEntries = req.cards.map((c) => ({
        qrCode: (c.qrCode || '').trim(),
        cardNumber: c.cardNumber ? c.cardNumber.trim().toUpperCase() : undefined,
      }));
    }

    targetEntries = targetEntries.filter((e) => !!e.qrCode);
    if (targetEntries.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No QR codes provided for import');
    }

    // Plan Card Limit check
    const subscription = mockStore.subscriptions.find((s) => s.organizationId === orgId);
    if (subscription) {
      const plan = mockStore.plans.find((p) => p.id === subscription.planId);
      if (plan) {
        const effectiveCardLimit = subscription.overrides?.cardLimit ?? plan.cardLimit;
        const currentCount = mockStore.cards.filter((c) => c.organizationId === orgId).length;
        if (currentCount + targetEntries.length > effectiveCardLimit) {
          return createMockError(
            'PLAN_LIMIT_REACHED',
            `Importing ${targetEntries.length} QR code(s) exceeds your subscription card limit of ${effectiveCardLimit} (currently ${currentCount} registered)`,
          );
        }
      }
    }

    const existingQrs = new Set(mockStore.cards.map((c) => c.qrToken.toLowerCase()));
    const existingNums = new Set(
      mockStore.cards
        .filter((c) => c.organizationId === orgId && !!c.physicalCardNumber)
        .map((c) => (c.physicalCardNumber || '').toLowerCase()),
    );

    const createdCards: Card[] = [];
    for (const entry of targetEntries) {
      if (existingQrs.has(entry.qrCode.toLowerCase())) {
        return createMockError('DUPLICATE_QR', `QR code '${entry.qrCode}' is already registered in the platform`);
      }
      existingQrs.add(entry.qrCode.toLowerCase());

      if (entry.cardNumber) {
        if (existingNums.has(entry.cardNumber.toLowerCase())) {
          return createMockError('DUPLICATE_CARD', `Card number '${entry.cardNumber}' already exists in this organization`);
        }
        existingNums.add(entry.cardNumber.toLowerCase());
      }

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
      createdCards.push(newCard);
    }

    mockStore.cards.push(...createdCards);
    const unassignedCount = createdCards.filter((c) => c.assignmentStatus === 'UNASSIGNED').length;

    return createMockSuccess({
      importedCount: createdCards.length,
      unassignedCount,
      assignedCount: createdCards.length - unassignedCount,
      cards: createdCards,
    });
  },

  async assignCardNumber(id: string, req: AssignCardNumberRequest): Promise<ApiResult<Card>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';
    const cleanNum = (req.cardNumber || '').trim().toUpperCase();

    if (!cleanNum) {
      return createMockError('VALIDATION_ERROR', 'Card number is required');
    }

    const card = mockStore.cards.find((c) => c.id === id && c.organizationId === orgId);
    if (!card) {
      return createMockError('NOT_FOUND', 'Card not found in your organization');
    }

    const duplicate = mockStore.cards.find(
      (c) => c.organizationId === orgId && c.physicalCardNumber?.toLowerCase() === cleanNum.toLowerCase() && c.id !== id,
    );
    if (duplicate) {
      return createMockError('DUPLICATE_CARD_NUMBER', `Card number '${cleanNum}' is already assigned to another card in your organization`);
    }

    card.physicalCardNumber = cleanNum;
    card.assignmentStatus = 'ASSIGNED';
    card.updatedAt = mockStore.getTimestamp();

    return createMockSuccess(card);
  },

  async bulkAssignCardNumbers(req: BulkAssignCardNumbersRequest): Promise<ApiResult<BulkAssignCardNumbersResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    if (!req.assignments || req.assignments.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No assignments provided');
    }

    const updated: Card[] = [];
    for (const a of req.assignments) {
      const cleanNum = (a.cardNumber || '').trim().toUpperCase();
      const card = mockStore.cards.find(
        (c) => c.organizationId === orgId && (c.id === a.cardId || c.qrToken.toLowerCase() === (a.qrCode || '').toLowerCase()),
      );
      if (card) {
        card.physicalCardNumber = cleanNum;
        card.assignmentStatus = 'ASSIGNED';
        card.updatedAt = mockStore.getTimestamp();
        updated.push(card);
      }
    }

    return createMockSuccess({
      assignedCount: updated.length,
      cards: updated,
    });
  },
};
    mockStore.customerHistoryEvents.unshift(historyEvent);

    return createMockSuccess(updated);
  },

  async getCustomerHistoryEvents(params?: any): Promise<ApiResult<PaginatedData<CustomerHistoryEvent>>> {
    await mockDelay();
    let events = [...mockStore.customerHistoryEvents];

    if (params?.action && params.action !== 'ALL') {
      events = events.filter((e) => e.action === params.action);
    }
    if (params?.cardId) {
      events = events.filter((e) => e.cardId === params.cardId);
    }
    if (params?.search) {
      const q = String(params.search).toLowerCase();
      events = events.filter((e) =>
        (e.customerName?.toLowerCase().includes(q) ?? false) ||
        (e.customerPhone?.toLowerCase().includes(q) ?? false) ||
        e.physicalCardNumber.toLowerCase().includes(q) ||
        (e.performedByName?.toLowerCase().includes(q) ?? false) ||
        (e.reason?.toLowerCase().includes(q) ?? false) ||
        (e.branchName?.toLowerCase().includes(q) ?? false)
      );
    }

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 50;
    return createMockSuccess(paginateArray(events, page, limit));
  },

  async importCards(req: ImportCardsRequest): Promise<ApiResult<ImportCardsResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const orgId = currentUser.organizationId || 'org_001';

    if (!req.cardNumbers || req.cardNumbers.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No card numbers provided for import');
    }

    // Check Plan Card Limit
    const subscription = mockStore.subscriptions.find((s) => s.organizationId === orgId);
    if (subscription) {
      const plan = mockStore.plans.find((p) => p.id === subscription.planId);
      if (plan) {
        const effectiveCardLimit = subscription.overrides?.cardLimit ?? plan.cardLimit;
        const currentCount = mockStore.cards.filter((c) => c.organizationId === orgId).length;
        if (currentCount + req.cardNumbers.length > effectiveCardLimit) {
          return createMockError(
            'PLAN_LIMIT_REACHED',
            `Importing ${req.cardNumbers.length} card(s) exceeds your subscription card limit of ${effectiveCardLimit} (currently ${currentCount} registered)`,
          );
        }
      }
    }

    const createdCards: Card[] = [];
    const existingNumbers = new Set(
      mockStore.cards
        .filter((c) => c.organizationId === orgId)
        .map((c) => c.physicalCardNumber.toLowerCase()),
    );

    for (const num of req.cardNumbers) {
      const trimmed = num.trim();
      if (!trimmed) continue;

      if (existingNumbers.has(trimmed.toLowerCase())) {
        return createMockError(
          'VALIDATION_ERROR',
          `Physical card '${trimmed}' already exists in this organization`,
        );
      }

      existingNumbers.add(trimmed.toLowerCase());
      const randomQrToken = `qr_token_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).substring(2, 8)}`;

      const newCard: Card = {
        id: mockStore.generateId('card'),
        organizationId: orgId,
        physicalCardNumber: trimmed,
        qrToken: randomQrToken,
        status: 'AVAILABLE',
        currentBranchId: req.branchId || null,
        createdAt: mockStore.getTimestamp(),
        updatedAt: mockStore.getTimestamp(),
        async importQrCodes(req: ImportQrCodesRequest): Promise<ApiResult<ImportQrCodesResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    let targetEntries: { qrCode: string; cardNumber?: string }[] = [];
    if (req.qrCodes && req.qrCodes.length > 0) {
      targetEntries = req.qrCodes.map((q) => ({ qrCode: q.trim() }));
    } else if (req.mappings && req.mappings.length > 0) {
      targetEntries = req.mappings.map((m) => ({
        qrCode: m.qrCode.trim(),
        cardNumber: m.cardNumber ? m.cardNumber.trim().toUpperCase() : undefined,
      }));
    } else if (req.cards && req.cards.length > 0) {
      targetEntries = req.cards.map((c) => ({
        qrCode: (c.qrCode || '').trim(),
        cardNumber: c.cardNumber ? c.cardNumber.trim().toUpperCase() : undefined,
      }));
    }

    targetEntries = targetEntries.filter((e) => !!e.qrCode);
    if (targetEntries.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No QR codes provided for import');
    }

    // Plan Card Limit check
    const subscription = mockStore.subscriptions.find((s) => s.organizationId === orgId);
    if (subscription) {
      const plan = mockStore.plans.find((p) => p.id === subscription.planId);
      if (plan) {
        const effectiveCardLimit = subscription.overrides?.cardLimit ?? plan.cardLimit;
        const currentCount = mockStore.cards.filter((c) => c.organizationId === orgId).length;
        if (currentCount + targetEntries.length > effectiveCardLimit) {
          return createMockError(
            'PLAN_LIMIT_REACHED',
            `Importing ${targetEntries.length} QR code(s) exceeds your subscription card limit of ${effectiveCardLimit} (currently ${currentCount} registered)`,
          );
        }
      }
    }

    const existingQrs = new Set(mockStore.cards.map((c) => c.qrToken.toLowerCase()));
    const existingNums = new Set(
      mockStore.cards
        .filter((c) => c.organizationId === orgId && !!c.physicalCardNumber)
        .map((c) => (c.physicalCardNumber || '').toLowerCase()),
    );

    const createdCards: Card[] = [];
    for (const entry of targetEntries) {
      if (existingQrs.has(entry.qrCode.toLowerCase())) {
        return createMockError('DUPLICATE_QR', `QR code '${entry.qrCode}' is already registered in the platform`);
      }
      existingQrs.add(entry.qrCode.toLowerCase());

      if (entry.cardNumber) {
        if (existingNums.has(entry.cardNumber.toLowerCase())) {
          return createMockError('DUPLICATE_CARD', `Card number '${entry.cardNumber}' already exists in this organization`);
        }
        existingNums.add(entry.cardNumber.toLowerCase());
      }

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
      createdCards.push(newCard);
    }

    mockStore.cards.push(...createdCards);
    const unassignedCount = createdCards.filter((c) => c.assignmentStatus === 'UNASSIGNED').length;

    return createMockSuccess({
      importedCount: createdCards.length,
      unassignedCount,
      assignedCount: createdCards.length - unassignedCount,
      cards: createdCards,
    });
  },

  async assignCardNumber(id: string, req: AssignCardNumberRequest): Promise<ApiResult<Card>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';
    const cleanNum = (req.cardNumber || '').trim().toUpperCase();

    if (!cleanNum) {
      return createMockError('VALIDATION_ERROR', 'Card number is required');
    }

    const card = mockStore.cards.find((c) => c.id === id && c.organizationId === orgId);
    if (!card) {
      return createMockError('NOT_FOUND', 'Card not found in your organization');
    }

    const duplicate = mockStore.cards.find(
      (c) => c.organizationId === orgId && c.physicalCardNumber?.toLowerCase() === cleanNum.toLowerCase() && c.id !== id,
    );
    if (duplicate) {
      return createMockError('DUPLICATE_CARD_NUMBER', `Card number '${cleanNum}' is already assigned to another card in your organization`);
    }

    card.physicalCardNumber = cleanNum;
    card.assignmentStatus = 'ASSIGNED';
    card.updatedAt = mockStore.getTimestamp();

    return createMockSuccess(card);
  },

  async bulkAssignCardNumbers(req: BulkAssignCardNumbersRequest): Promise<ApiResult<BulkAssignCardNumbersResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    if (!req.assignments || req.assignments.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No assignments provided');
    }

    const updated: Card[] = [];
    for (const a of req.assignments) {
      const cleanNum = (a.cardNumber || '').trim().toUpperCase();
      const card = mockStore.cards.find(
        (c) => c.organizationId === orgId && (c.id === a.cardId || c.qrToken.toLowerCase() === (a.qrCode || '').toLowerCase()),
      );
      if (card) {
        card.physicalCardNumber = cleanNum;
        card.assignmentStatus = 'ASSIGNED';
        card.updatedAt = mockStore.getTimestamp();
        updated.push(card);
      }
    }

    return createMockSuccess({
      assignedCount: updated.length,
      cards: updated,
    });
  },
};

      createdCards.push(newCard);
    }

    mockStore.cards.push(...createdCards);
    return createMockSuccess({
      importedCount: createdCards.length,
      cards: createdCards,
    });
  },
  async importQrCodes(req: ImportQrCodesRequest): Promise<ApiResult<ImportQrCodesResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    let targetEntries: { qrCode: string; cardNumber?: string }[] = [];
    if (req.qrCodes && req.qrCodes.length > 0) {
      targetEntries = req.qrCodes.map((q) => ({ qrCode: q.trim() }));
    } else if (req.mappings && req.mappings.length > 0) {
      targetEntries = req.mappings.map((m) => ({
        qrCode: m.qrCode.trim(),
        cardNumber: m.cardNumber ? m.cardNumber.trim().toUpperCase() : undefined,
      }));
    } else if (req.cards && req.cards.length > 0) {
      targetEntries = req.cards.map((c) => ({
        qrCode: (c.qrCode || '').trim(),
        cardNumber: c.cardNumber ? c.cardNumber.trim().toUpperCase() : undefined,
      }));
    }

    targetEntries = targetEntries.filter((e) => !!e.qrCode);
    if (targetEntries.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No QR codes provided for import');
    }

    // Plan Card Limit check
    const subscription = mockStore.subscriptions.find((s) => s.organizationId === orgId);
    if (subscription) {
      const plan = mockStore.plans.find((p) => p.id === subscription.planId);
      if (plan) {
        const effectiveCardLimit = subscription.overrides?.cardLimit ?? plan.cardLimit;
        const currentCount = mockStore.cards.filter((c) => c.organizationId === orgId).length;
        if (currentCount + targetEntries.length > effectiveCardLimit) {
          return createMockError(
            'PLAN_LIMIT_REACHED',
            `Importing ${targetEntries.length} QR code(s) exceeds your subscription card limit of ${effectiveCardLimit} (currently ${currentCount} registered)`,
          );
        }
      }
    }

    const existingQrs = new Set(mockStore.cards.map((c) => c.qrToken.toLowerCase()));
    const existingNums = new Set(
      mockStore.cards
        .filter((c) => c.organizationId === orgId && !!c.physicalCardNumber)
        .map((c) => (c.physicalCardNumber || '').toLowerCase()),
    );

    const createdCards: Card[] = [];
    for (const entry of targetEntries) {
      if (existingQrs.has(entry.qrCode.toLowerCase())) {
        return createMockError('DUPLICATE_QR', `QR code '${entry.qrCode}' is already registered in the platform`);
      }
      existingQrs.add(entry.qrCode.toLowerCase());

      if (entry.cardNumber) {
        if (existingNums.has(entry.cardNumber.toLowerCase())) {
          return createMockError('DUPLICATE_CARD', `Card number '${entry.cardNumber}' already exists in this organization`);
        }
        existingNums.add(entry.cardNumber.toLowerCase());
      }

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
      createdCards.push(newCard);
    }

    mockStore.cards.push(...createdCards);
    const unassignedCount = createdCards.filter((c) => c.assignmentStatus === 'UNASSIGNED').length;

    return createMockSuccess({
      importedCount: createdCards.length,
      unassignedCount,
      assignedCount: createdCards.length - unassignedCount,
      cards: createdCards,
    });
  },

  async assignCardNumber(id: string, req: AssignCardNumberRequest): Promise<ApiResult<Card>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';
    const cleanNum = (req.cardNumber || '').trim().toUpperCase();

    if (!cleanNum) {
      return createMockError('VALIDATION_ERROR', 'Card number is required');
    }

    const card = mockStore.cards.find((c) => c.id === id && c.organizationId === orgId);
    if (!card) {
      return createMockError('NOT_FOUND', 'Card not found in your organization');
    }

    const duplicate = mockStore.cards.find(
      (c) => c.organizationId === orgId && c.physicalCardNumber?.toLowerCase() === cleanNum.toLowerCase() && c.id !== id,
    );
    if (duplicate) {
      return createMockError('DUPLICATE_CARD_NUMBER', `Card number '${cleanNum}' is already assigned to another card in your organization`);
    }

    card.physicalCardNumber = cleanNum;
    card.assignmentStatus = 'ASSIGNED';
    card.updatedAt = mockStore.getTimestamp();

    return createMockSuccess(card);
  },

  async bulkAssignCardNumbers(req: BulkAssignCardNumbersRequest): Promise<ApiResult<BulkAssignCardNumbersResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    const orgId = currentUser.organizationId || 'org_001';

    if (!req.assignments || req.assignments.length === 0) {
      return createMockError('VALIDATION_ERROR', 'No assignments provided');
    }

    const updated: Card[] = [];
    for (const a of req.assignments) {
      const cleanNum = (a.cardNumber || '').trim().toUpperCase();
      const card = mockStore.cards.find(
        (c) => c.organizationId === orgId && (c.id === a.cardId || c.qrToken.toLowerCase() === (a.qrCode || '').toLowerCase()),
      );
      if (card) {
        card.physicalCardNumber = cleanNum;
        card.assignmentStatus = 'ASSIGNED';
        card.updatedAt = mockStore.getTimestamp();
        updated.push(card);
      }
    }

    return createMockSuccess({
      assignedCount: updated.length,
      cards: updated,
    });
  },
};

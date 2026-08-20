import { mockStore } from '../store';
import { mockDelay, createMockSuccess, createMockError, paginateArray } from '../utils';
import { mockAuthHandlers } from './auth';
import type {
  ApiResult,
  CardSession,
  PaginatedData,
  PaginationParams,
  CreateSessionRequest,
  RechargeRequest,
  RechargeResponseData,
  PurchaseRequest,
  PurchaseResponseData,
  RefundResponseData,
  Payment,
  Transaction,
  PurchaseItem,
  SessionStatus,
} from '@/types';

export interface CardSessionOverview extends CardSession {
  physicalCardNumber?: string;
  branchName?: string;
}

export const mockSessionsHandlers = {
  async getSessions(
    params?: PaginationParams & {
      cardId?: string;
      branchId?: string;
      status?: SessionStatus | 'ALL';
    },
  ): Promise<ApiResult<PaginatedData<CardSessionOverview>>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    if (currentUser.role === 'STAFF' && !currentUser.permissions.includes('PURCHASE')) {
      return createMockError('FORBIDDEN', 'Permission denied: Cannot perform purchase');
    }

    const orgId = currentUser.organizationId || 'org_001';
    const orgBranchIds = mockStore.branches.filter((b) => b.organizationId === orgId).map((b) => b.id);
    const orgCardIds = mockStore.cards.filter((c) => c.organizationId === orgId).map((c) => c.id);

    let sessions = mockStore.sessions.filter(
      (s) => orgBranchIds.includes(s.branchId) || orgCardIds.includes(s.cardId),
    );

    if (params?.cardId) {
      sessions = sessions.filter((s) => s.cardId === params.cardId);
    }

    if (params?.branchId) {
      sessions = sessions.filter((s) => s.branchId === params.branchId);
    }

    if (params?.status && params.status !== 'ALL') {
      sessions = sessions.filter((s) => s.status === params.status);
    }

    const overviews: CardSessionOverview[] = sessions.map((s) => {
      const card = mockStore.cards.find((c) => c.id === s.cardId);
      const branch = mockStore.branches.find((b) => b.id === s.branchId);
      return {
        ...s,
        physicalCardNumber: card ? card.physicalCardNumber : 'MC-000',
        branchName: branch ? branch.name : 'Branch',
      };
    });

    if (params?.search) {
      const q = params.search.toLowerCase();
      const filtered = overviews.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.physicalCardNumber && o.physicalCardNumber.toLowerCase().includes(q)) ||
          (o.branchName && o.branchName.toLowerCase().includes(q)),
      );
      const page = params?.page ?? 1;
      const limit = params?.limit ?? 10;
      return createMockSuccess(paginateArray(filtered, page, limit));
    }

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    return createMockSuccess(paginateArray(overviews, page, limit));
  },

  async getSessionById(id: string): Promise<ApiResult<CardSessionOverview>> {
    await mockDelay();
    const session = mockStore.sessions.find((s) => s.id === id);
    if (!session) {
      return createMockError('SESSION_NOT_FOUND', `Session '${id}' not found`);
    }

    const card = mockStore.cards.find((c) => c.id === session.cardId);
    const branch = mockStore.branches.find((b) => b.id === session.branchId);

    return createMockSuccess({
      ...session,
      physicalCardNumber: card ? card.physicalCardNumber : 'MC-000',
      branchName: branch ? branch.name : 'Branch',
    });
  },

  async getSessionTransactions(sessionId: string): Promise<ApiResult<Transaction[]>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    if (currentUser.role === 'STAFF' && !currentUser.permissions.includes('PURCHASE')) {
      return createMockError('FORBIDDEN', 'Permission denied: Cannot perform purchase');
    }

    const txns = mockStore.transactions.filter((t) => t.sessionId === sessionId);
    return createMockSuccess(txns);
  },

  async createSession(req: CreateSessionRequest): Promise<ApiResult<CardSession>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    if (currentUser.role === 'STAFF' && !currentUser.permissions.includes('PURCHASE')) {
      return createMockError('FORBIDDEN', 'Permission denied: Cannot perform purchase');
    }

    const card = mockStore.cards.find((c) => c.id === req.cardId);
    if (!card) {
      return createMockError('CARD_NOT_FOUND', `Card '${req.cardId}' not found`);
    }

    if (card.status === 'BLOCKED') {
      return createMockError(
        'CARD_BLOCKED',
        `Card '${card.physicalCardNumber}' is blocked and cannot open a new session`,
      );
    }

    const existingActiveSession = mockStore.sessions.find(
      (s) => s.cardId === req.cardId && s.status === 'ACTIVE',
    );
    if (existingActiveSession) {
      return createMockError(
        'CARD_NOT_AVAILABLE',
        `Card '${card.physicalCardNumber}' already has an active session (${existingActiveSession.id})`,
      );
    }

    const newSession: CardSession = {
      id: mockStore.generateId('SESSION'),
      cardId: req.cardId,
      branchId: req.branchId,
      status: 'ACTIVE',
      balance: 0,
      startedAt: mockStore.getTimestamp(),
      createdAt: mockStore.getTimestamp(),
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.sessions.push(newSession);

    card.status = 'ACTIVE';
    card.currentBranchId = req.branchId;
    card.updatedAt = mockStore.getTimestamp();

    return createMockSuccess(newSession);
  },

  async rechargeSession(
    sessionId: string,
    req: RechargeRequest,
  ): Promise<ApiResult<RechargeResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    if (currentUser.role === 'STAFF' && !currentUser.permissions.includes('PURCHASE')) {
      return createMockError('FORBIDDEN', 'Permission denied: Cannot perform purchase');
    }

    if (!req.amount || req.amount <= 0) {
      return createMockError('VALIDATION_ERROR', 'Recharge amount must be greater than zero');
    }

    if (req.paymentMethod !== 'CASH' && req.paymentMethod !== 'UPI') {
      return createMockError('VALIDATION_ERROR', 'Recharge payment method must be CASH or UPI');
    }

    const sessionIndex = mockStore.sessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex === -1) {
      return createMockError('SESSION_NOT_FOUND', `Session '${sessionId}' not found`);
    }

    const session = mockStore.sessions[sessionIndex];
    if (session.status !== 'ACTIVE') {
      return createMockError(
        'SESSION_NOT_ACTIVE',
        `Session '${sessionId}' is settled and cannot be recharged`,
      );
    }

    const newBalance = Number((session.balance + req.amount).toFixed(2));
    session.balance = newBalance;
    session.updatedAt = mockStore.getTimestamp();

    const transactionId = mockStore.generateId('TXN');
    const paymentId = mockStore.generateId('PAYMENT');

    const transaction: Transaction = {
      id: transactionId,
      sessionId: session.id,
      branchId: session.branchId,
      type: 'RECHARGE',
      amount: req.amount,
      balanceAfter: newBalance,
      status: 'SUCCESS',
      paymentMethod: req.paymentMethod,
      externalReference: req.externalReference,
      createdAt: mockStore.getTimestamp(),
    };

    const payment: Payment = {
      id: paymentId,
      transactionId,
      amount: req.amount,
      status: 'SUCCESS',
      paymentMethod: req.paymentMethod,
      externalReference: req.externalReference,
      createdAt: mockStore.getTimestamp(),
    };

    mockStore.transactions.push(transaction);
    mockStore.payments.push(payment);

    mockStore.auditLogs.push({
      id: mockStore.generateId('audit'),
      branchId: session.branchId,
      actorStaffId: currentUser.id,
      action: 'RECHARGE',
      resourceType: 'CardSession',
      resourceId: session.id,
      metadata: { amount: req.amount, paymentMethod: req.paymentMethod, newBalance },
      createdAt: mockStore.getTimestamp(),
    });

    return createMockSuccess({
      sessionId: session.id,
      paymentId,
      paymentMethod: req.paymentMethod,
      amount: req.amount,
      balance: newBalance,
      status: session.status,
    });
  },

  async purchase(
    sessionId: string,
    req: PurchaseRequest,
  ): Promise<ApiResult<PurchaseResponseData>> {
    return this.purchaseSession(sessionId, req);
  },

  async purchaseSession(
    sessionId: string,
    req: PurchaseRequest,
  ): Promise<ApiResult<PurchaseResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    if (currentUser.role === 'STAFF' && !currentUser.permissions.includes('PURCHASE')) {
      return createMockError('FORBIDDEN', 'Permission denied: Cannot perform purchase');
    }

    if (!req.items || req.items.length === 0) {
      return createMockError('VALIDATION_ERROR', 'Purchase request must contain at least one item');
    }

    const sessionIndex = mockStore.sessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex === -1) {
      return createMockError('SESSION_NOT_FOUND', `Session '${sessionId}' not found`);
    }

    const session = mockStore.sessions[sessionIndex];
    if (session.status !== 'ACTIVE') {
      return createMockError(
        'SESSION_NOT_ACTIVE',
        `Session '${sessionId}' is not active for purchases`,
      );
    }

    let totalCalculatedAmount = 0;
    const itemsDetail: PurchaseItem[] = [];

    for (const item of req.items) {
      if (item.quantity <= 0) {
        return createMockError(
          'VALIDATION_ERROR',
          `Item quantity must be positive (got ${item.quantity})`,
        );
      }

      const product = mockStore.products.find((p) => p.id === item.productId);
      if (!product) {
        return createMockError('NOT_FOUND', `Product '${item.productId}' not found`);
      }

      if (product.status !== 'ACTIVE') {
        return createMockError('VALIDATION_ERROR', `Product '${product.itemName}' is inactive`);
      }

      if (product.branchId !== session.branchId) {
        return createMockError(
          'BRANCH_ACCESS_DENIED',
          `Product '${product.itemName}' does not belong to session branch`,
        );
      }

      const inventoryItem = mockStore.inventory.find(
        (inv) => inv.productId === product.id && inv.branchId === session.branchId,
      );

      const availableQty = inventoryItem ? inventoryItem.quantity : 0;
      if (availableQty < item.quantity) {
        return createMockError(
          'INSUFFICIENT_INVENTORY',
          `Insufficient stock for '${product.itemName}'. Available: ${availableQty}, Requested: ${item.quantity}`,
        );
      }

      const itemTotal = Number((product.price * item.quantity).toFixed(2));
      totalCalculatedAmount += itemTotal;

      itemsDetail.push({
        productId: product.id,
        itemName: product.itemName,
        quantity: item.quantity,
        unitPrice: product.price,
        totalAmount: itemTotal,
      });
    }

    totalCalculatedAmount = Number(totalCalculatedAmount.toFixed(2));

    if (session.balance < totalCalculatedAmount) {
      return createMockError(
        'INSUFFICIENT_BALANCE',
        `Insufficient session balance. Required: ₹${totalCalculatedAmount}, Available: ₹${session.balance}`,
      );
    }

    const newBalance = Number((session.balance - totalCalculatedAmount).toFixed(2));
    session.balance = newBalance;
    session.updatedAt = mockStore.getTimestamp();

    for (const item of req.items) {
      const invIndex = mockStore.inventory.findIndex(
        (inv) => inv.productId === item.productId && inv.branchId === session.branchId,
      );
      if (invIndex !== -1) {
        mockStore.inventory[invIndex].quantity -= item.quantity;
        mockStore.inventory[invIndex].updatedAt = mockStore.getTimestamp();
      }
    }

    const transactionId = mockStore.generateId('TXN');
    const transaction: Transaction = {
      id: transactionId,
      sessionId: session.id,
      branchId: session.branchId,
      type: 'PURCHASE',
      amount: totalCalculatedAmount,
      balanceAfter: newBalance,
      status: 'SUCCESS',
      items: itemsDetail,
      createdAt: mockStore.getTimestamp(),
    };

    mockStore.transactions.push(transaction);

    mockStore.auditLogs.push({
      id: mockStore.generateId('audit'),
      branchId: session.branchId,
      actorStaffId: currentUser.id,
      action: 'PURCHASE',
      resourceType: 'CardSession',
      resourceId: session.id,
      metadata: { transactionId, amount: totalCalculatedAmount, newBalance },
      createdAt: mockStore.getTimestamp(),
    });

    return createMockSuccess({
      transactionId,
      amount: totalCalculatedAmount,
      balance: newBalance,
      status: 'SUCCESS',
    });
  },

  async returnSession(sessionId: string): Promise<ApiResult<RefundResponseData>> {
    return this.refundSession(sessionId);
  },

  async refundSession(sessionId: string): Promise<ApiResult<RefundResponseData>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    if (currentUser.role === 'STAFF' && !currentUser.permissions.includes('PURCHASE')) {
      return createMockError('FORBIDDEN', 'Permission denied: Cannot perform purchase');
    }

    const sessionIndex = mockStore.sessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex === -1) {
      return createMockError('SESSION_NOT_FOUND', `Session '${sessionId}' not found`);
    }

    const session = mockStore.sessions[sessionIndex];
    if (session.status !== 'ACTIVE') {
      return createMockError(
        'ALREADY_SETTLED',
        `Session '${sessionId}' has already been settled and refunded`,
      );
    }

    const refundAmount = session.balance;

    session.balance = 0;
    session.status = 'SETTLED';
    session.settledAt = mockStore.getTimestamp();
    session.updatedAt = mockStore.getTimestamp();

    const cardIndex = mockStore.cards.findIndex((c) => c.id === session.cardId);
    const cardStatus = 'AVAILABLE' as const;
    if (cardIndex !== -1) {
      mockStore.cards[cardIndex].status = 'AVAILABLE';
      mockStore.cards[cardIndex].currentBranchId = null;
      mockStore.cards[cardIndex].updatedAt = mockStore.getTimestamp();
    }

    const transactionId = mockStore.generateId('TXN');
    const transaction: Transaction = {
      id: transactionId,
      sessionId: session.id,
      branchId: session.branchId,
      type: 'REFUND',
      amount: refundAmount,
      balanceAfter: 0,
      status: 'SUCCESS',
      createdAt: mockStore.getTimestamp(),
    };

    mockStore.transactions.push(transaction);

    mockStore.auditLogs.push({
      id: mockStore.generateId('audit'),
      branchId: session.branchId,
      actorStaffId: currentUser.id,
      action: 'REFUND',
      resourceType: 'CardSession',
      resourceId: session.id,
      metadata: { refundedAmount: refundAmount, sessionStatus: 'SETTLED' },
      createdAt: mockStore.getTimestamp(),
    });

    return createMockSuccess({
      sessionId: session.id,
      refundedAmount: refundAmount,
      sessionStatus: 'SETTLED',
      cardStatus,
    });
  },
};

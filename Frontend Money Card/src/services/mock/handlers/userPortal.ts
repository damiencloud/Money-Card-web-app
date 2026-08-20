import { mockStore } from '../store';
import { mockDelay, createMockSuccess, createMockError } from '../utils';
import type {
  ApiResult,
  PublicSessionDetail,
  PublicTransaction,
  PublicReceipt,
} from '@/types';

// Map session tokens to session IDs
const publicSessionTokens: Map<string, string> = new Map([
  ['portal_token_mc001_session001', 'SESSION001'],
]);

export const mockUserPortalHandlers = {
  async resolvePublicCard(qrToken: string): Promise<
    ApiResult<{
      sessionToken: string;
      cardDisplayNumber: string;
      sessionStatus: string;
      currentBalance: number;
    }>
  > {
    await mockDelay();
    if (!qrToken) {
      return createMockError('VALIDATION_ERROR', 'QR token is required');
    }

    const card = mockStore.cards.find((c) => c.qrToken === qrToken);
    if (!card) {
      return createMockError('CARD_NOT_FOUND', 'Invalid QR code. Card not found.');
    }

    if (card.status === 'BLOCKED') {
      return createMockError(
        'CARD_BLOCKED',
        'This card has been blocked by store staff. Please visit cafeteria desk.',
      );
    }

    const activeSession = mockStore.sessions.find(
      (s) => s.cardId === card.id && s.status === 'ACTIVE',
    );

    if (!activeSession) {
      return createMockError(
        'SESSION_NOT_FOUND',
        'No active card session found. Please request cafeteria staff to issue a session.',
      );
    }

    const sessionToken = `portal_token_${card.physicalCardNumber.toLowerCase()}_${activeSession.id.toLowerCase()}`;
    publicSessionTokens.set(sessionToken, activeSession.id);

    return createMockSuccess({
      sessionToken,
      cardDisplayNumber: card.physicalCardNumber,
      sessionStatus: activeSession.status,
      currentBalance: activeSession.balance,
    });
  },

  async getPublicSessionDetail(sessionToken: string): Promise<ApiResult<PublicSessionDetail>> {
    await mockDelay();
    const sessionId = publicSessionTokens.get(sessionToken);
    if (!sessionId) {
      return createMockError(
        'UNAUTHORIZED',
        'Invalid or expired public portal session token',
      );
    }

    const session = mockStore.sessions.find((s) => s.id === sessionId);
    if (!session) {
      return createMockError('SESSION_NOT_FOUND', 'Session not found');
    }

    const card = mockStore.cards.find((c) => c.id === session.cardId);
    const branch = mockStore.branches.find((b) => b.id === session.branchId);

    return createMockSuccess({
      sessionId: session.id,
      cardDisplayNumber: card ? card.physicalCardNumber : 'MC-000',
      sessionStatus: session.status,
      currentBalance: session.balance,
      branchDisplayName: branch ? branch.name : 'Cafeteria Branch',
      startedAt: session.startedAt,
      settledAt: session.settledAt || null,
      settlementStatus: session.status === 'SETTLED' ? 'SETTLED_REFUNDED' : 'ACTIVE_IN_USE',
    });
  },

  async getPublicSessionTransactions(
    sessionToken: string,
  ): Promise<ApiResult<PublicTransaction[]>> {
    await mockDelay();
    const sessionId = publicSessionTokens.get(sessionToken);
    if (!sessionId) {
      return createMockError(
        'UNAUTHORIZED',
        'Invalid or expired public portal session token',
      );
    }

    const txns = mockStore.transactions.filter((t) => t.sessionId === sessionId);

    const publicTxns: PublicTransaction[] = txns.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      status: t.status,
      timestamp: t.createdAt,
      paymentMethod: t.paymentMethod,
      externalReference: t.externalReference,
      items: t.items
        ? t.items.map((i) => ({
            itemName: i.itemName || 'Product',
            quantity: i.quantity,
            unitPrice: i.unitPrice || 0,
            totalPrice: i.totalAmount || 0,
          }))
        : undefined,
    }));

    return createMockSuccess(publicTxns);
  },

  async getPublicSessionReceipts(sessionToken: string): Promise<ApiResult<PublicReceipt[]>> {
    await mockDelay();
    const sessionId = publicSessionTokens.get(sessionToken);
    if (!sessionId) {
      return createMockError(
        'UNAUTHORIZED',
        'Invalid or expired public portal session token',
      );
    }

    const txns = mockStore.transactions.filter(
      (t) => t.sessionId === sessionId && t.type === 'PURCHASE',
    );

    const receipts: PublicReceipt[] = txns.map((t) => ({
      receiptId: `RCPT_${t.id}`,
      sessionId: t.sessionId,
      date: t.createdAt,
      totalAmount: t.amount,
      paymentMethod: t.paymentMethod || 'CARD_SESSION_BALANCE',
      items: t.items
        ? t.items.map((i) => ({
            itemName: i.itemName || 'Product',
            quantity: i.quantity,
            unitPrice: i.unitPrice || 0,
            totalPrice: i.totalAmount || 0,
          }))
        : [],
    }));

    return createMockSuccess(receipts);
  },
};

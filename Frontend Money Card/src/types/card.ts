// ─── Card Entities & Lifecycles (M0 Section 4 & 7) ─────────────
// Physical card: human-readable physicalCardNumber (e.g. MC-001) + unique opaque qrToken.
// QR contains ONLY the HTTPS URL with opaque token — NO DB UUID, balance, secrets, or numbers.

export type CardStatus = 'AVAILABLE' | 'ACTIVE' | 'BLOCKED';

export interface Card {
  id: string;
  organizationId: string;
  qrToken: string;
  physicalCardNumber: string;
  status: CardStatus;
  currentBranchId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Card Session ──────────────────────────────────────────
// Wallet balance belongs to CardSession, NOT the physical card.
// A Card has many historical sessions, but ONLY ONE ACTIVE session at a time.

export type SessionStatus = 'ACTIVE' | 'SETTLED';

export interface CardSession {
  id: string;
  cardId: string;
  branchId: string;
  status: SessionStatus;
  balance: number;
  cycleNumber?: number;
  sessionCardNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  physicalCardNumber?: string | null;
  startedAt: string;
  settledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  transactions?: any[];
}

// ─── Transactions & Payments ────────────────────────────────

export type TransactionType = 'RECHARGE' | 'PURCHASE' | 'REFUND';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'UPI';

export interface PurchaseItem {
  productId: string;
  quantity: number;
  itemName?: string;
  unitPrice?: number;
  totalAmount?: number;
}

export interface Transaction {
  id: string;
  sessionId: string;
  branchId: string;
  type: TransactionType;
  amount: number;
  balanceAfter?: number;
  status: TransactionStatus;
  items?: PurchaseItem[];
  paymentMethod?: PaymentMethod;
  externalReference?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  transactionId: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED';
  paymentMethod: PaymentMethod;
  externalReference?: string;
  createdAt: string;
}

// ─── Request & Response Payload Specs ─────────────────────

export interface CreateCardRequest {
  physicalCardNumber: string;
  branchId: string;
}

export interface ResolveQrRequest {
  qrToken: string;
}

export interface ResolveQrResponseData {
  card: Card;
  session: CardSession | null;
}

export interface CreateSessionRequest {
  cardId: string;
  branchId: string;
}

export interface RechargeRequest {
  amount: number;
  paymentMethod: PaymentMethod;
  externalReference?: string;
}

export interface RechargeResponseData {
  sessionId: string;
  paymentId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  balance: number;
  status: SessionStatus;
}

export interface PurchaseRequest {
  items: {
    productId: string;
    quantity: number;
  }[];
}

export interface PurchaseResponseData {
  transactionId: string;
  amount: number;
  balance: number;
  status: TransactionStatus;
}

export interface RefundResponseData {
  sessionId: string;
  refundedAmount: number;
  sessionStatus: SessionStatus;
  cardStatus: CardStatus;
}

// ─── Card Bulk Import Specs (M-Card Import) ────────────────
// ── Card Bulk Import Specs (M-Card Import) ──
export type CardImportMode = 'AUTO_GENERATED_QR' | 'PREPRINTED_QR';

export interface ImportCardEntry {
  cardNumber: string;
  qrToken?: string;
}

export interface CardImportValidationError {
  rowNumber: number;
  cardNumber: string;
  qrCode?: string;
  reason: string;
}

export interface CardImportPreview {
  mode: CardImportMode;
  totalRows: number;
  validCards: string[];
  validEntries: ImportCardEntry[];
  duplicateCards: string[];
  invalidCards: CardImportValidationError[];
}

export interface ImportCardsRequest {
  branchId?: string;
  importMode: CardImportMode;
  cardNumbers?: string[];
  cards?: ImportCardEntry[];
}

export interface ImportCardsResponseData {
  importedCount: number;
  cards: Card[];
}


export type CardHistoryAction = 'CARD_BLOCKED' | 'CARD_UNBLOCKED' | 'CARD_ISSUED' | 'CARD_RETURNED';

export interface CustomerHistoryEvent {
  id: string;
  cardId: string;
  sessionId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  physicalCardNumber: string;
  action: CardHistoryAction;
  previousStatus: CardStatus;
  newStatus: CardStatus;
  performedByName?: string | null;
  performedByUserId?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  reason?: string | null;
  createdAt: string;
}

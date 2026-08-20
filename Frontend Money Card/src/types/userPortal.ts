// ─── User Portal Public Response Requirements (M0 Section 35) ──
import type { SessionStatus, TransactionType, TransactionStatus } from './card';

export interface PublicSessionDetail {
  sessionId: string;
  cardDisplayNumber: string; // e.g. MC-001 (Human readable card display number, NOT raw QR token)
  sessionStatus: SessionStatus;
  currentBalance: number;
  branchDisplayName: string;
  startedAt: string;
  settledAt?: string | null;
  settlementStatus: string;
}

export interface PublicTransactionItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PublicTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  timestamp: string;
  paymentMethod?: string;
  externalReference?: string;
  items?: PublicTransactionItem[];
}

export interface PublicReceipt {
  receiptId: string;
  sessionId: string;
  date: string;
  totalAmount: number;
  paymentMethod?: string;
  items: PublicTransactionItem[];
}

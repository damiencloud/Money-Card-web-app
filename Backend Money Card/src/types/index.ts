import { Request } from 'express';
import { PermissionCode, Role, UserStatus } from '@prisma/client';

export { PermissionCode, Role, UserStatus };

export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'STAFF';

export type CardStatus = 'AVAILABLE' | 'ACTIVE' | 'BLOCKED';

export type SessionStatus = 'ACTIVE' | 'SETTLED';

export type TransactionType = 'RECHARGE_CASH' | 'RECHARGE_UPI' | 'PURCHASE' | 'REFUND_RETURN';

export type PaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'CARD_BALANCE'
  | 'DIRECT_BANK_TRANSFER'
  | 'CHEQUE'
  | 'GATEWAY_ONLINE'
  | 'OTHER';

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'TRIAL' | 'SUSPENDED' | 'CANCELLED';

export type PlanChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type Permission =
  | 'CARD_VIEW'
  | 'CARD_ISSUE'
  | 'CARD_RETURN'
  | 'CARD_BLOCK'
  | 'CARD_UNBLOCK'
  | 'RECHARGE'
  | 'PURCHASE'
  | 'REFUND'
  | 'SESSION_VIEW'
  | 'PRODUCT_VIEW'
  | 'PRODUCT_MANAGE'
  | 'INVENTORY_VIEW'
  | 'INVENTORY_MANAGE'
  | 'INVENTORY_IMPORT'
  | 'VIEW_ANALYTICS'
  | 'VIEW_REPORTS'
  | 'STAFF_VIEW'
  | 'STAFF_MANAGE'
  | 'BRANCH_VIEW'
  | 'BRANCH_MANAGE';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string | null;
  status: UserStatus;
  mustChangePassword: boolean;
  permissions: PermissionCode[];
  assignedBranchIds: string[];
  tokenVersion: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

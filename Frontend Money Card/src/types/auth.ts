// ─── Actor Roles (M0 Section 2) ──────────────────────────────
export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'STAFF' | 'USER';

// ─── Permission Identifiers (M0 Section 3) ─────────────────
// Exactly 20 permissions defined in M0 Shared System Contract:
export type Permission =
  // Card
  | 'CARD_VIEW'
  | 'CARD_ISSUE'
  | 'CARD_RETURN'
  | 'CARD_BLOCK'
  | 'CARD_UNBLOCK'
  // Sessions/Payments
  | 'RECHARGE'
  | 'PURCHASE'
  | 'REFUND'
  | 'SESSION_VIEW'
  // Inventory/Products
  | 'PRODUCT_VIEW'
  | 'PRODUCT_MANAGE'
  | 'INVENTORY_VIEW'
  | 'INVENTORY_MANAGE'
  | 'INVENTORY_IMPORT'
  // Analytics/Reports
  | 'VIEW_ANALYTICS'
  | 'VIEW_REPORTS'
  // Staff
  | 'STAFF_VIEW'
  | 'STAFF_MANAGE'
  // Branch
  | 'BRANCH_VIEW'
  | 'BRANCH_MANAGE';

// ─── User & Auth Entities ───────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string | null;
  organizationName?: string | null;
  mustChangePassword?: boolean;
  permissions: Permission[];
  assignedBranchIds: string[];
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponseData {
  accessToken: string;
  user: AuthUser;
  refreshToken?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}


export interface VerifyActivationTokenResponse {
  valid: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    organizationName: string | null;
  };
}

export interface ActivateAccountRequest {
  token: string;
  password: string;
  confirmPassword?: string;
}

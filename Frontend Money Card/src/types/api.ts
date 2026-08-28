// ─── M0 API Response Envelopes & Error Codes ─────────────────

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'ORGANIZATION_ACCESS_DENIED'
  | 'BRANCH_ACCESS_DENIED'
  | 'PERMISSION_DENIED'
  | 'CARD_NOT_FOUND'
  | 'CARD_NOT_AVAILABLE'
  | 'CARD_BLOCKED'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_NOT_ACTIVE'
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_INVENTORY'
  | 'ALREADY_SETTLED'
  | 'REFUND_ALREADY_PROCESSED'
  | 'PLAN_LIMIT_REACHED'
  | 'CSV_VALIDATION_ERROR'
  | 'DUPLICATE_REQUEST'
  | 'PAYMENT_FAILED'
  | 'SUBSCRIPTION_NOT_FOUND'
  | 'SUBSCRIPTION_NOT_ACTIVE'
  | 'PAYMENT_VERIFICATION_FAILED'
  | 'DOWNGRADE_LIMIT_EXCEEDED'
  | 'WEBHOOK_VERIFICATION_FAILED'
  | 'DUPLICATE_QR'
  | 'DUPLICATE_CARD'
  | 'DUPLICATE_CARD_NUMBER'
  | 'REQUEST_ALREADY_PENDING';

export interface ApiErrorDetails {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetails;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginatedResponse<T> {
  success: true;
  data: PaginatedData<T>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  branchId?: string;
}


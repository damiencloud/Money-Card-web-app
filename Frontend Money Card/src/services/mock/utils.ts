import type {
  ApiResponse,
  ApiErrorResponse,
  ApiErrorCode,
  PaginatedData,
} from '@/types';

export function mockDelay(ms: number = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockSuccess<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}

export function createMockError(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}

export function paginateArray<T>(
  items: T[],
  page: number = 1,
  limit: number = 10,
): PaginatedData<T> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const total = items.length;
  const totalPages = Math.ceil(total / safeLimit) || 1;
  const startIndex = (safePage - 1) * safeLimit;
  const paginatedItems = items.slice(startIndex, startIndex + safeLimit);

  return {
    items: paginatedItems,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

import { apiClient } from './client';
import type {
  ApiResult,
  ApiErrorCode,
  AuthResponseData,
  LoginCredentials,
  AuthUser,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  OrganizationOverview,
  Organization,
  Branch,
  PaginatedData,
  PaginationParams,
  Card,
  CreateCardRequest,
  ResolveQrResponseData,
  ImportCardsRequest,
  ImportCardsResponseData,
  ImportQrCodesRequest,
  ImportQrCodesResponseData,
  AssignCardNumberRequest,
  BulkAssignCardNumbersRequest,
  BulkAssignCardNumbersResponseData,
  Staff,
  CreateStaffRequest,
  UpdateStaffRequest,
  Permission,
  ProductWithInventory,
  CreateProductRequest,
  UpdateProductRequest,
  InventoryItem,
  CardSession,
  CreateSessionRequest,
  Transaction,
  RefundResponseData,
  AnalyticsOverview,
  PeakAnalyticsOverview,
  AnalyticsExportResponseData,
  AnalyticsFilter,
  ReportItem,
  Plan,
  Subscription,
  SubscriptionPayment,
  PlanChangeRequest,
  CreatePlanRequestInput,
  PublicSessionDetail,
  PublicReceipt,
  PublicTransaction,
  CheckoutRequest,
  CheckoutResponseData,
  RechargeRequest,
  RechargeResponseData,
  PurchaseRequest,
  PurchaseResponseData,
  CustomerHistoryEvent,
} from '@/types';
import { mockClient } from '../mock/mockClient';

async function handleApiCall<T>(call: () => Promise<any>): Promise<ApiResult<T>> {
  try {
    const res = await call();
    if (res && res.success !== undefined) {
      return res as ApiResult<T>;
    }
    return {
      success: true,
      data: res as T,
    };
  } catch (err: unknown) {
    const error = err as { message?: string; status?: number; code?: ApiErrorCode; errors?: any };
    return {
      success: false,
      error: {
        code: error.code || 'VALIDATION_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: error.errors,
      },
    };
  }
}

function toPaginated<T>(items: T[], page = 1, limit = 50, total?: number): PaginatedData<T> {
  const tot = total !== undefined ? total : items.length;
  return {
    items,
    pagination: {
      page,
      limit,
      total: tot,
      totalPages: Math.ceil(tot / limit) || 1,
    },
  };
}

export const realClient: typeof mockClient = {
  auth: {
    async login(credentials: LoginCredentials): Promise<ApiResult<AuthResponseData>> {
      const res = await handleApiCall<AuthResponseData>(() =>
        apiClient.post<AuthResponseData>('/v1/auth/login', credentials),
      );
      if (res.success && res.data?.accessToken) {
        apiClient.setAccessToken(res.data.accessToken);
      }
      return res;
    },

    async refresh(refreshToken?: string): Promise<ApiResult<{ accessToken: string }>> {
      return handleApiCall(() =>
        apiClient.post<{ accessToken: string }>('/v1/auth/refresh', refreshToken ? { refreshToken } : {}),
      );
    },

    async logout(): Promise<ApiResult<{ message: string }>> {
      const res = await handleApiCall<{ message: string }>(() =>
        apiClient.post<{ message: string }>('/v1/auth/logout'),
      );
      apiClient.setAccessToken(null);
      return res;
    },

    async getMe(): Promise<ApiResult<AuthUser>> {
      return handleApiCall(() => apiClient.get<AuthUser>('/v1/auth/me'));
    },

    async forgotPassword(req: ForgotPasswordRequest): Promise<ApiResult<{ message: string }>> {
      return handleApiCall(() =>
        apiClient.post<{ message: string }>('/v1/auth/forgot-password', req),
      );
    },

    async resetPassword(req: ResetPasswordRequest): Promise<ApiResult<{ message: string }>> {
      return handleApiCall(() =>
        apiClient.post<{ message: string }>('/v1/auth/reset-password', req),
      );
    },

    async changePassword(req: ChangePasswordRequest): Promise<ApiResult<{ message: string }>> {
      return handleApiCall(() =>
        apiClient.post<{ message: string }>('/v1/auth/change-password', req),
      );
    },

    async verifyActivationToken(token: string): Promise<ApiResult<{ valid: boolean; user: { id: string; name: string; email: string; role: any; organizationName: string | null } }>> {
      return handleApiCall(() =>
        apiClient.get(`/v1/auth/verify-activation-token?token=${encodeURIComponent(token)}`),
      );
    },

    async activateAccount(req: { token: string; password: string; confirmPassword?: string }): Promise<ApiResult<{ message: string; accessToken: string; refreshToken?: string; user: AuthUser }>> {
      return handleApiCall(() =>
        apiClient.post('/v1/auth/activate-account', req),
      );
    },

    setMockSessionUser(): void {},
    getCurrentSessionUser(): AuthUser | null {
      return null;
    },
  },

  organizations: {
    async resendAdminInvite(orgId: string): Promise<ApiResult<any>> {
      return handleApiCall(() => apiClient.post(`/v1/admin/organizations/${orgId}/resend-invite`));
    },
    async getOrganization(): Promise<ApiResult<OrganizationOverview>> {
      return handleApiCall(() => apiClient.get<OrganizationOverview>('/v1/organization'));
    },

    async updateOrganization(data: { name?: string }): Promise<ApiResult<Organization>> {
      return handleApiCall(() => apiClient.patch<Organization>('/v1/organization', data));
    },

    async getOrganizations(params?: PaginationParams): Promise<ApiResult<PaginatedData<OrganizationOverview>>> {
      const res = await handleApiCall<any>(() => apiClient.get('/v1/admin/organizations', { params }));
      if (res.success && Array.isArray(res.data)) {
        return {
          success: true,
          data: toPaginated(res.data, params?.page || 1, params?.limit || 50),
        };
      }
      return res;
    },

    async createOrganization(data: {
      name: string;
      adminEmail?: string;
      password?: string;
      planId?: string;
    }): Promise<ApiResult<OrganizationOverview>> {
      return handleApiCall(() => apiClient.post<OrganizationOverview>('/v1/admin/organizations', data));
    },

    async getOrganizationById(id: string): Promise<ApiResult<OrganizationOverview>> {
      return handleApiCall(() => apiClient.get<OrganizationOverview>(`/v1/admin/organizations/${id}`));
    },

    async updateAdminOrganization(
      id: string,
      data: { name?: string; status?: string; planId?: string; overrides?: any },
    ): Promise<ApiResult<OrganizationOverview>> {
      return handleApiCall(() => apiClient.patch<OrganizationOverview>(`/v1/admin/organizations/${id}`, data));
    },

    async resetOrgAdminPassword(
      id: string,
      data: { temporaryPassword: string },
    ): Promise<ApiResult<{ message: string; user?: any }>> {
      return handleApiCall(() =>
        apiClient.post<{ message: string; user?: any }>(
          `/v1/admin/organizations/${id}/reset-admin-password`,
          data,
        ),
      );
    },
  },

  branches: {
    async getBranches(params?: PaginationParams): Promise<ApiResult<PaginatedData<Branch>>> {
      const res = await handleApiCall<any>(() => apiClient.get('/v1/branches', { params }));
      if (res.success && Array.isArray(res.data)) {
        return {
          success: true,
          data: toPaginated(res.data, params?.page || 1, params?.limit || 50),
        };
      }
      return res;
    },

    async getBranchById(id: string): Promise<ApiResult<Branch>> {
      return handleApiCall(() => apiClient.get<Branch>(`/v1/branches/${id}`));
    },

    async createBranch(data: { name: string; organizationId?: string }): Promise<ApiResult<Branch>> {
      return handleApiCall(() => apiClient.post<Branch>('/v1/branches', data));
    },

    async updateBranch(id: string, data: { name?: string; status?: string }): Promise<ApiResult<Branch>> {
      return handleApiCall(() => apiClient.patch<Branch>(`/v1/branches/${id}`, data));
    },

    async deleteBranch(id: string, options?: { force?: boolean; archive?: boolean }): Promise<ApiResult<any>> {
      return handleApiCall(() => apiClient.delete(`/v1/branches/${id}`, { params: options }));
    },
  },

  staff: {
    async resendInvite(id: string): Promise<ApiResult<any>> {
      return handleApiCall(() => apiClient.post(`/v1/admin/staff/${id}/resend-invite`));
    },
    async getStaff(params?: PaginationParams): Promise<ApiResult<PaginatedData<Staff>>> {
      const res = await handleApiCall<any>(() => apiClient.get('/v1/staff', { params }));
      if (res.success && Array.isArray(res.data)) {
        return {
          success: true,
          data: toPaginated(res.data, params?.page || 1, params?.limit || 50),
        };
      }
      return res;
    },

    async getStaffById(id: string): Promise<ApiResult<Staff>> {
      return handleApiCall(() => apiClient.get<Staff>(`/v1/staff/${id}`));
    },

    async createStaff(req: CreateStaffRequest): Promise<ApiResult<Staff>> {
      return handleApiCall(() => apiClient.post<Staff>('/v1/staff', req));
    },

    async updateStaff(id: string, req: UpdateStaffRequest): Promise<ApiResult<Staff>> {
      return handleApiCall(() => apiClient.patch<Staff>(`/v1/staff/${id}`, req));
    },

    async updateStaffBranches(id: string, branchIds: string[]): Promise<ApiResult<Staff>> {
      return handleApiCall(() => apiClient.put<Staff>(`/v1/staff/${id}/branches`, { branchIds }));
    },

    async updateStaffPermissions(id: string, permissions: Permission[]): Promise<ApiResult<Staff>> {
      return handleApiCall(() => apiClient.put<Staff>(`/v1/staff/${id}/permissions`, { permissions }));
    },

    async getPermissions(): Promise<ApiResult<{ code: Permission; name: string; area: string }[]>> {
      const res = await handleApiCall<any>(() => apiClient.get('/v1/permissions'));
      if (res.success && Array.isArray(res.data)) {
        return {
          success: true,
          data: res.data.map((p: any) => ({
            code: p.code,
            name: p.label || p.name,
            area: p.category || p.area || 'General',
          })),
        };
      }
      return res;
    },

    async deleteStaff(id: string): Promise<ApiResult<any>> {
      return handleApiCall(() => apiClient.delete(`/v1/staff/${id}`));
    },
  },

  cards: {
    async getCards(params?: PaginationParams): Promise<ApiResult<PaginatedData<Card>>> {
      const res = await handleApiCall<any>(() => apiClient.get('/v1/cards', { params }));
      if (res.success && Array.isArray(res.data)) {
        return {
          success: true,
          data: toPaginated(res.data, params?.page || 1, params?.limit || 50),
        };
      }
      return res;
    },

    async getCardById(id: string): Promise<ApiResult<Card>> {
      return handleApiCall(() => apiClient.get<Card>(`/v1/cards/${id}`));
    },

    async createCard(req: CreateCardRequest): Promise<ApiResult<Card>> {
      return handleApiCall(() => apiClient.post<Card>('/v1/cards', req));
    },

    async resolveCard(qrToken: string): Promise<ApiResult<ResolveQrResponseData>> {
      return handleApiCall(() => apiClient.get<ResolveQrResponseData>(`/v1/card-sessions/active/by-qr/${qrToken}`));
    },

    async resolveQrToken(qrToken: string): Promise<ApiResult<ResolveQrResponseData>> {
      return handleApiCall(() => apiClient.get<ResolveQrResponseData>(`/v1/card-sessions/active/by-qr/${qrToken}`));
    },

    async blockCard(id: string): Promise<ApiResult<Card>> {
      return handleApiCall(() => apiClient.post<Card>(`/v1/cards/${id}/block`));
    },

    async getCustomerHistoryEvents(params?: any): Promise<ApiResult<PaginatedData<CustomerHistoryEvent>>> {
      const query = new URLSearchParams(params || {}).toString();
      const res = await handleApiCall<any>(() =>
        apiClient.get<any>(`/v1/customer-history${query ? `?${query}` : ''}`),
      );
      if (res.success) {
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        return { success: true, data: toPaginated(items, params?.page || 1, params?.limit || 50, res.data?.total) };
      }
      return res as any;
    },

    async unblockCard(id: string): Promise<ApiResult<Card>> {
      return handleApiCall(() => apiClient.post<Card>(`/v1/cards/${id}/unblock`));
    },

    async importCards(req: ImportCardsRequest): Promise<ApiResult<ImportCardsResponseData>> {
      return handleApiCall(() => apiClient.post<ImportCardsResponseData>('/v1/cards/batch', req));
    },

    async importQrCodes(req: ImportQrCodesRequest): Promise<ApiResult<ImportQrCodesResponseData>> {
      return handleApiCall(() => apiClient.post<ImportQrCodesResponseData>('/v1/cards/import-qr', req));
    },

    async assignCardNumber(id: string, req: AssignCardNumberRequest): Promise<ApiResult<Card>> {
      return handleApiCall(() => apiClient.post<Card>(`/v1/cards/${id}/assign-number`, req));
    },

    async bulkAssignCardNumbers(req: BulkAssignCardNumbersRequest): Promise<ApiResult<BulkAssignCardNumbersResponseData>> {
      return handleApiCall(() => apiClient.post<BulkAssignCardNumbersResponseData>('/v1/cards/bulk-assign', req));
    },

    async deleteCard(id: string): Promise<ApiResult<any>> {
      return handleApiCall(() => apiClient.delete(`/v1/cards/${id}`));
    },
  },

  sessions: {
    async getSessions(params?: any): Promise<ApiResult<PaginatedData<any>>> {
      const res = await handleApiCall<any>(() => apiClient.get('/v1/card-sessions', { params }));
      if (res.success) {
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        return {
          success: true,
          data: toPaginated(items, params?.page || 1, params?.limit || 50, res.data?.total || items.length),
        };
      }
      return res;
    },

    async getSessionById(id: string): Promise<ApiResult<any>> {
      return handleApiCall(() => apiClient.get(`/v1/card-sessions/${id}`));
    },

    async getSessionTransactions(sessionId: string): Promise<ApiResult<Transaction[]>> {
      const res = await handleApiCall<any>(() => apiClient.get(`/v1/card-sessions/${sessionId}`));
      if (res.success && res.data?.transactions) {
        return { success: true, data: res.data.transactions };
      }
      return res;
    },

    async createSession(req: CreateSessionRequest): Promise<ApiResult<CardSession>> {
      return handleApiCall(() => apiClient.post<CardSession>('/v1/card-sessions', req));
    },

    async rechargeSession(
      sessionId: string,
      req: RechargeRequest,
    ): Promise<ApiResult<RechargeResponseData>> {
      const res = await handleApiCall<any>(() =>
        apiClient.post(`/v1/card-sessions/${sessionId}/recharge`, req),
      );
      if (res.success) {
        return {
          success: true,
          data: {
            sessionId: res.data.id || sessionId,
            paymentId: `pay_${Date.now()}`,
            paymentMethod: req.paymentMethod || 'CASH',
            amount: req.amount,
            balance: res.data.balance || 0,
            status: 'ACTIVE',
          },
        };
      }
      return res;
    },

    async purchase(sessionId: string, req: PurchaseRequest): Promise<ApiResult<PurchaseResponseData>> {
      return handleApiCall(() => apiClient.post(`/v1/card-sessions/${sessionId}/purchase`, req));
    },

    async purchaseSession(
      sessionId: string,
      req: PurchaseRequest,
    ): Promise<ApiResult<PurchaseResponseData>> {
      return handleApiCall(() => apiClient.post(`/v1/card-sessions/${sessionId}/purchase`, req));
    },

    async returnSession(sessionId: string): Promise<ApiResult<RefundResponseData>> {
      return handleApiCall(() => apiClient.post<RefundResponseData>(`/v1/card-sessions/${sessionId}/return`));
    },

    async refundSession(sessionId: string): Promise<ApiResult<RefundResponseData>> {
      return handleApiCall(() => apiClient.post<RefundResponseData>(`/v1/card-sessions/${sessionId}/return`));
    },
  },

  products: {
    async getProducts(params?: any): Promise<ApiResult<PaginatedData<ProductWithInventory>>> {
      const res = await handleApiCall<any>(() => apiClient.get('/v1/products', { params }));
      if (res.success && Array.isArray(res.data)) {
        return {
          success: true,
          data: toPaginated(res.data, params?.page || 1, params?.limit || 50),
        };
      }
      return res;
    },

    async getProductById(id: string): Promise<ApiResult<ProductWithInventory>> {
      return handleApiCall(() => apiClient.get<ProductWithInventory>(`/v1/products/${id}`));
    },

    async createProduct(req: CreateProductRequest): Promise<ApiResult<ProductWithInventory>> {
      return handleApiCall(() => apiClient.post<ProductWithInventory>('/v1/products', req));
    },

    async updateProduct(id: string, req: UpdateProductRequest): Promise<ApiResult<ProductWithInventory>> {
      return handleApiCall(() => apiClient.patch<ProductWithInventory>(`/v1/products/${id}`, req));
    },

    async deleteProduct(id: string): Promise<ApiResult<any>> {
      return handleApiCall(() => apiClient.delete(`/v1/products/${id}`));
    },
  },

  inventory: {
    async getInventory(params?: any): Promise<ApiResult<PaginatedData<InventoryItem>>> {
      const res = await handleApiCall<any>(() => apiClient.get('/v1/inventory', { params }));
      if (res.success && Array.isArray(res.data)) {
        return {
          success: true,
          data: toPaginated(res.data, params?.page || 1, params?.limit || 50),
        };
      }
      return res;
    },

    async updateInventoryQuantity(id: string, quantity: number): Promise<ApiResult<InventoryItem>> {
      return handleApiCall(() => apiClient.patch<InventoryItem>(`/v1/inventory/${id}`, { quantity }));
    },

    async getImportTemplate(): Promise<ApiResult<{ templateCsv: string; filename: string }>> {
      return handleApiCall(() => apiClient.get('/v1/inventory/import/template'));
    },

    async importInventory(req: any): Promise<ApiResult<any>> {
      return handleApiCall(() => apiClient.post('/v1/inventory/import', req));
    },

    async deleteInventory(id: string): Promise<ApiResult<any>> {
      return handleApiCall(() => apiClient.delete(`/v1/inventory/${id}`));
    },

    async deleteInventoryByBranchAndProduct(branchId: string, productId: string): Promise<ApiResult<any>> {
      return handleApiCall(() => apiClient.delete(`/v1/inventory/${branchId}/${productId}`));
    },
  },

  analytics: {
    async getOverview(filter?: AnalyticsFilter): Promise<ApiResult<AnalyticsOverview>> {
      return handleApiCall(() => apiClient.get<AnalyticsOverview>('/v1/analytics', { params: filter }));
    },

    async getAnalyticsOverview(filter?: AnalyticsFilter): Promise<ApiResult<AnalyticsOverview>> {
      return handleApiCall(() => apiClient.get<AnalyticsOverview>('/v1/analytics', { params: filter }));
    },

    async getPeakAnalytics(filter?: AnalyticsFilter): Promise<ApiResult<PeakAnalyticsOverview>> {
      return handleApiCall(() => apiClient.get<PeakAnalyticsOverview>('/v1/analytics/peak', { params: filter }));
    },

    async exportPeakAnalyticsCsv(filter?: AnalyticsFilter): Promise<ApiResult<AnalyticsExportResponseData>> {
      return handleApiCall(() => apiClient.get('/v1/analytics/export', { params: filter }));
    },

    async exportAnalyticsCsv(filter?: AnalyticsFilter): Promise<ApiResult<AnalyticsExportResponseData>> {
      return handleApiCall(() => apiClient.get('/v1/analytics/export', { params: filter }));
    },

    async exportData(filter?: AnalyticsFilter): Promise<ApiResult<AnalyticsExportResponseData>> {
      return handleApiCall(() => apiClient.get('/v1/analytics/export', { params: filter }));
    },

    async downloadReportPdf(reportId: string): Promise<ApiResult<Blob>> {
      return handleApiCall(() => apiClient.get(`/v1/reports/${reportId}/pdf`, { responseType: 'blob' }));
    },

    async getReports(): Promise<ApiResult<ReportItem[]>> {
      return handleApiCall(() => apiClient.get<ReportItem[]>('/v1/reports'));
    },
  },

  reports: {
    getReports: async () => handleApiCall(() => apiClient.get('/v1/reports')),
    downloadReportPdf: async (reportId: string) =>
      handleApiCall(() => apiClient.get(`/v1/reports/${reportId}/pdf`, { responseType: 'blob' })),
  },

  plans: {
    async getPlans(): Promise<ApiResult<Plan[]>> {
      return handleApiCall(() => apiClient.get<Plan[]>('/v1/plans'));
    },
    async createPlan(req: Partial<Plan>): Promise<ApiResult<Plan>> {
      return handleApiCall(() => apiClient.post<Plan>('/v1/admin/plans', req));
    },
    async updatePlan(id: string, req: Partial<Plan>): Promise<ApiResult<Plan>> {
      return handleApiCall(() => apiClient.patch<Plan>(`/v1/admin/plans/${id}`, req));
    },
    async deletePlan(id: string): Promise<ApiResult<void>> {
      return handleApiCall(() => apiClient.delete<void>(`/v1/admin/plans/${id}`));
    },
    async getAllSubscriptions(): Promise<ApiResult<Subscription[]>> {
      return handleApiCall(() => apiClient.get<Subscription[]>('/v1/admin/subscriptions'));
    },
    async getOrganizationSubscription(orgId: string): Promise<ApiResult<Subscription>> {
      return handleApiCall(() => apiClient.get<Subscription>(`/v1/admin/organizations/${orgId}/subscription`));
    },
    async getAllPlanRequests(): Promise<ApiResult<PlanChangeRequest[]>> {
      return handleApiCall(() => apiClient.get<PlanChangeRequest[]>('/v1/admin/plan-change-requests'));
    },
    async updateOrganizationSubscription(orgId: string, data: any): Promise<ApiResult<Subscription>> {
      return handleApiCall(() => apiClient.patch<Subscription>(`/v1/admin/organizations/${orgId}/subscription`, data));
    },
    async getAllPayments(): Promise<ApiResult<SubscriptionPayment[]>> {
      return handleApiCall(() => apiClient.get<SubscriptionPayment[]>('/v1/admin/subscription-payments'));
    },
    async getSubscription(): Promise<ApiResult<Subscription>> {
      return handleApiCall(() => apiClient.get<Subscription>('/v1/subscription'));
    },
    async getPayments(): Promise<ApiResult<SubscriptionPayment[]>> {
      return handleApiCall(() => apiClient.get<SubscriptionPayment[]>('/v1/subscription/payments'));
    },
    async getPaymentById(id: string): Promise<ApiResult<SubscriptionPayment>> {
      return handleApiCall(() => apiClient.get<SubscriptionPayment>(`/v1/subscription/payments/${id}`));
    },
    async getPlanRequests(): Promise<ApiResult<PlanChangeRequest[]>> {
      return handleApiCall(() => apiClient.get<PlanChangeRequest[]>('/v1/subscription/plan-requests'));
    },
    async createPlanRequest(req: CreatePlanRequestInput): Promise<ApiResult<PlanChangeRequest>> {
      return handleApiCall(() => apiClient.post<PlanChangeRequest>('/v1/subscription/plan-requests', req));
    },
    async reviewPlanRequest(id: string, data: any): Promise<ApiResult<PlanChangeRequest>> {
      return handleApiCall(() => apiClient.patch<PlanChangeRequest>(`/v1/admin/plan-change-requests/${id}`, data));
    },
    async recordDirectPayment(data: any): Promise<ApiResult<SubscriptionPayment>> {
      return handleApiCall(() => apiClient.post<SubscriptionPayment>('/v1/admin/subscription-payments', data));
    },
    async renewSubscription(data?: { reason?: string }): Promise<ApiResult<any>> {
      return handleApiCall(() => apiClient.post<any>('/v1/subscription/renew', data || {}));
    },
    async checkout(_req: CheckoutRequest): Promise<ApiResult<CheckoutResponseData>> {
      return handleApiCall(() => apiClient.post<CheckoutResponseData>('/v1/subscription/checkout', _req));
    },
  },

  subscriptions: {
    async getPlans(): Promise<ApiResult<Plan[]>> {
      return handleApiCall(() => apiClient.get<Plan[]>('/v1/plans'));
    },
    async createPlan(req: Partial<Plan>): Promise<ApiResult<Plan>> {
      return handleApiCall(() => apiClient.post<Plan>('/v1/admin/plans', req));
    },
    async updatePlan(id: string, req: Partial<Plan>): Promise<ApiResult<Plan>> {
      return handleApiCall(() => apiClient.patch<Plan>(`/v1/admin/plans/${id}`, req));
    },
    async deletePlan(id: string): Promise<ApiResult<void>> {
      return handleApiCall(() => apiClient.delete<void>(`/v1/admin/plans/${id}`));
    },
    async getAllSubscriptions(): Promise<ApiResult<Subscription[]>> {
      return handleApiCall(() => apiClient.get<Subscription[]>('/v1/admin/subscriptions'));
    },
    async getOrganizationSubscription(orgId: string): Promise<ApiResult<Subscription>> {
      return handleApiCall(() => apiClient.get<Subscription>(`/v1/admin/organizations/${orgId}/subscription`));
    },
    async getAllPlanRequests(): Promise<ApiResult<PlanChangeRequest[]>> {
      return handleApiCall(() => apiClient.get<PlanChangeRequest[]>('/v1/admin/plan-change-requests'));
    },
    async updateOrganizationSubscription(orgId: string, data: any): Promise<ApiResult<Subscription>> {
      return handleApiCall(() => apiClient.patch<Subscription>(`/v1/admin/organizations/${orgId}/subscription`, data));
    },
    async getAllPayments(): Promise<ApiResult<SubscriptionPayment[]>> {
      return handleApiCall(() => apiClient.get<SubscriptionPayment[]>('/v1/admin/subscription-payments'));
    },
    async getSubscription(): Promise<ApiResult<Subscription>> {
      return handleApiCall(() => apiClient.get<Subscription>('/v1/subscription'));
    },
    async getPayments(): Promise<ApiResult<SubscriptionPayment[]>> {
      return handleApiCall(() => apiClient.get<SubscriptionPayment[]>('/v1/subscription/payments'));
    },
    async getPaymentById(id: string): Promise<ApiResult<SubscriptionPayment>> {
      return handleApiCall(() => apiClient.get<SubscriptionPayment>(`/v1/subscription/payments/${id}`));
    },
    async getPlanRequests(): Promise<ApiResult<PlanChangeRequest[]>> {
      return handleApiCall(() => apiClient.get<PlanChangeRequest[]>('/v1/subscription/plan-requests'));
    },
    async createPlanRequest(req: CreatePlanRequestInput): Promise<ApiResult<PlanChangeRequest>> {
      return handleApiCall(() => apiClient.post<PlanChangeRequest>('/v1/subscription/plan-requests', req));
    },
    async reviewPlanRequest(id: string, data: any): Promise<ApiResult<PlanChangeRequest>> {
      return handleApiCall(() => apiClient.patch<PlanChangeRequest>(`/v1/admin/plan-change-requests/${id}`, data));
    },
    async recordDirectPayment(data: any): Promise<ApiResult<SubscriptionPayment>> {
      return handleApiCall(() => apiClient.post<SubscriptionPayment>('/v1/admin/subscription-payments', data));
    },
    async renewSubscription(data?: { reason?: string }): Promise<ApiResult<any>> {
      return handleApiCall(() => apiClient.post<any>('/v1/subscription/renew', data || {}));
    },
    async checkout(_req: CheckoutRequest): Promise<ApiResult<CheckoutResponseData>> {
      return handleApiCall(() => apiClient.post<CheckoutResponseData>('/v1/subscription/checkout', _req));
    },
  },

  userPortal: {
    async resolvePublicCard(qrToken: string): Promise<any> {
      return handleApiCall(() => apiClient.post('/v1/public/cards/resolve', { qrToken }));
    },
    async getPublicSessionDetail(sessionToken: string): Promise<ApiResult<PublicSessionDetail>> {
      return handleApiCall(() => apiClient.get<PublicSessionDetail>(`/v1/public/sessions/${sessionToken}`));
    },
    async getPublicSessionTransactions(sessionToken: string): Promise<ApiResult<PublicTransaction[]>> {
      const res = await handleApiCall<any>(() => apiClient.get(`/v1/public/sessions/${sessionToken}/transactions`));
      if (res.success && Array.isArray(res.data)) {
        return {
          success: true,
          data: res.data.map((tx: any) => ({
            id: tx.id,
            type: tx.type,
            amount: tx.amount,
            balanceAfter: tx.balanceAfter,
            timestamp: tx.createdAt || new Date().toISOString(),
            description: tx.type,
            status: 'SUCCESS',
          })),
        };
      }
      return res;
    },
    async getPublicSessionReceipts(sessionToken: string): Promise<ApiResult<PublicReceipt[]>> {
      return handleApiCall(() => apiClient.get<PublicReceipt[]>(`/v1/public/sessions/${sessionToken}/receipts`));
    },
  },

  resetStore: () => {},
};

import { mockStore } from '../store';
import { mockDelay, createMockSuccess, createMockError, paginateArray } from '../utils';
import { mockAuthHandlers } from './auth';
import type {
  ApiResult,
  Staff,
  PaginatedData,
  PaginationParams,
  CreateStaffRequest,
  UpdateStaffRequest,
  Permission,
} from '@/types';

export const mockStaffHandlers = {
  async deleteStaff(id: string): Promise<ApiResult<any>> {
    await mockDelay();
    const staff = mockStore.staffEntities.find((s) => s.id === id);
    if (!staff) return createMockError('NOT_FOUND', 'Staff member not found');
    mockStore.staffEntities = mockStore.staffEntities.filter((s) => s.id !== id);
    return createMockSuccess({ deleted: true, message: 'Staff member deleted.' });
  },

  async resendInvite(_id: string): Promise<ApiResult<any>> {
    await mockDelay();
    return createMockSuccess({ message: 'Invitation email resent successfully' });
  },
  async getStaff(params?: PaginationParams): Promise<ApiResult<PaginatedData<Staff>>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    let staffList = mockStore.staffEntities;

    if (currentUser.role !== 'SUPER_ADMIN') {
      staffList = staffList.filter((s) => s.organizationId === currentUser.organizationId);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      staffList = staffList.filter(
        (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
      );
    }

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    return createMockSuccess(paginateArray(staffList, page, limit));
  },

  async getStaffById(id: string): Promise<ApiResult<Staff>> {
    await mockDelay();
    const staff = mockStore.staffEntities.find((s) => s.id === id);
    if (!staff) {
      return createMockError('NOT_FOUND', `Staff member with ID '${id}' not found`);
    }
    return createMockSuccess(staff);
  },

  async createStaff(req: CreateStaffRequest): Promise<ApiResult<Staff>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const orgId = currentUser.organizationId || 'org_001';

    // Email Uniqueness check
    const emailExists = mockStore.staffUsers.some(
      (u) => u.email.toLowerCase() === req.email.toLowerCase(),
    );
    if (emailExists) {
      return createMockError(
        'VALIDATION_ERROR',
        `Account with email '${req.email}' already exists`,
      );
    }

    // Check Plan Staff Limit
    // Check Plan Staff Limit (respecting organization-specific overrides)
    const subscription = mockStore.subscriptions.find((s) => s.organizationId === orgId);
    if (subscription) {
      const plan = mockStore.plans.find((p) => p.id === subscription.planId);
      if (plan) {
        const effectiveStaffLimit = subscription.overrides?.staffLimit ?? plan.staffLimit;
        const currentStaffCount = mockStore.staffEntities.filter(
          (s) => s.organizationId === orgId,
        ).length;
        if (currentStaffCount >= effectiveStaffLimit) {
          return createMockError(
            'PLAN_LIMIT_REACHED',
            `Staff limit of ${effectiveStaffLimit} reached for your active subscription`,
          );
        }
      }
    }

    const newStaffId = mockStore.generateId('staff');
    const newStaffEntity: Staff = {
      id: newStaffId,
      organizationId: orgId,
      name: req.name,
      email: req.email,
      status: 'ACTIVE',
      permissions: req.permissions,
      assignedBranchIds: req.assignedBranchIds,
      createdAt: mockStore.getTimestamp(),
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.staffEntities.push(newStaffEntity);

    // Create user login auth record
    mockStore.staffUsers.push({
      id: newStaffId,
      email: req.email,
      name: req.name,
      role: 'STAFF', // Single operational STAFF role from M0 Section 0 & 1
      organizationId: orgId,
      permissions: req.permissions,
      assignedBranchIds: req.assignedBranchIds,
      passwordHash: req.password || 'password',
    });

    return createMockSuccess(newStaffEntity);
  },

  async updateStaff(id: string, req: UpdateStaffRequest): Promise<ApiResult<Staff>> {
    await mockDelay();
    const index = mockStore.staffEntities.findIndex((s) => s.id === id);
    if (index === -1) {
      return createMockError('NOT_FOUND', `Staff '${id}' not found`);
    }

    const existing = mockStore.staffEntities[index];
    const updated: Staff = {
      ...existing,
      ...(req.name ? { name: req.name } : {}),
      ...(req.email ? { email: req.email } : {}),
      ...(req.status ? { status: req.status } : {}),
      ...(req.assignedBranchIds ? { assignedBranchIds: req.assignedBranchIds } : {}),
      ...(req.permissions ? { permissions: req.permissions } : {}),
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.staffEntities[index] = updated;

    // Update user auth profile
    const userIndex = mockStore.staffUsers.findIndex((u) => u.id === id);
    if (userIndex !== -1) {
      mockStore.staffUsers[userIndex] = {
        ...mockStore.staffUsers[userIndex],
        name: updated.name,
        email: updated.email,
        permissions: updated.permissions,
        assignedBranchIds: updated.assignedBranchIds,
      };
    }

    return createMockSuccess(updated);
  },

  async updateStaffBranches(id: string, branchIds: string[]): Promise<ApiResult<Staff>> {
    return this.updateStaff(id, { assignedBranchIds: branchIds });
  },

  async updateStaffPermissions(id: string, permissions: Permission[]): Promise<ApiResult<Staff>> {
    return this.updateStaff(id, { permissions });
  },

  

  async getPermissions(): Promise<ApiResult<{ code: Permission; name: string; area: string }[]>> {
    await mockDelay();
    return createMockSuccess([
      { code: 'CARD_VIEW', name: 'View Cards', area: 'Cards' },
      { code: 'CARD_ISSUE', name: 'Issue Cards', area: 'Cards' },
      { code: 'CARD_RETURN', name: 'Return Cards', area: 'Cards' },
      { code: 'CARD_BLOCK', name: 'Block Cards', area: 'Cards' },
      { code: 'CARD_UNBLOCK', name: 'Unblock Cards', area: 'Cards' },
      { code: 'RECHARGE', name: 'Recharge Sessions', area: 'Sessions / Payments' },
      { code: 'PURCHASE', name: 'Process Purchases', area: 'Sessions / Payments' },
      { code: 'REFUND', name: 'Process Refunds', area: 'Sessions / Payments' },
      { code: 'SESSION_VIEW', name: 'View Sessions', area: 'Sessions / Payments' },
      { code: 'PRODUCT_VIEW', name: 'View Products', area: 'Products / Inventory' },
      { code: 'PRODUCT_MANAGE', name: 'Manage Products', area: 'Products / Inventory' },
      { code: 'INVENTORY_VIEW', name: 'View Inventory', area: 'Products / Inventory' },
      { code: 'INVENTORY_MANAGE', name: 'Manage Inventory', area: 'Products / Inventory' },
      { code: 'INVENTORY_IMPORT', name: 'Import Inventory CSV', area: 'Products / Inventory' },
      { code: 'VIEW_ANALYTICS', name: 'View Analytics', area: 'Analytics / Reports' },
      { code: 'VIEW_REPORTS', name: 'View Reports', area: 'Analytics / Reports' },
      { code: 'STAFF_VIEW', name: 'View Staff', area: 'Staff' },
      { code: 'STAFF_MANAGE', name: 'Manage Staff', area: 'Staff' },
      { code: 'BRANCH_VIEW', name: 'View Branches', area: 'Branch' },
      { code: 'BRANCH_MANAGE', name: 'Manage Branches', area: 'Branch' },
    ]);
  },
};

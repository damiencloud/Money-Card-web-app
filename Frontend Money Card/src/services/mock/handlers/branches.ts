import { mockStore } from '../store';
import { mockDelay, createMockSuccess, createMockError, paginateArray } from '../utils';
import { mockAuthHandlers } from './auth';
import type { ApiResult, Branch, PaginatedData, PaginationParams } from '@/types';

export const mockBranchesHandlers = {
  async getBranches(params?: PaginationParams): Promise<ApiResult<PaginatedData<Branch>>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    let branches = mockStore.branches;

    // Organization Scope Enforcement (M0 Rule 13)
    if (currentUser.role !== 'SUPER_ADMIN') {
      branches = branches.filter((b) => b.organizationId === currentUser.organizationId);
    }

    // Staff Branch Assignment Scope Enforcement (M0 Section 2)
    if (currentUser.role === 'STAFF') {
      branches = branches.filter((b) => currentUser.assignedBranchIds.includes(b.id));
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      branches = branches.filter((b) => b.name.toLowerCase().includes(q));
    }

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    return createMockSuccess(paginateArray(branches, page, limit));
  },

  async getBranchById(id: string): Promise<ApiResult<Branch>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const branch = mockStore.branches.find((b) => b.id === id);
    if (!branch) {
      return createMockError('NOT_FOUND', `Branch with ID '${id}' not found`);
    }

    if (
      currentUser.role !== 'SUPER_ADMIN' &&
      branch.organizationId !== currentUser.organizationId
    ) {
      return createMockError('BRANCH_ACCESS_DENIED', 'Access to branch denied');
    }

    return createMockSuccess(branch);
  },

  async createBranch(data: { name: string; organizationId?: string }): Promise<ApiResult<Branch>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const orgId = data.organizationId || currentUser.organizationId;
    if (!orgId) {
      return createMockError('VALIDATION_ERROR', 'Organization ID is required');
    }

    // Check Plan Branch Limit (respecting organization-specific overrides)
    const subscription = mockStore.subscriptions.find((s) => s.organizationId === orgId);
    if (subscription) {
      const plan = mockStore.plans.find((p) => p.id === subscription.planId);
      if (plan) {
        const effectiveBranchLimit = subscription.overrides?.branchLimit ?? plan.branchLimit;
        const existingCount = mockStore.branches.filter(
          (b) => b.organizationId === orgId,
        ).length;
        if (existingCount >= effectiveBranchLimit) {
          return createMockError(
            'PLAN_LIMIT_REACHED',
            `Branch limit of ${effectiveBranchLimit} reached for your active subscription`,
          );
        }
      }
    }

    const newBranch: Branch = {
      id: mockStore.generateId('branch'),
      organizationId: orgId,
      name: data.name,
      status: 'ACTIVE',
      createdAt: mockStore.getTimestamp(),
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.branches.push(newBranch);
    return createMockSuccess(newBranch);
  },

  async updateBranch(
    id: string,
    data: { name?: string; status?: 'ACTIVE' | 'INACTIVE' },
  ): Promise<ApiResult<Branch>> {
    await mockDelay();
    const branchIndex = mockStore.branches.findIndex((b) => b.id === id);
    if (branchIndex === -1) {
      return createMockError('NOT_FOUND', `Branch '${id}' not found`);
    }

    const existing = mockStore.branches[branchIndex];

    if (data.status && data.status !== 'ACTIVE' && existing.status === 'ACTIVE') {
      const activeCount = mockStore.branches.filter(
        (b) => b.organizationId === existing.organizationId && b.status === 'ACTIVE',
      ).length;
      if (activeCount <= 1) {
        return createMockError(
          'MIN_ACTIVE_BRANCH_REQUIRED',
          'Cannot disable this branch. An organization must have at least one active branch.',
        );
      }
    }

    const updated: Branch = {
      ...existing,
      ...(data.name ? { name: data.name } : {}),
      ...(data.status ? { status: data.status } : {}),
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.branches[branchIndex] = updated;
    return createMockSuccess(updated);
  },
};

import { mockStore } from '../store';
import { mockDelay, createMockSuccess, createMockError, paginateArray } from '../utils';
import { mockAuthHandlers } from './auth';
import type {
  ApiResult,
  Organization,
  OrganizationOverview,
  PaginatedData,
  PaginationParams,
  Permission,
} from '@/types';

export const mockOrganizationsHandlers = {
  // GET /api/v1/organization (Current org profile for ORG_ADMIN)
  async getOrganization(): Promise<ApiResult<OrganizationOverview>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const orgId = currentUser.organizationId || 'org_001';
    const org = mockStore.organizations.find((o) => o.id === orgId);
    if (!org) {
      return createMockError('NOT_FOUND', `Organization '${orgId}' not found`);
    }

    const subscription = mockStore.subscriptions.find((s) => s.organizationId === org.id);
    const plan = subscription
      ? mockStore.plans.find((p) => p.id === subscription.planId)
      : mockStore.plans.find((p) => p.id === org.planId);

    const branchCount = mockStore.branches.filter((b) => b.organizationId === orgId).length;
    const staffCount = mockStore.staffEntities.filter((s) => s.organizationId === orgId).length;
    const cardCount = mockStore.cards.filter((c) => c.organizationId === orgId).length;

    const branchLimit = subscription?.overrides?.branchLimit ?? plan?.branchLimit ?? 3;
    const staffLimit = subscription?.overrides?.staffLimit ?? plan?.staffLimit ?? 25;
    const cardLimit = subscription?.overrides?.cardLimit ?? plan?.cardLimit ?? 1000;

    return createMockSuccess({
      ...org,
      plan: plan || mockStore.plans[0],
      subscription,
      usage: {
        branchCount,
        branchLimit,
        staffCount,
        staffLimit,
        cardCount,
        cardLimit,
      },
    });
  },

  // PATCH /api/v1/organization (Update org settings for ORG_ADMIN)
  async updateOrganization(data: { name?: string }): Promise<ApiResult<Organization>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }

    const orgId = currentUser.organizationId || 'org_001';
    const index = mockStore.organizations.findIndex((o) => o.id === orgId);
    if (index === -1) {
      return createMockError('NOT_FOUND', `Organization '${orgId}' not found`);
    }

    const updated: Organization = {
      ...mockStore.organizations[index],
      ...(data.name ? { name: data.name } : {}),
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.organizations[index] = updated;
    return createMockSuccess(updated);
  },

  // GET /api/v1/admin/organizations (List all orgs for SUPER_ADMIN)
  async getOrganizations(
    params?: PaginationParams,
  ): Promise<ApiResult<PaginatedData<OrganizationOverview>>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return createMockError('FORBIDDEN', 'Super Admin access required');
    }

    let orgs = mockStore.organizations;

    if (params?.search) {
      const q = params.search.toLowerCase();
      orgs = orgs.filter((o) => o.name.toLowerCase().includes(q));
    }

    const overviews: OrganizationOverview[] = orgs.map((org) => {
      const subscription = mockStore.subscriptions.find((s) => s.organizationId === org.id);
      const plan = subscription
        ? mockStore.plans.find((p) => p.id === subscription.planId)
        : mockStore.plans.find((p) => p.id === org.planId);

      const branchCount = mockStore.branches.filter((b) => b.organizationId === org.id).length;
      const staffCount = mockStore.staffEntities.filter((s) => s.organizationId === org.id).length;
      const cardCount = mockStore.cards.filter((c) => c.organizationId === org.id).length;

      const branchLimit = subscription?.overrides?.branchLimit ?? plan?.branchLimit ?? 3;
      const staffLimit = subscription?.overrides?.staffLimit ?? plan?.staffLimit ?? 25;
      const cardLimit = subscription?.overrides?.cardLimit ?? plan?.cardLimit ?? 1000;

      return {
        ...org,
        plan: plan || mockStore.plans[0],
        subscription,
        usage: {
          branchCount,
          branchLimit,
          staffCount,
          staffLimit,
          cardCount,
          cardLimit,
        },
      };
    });

    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    return createMockSuccess(paginateArray(overviews, page, limit));
  },

  // POST /api/v1/admin/organizations (Create org & initial Org Admin account for SUPER_ADMIN)
  async createOrganization(data: {
    name: string;
    adminEmail?: string;
    password?: string;
    planId?: string;
  }): Promise<ApiResult<OrganizationOverview>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return createMockError('FORBIDDEN', 'Super Admin access required');
    }

    // 1. Validate Organization Name
    if (!data.name || !data.name.trim()) {
      return createMockError('VALIDATION_ERROR', 'Organization name is required');
    }

    // 2. Validate Org Admin Email
    const adminEmail = (data.adminEmail || '').trim().toLowerCase();
    if (!adminEmail) {
      return createMockError('VALIDATION_ERROR', 'Org Admin email is required');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      return createMockError('VALIDATION_ERROR', 'Please enter a valid email address for Org Admin');
    }

    // Email Uniqueness check
    const emailExists = mockStore.staffUsers.some(
      (u) => u.email.toLowerCase() === adminEmail,
    );
    if (emailExists) {
      return createMockError('VALIDATION_ERROR', `Account with email '${data.adminEmail}' already exists`);
    }

    // 3. Validate Password (min 6 chars, same as Staff Creation)
    const rawPassword = data.password || '';
    if (!rawPassword.trim()) {
      return createMockError('VALIDATION_ERROR', 'Initial password is required');
    }
    if (rawPassword.length < 6) {
      return createMockError('VALIDATION_ERROR', 'Password must be at least 6 characters');
    }

    // 4. Validate Plan
    const planId = data.planId || 'plan_002';
    const plan = mockStore.plans.find((p) => p.id === planId) || mockStore.plans[0];

    const orgId = `org_${String(mockStore.organizations.length + 1).padStart(3, '0')}`;
    const timestamp = mockStore.getTimestamp();

    // Create Organization
    const newOrg: Organization = {
      id: orgId,
      name: data.name.trim(),
      planId: plan.id,
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    mockStore.organizations.push(newOrg);

    // Create Initial Subscription
    mockStore.subscriptions.push({
      id: `sub_${orgId}`,
      organizationId: orgId,
      planId: plan.id,
      status: 'ACTIVE',
      startDate: timestamp,
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      renewalDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      paymentStatus: 'SUCCESS',
      overrides: {},
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    // Create Initial Org Admin Account
    const orgAdminPermissions: Permission[] = [
      'CARD_VIEW',
      'CARD_ISSUE',
      'CARD_RETURN',
      'CARD_BLOCK',
      'CARD_UNBLOCK',
      'RECHARGE',
      'PURCHASE',
      'REFUND',
      'SESSION_VIEW',
      'PRODUCT_VIEW',
      'PRODUCT_MANAGE',
      'INVENTORY_VIEW',
      'INVENTORY_MANAGE',
      'INVENTORY_IMPORT',
      'VIEW_ANALYTICS',
      'VIEW_REPORTS',
      'STAFF_VIEW',
      'STAFF_MANAGE',
      'BRANCH_VIEW',
      'BRANCH_MANAGE',
    ];

    mockStore.staffUsers.push({
      id: `user_${orgId}_admin`,
      email: adminEmail,
      name: `${data.name.trim()} Admin`,
      role: 'ORG_ADMIN',
      organizationId: orgId,
      permissions: orgAdminPermissions,
      assignedBranchIds: [],
      passwordHash: rawPassword,
      status: 'ACTIVE',
    });

    const overview: OrganizationOverview = {
      ...newOrg,
      plan,
      usage: {
        branchCount: 0,
        branchLimit: plan.branchLimit,
        staffCount: 1,
        staffLimit: plan.staffLimit,
        cardCount: 0,
        cardLimit: plan.cardLimit,
      },
    };

    return createMockSuccess(overview);
  },

  // GET /api/v1/admin/organizations/:id (Org details for SUPER_ADMIN)
  async getOrganizationById(id: string): Promise<ApiResult<OrganizationOverview>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return createMockError('FORBIDDEN', 'Super Admin access required');
    }

    const org = mockStore.organizations.find((o) => o.id === id);
    if (!org) {
      return createMockError('NOT_FOUND', `Organization with ID '${id}' not found`);
    }

    const subscription = mockStore.subscriptions.find((s) => s.organizationId === org.id);
    const plan = subscription
      ? mockStore.plans.find((p) => p.id === subscription.planId)
      : mockStore.plans.find((p) => p.id === org.planId);

    const branchCount = mockStore.branches.filter((b) => b.organizationId === org.id).length;
    const staffCount = mockStore.staffEntities.filter((s) => s.organizationId === org.id).length;
    const cardCount = mockStore.cards.filter((c) => c.organizationId === org.id).length;

    const branchLimit = subscription?.overrides?.branchLimit ?? plan?.branchLimit ?? 3;
    const staffLimit = subscription?.overrides?.staffLimit ?? plan?.staffLimit ?? 25;
    const cardLimit = subscription?.overrides?.cardLimit ?? plan?.cardLimit ?? 1000;

    return createMockSuccess({
      ...org,
      plan: plan || mockStore.plans[0],
      subscription,
      usage: {
        branchCount,
        branchLimit,
        staffCount,
        staffLimit,
        cardCount,
        cardLimit,
      },
    });
  },

  // PATCH /api/v1/admin/organizations/:id (Update org status/plan for SUPER_ADMIN)
  async updateAdminOrganization(
    id: string,
    data: { status?: 'ACTIVE' | 'INACTIVE'; planId?: string; name?: string },
  ): Promise<ApiResult<Organization>> {
    await mockDelay();
    const currentUser = mockAuthHandlers.getCurrentSessionUser();
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return createMockError('FORBIDDEN', 'Super Admin access required');
    }

    const index = mockStore.organizations.findIndex((o) => o.id === id);
    if (index === -1) {
      return createMockError('NOT_FOUND', `Organization '${id}' not found`);
    }

    const updated: Organization = {
      ...mockStore.organizations[index],
      ...(data.name ? { name: data.name } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.planId ? { planId: data.planId } : {}),
      updatedAt: mockStore.getTimestamp(),
    };

    mockStore.organizations[index] = updated;
    return createMockSuccess(updated);
  },
};

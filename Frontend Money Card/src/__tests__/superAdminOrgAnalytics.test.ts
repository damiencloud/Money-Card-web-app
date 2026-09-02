import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockAnalyticsHandlers } from '../services/mock/handlers/analytics';
import { mockAuthHandlers } from '../services/mock/handlers/auth';
import { mockStore } from '../services/mock/store';
import type { AuthUser } from '../types';

describe('Super Admin Dashboard - Dropdown Org Analytics Filtering', () => {
  const superAdminUser: AuthUser = {
    id: 'usr_superadmin',
    email: 'amigosiamoneycard@gmail.com',
    name: 'Platform Super Admin',
    role: 'SUPER_ADMIN',
    organizationId: null,
    mustChangePassword: false,
    permissions: [],
    assignedBranchIds: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthHandlers.setMockSessionUser(superAdminUser);
  });

  it('should return platform-wide metrics when no organizationId is specified', async () => {
    const res = await mockAnalyticsHandlers.getAnalyticsOverview();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.totalTransactions).toBeGreaterThan(0);
      expect(res.data.branchPerformance).toBeDefined();
      expect(res.data.branchPerformance?.length).toBe(mockStore.branches.length);
    }
  });

  it('should correctly filter metrics to the selected organization (org_001)', async () => {
    const org1BranchIds = mockStore.branches
      .filter((b) => b.organizationId === 'org_001')
      .map((b) => b.id);

    const res = await mockAnalyticsHandlers.getAnalyticsOverview({
      organizationId: 'org_001',
    });

    expect(res.success).toBe(true);
    if (res.success) {
      // All branches in branchPerformance should belong to org_001
      expect(res.data.branchPerformance).toBeDefined();
      for (const bp of res.data.branchPerformance || []) {
        expect(org1BranchIds).toContain(bp.branchId);
      }

      // Should only count active cards for org_001
      const expectedCards = mockStore.cards.filter(
        (c) => (c.status === 'ACTIVE' || c.status === 'AVAILABLE') && c.organizationId === 'org_001',
      ).length;
      expect(res.data.activeCardsCount).toBe(expectedCards);
    }
  });

  it('should correctly filter metrics to another selected organization (org_002)', async () => {
    const org2BranchIds = mockStore.branches
      .filter((b) => b.organizationId === 'org_002')
      .map((b) => b.id);

    const res = await mockAnalyticsHandlers.getAnalyticsOverview({
      organizationId: 'org_002',
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.branchPerformance).toBeDefined();
      for (const bp of res.data.branchPerformance || []) {
        expect(org2BranchIds).toContain(bp.branchId);
      }

      const expectedCards = mockStore.cards.filter(
        (c) => (c.status === 'ACTIVE' || c.status === 'AVAILABLE') && c.organizationId === 'org_002',
      ).length;
      expect(res.data.activeCardsCount).toBe(expectedCards);
    }
  });

  it('should return 0 transactions and metrics for an organization with no transactions', async () => {
    const res = await mockAnalyticsHandlers.getAnalyticsOverview({
      organizationId: 'non_existent_org',
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.totalTransactions).toBe(0);
      expect(res.data.totalPurchaseVolume).toBe(0);
      expect(res.data.totalRechargeVolume).toBe(0);
      expect(res.data.activeSessionsCount).toBe(0);
      expect(res.data.activeCardsCount).toBe(0);
      expect(res.data.branchPerformance?.length).toBe(0);
    }
  });
});

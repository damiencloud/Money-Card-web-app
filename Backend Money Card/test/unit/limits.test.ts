import { describe, it, expect } from 'vitest';
import { calculateEffectiveLimits, formatSubscription } from '../../src/utils/limits';

describe('Backend Unit Tests: Organization Limits Engine & Calculation', () => {
  const basePlan = {
    id: 'plan_starter',
    name: 'Starter Plan',
    staffLimit: 5,
    branchLimit: 2,
    cardLimit: 100,
    priceMonthly: 49,
    priceYearly: 490,
  };

  describe('calculateEffectiveLimits - Plan Defaults vs Custom Overrides', () => {
    it('should use base plan limits when no custom overrides are configured', () => {
      const org = {
        id: 'org_001',
        name: 'Standard Org',
        subscription: {
          plan: basePlan,
          branchLimitOverride: null,
          staffLimitOverride: null,
          cardLimitOverride: null,
        },
      };

      const limits = calculateEffectiveLimits(org);

      expect(limits.staffLimit).toBe(5);
      expect(limits.branchLimit).toBe(2);
      expect(limits.cardLimit).toBe(100);
      expect(limits.isCustomStaff).toBe(false);
      expect(limits.isCustomBranches).toBe(false);
      expect(limits.isCustomCards).toBe(false);
      expect(limits.hasAnyCustomOverride).toBe(false);
    });

    it('should apply custom overrides and flag them as custom when provided', () => {
      const org = {
        id: 'org_002',
        name: 'Custom High-Capacity Org',
        subscription: {
          plan: basePlan,
          branchLimitOverride: null, // fallback to base plan (2)
          staffLimitOverride: 15,
          cardLimitOverride: 500,
        },
      };

      const limits = calculateEffectiveLimits(org);

      expect(limits.staffLimit).toBe(15);
      expect(limits.isCustomStaff).toBe(true);
      expect(limits.branchLimit).toBe(2);
      expect(limits.isCustomBranches).toBe(false);
      expect(limits.cardLimit).toBe(500);
      expect(limits.isCustomCards).toBe(true);
      expect(limits.hasAnyCustomOverride).toBe(true);
    });

    it('should format subscription overrides correctly for API responses', () => {
      const sub = {
        id: 'sub_123',
        branchLimitOverride: 10,
        staffLimitOverride: null,
        cardLimitOverride: null,
      };

      const formatted = formatSubscription(sub);
      expect(formatted).not.toBeNull();
      expect(formatted?.overrides).toEqual({ branchLimit: 10 });
    });

    it('should fallback to base plan limits when custom overrides are removed (set to null)', () => {
      const orgBefore = {
        id: 'org_003',
        name: 'Modified Org',
        subscription: {
          plan: basePlan,
          branchLimitOverride: 10,
          staffLimitOverride: 20,
          cardLimitOverride: 1000,
        },
      };

      const limitsBefore = calculateEffectiveLimits(orgBefore);
      expect(limitsBefore.staffLimit).toBe(20);
      expect(limitsBefore.hasAnyCustomOverride).toBe(true);

      // Super Admin removes custom overrides
      const orgAfter = {
        ...orgBefore,
        subscription: {
          plan: basePlan,
          branchLimitOverride: null,
          staffLimitOverride: null,
          cardLimitOverride: null,
        },
      };

      const limitsAfter = calculateEffectiveLimits(orgAfter);
      expect(limitsAfter.staffLimit).toBe(5);
      expect(limitsAfter.branchLimit).toBe(2);
      expect(limitsAfter.cardLimit).toBe(100);
      expect(limitsAfter.hasAnyCustomOverride).toBe(false);
    });
  });

  describe('Limit Enforcement Boundary Conditions (usage < limit, usage == limit, usage > limit)', () => {
    const evaluateQuota = (currentUsage: number, maxLimit: number, requestedBatch: number = 1) => {
      const available = Math.max(0, maxLimit - currentUsage);
      const isAllowed = (currentUsage + requestedBatch) <= maxLimit;
      const isAtLimit = currentUsage >= maxLimit;
      return { available, isAllowed, isAtLimit };
    };

    it('should allow creation when usage is below limit', () => {
      const result = evaluateQuota(3, 5, 1);
      expect(result.isAllowed).toBe(true);
      expect(result.isAtLimit).toBe(false);
      expect(result.available).toBe(2);
    });

    it('should allow reaching exact limit (boundary condition: 4 + 1 = 5 / 5)', () => {
      const result = evaluateQuota(4, 5, 1);
      expect(result.isAllowed).toBe(true);
      expect(result.available).toBe(1);
    });

    it('should reject creation when current usage has already reached max limit', () => {
      const result = evaluateQuota(5, 5, 1);
      expect(result.isAllowed).toBe(false);
      expect(result.isAtLimit).toBe(true);
      expect(result.available).toBe(0);
    });

    it('should reject bulk batch when requested count exceeds available quota', () => {
      // 90 existing cards, limit 100, batch requested = 20
      const result = evaluateQuota(90, 100, 20);
      expect(result.isAllowed).toBe(false);
      expect(result.available).toBe(10);
    });
  });
});

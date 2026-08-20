import { prisma } from '../config/database.js';

export interface EffectiveLimits {
  branchLimit: number;
  staffLimit: number;
  cardLimit: number;
  isCustomBranches?: boolean;
  isCustomStaff?: boolean;
  isCustomCards?: boolean;
  hasAnyCustomOverride?: boolean;
}

export function formatSubscription(sub: any) {
  if (!sub) return null;
  const overrides: Record<string, any> = {};
  if (sub.branchLimitOverride !== null && sub.branchLimitOverride !== undefined) {
    overrides.branchLimit = sub.branchLimitOverride;
  }
  if (sub.staffLimitOverride !== null && sub.staffLimitOverride !== undefined) {
    overrides.staffLimit = sub.staffLimitOverride;
  }
  if (sub.cardLimitOverride !== null && sub.cardLimitOverride !== undefined) {
    overrides.cardLimit = sub.cardLimitOverride;
  }

  return {
    ...sub,
    branchLimitOverride: sub.branchLimitOverride ?? null,
    staffLimitOverride: sub.staffLimitOverride ?? null,
    cardLimitOverride: sub.cardLimitOverride ?? null,
    overrides: Object.keys(overrides).length > 0 ? overrides : null,
  };
}

export function calculateEffectiveLimits(org: any): EffectiveLimits {
  const activePlan = org?.subscription?.plan || org?.plan || org?.subscriptionPlan;
  const sub = org?.subscription;

  const isCustomBranches = (sub?.branchLimitOverride !== null && sub?.branchLimitOverride !== undefined) || (org?.customMaxBranches !== null && org?.customMaxBranches !== undefined);
  const isCustomStaff = (sub?.staffLimitOverride !== null && sub?.staffLimitOverride !== undefined) || (org?.customMaxStaff !== null && org?.customMaxStaff !== undefined);
  const isCustomCards = (sub?.cardLimitOverride !== null && sub?.cardLimitOverride !== undefined) || (org?.customMaxCards !== null && org?.customMaxCards !== undefined);

  const branchLimit = isCustomBranches
    ? Number(sub?.branchLimitOverride ?? org?.customMaxBranches)
    : (activePlan?.branchLimit ?? activePlan?.maxBranches ?? 3);

  const staffLimit = isCustomStaff
    ? Number(sub?.staffLimitOverride ?? org?.customMaxStaff)
    : (activePlan?.staffLimit ?? activePlan?.maxStaff ?? 25);

  const cardLimit = isCustomCards
    ? Number(sub?.cardLimitOverride ?? org?.customMaxCards)
    : (activePlan?.cardLimit ?? activePlan?.maxCards ?? 1000);

  return {
    branchLimit,
    staffLimit,
    cardLimit,
    isCustomBranches,
    isCustomStaff,
    isCustomCards,
    hasAnyCustomOverride: isCustomBranches || isCustomStaff || isCustomCards,
  };
}

export async function getEffectiveLimits(organizationId: string): Promise<EffectiveLimits> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      plan: true,
      subscription: {
        include: { plan: true },
      },
    },
  });

  return calculateEffectiveLimits(org);
}

export const getOrganizationEffectiveLimits = calculateEffectiveLimits;

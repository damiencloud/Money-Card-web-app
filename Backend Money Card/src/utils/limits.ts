import { prisma } from '../config/database.js';

export interface EffectiveLimits {
  branchLimit: number;
  staffLimit: number;
  cardLimit: number;
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

  const activePlan = org?.subscription?.plan || org?.plan;
  const sub = org?.subscription;

  // Custom Organization Override > Subscription Plan Limit > Default
  const branchLimit = sub?.branchLimitOverride !== null && sub?.branchLimitOverride !== undefined
    ? Number(sub.branchLimitOverride)
    : (activePlan?.branchLimit ?? 3);

  const staffLimit = sub?.staffLimitOverride !== null && sub?.staffLimitOverride !== undefined
    ? Number(sub.staffLimitOverride)
    : (activePlan?.staffLimit ?? 25);

  const cardLimit = sub?.cardLimitOverride !== null && sub?.cardLimitOverride !== undefined
    ? Number(sub.cardLimitOverride)
    : (activePlan?.cardLimit ?? 1000);

  return {
    branchLimit,
    staffLimit,
    cardLimit,
  };
}

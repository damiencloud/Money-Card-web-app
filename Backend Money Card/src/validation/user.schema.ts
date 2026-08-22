import { z } from 'zod';
import { safeEmail, strongPasswordSchema, safeDisplayName, safeFreeText, safeId } from './common.schema.js';

export const createStaffMemberSchema = z
  .object({
    name: safeDisplayName,
    email: safeEmail,
    password: strongPasswordSchema.optional(),
    branchIds: z.array(safeId).optional(),
    permissionCodes: z.array(z.string().max(50)).optional(),
  })
  .strict();

export const updateStaffMemberSchema = z
  .object({
    name: safeDisplayName.optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    name: safeDisplayName.optional(),
    bio: safeFreeText.optional(),
  })
  .strict();

export const updateStaffBranchesSchema = z
  .object({
    branchIds: z.array(safeId).min(1, 'At least one branch must be assigned'),
  })
  .strict();

export const updateStaffPermissionsSchema = z
  .object({
    permissionCodes: z.array(z.string().max(50)),
  })
  .strict();

export const createOrganizationSchema = z
  .object({
    name: safeDisplayName,
    planId: safeId,
    email: safeEmail,
    phone: z.string().max(20).optional(),
    address: safeFreeText.optional(),
    adminName: safeDisplayName,
    adminEmail: safeEmail,
    adminPassword: strongPasswordSchema.optional(),
  })
  .strict();

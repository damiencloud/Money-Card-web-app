import { z } from 'zod';
import { safeEmail, strongPasswordSchema, safeDisplayName, safeFreeText, safeId } from './common.schema.js';

export const createStaffMemberSchema = z
  .object({
    name: safeDisplayName,
    email: safeEmail,
    password: strongPasswordSchema.optional(),
    assignedBranchIds: z.array(safeId).optional(),
    branchIds: z.array(safeId).optional(),
    permissions: z.array(z.string().max(50)).optional(),
    permissionCodes: z.array(z.string().max(50)).optional(),
  })
  .strict();

export const updateStaffMemberSchema = z
  .object({
    name: safeDisplayName.optional(),
    email: safeEmail.optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    branchIds: z.array(safeId).optional(),
    assignedBranchIds: z.array(safeId).optional(),
    permissions: z.array(z.string().max(50)).optional(),
    permissionCodes: z.array(z.string().max(50)).optional(),
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
    branchIds: z.array(safeId).optional(),
    assignedBranchIds: z.array(safeId).optional(),
  })
  .strict()
  .refine((data) => data.branchIds !== undefined || data.assignedBranchIds !== undefined, {
    message: 'Either branchIds or assignedBranchIds must be provided',
  });

export const updateStaffPermissionsSchema = z
  .object({
    permissions: z.array(z.string().max(50)).optional(),
    permissionCodes: z.array(z.string().max(50)).optional(),
  })
  .strict()
  .refine((data) => data.permissions !== undefined || data.permissionCodes !== undefined, {
    message: 'Either permissions or permissionCodes must be provided',
  });

export const changeStaffPasswordSchema = z
  .object({
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().max(128).optional(),
  })
  .strict()
  .refine((data) => !data.confirmPassword || data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const createOrganizationSchema = z
  .object({
    name: safeDisplayName,
    planId: safeId.optional(),
    email: safeEmail.optional(),
    phone: z.string().max(20).optional(),
    address: safeFreeText.optional(),
    adminName: safeDisplayName.optional(),
    adminEmail: safeEmail,
    adminPassword: strongPasswordSchema.optional(),
  })
  .strict();


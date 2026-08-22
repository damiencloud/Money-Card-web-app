import { z } from 'zod';
import { safeEmail, loginPasswordSchema, strongPasswordSchema } from './common.schema.js';

export const loginSchema = z
  .object({
    email: safeEmail,
    password: loginPasswordSchema,
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: safeEmail,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string({ required_error: 'Reset token is required' }).trim().min(1, 'Reset token cannot be empty').max(256),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().max(128).optional(),
  })
  .strict()
  .refine((data) => !data.confirmPassword || data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: 'Current password is required' }).min(1, 'Current password is required').max(128),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().max(128).optional(),
  })
  .strict()
  .refine((data) => !data.confirmPassword || data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const resetOrgAdminPasswordSchema = z
  .object({
    temporaryPassword: strongPasswordSchema,
  })
  .strict();

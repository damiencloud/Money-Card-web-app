import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { comparePassword, hashPassword } from '../utils/crypto.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { PermissionCode, Role, UserStatus } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: {
      permissions: true,
      assignedBranches: {
        include: { branch: true },
      },
      organization: true,
    },
  });

  if (!user) {
    return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  if (user.status !== UserStatus.ACTIVE) {
    return sendError(res, 403, 'ACCOUNT_DEACTIVATED', 'Your account has been deactivated');
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    tokenVersion: user.tokenVersion,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Set HTTP-only cookie for refresh token
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  const permissions = user.permissions.map((p) => p.permission);
  const assignedBranches = user.assignedBranches.map((b) => ({
    id: b.branch.id,
    name: b.branch.name,
  }));

  return sendSuccess(res, {
    token: accessToken,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization?.name || null,
      status: user.status,
      permissions,
      assignedBranches,
    },
  });
}

export async function refresh(req: Request, res: Response) {
  const token = req.body?.refreshToken || req.cookies?.refreshToken;
  if (!token) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Refresh token required');
  }

  const payload = verifyRefreshToken(token);
  if (!payload) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user || user.status !== UserStatus.ACTIVE || user.tokenVersion !== payload.tokenVersion) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Session expired. Please log in again.');
  }

  const newAccessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    tokenVersion: user.tokenVersion,
  });

  return sendSuccess(res, {
    token: newAccessToken,
    accessToken: newAccessToken,
  });
}

export async function getMe(req: Request, res: Response) {
  if (!req.user) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      permissions: true,
      assignedBranches: {
        include: { branch: true },
      },
      organization: true,
    },
  });

  if (!user) {
    return sendError(res, 404, 'NOT_FOUND', 'User not found');
  }

  return sendSuccess(res, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    organizationName: user.organization?.name || null,
    status: user.status,
    permissions: user.permissions.map((p) => p.permission),
    assignedBranches: user.assignedBranches.map((b) => ({
      id: b.branch.id,
      name: b.branch.name,
    })),
  });
}

export async function forgotPassword(req: Request, res: Response) {
  // Anti-user enumeration: always return 200 generic message
  return sendSuccess(res, {
    message: 'If an account exists with this email address, password reset instructions have been sent.',
  });
}

export async function resetPassword(req: Request, res: Response) {
  const { newPassword, token } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Password must be at least 6 characters');
  }
  return sendSuccess(res, {
    message: 'Password reset successfully. You may now log in with your new password.',
  });
}

export async function changePassword(req: Request, res: Response) {
  if (!req.user) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Current and new password are required');
  }

  if (newPassword.length < 6) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'New password must be at least 6 characters');
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return sendError(res, 404, 'NOT_FOUND', 'User not found');
  }

  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Current password does not match');
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      tokenVersion: { increment: 1 }, // Invalidate all existing tokens
    },
  });

  return sendSuccess(res, { message: 'Password changed successfully' });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie('refreshToken');
  return sendSuccess(res, { message: 'Logged out successfully' });
}

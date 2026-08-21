import { sendPasswordResetEmail } from '../services/email.service.js';
import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { comparePassword, hashPassword } from '../utils/crypto.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { Role, UserStatus } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Email and password are required');
  }

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
    return sendError(
      res,
      401,
      'STAFF_INACTIVE',
      'Your staff account is no longer active. Please contact your Organization Administrator.',
    );
  }

  if (user.organizationId && user.organization) {
    const orgStatus = (user.organization as any).status;
    if (orgStatus === 'SUSPENDED' || orgStatus === 'INACTIVE') {
      return sendError(
        res,
        403,
        'ORGANIZATION_INACTIVE',
        'Your organization account is currently inactive or suspended. Please contact your platform administrator.',
      );
    }
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
  const activeAssignedBranches = user.assignedBranches
    .filter((b) => user.role !== Role.STAFF || b.branch.status === 'ACTIVE')
    .map((b) => ({
      id: b.branch.id,
      name: b.branch.name,
      location: b.branch.location,
      status: b.branch.status,
    }));
  const assignedBranchIds = activeAssignedBranches.map((b) => b.id);

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
      mustChangePassword: user.mustChangePassword,
      permissions,
      assignedBranchIds,
      assignedBranches: activeAssignedBranches,
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
    mustChangePassword: user.mustChangePassword,
    permissions: user.permissions.map((p) => p.permission),
    assignedBranchIds: user.assignedBranches
      .filter((b) => user.role !== Role.STAFF || b.branch.status === 'ACTIVE')
      .map((b) => b.branchId),
    assignedBranches: user.assignedBranches
      .filter((b) => user.role !== Role.STAFF || b.branch.status === 'ACTIVE')
      .map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
        location: b.branch.location,
        status: b.branch.status,
      })),
  });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Email is required');
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
    include: { organization: true },
  });

  // Allow both SUPER_ADMIN and ORG_ADMIN (and any active user) to receive password reset email
  if (user && user.status === UserStatus.ACTIVE && [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.STAFF].includes(user.role)) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity // 30 minutes validity

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: tokenHash,
        resetPasswordExpires: resetExpires,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;
    const roleName = user.role === Role.SUPER_ADMIN ? 'Super Admin' : user.role === Role.ORG_ADMIN ? 'Organization Admin' : 'Staff';

    // Dispatch email via Resend
    await sendPasswordResetEmail(user.email, user.name, resetLink, user.role, user.organization?.name);
  }

  // Anti-user enumeration message (always generic for all users)
  return sendSuccess(res, {
    message: 'If an account exists with this email address, a password reset link has been sent.',
  });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body;

  if (!token || !token.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Reset token is required');
  }

  if (!newPassword || newPassword.length < 6) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'New password must be at least 6 characters');
  }

  const rawToken = token.trim();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { resetPasswordToken: tokenHash },
        { resetPasswordToken: rawToken },
      ],
    },
  });

  if (!user || !user.resetPasswordExpires) {
    return sendError(res, 400, 'INVALID_TOKEN', 'Password reset token is invalid or has expired');
  }

  // Timezone-safe timestamp comparison (epoch milliseconds)
  const isExpired = new Date(user.resetPasswordExpires).getTime() < Date.now();
  if (isExpired) {
    return sendError(res, 400, 'INVALID_TOKEN', 'This password reset link has expired. Please request a new one.');
  }

  const newHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      mustChangePassword: false, // User personally chose their new password
      tokenVersion: { increment: 1 }, // Invalidate old sessions/tokens
    },
  });

  return sendSuccess(res, {
    message: 'Password changed successfully. Please log in with your new password.',
  });
}

export async function changePassword(req: Request, res: Response) {
  if (!req.user) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Current password and new password are required');
  }

  if (newPassword.length < 6) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'New password must be at least 6 characters');
  }

  if (currentPassword === newPassword) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'New password must be different from current password');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      permissions: true,
      assignedBranches: { include: { branch: true } },
      organization: true,
    },
  });

  if (!user) {
    return sendError(res, 404, 'NOT_FOUND', 'User not found');
  }

  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) {
    return sendError(res, 400, 'INVALID_CREDENTIALS', 'Current password does not match');
  }

  const newHash = await hashPassword(newPassword);
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
      tokenVersion: { increment: 1 }, // Invalidate previous sessions
    },
    include: {
      permissions: true,
      assignedBranches: { include: { branch: true } },
      organization: true,
    },
  });

  // Generate fresh token with updated tokenVersion and mustChangePassword = false
  const tokenPayload = {
    userId: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    organizationId: updatedUser.organizationId,
    tokenVersion: updatedUser.tokenVersion,
  };

  const newAccessToken = generateAccessToken(tokenPayload);

  return sendSuccess(res, {
    message: 'Password changed successfully.',
    token: newAccessToken,
    accessToken: newAccessToken,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      organizationId: updatedUser.organizationId,
      organizationName: updatedUser.organization?.name || null,
      status: updatedUser.status,
      mustChangePassword: false,
      permissions: updatedUser.permissions.map((p) => p.permission),
      assignedBranches: updatedUser.assignedBranches.map((b) => ({
        id: b.branch.id,
        name: b.branch.name,
      })),
    },
  });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie('refreshToken');
  return sendSuccess(res, { message: 'Logged out successfully' });
}

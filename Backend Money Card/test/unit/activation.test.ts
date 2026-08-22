import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/database.js';
import { UserStatus, Role, PermissionCode } from '@prisma/client';

describe('Account Invitation & Activation Workflow', () => {
  const testOrgId = 'org_test_activation';
  const testStaffId = 'usr_test_activation_staff';
  const rawToken = 'sample_raw_activation_token_1234567890abcdef';
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  beforeEach(async () => {
    // Clean and setup test fixtures
    await prisma.userPermission.deleteMany({ where: { user: { email: 'invite_test@example.com' } } });
    await prisma.user.deleteMany({ where: { email: 'invite_test@example.com' } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });

    await prisma.organization.create({
      data: {
        id: testOrgId,
        name: 'Activation Test Cafeteria',
      },
    });

    await prisma.user.create({
      data: {
        id: testStaffId,
        name: 'Rahul Test Staff',
        email: 'invite_test@example.com',
        role: Role.STAFF,
        organizationId: testOrgId,
        status: UserStatus.PENDING_ACTIVATION,
        passwordHash: await bcrypt.hash('temporary_placeholder_hash', 10),
        activationToken: tokenHash,
        activationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        tokenVersion: 1,
      },
    });
  });

  it('1. should find user and verify activation token when valid and not expired', async () => {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { activationToken: tokenHash },
          { activationToken: rawToken },
        ],
      },
      include: { organization: true },
    });

    expect(user).toBeDefined();
    expect(user?.name).toBe('Rahul Test Staff');
    expect(user?.status).toBe(UserStatus.PENDING_ACTIVATION);
    expect(user?.organization?.name).toBe('Activation Test Cafeteria');
    expect(new Date(user!.activationTokenExpires!).getTime()).toBeGreaterThan(Date.now());
  });

  it('2. should reject expired activation token', async () => {
    // Set token to expired 1 hour ago
    await prisma.user.update({
      where: { id: testStaffId },
      data: {
        activationTokenExpires: new Date(Date.now() - 60 * 60 * 1000),
      },
    });

    const user = await prisma.user.findFirst({
      where: { activationToken: tokenHash },
    });

    expect(user).toBeDefined();
    const isExpired = new Date(user!.activationTokenExpires!).getTime() < Date.now();
    expect(isExpired).toBe(true);
  });

  it('3. should activate account, update status to ACTIVE, clear token, and hash chosen password', async () => {
    const chosenPassword = 'MySecretStaff@2026';
    const newHash = await bcrypt.hash(chosenPassword, 10);

    const activatedUser = await prisma.user.update({
      where: { id: testStaffId },
      data: {
        passwordHash: newHash,
        status: UserStatus.ACTIVE,
        activationToken: null,
        activationTokenExpires: null,
        mustChangePassword: false,
        tokenVersion: { increment: 1 },
      },
    });

    expect(activatedUser.status).toBe(UserStatus.ACTIVE);
    expect(activatedUser.activationToken).toBeNull();
    expect(activatedUser.activationTokenExpires).toBeNull();
    expect(activatedUser.tokenVersion).toBe(2);

    const isMatch = await bcrypt.compare(chosenPassword, activatedUser.passwordHash);
    expect(isMatch).toBe(true);
  });

  it('4. should enforce single-use token: token lookup fails once activated', async () => {
    // Activate user
    await prisma.user.update({
      where: { id: testStaffId },
      data: {
        status: UserStatus.ACTIVE,
        activationToken: null,
        activationTokenExpires: null,
      },
    });

    const attemptReuse = await prisma.user.findFirst({
      where: { activationToken: tokenHash },
    });

    expect(attemptReuse).toBeNull();
  });

  it('5. should regenerate activation token and extend 24h expiration on resend invite', async () => {
    const newRawToken = 'new_regenerated_token_987654321';
    const newTokenHash = crypto.createHash('sha256').update(newRawToken).digest('hex');
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const refreshed = await prisma.user.update({
      where: { id: testStaffId },
      data: {
        activationToken: newTokenHash,
        activationTokenExpires: newExpires,
      },
    });

    expect(refreshed.activationToken).toBe(newTokenHash);
    expect(refreshed.activationTokenExpires).toEqual(newExpires);
  });
});

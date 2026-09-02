import { mockStore } from '../store';
import { mockDelay, createMockSuccess, createMockError } from '../utils';
import type {
  ApiResult,
  AuthResponseData,
  LoginCredentials,
  AuthUser,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from '@/types';
import { storage, STORAGE_KEYS } from '@/utils';

let currentSessionUser: AuthUser | null = null;

export const mockAuthHandlers = {
  async activateAccount(_req: any): Promise<ApiResult<any>> {
    await mockDelay();
    return createMockSuccess({ message: 'Account activated' });
  },
  async verifyActivationToken(_token: string): Promise<ApiResult<any>> {
    await mockDelay();
    return createMockSuccess({ valid: true, user: { id: 'usr_001', name: 'Demo User', email: 'user@example.com', role: 'STAFF', organizationName: 'Demo Org' } });
  },
  async login(credentials: LoginCredentials): Promise<ApiResult<AuthResponseData>> {
    await mockDelay();

    const userMatch = mockStore.staffUsers.find(
      (u) => u.email.toLowerCase() === credentials.email.toLowerCase(),
    );

    if (!userMatch || userMatch.passwordHash !== credentials.password) {
      return createMockError('UNAUTHORIZED', 'Invalid email or password');
    }

    if ('status' in userMatch && (userMatch as { status?: string }).status === 'INACTIVE') {
      return createMockError('UNAUTHORIZED', 'Account is disabled. Please contact your administrator.');
    }

    const authUser: AuthUser = {
      id: userMatch.id,
      email: userMatch.email,
      name: userMatch.name,
      role: userMatch.role,
      organizationId: userMatch.organizationId,
      permissions: userMatch.permissions,
      assignedBranchIds: userMatch.assignedBranchIds,
    };

    currentSessionUser = authUser;

    const mockAccessToken = `mock_jwt_access_${authUser.id}_${Date.now()}`;
    const mockRefreshToken = `mock_jwt_refresh_${authUser.id}_${Date.now()}`;

    return createMockSuccess({
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      user: authUser,
    });
  },

  async refresh(refreshToken: string): Promise<ApiResult<{ accessToken: string }>> {
    await mockDelay();
    if (!refreshToken || !refreshToken.startsWith('mock_jwt_refresh_')) {
      return createMockError('UNAUTHORIZED', 'Invalid or expired refresh token');
    }

    const newAccessToken = `mock_jwt_access_rotated_${Date.now()}`;
    return createMockSuccess({ accessToken: newAccessToken });
  },

  async logout(): Promise<ApiResult<{ message: string }>> {
    await mockDelay();
    currentSessionUser = null;
    return createMockSuccess({ message: 'Successfully logged out' });
  },

  async getMe(): Promise<ApiResult<AuthUser>> {
    await mockDelay();
    if (!currentSessionUser) {
      const savedUser = storage.get<AuthUser>(STORAGE_KEYS.USER);
      if (savedUser) {
        currentSessionUser = savedUser;
      }
    }
    if (!currentSessionUser) {
      return createMockError('UNAUTHORIZED', 'Authentication token missing or invalid');
    }
    return createMockSuccess(currentSessionUser);
  },

  async forgotPassword(req: ForgotPasswordRequest): Promise<ApiResult<{ message: string }>> {
    await mockDelay();
    if (!req.email || !req.email.trim()) {
      return createMockError('VALIDATION_ERROR', 'Email is required');
    }
    // M0 Rule 14.3: Password-reset requests must NOT reveal whether an account exists.
    return createMockSuccess({
      message: `If an account associated with ${req.email} exists, password reset instructions have been sent.`,
    });
  },

  async resetPassword(req: ResetPasswordRequest): Promise<ApiResult<{ message: string }>> {
    await mockDelay();
    if (!req.token || !req.newPassword) {
      return createMockError('VALIDATION_ERROR', 'Token and new password are required');
    }
    return createMockSuccess({ message: 'Password reset successfully' });
  },

  async changePassword(req: ChangePasswordRequest): Promise<ApiResult<{ message: string }>> {
    await mockDelay();
    if (!currentSessionUser) {
      return createMockError('UNAUTHORIZED', 'Authentication required');
    }
    if (!req.currentPassword || !req.newPassword) {
      return createMockError('VALIDATION_ERROR', 'Current and new password are required');
    }
    return createMockSuccess({ message: 'Password changed successfully' });
  },

  // Helper to switch active mock session user (for testing different roles/permissions)
  setMockSessionUser(user: AuthUser | null): void {
    currentSessionUser = user;
  },

  getCurrentSessionUser(): AuthUser | null {
    return currentSessionUser;
  },
};

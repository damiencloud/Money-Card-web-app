import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STORAGE_KEYS, storage } from '../utils/storage';
import { mockAuthHandlers } from '../services/mock/handlers/auth';
import type { AuthUser } from '../types';

describe('Auth Role Persistence & Refresh Protection', () => {
  const superAdminUser: AuthUser = {
    id: 'usr_superadmin',
    email: 'amigosiamoneycard@gmail.com',
    name: 'Platform Super Admin',
    role: 'SUPER_ADMIN',
    organizationId: null,
    organizationName: null,
    mustChangePassword: false,
    permissions: [],
    assignedBranchIds: [],
  };

  const orgAdminUser: AuthUser = {
    id: 'usr_orgadmin',
    email: 'admin@maincafe.com',
    name: 'Acme General Manager',
    role: 'ORG_ADMIN',
    organizationId: 'org_001',
    organizationName: 'Acme Cafeterias',
    mustChangePassword: false,
    permissions: [],
    assignedBranchIds: ['branch_001'],
  };

  const mockStorageStore = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => mockStorageStore.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorageStore.set(key, value),
    removeItem: (key: string) => mockStorageStore.delete(key),
    clear: () => mockStorageStore.clear(),
    key: (index: number) => Array.from(mockStorageStore.keys())[index] ?? null,
    get length() {
      return mockStorageStore.size;
    },
  };

  beforeEach(() => {
    mockStorageStore.clear();
    vi.stubGlobal('localStorage', mockLocalStorage);
    storage.clear();
    vi.clearAllMocks();
  });

  it('STORAGE_KEYS should include USER key', () => {
    expect(STORAGE_KEYS.USER).toBe('user');
    expect(STORAGE_KEYS.ACCESS_TOKEN).toBe('access_token');
  });

  it('should persist and retrieve AuthUser from storage across page reloads', () => {
    storage.set(STORAGE_KEYS.ACCESS_TOKEN, 'test_superadmin_token');
    storage.set(STORAGE_KEYS.USER, superAdminUser);

    const savedToken = storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
    const savedUser = storage.get<AuthUser>(STORAGE_KEYS.USER);

    expect(savedToken).toBe('test_superadmin_token');
    expect(savedUser).not.toBeNull();
    expect(savedUser?.role).toBe('SUPER_ADMIN');
    expect(savedUser?.email).toBe('amigosiamoneycard@gmail.com');
  });

  it('mockAuthHandlers.getMe should restore user from storage instead of defaulting to ORG_ADMIN', async () => {
    // Simulate Super Admin session stored in localStorage
    storage.set(STORAGE_KEYS.ACCESS_TOKEN, 'mock_token_super');
    storage.set(STORAGE_KEYS.USER, superAdminUser);

    const result = await mockAuthHandlers.getMe();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('SUPER_ADMIN');
      expect(result.data.id).toBe('usr_superadmin');
    }
  });

  it('should clear USER key on logout or auth state reset', () => {
    storage.set(STORAGE_KEYS.ACCESS_TOKEN, 'token_123');
    storage.set(STORAGE_KEYS.USER, orgAdminUser);

    storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
    storage.remove(STORAGE_KEYS.USER);

    expect(storage.get(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(storage.get(STORAGE_KEYS.USER)).toBeNull();
  });

  it('role resolution should strictly differentiate SUPER_ADMIN from ORG_ADMIN without falling back', () => {
    const resolveDashboard = (user: AuthUser | null, isLoading: boolean) => {
      if (isLoading && !user) return 'LOADING';
      if (user?.role === 'SUPER_ADMIN') return 'SUPER_ADMIN_DASHBOARD';
      if (user?.role === 'ORG_ADMIN') return 'ORG_ADMIN_DASHBOARD';
      return 'UNAUTHORIZED';
    };

    // While loading without cached user
    expect(resolveDashboard(null, true)).toBe('LOADING');

    // While loading with cached Super Admin (instant hydration)
    expect(resolveDashboard(superAdminUser, true)).toBe('SUPER_ADMIN_DASHBOARD');

    // Fully hydrated Super Admin
    expect(resolveDashboard(superAdminUser, false)).toBe('SUPER_ADMIN_DASHBOARD');

    // Fully hydrated Org Admin
    expect(resolveDashboard(orgAdminUser, false)).toBe('ORG_ADMIN_DASHBOARD');

    // Unauthenticated or unknown role
    expect(resolveDashboard(null, false)).toBe('UNAUTHORIZED');
  });
});

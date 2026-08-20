import { useCallback } from 'react';
import { useAuth } from './useAuth';
import type { Permission, UserRole } from '@/types';

// ─── usePermissions Hook ───────────────────────────────────
// Frontend permission guard for UI/navigation control.
// Backend authorization remains authoritative.
//
// Usage:
//   const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
//   if (hasPermission('CARD_VIEW')) { ... }

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;
      // Super Admin and Org Admin have all permissions implicitly
      if (user.role === 'SUPER_ADMIN' || user.role === 'ORG_ADMIN') return true;
      return user.permissions.includes(permission);
    },
    [user],
  );

  const hasAnyPermission = useCallback(
    (permissions: Permission[]): boolean => {
      return permissions.some((p) => hasPermission(p));
    },
    [hasPermission],
  );

  const hasAllPermissions = useCallback(
    (permissions: Permission[]): boolean => {
      return permissions.every((p) => hasPermission(p));
    },
    [hasPermission],
  );

  const hasRole = useCallback(
    (role: UserRole): boolean => {
      if (!user) return false;
      return user.role === role;
    },
    [user],
  );

  const hasAnyRole = useCallback(
    (roles: UserRole[]): boolean => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user],
  );

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    permissions: user?.permissions ?? [],
    role: user?.role ?? null,
  };
}

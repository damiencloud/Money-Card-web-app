import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks';
import type { Permission, UserRole } from '@/types';
import { ErrorState } from '@/components/ui';
import { ShieldX } from 'lucide-react';

// ─── Permission Guard ──────────────────────────────────────
// UI-level permission check. Backend authorization remains authoritative.
//
// Usage:
//   <PermissionGuard permission="CARD_VIEW">
//     <CardList />
//   </PermissionGuard>
//
//   <PermissionGuard permissions={["RECHARGE", "PURCHASE"]} requireAll={false}>
//     <TransactionPanel />
//   </PermissionGuard>

interface PermissionGuardProps {
  children: ReactNode;
  /** Single permission check */
  permission?: Permission;
  /** Multiple permission check */
  permissions?: Permission[];
  /** If true, all permissions are required. Default: false (any). */
  requireAll?: boolean;
  /** Required role(s) */
  roles?: UserRole[];
  /** Custom fallback when access is denied */
  fallback?: ReactNode;
  /** If true, renders nothing instead of error state when denied */
  silent?: boolean;
}

export function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  roles,
  fallback,
  silent = false,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasAnyRole } = usePermissions();

  let hasAccess = true;

  // Check role requirement
  if (roles && roles.length > 0) {
    hasAccess = hasAnyRole(roles);
  }

  // Check single permission
  if (hasAccess && permission) {
    hasAccess = hasPermission(permission);
  }

  // Check multiple permissions
  if (hasAccess && permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (!hasAccess) {
    if (silent) return null;
    if (fallback) return <>{fallback}</>;

    return (
      <ErrorState
        icon={<ShieldX className="h-8 w-8" />}
        title="Access Denied"
        message="You don't have permission to view this content."
      />
    );
  }

  return <>{children}</>;
}

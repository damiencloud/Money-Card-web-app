// ─── Dashboard Main Entry Page (M11) ───────────────────────
// Main Landing Page after successful authentication.
// Renders role-specific dashboards for SUPER_ADMIN vs ORG_ADMIN.

import { useAuth } from '@/hooks';
import { LoadingState } from '@/components/ui';
import { UnauthorizedPage } from '@/features/auth';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { OrgAdminDashboard } from './OrgAdminDashboard';

export function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading && !user) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (user?.role === 'SUPER_ADMIN') {
    return <SuperAdminDashboard />;
  }

  if (user?.role === 'ORG_ADMIN') {
    return <OrgAdminDashboard />;
  }

  return <UnauthorizedPage />;
}

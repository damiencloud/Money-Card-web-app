// ─── Dashboard Main Entry Page (M11) ───────────────────────
// Main Landing Page after successful authentication.
// Renders role-specific dashboards for SUPER_ADMIN vs ORG_ADMIN.

import { useAuth } from '@/hooks';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { OrgAdminDashboard } from './OrgAdminDashboard';

export function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === 'SUPER_ADMIN') {
    return <SuperAdminDashboard />;
  }

  return <OrgAdminDashboard />;
}

// ─── Analytics Dashboard Router (M9 Analytics Correction) ─────
// Renders role-specific analytics dashboards:
// - SUPER_ADMIN -> SuperAdminAnalyticsView (Platform Scope)
// - ORG_ADMIN -> OrgAdminAnalyticsView (Organization Scope)

import { useAuth, usePermissions } from '@/hooks';
import { LoadingState } from '@/components/ui';
import { UnauthorizedPage } from '@/features/auth';
import { SuperAdminAnalyticsView } from './SuperAdminAnalyticsView';
import { OrgAdminAnalyticsView } from './OrgAdminAnalyticsView';

export function AnalyticsPage() {
  const { user, isLoading } = useAuth();
  const { hasPermission } = usePermissions();

  if (isLoading && !user) {
    return <LoadingState message="Loading analytics..." />;
  }

  const canViewAnalytics = hasPermission('VIEW_ANALYTICS');

  if (!canViewAnalytics) {
    return <UnauthorizedPage />;
  }

  if (user?.role === 'SUPER_ADMIN') {
    return <SuperAdminAnalyticsView />;
  }

  if (user?.role === 'ORG_ADMIN') {
    return <OrgAdminAnalyticsView />;
  }

  return <UnauthorizedPage />;
}

import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/app/layouts/DashboardLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { PortalLayout } from '@/app/layouts/PortalLayout';
import { AuthGuard, GuestGuard, PermissionGuard } from '@/app/routes/guards';

// ── Feature Pages ──────────────────────────────────────────
import {
  LoginPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  UnauthorizedPage,
  MandatoryChangePasswordPage,
} from '@/features/auth';
import { OrganizationsPage } from '@/features/organizations';
import { DashboardPage } from '@/features/dashboard';
import { BranchesPage } from '@/features/branches';
import { StaffPage } from '@/features/staff';
import { CardsPage } from '@/features/cards';
import { SessionsPage } from '@/features/sessions';
import { ProductsPage } from '@/features/products';
import { InventoryPage } from '@/features/inventory';
import { AnalyticsPage } from '@/features/analytics';
import { PeakPage } from '@/features/peak';
import { ReportsPage } from '@/features/reports';
import { SubscriptionsPage } from '@/features/subscriptions';
import { SettingsPage } from '@/features/settings';

import {
  QrResolutionPage,
  PortalSessionPage,
  PortalTransactionsPage,
  PortalReceiptsPage,
} from '@/features/portal';

// ─── Application Routes ───────────────────────────────────
// User Portal routes are conceptually separate from Staff/Admin routes.

export function AppRoutes() {
  return (
    <Routes>
      {/* ── Auth Routes (unauthenticated) ── */}
      <Route
        element={
          <GuestGuard>
            <AuthLayout />
          </GuestGuard>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* ── Unauthorized (authenticated but no permission) ── */}
      <Route
        path="/change-password"
        element={
          <AuthGuard>
            <MandatoryChangePasswordPage />
          </AuthGuard>
        }
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* ── Dashboard Routes (authenticated) ── */}
      <Route
        element={
          <AuthGuard>
            <DashboardLayout />
          </AuthGuard>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/branches" element={<BranchesPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/cards" element={<CardsPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/peak" element={<PeakPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* ── Super Admin Specific Routes ── */}
        <Route
          path="/organizations"
          element={
            <PermissionGuard roles={['SUPER_ADMIN']}>
              <OrganizationsPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/plans"
          element={
            <PermissionGuard roles={['SUPER_ADMIN']}>
              <SubscriptionsPage />
            </PermissionGuard>
          }
        />
        <Route
          path="/plans-subscriptions"
          element={
            <PermissionGuard roles={['SUPER_ADMIN']}>
              <SubscriptionsPage />
            </PermissionGuard>
          }
        />
      </Route>

      {/* ── User Portal Routes (separate authentication/session) ── */}
      <Route element={<PortalLayout />}>
        <Route path="/c/:qrToken" element={<QrResolutionPage />} />
        <Route path="/c/:token" element={<QrResolutionPage />} />
        <Route path="/portal" element={<PortalSessionPage />} />
        <Route path="/portal/session" element={<PortalSessionPage />} />
        <Route path="/portal/transactions" element={<PortalTransactionsPage />} />
        <Route path="/portal/receipts" element={<PortalReceiptsPage />} />
      </Route>

      {/* ── Redirects ── */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="*"
        element={
          <div className="flex min-h-screen items-center justify-center bg-slate-950">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-slate-700">404</h1>
              <p className="mt-2 text-slate-500">Page not found</p>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

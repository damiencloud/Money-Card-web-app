import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { LoadingState } from '@/components/ui';

// ─── Auth Guard ────────────────────────────────────────────
// Redirects unauthenticated users to /login, preserving the intended
// destination in ?redirect= so the user returns there after login.

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    // Preserve the intended destination for post-login redirect
    const redirectParam =
      location.pathname !== '/' && location.pathname !== '/dashboard'
        ? `?redirect=${encodeURIComponent(location.pathname + location.search)}`
        : '';
    return <Navigate to={`/login${redirectParam}`} replace />;
  }

  return <>{children}</>;
}

// ─── Guest Guard ───────────────────────────────────────────
// Redirects authenticated users to /dashboard.

interface GuestGuardProps {
  children: ReactNode;
}

export function GuestGuard({ children }: GuestGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState message="Checking authentication..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

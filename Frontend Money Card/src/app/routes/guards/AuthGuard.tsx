import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { LoadingState } from '@/components/ui';

//  Auth Guard 
// Redirects unauthenticated users to /login, preserving the intended
// destination in ?redirect= so the user returns there after login.
// Enforces mandatory password change redirection when mustChangePassword is true.

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    const redirectParam =
      location.pathname !== '/' && location.pathname !== '/dashboard'
        ? `?redirect=${encodeURIComponent(location.pathname + location.search)}`
        : '';
    return <Navigate to={`/login${redirectParam}`} replace />;
  }

  // Mandatory Password Change Enforcement
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (!user?.mustChangePassword && location.pathname === '/change-password') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

//  Guest Guard 
// Redirects authenticated users to /dashboard or /change-password.

interface GuestGuardProps {
  children: ReactNode;
}

export function GuestGuard({ children }: GuestGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState message="Checking authentication..." />;
  }

  if (isAuthenticated) {
    if (user?.mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// ─── Unauthorized Page (403) ────────────────────────────────
// Authenticated but insufficient permissions.

import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui';

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/15 to-orange-500/15 shadow-lg shadow-rose-500/10">
          <ShieldX className="h-10 w-10 text-rose-400" />
        </div>

        <h1 className="mt-6 text-4xl font-bold text-slate-200">403</h1>
        <h2 className="mt-2 text-lg font-semibold text-slate-300">Access Denied</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          You don&apos;t have the required permissions to access this page. If you believe this is
          an error, please contact your organization administrator.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link to="/dashboard">
            <Button variant="primary" leftIcon={<Home className="h-4 w-4" />}>
              Go to Dashboard
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Sign in as different user
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

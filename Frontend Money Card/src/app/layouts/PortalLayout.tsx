import { Outlet } from 'react-router-dom';

// ─── Portal Layout ─────────────────────────────────────────
// Layout for the User Portal — conceptually separate from Staff/Admin dashboard.
// Users access the portal by scanning their QR card.

export function PortalLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      {/* Portal Header */}
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-bold text-white">
            MC
          </div>
          <span className="font-semibold text-slate-200">My Card</span>
        </div>
      </header>

      {/* Portal Content */}
      <main className="mx-auto w-full max-w-lg flex-1 p-4">
        <Outlet />
      </main>

      {/* Portal Footer */}
      <footer className="border-t border-slate-800/60 py-4 text-center text-xs text-slate-600">
        Money Card • User Portal
      </footer>
    </div>
  );
}

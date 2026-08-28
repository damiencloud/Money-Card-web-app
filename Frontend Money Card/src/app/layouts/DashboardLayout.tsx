import { ErrorBoundary } from '@/components/ui';
// ─── Authenticated Web Application Shell (M4) ──────────────
// Reusable shell layout for SUPER_ADMIN & ORG_ADMIN.
// Staff operational UI and User Portal auth are strictly separate.

import { useState, useMemo } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { cn } from '@/utils';
import { useAuth, useBranch, usePermissions } from '@/hooks';
import { Breadcrumbs, ProfileMenu } from '@/components/ui';
import { NAVIGATION_ITEMS } from '@/config/navigation';
import {
  LayoutDashboard,
  Building,
  Building2,
  Users,
  UserCheck,
  CreditCard,
  Clock,
  Package,
  Warehouse,
  BarChart3,
  FileText,
  Settings,
  Layers,
  Flame,
  Menu,
  X,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
} from 'lucide-react';

// Icon Map for dynamic lookup from config
const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="h-5 w-5 shrink-0" />,
  Building: <Building className="h-5 w-5 shrink-0" />,
  Building2: <Building2 className="h-5 w-5 shrink-0" />,
  Users: <Users className="h-5 w-5 shrink-0" />,
  UserCheck: <UserCheck className="h-5 w-5 shrink-0" />,
  CreditCard: <CreditCard className="h-5 w-5 shrink-0" />,
  Clock: <Clock className="h-5 w-5 shrink-0" />,
  Package: <Package className="h-5 w-5 shrink-0" />,
  Warehouse: <Warehouse className="h-5 w-5 shrink-0" />,
  BarChart3: <BarChart3 className="h-5 w-5 shrink-0" />,
  Flame: <Flame className="h-5 w-5 shrink-0" />,
  FileText: <FileText className="h-5 w-5 shrink-0" />,
  Settings: <Settings className="h-5 w-5 shrink-0" />,
  Layers: <Layers className="h-5 w-5 shrink-0" />,
};

export function DashboardLayout() {
  const { user } = useAuth();
  const { currentBranch, branches, selectBranch } = useBranch();
  const { hasPermission } = usePermissions();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

  const userRole = user?.role || 'ORG_ADMIN';

  // ── Filter Navigation Items by Role & Permission ─────────
  const navItems = useMemo(() => {
    return NAVIGATION_ITEMS.filter((item) => {
      // Role check
      if (!item.roles.includes(userRole)) return false;
      // Permission check (if specified on item)
      if (item.permission && !hasPermission(item.permission)) return false;
      return true;
    });
  }, [userRole, hasPermission]);

  // ── Organization Context Label ────────────────────────────
  const orgContextLabel = useMemo(() => {
    if (userRole === 'SUPER_ADMIN') {
      return 'Platform Super Admin';
    }
    return user?.organizationId === 'org_001'
      ? 'Acme Cafeterias'
      : user?.organizationId === 'org_002'
        ? 'Metro Food Court'
        : 'Organization Admin';
  }, [userRole, user?.organizationId]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* ── Mobile Overlay ── */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        aria-label="Main Navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800/60 bg-slate-950 transition-all duration-300 lg:static lg:translate-x-0',
          mobileDrawerOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0',
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-64',
        )}
      >
        {/* Brand / Logo Header */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-800/60 px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 font-bold text-white shadow-lg shadow-violet-500/25">
            MC
          </div>
          {(!sidebarCollapsed || mobileDrawerOpen) && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold text-slate-100 truncate">Money Card</span>
              <span className="text-[11px] text-slate-400 font-medium truncate">
                {userRole === 'SUPER_ADMIN' ? 'Platform Control' : 'Admin Portal'}
              </span>
            </div>
          )}

          {/* Mobile close button */}
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden"
            aria-label="Close navigation sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Organization / Branch Context in Sidebar (Expanded view) */}
        {(!sidebarCollapsed || mobileDrawerOpen) && branches.length > 0 && (
          <div className="border-b border-slate-800/60 px-3 py-3">
            <div className="relative">
              <button
                onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                aria-expanded={branchDropdownOpen}
                aria-label="Branch selector"
                className="flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <Building2 className="h-4 w-4 shrink-0 text-violet-400" />
                <span className="flex-1 truncate text-left">
                  {currentBranch?.name || 'Select Branch'}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                    branchDropdownOpen && 'rotate-180',
                  )}
                />
              </button>

              {branchDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-slate-800 bg-slate-900 py-1 shadow-2xl backdrop-blur-md">
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => {
                        selectBranch(branch);
                        setBranchDropdownOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-2 text-xs font-medium transition-colors',
                        currentBranch?.id === branch.id
                          ? 'bg-violet-500/15 text-violet-300'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                      )}
                    >
                      <span className="truncate">{branch.name}</span>
                      {currentBranch?.id === branch.id && (
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const icon = ICON_MAP[item.iconName] || <LayoutDashboard className="h-5 w-5 shrink-0" />;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileDrawerOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
                    isActive
                      ? 'bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-300 font-semibold border-l-2 border-violet-500'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
                    sidebarCollapsed && !mobileDrawerOpen && 'justify-center px-2',
                  )
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                {icon}
                {(!sidebarCollapsed || mobileDrawerOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer — Desktop Collapse Toggle */}
        <div className="hidden lg:flex border-t border-slate-800/60 p-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5 shrink-0 text-slate-400" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5 shrink-0 text-slate-400" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main Workspace Area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="relative z-30 flex h-16 shrink-0 items-center gap-4 border-b border-slate-800/60 bg-slate-950/80 px-4 backdrop-blur-md lg:px-6">
          {/* Mobile Drawer Trigger */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb Navigation */}
          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>

          <div className="flex-1" />

          {/* Organization Context Badge */}
          <div className="hidden md:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300">
            <Shield className="h-3.5 w-3.5 text-violet-400 shrink-0" />
            <span className="text-slate-400">Org:</span>
            <span className="font-semibold text-slate-200 truncate max-w-[140px]">
              {orgContextLabel}
            </span>
          </div>

          {/* User Profile Menu */}
          <ProfileMenu />
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" id="main-content">
          {/* Mobile Breadcrumb (shown on small screens) */}
          <div className="mb-4 sm:hidden">
            <Breadcrumbs />
          </div>

          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

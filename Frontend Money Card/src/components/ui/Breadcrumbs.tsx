// ─── Breadcrumbs Component ─────────────────────────────────
// Route-derived accessible breadcrumb navigation.

import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  branches: 'Branches',
  staff: 'Staff',
  cards: 'Cards',
  sessions: 'Sessions',
  products: 'Products',
  inventory: 'Inventory',
  analytics: 'Analytics',
  reports: 'Reports',
  subscriptions: 'Subscriptions',
  settings: 'Settings',
  organizations: 'Organizations',
  plans: 'Plans',
  portal: 'User Portal',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  if (pathnames.length === 0) return null;

  const items: BreadcrumbItem[] = pathnames.map((segment, index) => {
    const path = `/${pathnames.slice(0, index + 1).join('/')}`;
    const label =
      ROUTE_LABELS[segment.toLowerCase()] ||
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    return { label, path };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm font-medium">
      <ol className="flex items-center gap-1.5 text-slate-400">
        <li>
          <Link
            to="/dashboard"
            className="flex items-center gap-1 transition-colors hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:rounded"
            title="Dashboard Home"
          >
            <Home className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="sr-only">Dashboard</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.path} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
              {isLast ? (
                <span
                  className="font-semibold text-slate-200"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="transition-colors hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:rounded"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

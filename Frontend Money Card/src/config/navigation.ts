// ─── Navigation Configuration ──────────────────────────────
// Role & Permission-aware navigation config.
// Uses ONLY M0 permission identifiers.
// Staff operational UI and User Portal auth are EXCLUDED.

import type { UserRole, Permission } from '@/types';

export interface NavItemConfig {
  id: string;
  label: string;
  path: string;
  iconName: string;
  roles: UserRole[];
  permission?: Permission;
}

export const NAVIGATION_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    iconName: 'LayoutDashboard',
    roles: ['SUPER_ADMIN', 'ORG_ADMIN'],
  },
  {
    id: 'organizations',
    label: 'Organizations',
    path: '/organizations',
    iconName: 'Building',
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'plans-subscriptions',
    label: 'Plans & Subscriptions',
    path: '/plans-subscriptions',
    iconName: 'Layers',
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'branches',
    label: 'Branches',
    path: '/branches',
    iconName: 'Building2',
    roles: ['ORG_ADMIN'],
    permission: 'BRANCH_VIEW',
  },
  {
    id: 'staff',
    label: 'Staff',
    path: '/staff',
    iconName: 'Users',
    roles: ['ORG_ADMIN'],
    permission: 'STAFF_VIEW',
  },
  {
    id: 'cards',
    label: 'Cards',
    path: '/cards',
    iconName: 'CreditCard',
    roles: ['ORG_ADMIN'],
    permission: 'CARD_VIEW',
  },
  {
    id: 'sessions',
    label: 'Sessions',
    path: '/sessions',
    iconName: 'Clock',
    roles: ['ORG_ADMIN'],
    permission: 'SESSION_VIEW',
  },
  {
    id: 'products',
    label: 'Products & Inventory',
    path: '/products',
    iconName: 'Package',
    roles: ['ORG_ADMIN'],
    permission: 'PRODUCT_VIEW',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    iconName: 'BarChart3',
    roles: ['SUPER_ADMIN', 'ORG_ADMIN'],
    permission: 'VIEW_ANALYTICS',
  },
  {
    id: 'peak',
    label: 'Peak & Demand',
    path: '/peak',
    iconName: 'Flame',
    roles: ['ORG_ADMIN'],
    permission: 'VIEW_ANALYTICS',
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    iconName: 'FileText',
    roles: ['ORG_ADMIN'],
    permission: 'VIEW_REPORTS',
  },
  {
    id: 'subscriptions',
    label: 'Subscription',
    path: '/subscriptions',
    iconName: 'CreditCard',
    roles: ['ORG_ADMIN'],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    iconName: 'Settings',
    roles: ['SUPER_ADMIN', 'ORG_ADMIN'],
  },
];

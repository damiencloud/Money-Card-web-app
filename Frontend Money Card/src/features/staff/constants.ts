// ─── Staff Permission Categories Constants (M6) ─────────────
// Grouping for M0 permission matrix with logical dependencies.

import type { Permission } from '@/types';
import {
  CreditCard,
  Clock,
  Package,
  ShieldCheck,
} from 'lucide-react';
import React from 'react';

export interface PermissionItemConfig {
  key: Permission;
  linkedKeys?: Permission[];
  label: string;
  description: string;
  prerequisite?: Permission;
}

export interface PermissionCategoryConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  permissions: PermissionItemConfig[];
}

// ── Logical Permission Dependencies ────────────────────────────
// If a permission key is granted, its required prerequisite(s) MUST also be granted.
// If a prerequisite is revoked, all dependent subordinate permissions are automatically revoked.
export const PERMISSION_DEPENDENCIES: Partial<Record<Permission, Permission[]>> = {
  CARD_ISSUE: ['CARD_VIEW'],
  CARD_RETURN: ['CARD_VIEW'],
  CARD_BLOCK: ['CARD_VIEW'],
  CARD_UNBLOCK: ['CARD_VIEW'],
  PRODUCT_MANAGE: ['PRODUCT_VIEW'],
  INVENTORY_MANAGE: ['PRODUCT_VIEW', 'INVENTORY_VIEW'],
  INVENTORY_IMPORT: ['PRODUCT_VIEW', 'INVENTORY_VIEW'],
  BRANCH_MANAGE: ['BRANCH_VIEW', 'STAFF_VIEW'],
  STAFF_MANAGE: ['BRANCH_VIEW', 'STAFF_VIEW'],
  VIEW_ANALYTICS: ['BRANCH_VIEW', 'STAFF_VIEW'],
  VIEW_REPORTS: ['BRANCH_VIEW', 'STAFF_VIEW'],
  REFUND: ['SESSION_VIEW'],
};

export const PERMISSION_CHILDREN: Partial<Record<Permission, Permission[]>> = {
  CARD_VIEW: ['CARD_ISSUE', 'CARD_RETURN', 'CARD_BLOCK', 'CARD_UNBLOCK'],
  PRODUCT_VIEW: ['PRODUCT_MANAGE', 'INVENTORY_MANAGE', 'INVENTORY_IMPORT'],
  INVENTORY_VIEW: ['PRODUCT_MANAGE', 'INVENTORY_MANAGE', 'INVENTORY_IMPORT'],
  BRANCH_VIEW: ['BRANCH_MANAGE', 'STAFF_MANAGE', 'VIEW_ANALYTICS', 'VIEW_REPORTS'],
  STAFF_VIEW: ['BRANCH_MANAGE', 'STAFF_MANAGE', 'VIEW_ANALYTICS', 'VIEW_REPORTS'],
  SESSION_VIEW: ['REFUND'],
};

export const PERMISSION_GROUPS: PermissionCategoryConfig[] = [
  {
    id: 'cards',
    title: 'Cards Management',
    icon: React.createElement(CreditCard, { className: 'h-4 w-4 text-violet-400' }),
    permissions: [
      { key: 'CARD_VIEW', label: 'CARD_VIEW', description: 'View card balances and card list (Prerequisite for all card actions)' },
      { key: 'CARD_ISSUE', label: 'CARD_ISSUE', description: 'Issue new cards to users (Requires CARD_VIEW)', prerequisite: 'CARD_VIEW' },
      { key: 'CARD_RETURN', label: 'CARD_RETURN', description: 'Process card returns and refunds (Requires CARD_VIEW)', prerequisite: 'CARD_VIEW' },
      {
        key: 'CARD_BLOCK',
        linkedKeys: ['CARD_UNBLOCK'],
        label: 'CARD_BLOCK & UNBLOCK',
        description: 'Block and unblock lost or compromised cards (Requires CARD_VIEW)',
        prerequisite: 'CARD_VIEW',
      },
    ],
  },
  {
    id: 'sessions',
    title: 'Sessions & Operations',
    icon: React.createElement(Clock, { className: 'h-4 w-4 text-violet-400' }),
    permissions: [
      { key: 'RECHARGE', label: 'RECHARGE', description: 'Recharge card balance with cash/UPI' },
      { key: 'PURCHASE', label: 'PURCHASE', description: 'Allows staff to add products to cart and checkout' },
      { key: 'SESSION_VIEW', label: 'SESSION_VIEW', description: 'View active and historical counter sessions' },
      { key: 'REFUND', label: 'REFUND', description: 'Refund purchase transactions (Requires SESSION_VIEW)', prerequisite: 'SESSION_VIEW' },
    ],
  },
  {
    id: 'products',
    title: 'Menu & Inventory',
    icon: React.createElement(Package, { className: 'h-4 w-4 text-violet-400' }),
    permissions: [
      {
        key: 'PRODUCT_VIEW',
        linkedKeys: ['INVENTORY_VIEW'],
        label: 'PRODUCT & INVENTORY VIEW',
        description: 'View catalog products and live inventory stock levels (Prerequisite for management)',
      },
      {
        key: 'PRODUCT_MANAGE',
        linkedKeys: ['INVENTORY_MANAGE', 'INVENTORY_IMPORT'],
        label: 'PRODUCT & INVENTORY MANAGE',
        description: 'Create and edit products, adjust stock levels, and import inventory (Requires View)',
        prerequisite: 'PRODUCT_VIEW',
      },
    ],
  },
  {
    id: 'admin_analytics',
    title: 'Branches, Staff, Analytics & Reports',
    icon: React.createElement(ShieldCheck, { className: 'h-4 w-4 text-violet-400' }),
    permissions: [
      {
        key: 'BRANCH_VIEW',
        linkedKeys: ['STAFF_VIEW'],
        label: 'BRANCH & STAFF VIEW',
        description: 'View branch details and staff member directory (Prerequisite for admin actions)',
      },
      {
        key: 'BRANCH_MANAGE',
        linkedKeys: ['STAFF_MANAGE', 'VIEW_ANALYTICS', 'VIEW_REPORTS'],
        label: 'BRANCH, STAFF & ANALYTICS MANAGE',
        description: 'Manage branches, staff accounts, analytics dashboards, and reports (Requires View)',
        prerequisite: 'BRANCH_VIEW',
      },
    ],
  },
];

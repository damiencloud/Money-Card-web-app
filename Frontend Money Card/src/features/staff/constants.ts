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
  INVENTORY_MANAGE: ['INVENTORY_VIEW'],
  INVENTORY_IMPORT: ['INVENTORY_VIEW'],
  STAFF_MANAGE: ['STAFF_VIEW'],
  BRANCH_MANAGE: ['BRANCH_VIEW'],
  REFUND: ['SESSION_VIEW'],
};

export const PERMISSION_CHILDREN: Partial<Record<Permission, Permission[]>> = {
  CARD_VIEW: ['CARD_ISSUE', 'CARD_RETURN', 'CARD_BLOCK', 'CARD_UNBLOCK'],
  PRODUCT_VIEW: ['PRODUCT_MANAGE'],
  INVENTORY_VIEW: ['INVENTORY_MANAGE', 'INVENTORY_IMPORT'],
  STAFF_VIEW: ['STAFF_MANAGE'],
  BRANCH_VIEW: ['BRANCH_MANAGE'],
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
      { key: 'CARD_BLOCK', label: 'CARD_BLOCK', description: 'Block lost or compromised cards (Requires CARD_VIEW)', prerequisite: 'CARD_VIEW' },
      { key: 'CARD_UNBLOCK', label: 'CARD_UNBLOCK', description: 'Unblock blocked cards (Requires CARD_VIEW)', prerequisite: 'CARD_VIEW' },
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
    title: 'Products & Inventory',
    icon: React.createElement(Package, { className: 'h-4 w-4 text-violet-400' }),
    permissions: [
      { key: 'PRODUCT_VIEW', label: 'PRODUCT_VIEW', description: 'View catalog products (Prerequisite for product management)' },
      { key: 'PRODUCT_MANAGE', label: 'PRODUCT_MANAGE', description: 'Create and edit catalog products (Requires PRODUCT_VIEW)', prerequisite: 'PRODUCT_VIEW' },
      { key: 'INVENTORY_VIEW', label: 'INVENTORY_VIEW', description: 'View live stock levels (Prerequisite for inventory actions)' },
      { key: 'INVENTORY_MANAGE', label: 'INVENTORY_MANAGE', description: 'Adjust stock levels (Requires INVENTORY_VIEW)', prerequisite: 'INVENTORY_VIEW' },
      { key: 'INVENTORY_IMPORT', label: 'INVENTORY_IMPORT', description: 'Import inventory via CSV (Requires INVENTORY_VIEW)', prerequisite: 'INVENTORY_VIEW' },
    ],
  },
  {
    id: 'admin_analytics',
    title: 'Branches, Staff, Analytics & Reports',
    icon: React.createElement(ShieldCheck, { className: 'h-4 w-4 text-violet-400' }),
    permissions: [
      { key: 'BRANCH_VIEW', label: 'BRANCH_VIEW', description: 'View branch details and branch list' },
      { key: 'BRANCH_MANAGE', label: 'BRANCH_MANAGE', description: 'Create and edit branches (Requires BRANCH_VIEW)', prerequisite: 'BRANCH_VIEW' },
      { key: 'STAFF_VIEW', label: 'STAFF_VIEW', description: 'View staff members list' },
      { key: 'STAFF_MANAGE', label: 'STAFF_MANAGE', description: 'Add, edit, and deactivate staff (Requires STAFF_VIEW)', prerequisite: 'STAFF_VIEW' },
      { key: 'VIEW_ANALYTICS', label: 'VIEW_ANALYTICS', description: 'View performance and operational analytics' },
      { key: 'VIEW_REPORTS', label: 'VIEW_REPORTS', description: 'View and export system reports' },
    ],
  },
];

// ─── Staff Permission Categories Constants (M6) ─────────────
// Grouping for M0 permission matrix.

import type { Permission } from '@/types';
import {
  CreditCard,
  Clock,
  Package,
  BarChart3,
  Users,
  Building2,
} from 'lucide-react';
import React from 'react';

export interface PermissionCategoryConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  permissions: {
    key: Permission;
    label: string;
    description: string;
  }[];
}

export const PERMISSION_GROUPS: PermissionCategoryConfig[] = [
  {
    id: 'cards',
    title: 'Cards Management',
    icon: React.createElement(CreditCard, { className: 'h-4 w-4 text-violet-400' }),
    permissions: [
      { key: 'CARD_VIEW', label: 'CARD_VIEW', description: 'View card balances and card list' },
      { key: 'CARD_ISSUE', label: 'CARD_ISSUE', description: 'Issue new cards to users' },
      { key: 'CARD_RETURN', label: 'CARD_RETURN', description: 'Process card returns and refunds' },
      { key: 'CARD_BLOCK', label: 'CARD_BLOCK', description: 'Block lost or compromised cards' },
      { key: 'CARD_UNBLOCK', label: 'CARD_UNBLOCK', description: 'Unblock blocked cards' },
    ],
  },
  {
    id: 'sessions',
    title: 'Sessions & Operations',
    icon: React.createElement(Clock, { className: 'h-4 w-4 text-violet-400' }),
    permissions: [
      { key: 'RECHARGE', label: 'RECHARGE', description: 'Recharge card balance with cash/UPI' },
      { key: 'PURCHASE', label: 'PURCHASE', description: 'Allows staff to add products to cart and checkout' },
      { key: 'REFUND', label: 'REFUND', description: 'Refund purchase transactions' },
      { key: 'SESSION_VIEW', label: 'SESSION_VIEW', description: 'View active and historical sessions' },
    ],
  },
  {
    id: 'products',
    title: 'Products & Inventory',
    icon: React.createElement(Package, { className: 'h-4 w-4 text-violet-400' }),
    permissions: [
      { key: 'PRODUCT_VIEW', label: 'PRODUCT_VIEW', description: 'View catalog products' },
      { key: 'PRODUCT_MANAGE', label: 'PRODUCT_MANAGE', description: 'Create and edit catalog products' },
      { key: 'INVENTORY_VIEW', label: 'INVENTORY_VIEW', description: 'View stock levels' },
      { key: 'INVENTORY_MANAGE', label: 'INVENTORY_MANAGE', description: 'Adjust stock levels' },
      { key: 'INVENTORY_IMPORT', label: 'INVENTORY_IMPORT', description: 'Import inventory via CSV' },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics & Reports',
    icon: React.createElement(BarChart3, { className: 'h-4 w-4 text-violet-400' }),
    permissions: [
      { key: 'VIEW_ANALYTICS', label: 'VIEW_ANALYTICS', description: 'View analytics dashboard' },
      { key: 'VIEW_REPORTS', label: 'VIEW_REPORTS', description: 'View and export system reports' },
    ],
  },
  {
    id: 'staff',
    title: 'Staff Management',
    icon: React.createElement(Users, { className: 'h-4 w-4 text-violet-400' }),
    permissions: [
      { key: 'STAFF_VIEW', label: 'STAFF_VIEW', description: 'View staff members list' },
      { key: 'STAFF_MANAGE', label: 'STAFF_MANAGE', description: 'Add, edit, and deactivate staff' },
    ],
  },
  {
    id: 'branch',
    title: 'Branch Management',
    icon: React.createElement(Building2, { className: 'h-4 w-4 text-violet-400' }),
    permissions: [
      { key: 'BRANCH_VIEW', label: 'BRANCH_VIEW', description: 'View branch details' },
      { key: 'BRANCH_MANAGE', label: 'BRANCH_MANAGE', description: 'Create and edit branches' },
    ],
  },
];

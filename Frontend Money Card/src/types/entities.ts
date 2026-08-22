import type { Permission } from './auth';
import type { Plan, Subscription } from './subscription';

// ─── Organization (M0 Section 4) ───────────────────────────

export interface Organization {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_ACTIVATION';
  planId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  adminEmail: string;
  password?: string;
  planId?: string;
}

export interface OrganizationOverview extends Organization {
  plan?: Plan;
  subscription?: Subscription;
  adminUser?: {
    id: string;
    name: string;
    email: string;
    mustChangePassword?: boolean;
  } | null;
  usage?: {
    branchCount: number;
    branchLimit: number;
    staffCount: number;
    staffLimit: number;
    cardCount: number;
    cardLimit: number;
  };
}

// ─── Branch (M0 Section 4) ─────────────────────────────────

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_ACTIVATION';
  createdAt: string;
  updatedAt: string;
}

// ─── Staff (M0 Section 4) ──────────────────────────────────
// Single operational Staff role. Access controlled by permissions + assigned branches.

export interface Staff {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_ACTIVATION';
  permissions: Permission[];
  assignedBranchIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Audit Log (M0 Section 4 & 21) ─────────────────────────

export interface AuditLog {
  id: string;
  organizationId?: string | null;
  branchId?: string | null;
  actorStaffId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateStaffRequest {
  name: string;
  email: string;
  password?: string;
  assignedBranchIds: string[];
  permissions: Permission[];
}

export interface UpdateStaffRequest {
  name?: string;
  email?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  assignedBranchIds?: string[];
  permissions?: Permission[];
}

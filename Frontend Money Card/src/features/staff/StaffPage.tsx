// ─── Staff Management Page (M6) ───────────────────────────
// Unified Staff Details, Permissions, Branches, and Add Staff UX for ORG_ADMIN.
// Uses apiService abstraction strictly — does NOT call mock handlers directly.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { usePermissions } from '@/hooks';
import type {
  Staff,
  Branch,
  Permission,
  OrganizationOverview,
} from '@/types';
import {
  Button,
  Input,
  Card,
  Badge,
  Modal,
  ModalFooter,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { notify, formatDate } from '@/utils';
import { PermissionMatrix } from './PermissionMatrix';
import { UnauthorizedPage } from '@/features/auth';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Power,
  Building2,
  ShieldCheck,
  Send,
  RefreshCw,
  AlertCircle,
  Eye,
  Check,
  ArrowRight,
  ArrowLeft,
  User,
  Trash2,
} from 'lucide-react';

export function StaffPage() {
  const { hasPermission } = usePermissions();

  const canView = hasPermission('STAFF_VIEW');
  const canManage = hasPermission('STAFF_MANAGE');

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [orgOverview, setOrgOverview] = useState<OrganizationOverview | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);

  const handleResendInvite = async (staffId: string) => {
    setResendingId(staffId);
    try {
      const res = await apiService.staff.resendInvite(staffId);
      if (res.success) {
        notify.success(res.data?.message || 'Activation invitation re-sent successfully!');
      } else {
        notify.error(res.error?.message || 'Failed to resend activation invitation.');
      }
    } catch {
      notify.error('An unexpected error occurred while sending the invitation.');
    } finally {
      setResendingId(null);
    }
  };


  // ── Unified Staff Details/Edit Modal State ─────────────────
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffTab, setStaffTab] = useState<'overview' | 'permissions' | 'branches'>('overview');

  // ── Add Staff Modal State & Multi-step Tabs ─────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTab, setAddTab] = useState<'basic' | 'branches' | 'permissions'>('basic');

  // ── Status Toggle Modal ───────────────────────────────────
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteStaffModal, setShowDeleteStaffModal] = useState(false);

  // ── Form & Selection State ────────────────────────────────
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formBranchIds, setFormBranchIds] = useState<string[]>([]);
  const [formPermissions, setFormPermissions] = useState<Permission[]>([]);

  // ── Validation & Error state ──────────────────────────────
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch Staff & Organization Branches ───────────────────
  const fetchStaffData = useCallback(async () => {
    setError(null);
    try {
      const [staffRes, branchRes, orgRes] = await Promise.all([
        apiService.staff.getStaff({ search: searchQuery }),
        apiService.branches.getBranches(),
        apiService.organizations.getOrganization(),
      ]);

      if (!staffRes.success) {
        setError(staffRes.error.message || 'Failed to load staff list');
        return;
      }

      setStaffList(staffRes.data.items);

      if (branchRes.success) {
        setBranches(branchRes.data.items);
      }
      if (orgRes.success) {
        setOrgOverview(orgRes.data);
      }
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const [staffRes, branchRes, orgRes] = await Promise.all([
          apiService.staff.getStaff({ search: searchQuery }),
          apiService.branches.getBranches(),
          apiService.organizations.getOrganization(),
        ]);
        if (isCancelled) return;

        if (!staffRes.success) {
          setError(staffRes.error.message || 'Failed to load staff list');
          return;
        }

        setStaffList(staffRes.data.items);
        if (branchRes.success) setBranches(branchRes.data.items);
        if (orgRes.success) setOrgOverview(orgRes.data);
      } catch {
        if (!isCancelled) setError('Unable to connect to the server. Please try again.');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [searchQuery]);

  // If user lacks STAFF_VIEW permission, block access
  if (!canView) {
    return <UnauthorizedPage />;
  }

  // ── Open Add Staff Modal ──────────────────────────────────
  const handleOpenAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormBranchIds(branches.map((b) => b.id)); // Default assign all active branches
    setFormPermissions([
      'CARD_VIEW',
      'CARD_ISSUE',
      'CARD_RETURN',
      'RECHARGE',
      'PURCHASE',
      'SESSION_VIEW',
    ]);
    setFormErrors({});
    setModalApiError(null);
    setAddTab('basic');
    setShowAddModal(true);
  };

  // ── Validate Add Staff Step 1 ──────────────────────────────
  const validateBasicInfo = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Staff name is required';
    if (!formEmail.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formEmail)) {
      errors.email = 'Enter a valid email address';
    }
    if (!formPassword.trim()) {
      errors.password = 'Initial password is required';
    } else if (formPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit Add Staff ──────────────────────────────────────
  const handleAddSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateBasicInfo()) {
      setAddTab('basic');
      notify.error('Please fix the errors in Basic Information before creating');
      return;
    }

    setFormErrors({});
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.staff.createStaff({
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword,
        assignedBranchIds: formBranchIds,
        permissions: formPermissions,
      });

      if (!res.success) {
        if (res.error.code === 'PLAN_LIMIT_REACHED') {
          setModalApiError(
            res.error.message ||
              'Staff limit reached for your active plan. Upgrade your plan to add more staff.',
          );
        } else {
          setModalApiError(res.error.message || 'Failed to add staff member');
        }
        return;
      }

      notify.success(`Staff member ${res.data.name} created successfully`);
      setShowAddModal(false);
      fetchStaffData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Unified Staff Details/Edit Modal ─────────────────
  const handleOpenStaffModal = (
    staff: Staff,
    initialTab: 'overview' | 'permissions' | 'branches' = 'overview',
  ) => {
    setSelectedStaff(staff);
    setFormName(staff.name);
    setFormEmail(staff.email);
    setFormBranchIds(staff.assignedBranchIds);
    setFormPermissions(staff.permissions);
    setStaffTab(initialTab);
    setFormErrors({});
    setModalApiError(null);
    setShowStaffModal(true);
  };

  // ── Save Unified Staff Details & Permissions & Branches ───
  //  Save Staff Profile Information
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStaff) return;

    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Staff name is required';
    if (!formEmail.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formEmail)) {
      errors.email = 'Enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setStaffTab('overview');
      return;
    }

    setFormErrors({});
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.staff.updateStaff(selectedStaff.id, {
        name: formName.trim(),
        email: formEmail.trim(),
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update staff profile');
        return;
      }

      notify.success('Staff profile updated successfully.');
      setSelectedStaff((prev) => (prev ? { ...prev, name: formName.trim(), email: formEmail.trim() } : null));
      fetchStaffData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  //  Save Staff Permissions
  const handleSavePermissions = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStaff) return;

    setFormErrors({});
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.staff.updateStaffPermissions(selectedStaff.id, formPermissions);

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update staff permissions');
        return;
      }

      notify.success('Permissions updated successfully.');
      setSelectedStaff((prev) => (prev ? { ...prev, permissions: formPermissions } : null));
      fetchStaffData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  //  Save Staff Branch Assignments
  const handleSaveBranches = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStaff) return;

    setFormErrors({});
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.staff.updateStaffBranches(selectedStaff.id, formBranchIds);

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update branch assignments');
        return;
      }

      notify.success('Branch assignments updated successfully.');
      setSelectedStaff((prev) => (prev ? { ...prev, assignedBranchIds: formBranchIds } : null));
      fetchStaffData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveStaffChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Staff name is required';
    if (!formEmail.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formEmail)) {
      errors.email = 'Enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setStaffTab('overview');
      return;
    }

    setFormErrors({});
    setModalApiError(null);
    setIsSubmitting(true);

    try {
      const res = await apiService.staff.updateStaff(selectedStaff.id, {
        name: formName.trim(),
        email: formEmail.trim(),
        assignedBranchIds: formBranchIds,
        permissions: formPermissions,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update staff member');
        return;
      }

      notify.success('Staff profile, permissions, and branch assignments updated successfully');
      setShowStaffModal(false);
      fetchStaffData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Toggle Status Modal ───────────────────────────────────
  const handleOpenStatus = (staff: Staff) => {
    setSelectedStaff(staff);
    setModalApiError(null);
    setShowStatusModal(true);
  };

  const handleStatusSubmit = async () => {
    if (!selectedStaff) return;
    const newStatus = selectedStaff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.staff.updateStaff(selectedStaff.id, { status: newStatus });
      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to change staff status');
        return;
      }

      notify.success(
        `Staff member ${selectedStaff.name} is now ${newStatus === 'ACTIVE' ? 'Active' : 'Inactive'}`,
      );
      setShowStatusModal(false);
      fetchStaffData();
    } catch {
      setModalApiError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete / Deactivate Staff ──────────────────────────────
  const handleOpenDeleteStaff = (staff: Staff) => {
    setSelectedStaff(staff);
    setModalApiError(null);
    setShowDeleteStaffModal(true);
  };

  const handleDeleteStaffSubmit = async () => {
    if (!selectedStaff) return;
    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.staff.deleteStaff(selectedStaff.id);
      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to delete staff member');
        return;
      }

      notify.success(
        res.data?.deactivated
          ? 'Staff member deactivated to preserve historical transaction records'
          : 'Staff member deleted successfully',
      );
      setShowDeleteStaffModal(false);
      fetchStaffData();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Table Columns ─────────────────────────────────────────
  const columns = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (staff: Staff) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 font-bold text-sm">
            {staff.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-100">{staff.name}</p>
            <p className="text-xs text-slate-400">{staff.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (staff: Staff) => (
        staff.status === 'PENDING_ACTIVATION' ? (
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/30">
            Pending Activation
          </span>
        ) : (
          <Badge variant={staff.status === 'ACTIVE' ? 'success' : 'danger'}>
            {staff.status === 'ACTIVE' ? 'Active' : 'Inactive'}
          </Badge>
        )
      ),
    },
    {
      key: 'branches',
      header: 'Assigned Branches',
      render: (staff: Staff) => {
        const assignedNames = branches
          .filter((b) => staff.assignedBranchIds.includes(b.id))
          .map((b) => b.name);

        return (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-300">
              {staff.assignedBranchIds.length} branch(es)
            </span>
            {assignedNames.length > 0 && (
              <p className="max-w-[180px] truncate text-[11px] text-slate-400">
                {assignedNames.join(', ')}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (staff: Staff) => (
        <Badge variant="outline" className="text-violet-300 border-violet-500/30 font-mono text-xs">
          {staff.permissions.length} / 20 M0 perms
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (staff: Staff) => (
        <span className="text-xs text-slate-400">{formatDate(staff.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (staff: Staff) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Resend Activation Invite if Pending */}
          {canManage && staff.status === 'PENDING_ACTIVATION' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResendInvite(staff.id)}
              disabled={resendingId === staff.id}
              className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10 text-xs"
              title="Resend Activation Invite"
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              {resendingId === staff.id ? 'Sending...' : 'Resend Invite'}
            </Button>
          )}

          {/* Unified Details / Edit Action */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenStaffModal(staff, 'overview')}
            title="View Details & Edit"
            leftIcon={canManage ? <Edit2 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          >
            {canManage ? 'Edit / Details' : 'Details'}
          </Button>

          {/* Quick Permission Jump */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenStaffModal(staff, 'permissions')}
            title="Manage Permissions"
            leftIcon={<ShieldCheck className="h-3.5 w-3.5 text-violet-400" />}
          >
            Permissions
          </Button>

          {/* Status Toggle */}
          {canManage && (
            <Button
              variant={staff.status === 'ACTIVE' ? 'ghost' : 'outline'}
              size="sm"
              onClick={() => handleOpenStatus(staff)}
              title={staff.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              leftIcon={<Power className="h-3.5 w-3.5" />}
            >
              {staff.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
          )}
          {/* Delete Staff Member */}
          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDeleteStaff(staff)}
              title="Delete Staff Member"
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Staff Management</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage organization staff accounts, branch assignments, and M0 permission matrices.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            onClick={handleOpenAdd}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Add Staff Member
          </Button>
        )}
      </div>

      {/* Plan Resource Usage Indicator */}
      {orgOverview?.usage && (
        <Card padding="sm" className="bg-slate-900/40">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-400">
              Staff Usage ({orgOverview.plan?.name || 'Active Plan'}):
            </span>
            <span className="text-slate-200">
              <strong className="text-violet-400">{orgOverview.usage.staffCount}</strong> /{' '}
              {orgOverview.usage.staffLimit} staff accounts created
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-violet-500 transition-all duration-300"
              style={{
                width: `${Math.min(
                  (orgOverview.usage.staffCount / orgOverview.usage.staffLimit) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
        </Card>
      )}

      {/* Search & Refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-violet-500 focus:outline-none"
          />
        </div>
        <Button variant="outline" size="md" onClick={fetchStaffData} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Refresh
        </Button>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <LoadingState message="Loading staff accounts..." />
      ) : error ? (
        <ErrorState title="Failed to load staff" message={error} onRetry={fetchStaffData} />
      ) : staffList.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-slate-500" />}
          title="No staff members found"
          description={
            searchQuery
              ? `No staff matching "${searchQuery}"`
              : 'Add staff members to grant operational POS and inventory permissions.'
          }
          action={
            canManage && !searchQuery ? (
              <Button variant="primary" onClick={handleOpenAdd} leftIcon={<UserPlus className="h-4 w-4" />}>
                Add Staff Member
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card padding="none">
          <DataTable<Staff> data={staffList} columns={columns} keyExtractor={(item: Staff) => item.id} />
        </Card>
      )}

      {/* ── 1. UNIFIED STAFF DETAILS & EDIT MODAL (WITH HORIZONTAL TABS) ── */}
      <Modal
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        title={canManage ? `Staff Settings: ${selectedStaff?.name}` : `Staff Details: ${selectedStaff?.name}`}
        description="Unified management of staff profile, branch authorizations, and M0 permissions."
        size="xl"
      >
        <form onSubmit={handleSaveStaffChanges} noValidate className="space-y-6">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          {/* Horizontal Navigation Tabs */}
          <div className="flex border-b border-slate-800 overflow-x-auto gap-2">
            <button
              type="button"
              onClick={() => setStaffTab('overview')}
              className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                staffTab === 'overview'
                  ? 'border-violet-500 text-violet-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="h-4 w-4" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setStaffTab('permissions')}
              className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                staffTab === 'permissions'
                  ? 'border-violet-500 text-violet-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Permissions</span>
              <Badge variant="outline" className="text-[10px] ml-1">
                {formPermissions.length} / 20
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setStaffTab('branches')}
              className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                staffTab === 'branches'
                  ? 'border-violet-500 text-violet-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Branches</span>
              <Badge variant="outline" className="text-[10px] ml-1">
                {formBranchIds.length}
              </Badge>
            </button>
          </div>

          {/* Tab Content Panes (Natural scrolling without nested scroll trapping) */}
          <div className="max-h-[64vh] overflow-y-auto pr-1">
            {/* ── TAB 1: OVERVIEW ── */}
            {staffTab === 'overview' && (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
                    <span className="text-xs text-slate-400">Account Status</span>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant={selectedStaff?.status === 'ACTIVE' ? 'success' : 'danger'}>
                        {selectedStaff?.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
                    <span className="text-xs text-slate-400">Assigned Branches</span>
                    <p className="font-mono text-sm font-bold text-slate-200 pt-1">
                      {formBranchIds.length} branch(es)
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
                    <span className="text-xs text-slate-400">Granted Permissions</span>
                    <p className="font-mono text-sm font-bold text-violet-300 pt-1">
                      {formPermissions.length} / 20 M0 rules
                    </p>
                  </div>
                </div>

                {/* Account Details & Edit Fields */}
                <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Staff Profile Information
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      id="staff-edit-name"
                      label="Full Name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      error={formErrors.name}
                      disabled={!canManage || isSubmitting}
                    />

                    <Input
                      id="staff-edit-email"
                      type="email"
                      label="Email Address"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      error={formErrors.email}
                      disabled={!canManage || isSubmitting}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400">Staff ID:</span>
                      <p className="font-mono font-semibold text-slate-300">STAFF-#{selectedStaff?.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Created Date:</span>
                      <p className="font-semibold text-slate-300">
                        {selectedStaff?.createdAt ? formatDate(selectedStaff.createdAt) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Branch Access Summary */}
                <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Authorized Branches ({formBranchIds.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => setStaffTab('branches')}
                      className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                    >
                      Manage Branches →
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {branches
                      .filter((b) => formBranchIds.includes(b.id))
                      .map((b) => (
                        <span
                          key={b.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200"
                        >
                          <Building2 className="h-3.5 w-3.5 text-violet-400" />
                          {b.name}
                        </span>
                      ))}
                    {formBranchIds.length === 0 && (
                      <span className="text-xs text-amber-400">No branches currently assigned</span>
                    )}
                  </div>
                </div>


              </div>
            )}

            {/* ── TAB 2: PERMISSIONS ── */}
            {staffTab === 'permissions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs text-slate-400">
                    Configure operational POS, inventory, and session permissions defined in M0.
                  </p>
                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormPermissions([
                            'CARD_VIEW',
                            'CARD_ISSUE',
                            'CARD_RETURN',
                            'CARD_BLOCK',
                            'CARD_UNBLOCK',
                            'RECHARGE',
                            'PURCHASE',
                            'REFUND',
                            'SESSION_VIEW',
                            'PRODUCT_VIEW',
                            'PRODUCT_MANAGE',
                            'INVENTORY_VIEW',
                            'INVENTORY_MANAGE',
                            'INVENTORY_IMPORT',
                            'VIEW_ANALYTICS',
                            'VIEW_REPORTS',
                            'STAFF_VIEW',
                            'STAFF_MANAGE',
                            'BRANCH_VIEW',
                            'BRANCH_MANAGE',
                          ])
                        }
                        className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                      >
                        Select All (20)
                      </button>
                      <span className="text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={() => setFormPermissions([])}
                        className="text-xs text-slate-400 hover:text-slate-300 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                <PermissionMatrix
                  selectedPermissions={formPermissions}
                  onChange={canManage ? setFormPermissions : undefined}
                  readOnly={!canManage}
                />


              </div>
            )}

            {/* ── TAB 3: BRANCHES ── */}
            {staffTab === 'branches' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs text-slate-400">
                    Select organization branches where this staff account is allowed to log in and transact.
                  </p>
                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormBranchIds(branches.map((b) => b.id))}
                        className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={() => setFormBranchIds([])}
                        className="text-xs text-slate-400 hover:text-slate-300 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {branches.map((b) => {
                    const isAssigned = formBranchIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 text-xs transition-all ${
                          isAssigned
                            ? 'border-violet-500/40 bg-violet-500/15 text-slate-100'
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                        } ${!canManage ? 'pointer-events-none' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                              isAssigned
                                ? 'border-violet-500 bg-violet-600 text-white'
                                : 'border-slate-700 bg-slate-900'
                            }`}
                          >
                            {isAssigned && <Check className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200">{b.name}</p>
                            <span className="text-[11px] text-slate-400">{b.name}</span>
                          </div>
                        </div>

                        <Badge variant={b.status === 'ACTIVE' ? 'success' : 'outline'} className="text-[10px]">
                          {b.status}
                        </Badge>

                        <input
                          type="checkbox"
                          checked={isAssigned}
                          disabled={!canManage}
                          onChange={() => {
                            if (isAssigned) {
                              setFormBranchIds(formBranchIds.filter((id) => id !== b.id));
                            } else {
                              setFormBranchIds([...formBranchIds, b.id]);
                            }
                          }}
                          className="sr-only"
                        />
                      </label>
                    );
                  })}
                </div>


              </div>
            )}
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowStaffModal(false)} disabled={isSubmitting}>
              {canManage ? 'Close' : 'Close'}
            </Button>
            {canManage && staffTab === 'overview' && (
              <Button type="button" variant="primary" onClick={handleSaveProfile} isLoading={isSubmitting} disabled={isSubmitting}>
                Save Staff Information
              </Button>
            )}
            {canManage && staffTab === 'permissions' && (
              <Button type="button" variant="primary" onClick={handleSavePermissions} isLoading={isSubmitting} disabled={isSubmitting} leftIcon={<ShieldCheck className="h-4 w-4" />}>
                Save Permissions
              </Button>
            )}
            {canManage && staffTab === 'branches' && (
              <Button type="button" variant="primary" onClick={handleSaveBranches} isLoading={isSubmitting} disabled={isSubmitting} leftIcon={<Building2 className="h-4 w-4" />}>
                Save Branches
              </Button>
            )}
          </ModalFooter>
        </form>
      </Modal>

      {/* ── 2. ADD STAFF MEMBER MODAL (TABBED STEPPER UX) ── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Staff Member"
        description="Register a staff member, authorize branches, and assign operational permissions."
        size="xl"
      >
        <div className="space-y-6">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          {/* Horizontal Step Tabs */}
          <div className="flex border-b border-slate-800 overflow-x-auto gap-2">
            <button
              type="button"
              onClick={() => setAddTab('basic')}
              className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                addTab === 'basic'
                  ? 'border-violet-500 text-violet-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="h-4 w-4" />
              <span>1. Basic Info</span>
              {Object.keys(formErrors).length > 0 && (
                <span className="h-2 w-2 rounded-full bg-rose-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setAddTab('branches')}
              className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                addTab === 'branches'
                  ? 'border-violet-500 text-violet-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>2. Branches</span>
              <Badge variant="outline" className="text-[10px] ml-1">
                {formBranchIds.length}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setAddTab('permissions')}
              className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                addTab === 'permissions'
                  ? 'border-violet-500 text-violet-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>3. Permissions</span>
              <Badge variant="outline" className="text-[10px] ml-1">
                {formPermissions.length} / 20
              </Badge>
            </button>
          </div>

          {/* Form Step Panes (Preserves entered state across tabs) */}
          <div className="max-h-[64vh] overflow-y-auto pr-1">
            {/* ── STEP 1: BASIC INFO ── */}
            {addTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    id="add-staff-name"
                    label="Staff Full Name"
                    placeholder="e.g. John Cashier"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    error={formErrors.name}
                    disabled={isSubmitting}
                    autoFocus
                  />

                  <Input
                    id="add-staff-email"
                    type="email"
                    label="Email Address"
                    placeholder="john@cafeteria.com"
                    value={formEmail}
                    onChange={(e) => {
                      setFormEmail(e.target.value);
                      if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    error={formErrors.email}
                    disabled={isSubmitting}
                  />
                </div>

                <Input
                  id="add-staff-password"
                  type="password"
                  label="Initial Password"
                  placeholder="At least 6 characters"
                  value={formPassword}
                  onChange={(e) => {
                    setFormPassword(e.target.value);
                    if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  error={formErrors.password}
                  disabled={isSubmitting}
                />

                {orgOverview?.usage && (
                  <p className="text-xs text-slate-400 pt-2">
                    Active subscription allows up to {orgOverview.usage.staffLimit} staff accounts (
                    {orgOverview.usage.staffLimit - orgOverview.usage.staffCount} slots available).
                  </p>
                )}
              </div>
            )}

            {/* ── STEP 2: BRANCHES ── */}
            {addTab === 'branches' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs text-slate-400">
                    Authorize the branches this staff member can operate within.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormBranchIds(branches.map((b) => b.id))}
                      className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() => setFormBranchIds([])}
                      className="text-xs text-slate-400 hover:text-slate-300 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {branches.map((b) => {
                    const isAssigned = formBranchIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 text-xs transition-all ${
                          isAssigned
                            ? 'border-violet-500/40 bg-violet-500/15 text-slate-100'
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                              isAssigned
                                ? 'border-violet-500 bg-violet-600 text-white'
                                : 'border-slate-700 bg-slate-900'
                            }`}
                          >
                            {isAssigned && <Check className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200">{b.name}</p>
                            <span className="text-[11px] text-slate-400">{b.name}</span>
                          </div>
                        </div>

                        <Badge variant={b.status === 'ACTIVE' ? 'success' : 'outline'} className="text-[10px]">
                          {b.status}
                        </Badge>

                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={() => {
                            if (isAssigned) {
                              setFormBranchIds(formBranchIds.filter((id) => id !== b.id));
                            } else {
                              setFormBranchIds([...formBranchIds, b.id]);
                            }
                          }}
                          className="sr-only"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 3: PERMISSIONS ── */}
            {addTab === 'permissions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs text-slate-400">
                    Assign exact M0 operational permissions for this staff member.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormPermissions([
                          'CARD_VIEW',
                          'CARD_ISSUE',
                          'CARD_RETURN',
                          'RECHARGE',
                          'PURCHASE',
                          'SESSION_VIEW',
                          'PRODUCT_VIEW',
                          'INVENTORY_VIEW',
                        ])
                      }
                      className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                    >
                      Default POS Preset
                    </button>
                    <span className="text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormPermissions([
                          'CARD_VIEW',
                          'CARD_ISSUE',
                          'CARD_RETURN',
                          'CARD_BLOCK',
                          'CARD_UNBLOCK',
                          'RECHARGE',
                          'PURCHASE',
                          'REFUND',
                          'SESSION_VIEW',
                          'PRODUCT_VIEW',
                          'PRODUCT_MANAGE',
                          'INVENTORY_VIEW',
                          'INVENTORY_MANAGE',
                          'INVENTORY_IMPORT',
                          'VIEW_ANALYTICS',
                          'VIEW_REPORTS',
                          'STAFF_VIEW',
                          'STAFF_MANAGE',
                          'BRANCH_VIEW',
                          'BRANCH_MANAGE',
                        ])
                      }
                      className="text-xs text-violet-400 hover:text-violet-300 font-medium"
                    >
                      Select All (20)
                    </button>
                  </div>
                </div>

                <PermissionMatrix
                  selectedPermissions={formPermissions}
                  onChange={setFormPermissions}
                />
              </div>
            )}
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>

            {addTab === 'basic' && (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  if (validateBasicInfo()) setAddTab('branches');
                }}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Next: Branches
              </Button>
            )}

            {addTab === 'branches' && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddTab('basic')}
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                  Back: Basic Info
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setAddTab('permissions')}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Next: Permissions
                </Button>
              </div>
            )}

            {addTab === 'permissions' && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddTab('branches')}
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                  Back: Branches
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleAddSubmit()}
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Create Staff Account
                </Button>
              </div>
            )}
          </ModalFooter>
        </div>
      </Modal>

      {/* ── 3. ACTIVATE / DEACTIVATE CONFIRMATION MODAL ── */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={selectedStaff?.status === 'ACTIVE' ? 'Deactivate Staff Account' : 'Activate Staff Account'}
      >
        <div className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <p className="text-sm text-slate-300">
            Are you sure you want to{' '}
            <strong className="text-white">
              {selectedStaff?.status === 'ACTIVE' ? 'deactivate' : 'activate'}
            </strong>{' '}
            the staff member <span className="text-violet-400 font-semibold">{selectedStaff?.name}</span>?
          </p>

          {selectedStaff?.status === 'ACTIVE' && (
            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg">
              Deactivating a staff account will immediately revoke POS access in the Flutter Staff application.
            </p>
          )}

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant={selectedStaff?.status === 'ACTIVE' ? 'danger' : 'primary'}
              onClick={handleStatusSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Confirm {selectedStaff?.status === 'ACTIVE' ? 'Deactivation' : 'Activation'}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
      {/* ── Delete Staff Confirmation Modal ───────────────────────── */}
      <Modal
        isOpen={showDeleteStaffModal}
        onClose={() => !isSubmitting && setShowDeleteStaffModal(false)}
        title="Delete Staff Member"
        description="Permanently remove staff account or safely deactivate"
        size="md"
      >
        <div className="space-y-4">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Action Blocked</p>
                <p>{modalApiError}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-2">
            <p className="text-sm text-slate-200 font-medium">
              Are you sure you want to remove <span className="text-violet-300 font-bold font-mono">{selectedStaff?.name}</span> ({selectedStaff?.email})?
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              If this staff member has never processed sessions or transactions, their account will be permanently removed. If historical transaction records exist, their access will be safely deactivated and tokens revoked, preserving all "Performed By" audit history.
            </p>
          </div>

          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteStaffModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteStaffSubmit}
              isLoading={isSubmitting}
            >
              Confirm Deletion
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}

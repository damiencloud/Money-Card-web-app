import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiService } from '@/services/api';
import type { OrganizationOverview, Plan } from '@/types';
import {
  Button,
  Card,
  Badge,
  Modal,
  ModalFooter,
  Input,
  Select,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { DataTable } from '@/components/tables';
import { notify, formatDate } from '@/utils';
import {
  Building,
  Search,
  Power,
  Eye,
  Edit2,
  RefreshCw,
  AlertCircle,
  Building2,
  Users,
  CreditCard,
  ShieldAlert,
  Plus,
  KeyRound,
  Trash2,
  MoreVertical,
  ChevronDown,
} from 'lucide-react';

interface OrgActionMenuProps {
  org: OrganizationOverview;
  onViewDetails: () => void;
  onEdit: () => void;
  onResetPassword: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

function OrgActionMenu({
  org,
  onViewDetails,
  onEdit,
  onResetPassword,
  onToggleStatus,
  onDelete,
}: OrgActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const menuWidth = 210;
    const menuHeight = 220;

    // Check if bottom space is constrained in the viewport
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight;

    const top = openUpwards ? rect.top - menuHeight - 6 : rect.bottom + 6;
    const left = Math.max(8, rect.right - menuWidth);

    setMenuPosition({ top, left });
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="inline-block text-left">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs py-1 px-2.5 bg-slate-900 border-slate-700 hover:border-violet-500 text-slate-200"
      >
        <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
        <span>Actions</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              zIndex: 9999,
            }}
            className="w-52 rounded-xl border border-slate-700/80 bg-slate-900 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onViewDetails();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-left"
            >
              <Eye className="h-4 w-4 text-slate-400" />
              <span>View Details</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-left"
            >
              <Edit2 className="h-4 w-4 text-violet-400" />
              <span>Edit Organization</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onResetPassword();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-amber-300 transition-colors cursor-pointer text-left"
            >
              <KeyRound className="h-4 w-4 text-amber-400" />
              <span>Reset Admin Password</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onToggleStatus();
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left ${
                org.status === 'ACTIVE'
                  ? 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300'
                  : 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
              }`}
            >
              <Power className="h-4 w-4" />
              <span>{org.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
            </button>

            <div className="my-1 border-t border-slate-800" />

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer text-left"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Organization</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationOverview[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Client Filtered Organizations for Instant Search ────────
  const filteredOrganizations = useMemo(() => {
    if (!searchQuery.trim()) return organizations;
    const q = searchQuery.toLowerCase().trim();
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        org.id.toLowerCase().includes(q) ||
        (org.adminUser?.name && org.adminUser.name.toLowerCase().includes(q)) ||
        (org.adminUser?.email && org.adminUser.email.toLowerCase().includes(q)) ||
        (org.plan?.name && org.plan.name.toLowerCase().includes(q)),
    );
  }, [organizations, searchQuery]);

  // Modals
  const [selectedOrg, setSelectedOrg] = useState<OrganizationOverview | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrgToDelete, setSelectedOrgToDelete] = useState<OrganizationOverview | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [confirmTempPassword, setConfirmTempPassword] = useState('');
  const [tempPasswordError, setTempPasswordError] = useState<string | null>(null);
  const [confirmTempPasswordError, setConfirmTempPasswordError] = useState<string | null>(null);

  // Form State for Create Organization (4 Required Fields)
  const [formName, setFormName] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPlanId, setFormPlanId] = useState('plan_002');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form State for Edit Organization
  const [editFormName, setEditFormName] = useState('');
  const [editFormPlanId, setEditFormPlanId] = useState('plan_002');
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalApiError, setModalApiError] = useState<string | null>(null);

  // ── Fetch Organization List & Plans ────────────────────────
  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [res, plansRes] = await Promise.all([
        apiService.organizations.getOrganizations({ search: searchQuery }),
        apiService.plans.getPlans(),
      ]);

      if (!res.success) {
        setError(res.error.message || 'Failed to load platform organizations');
        return;
      }

      setOrganizations(res.data.items);
      if (plansRes.success) {
        setPlans(plansRes.data);
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
        const [res, plansRes] = await Promise.all([
          apiService.organizations.getOrganizations({ search: searchQuery }),
          apiService.plans.getPlans(),
        ]);
        if (isCancelled) return;

        if (!res.success) {
          setError(res.error.message || 'Failed to load platform organizations');
          return;
        }

        setOrganizations(res.data.items);
        if (plansRes.success) {
          setPlans(plansRes.data);
        }
      } catch {
        if (!isCancelled) {
          setError('Unable to connect to the server. Please try again.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [searchQuery]);

  // ── Open Create Modal ─────────────────────────────────────
  //  Open Reset Password Modal
  const handleOpenResetPasswordModal = (org: OrganizationOverview) => {
    setSelectedOrg(org);
    setTempPassword('');
    setConfirmTempPassword('');
    setTempPasswordError(null);
    setConfirmTempPasswordError(null);
    setModalApiError(null);
    setShowResetPasswordModal(true);
  };

    

  

  /* const _handleResendAdminInvite = async (orgId: string) => {
    setResendingAdminOrgId(orgId);
    try {
      const res = await apiService.organizations.resendAdminInvite(orgId);
      if (res.success) {
        notify.success((res.data as any)?.message || 'Admin invitation re-sent successfully!');
      } else {
        notify.error(res.error?.message || 'Failed to resend admin invitation.');
      }
    } catch {
      notify.error('An unexpected error occurred while resending the invitation.');
    } finally {
      setResendingAdminOrgId(null);
    }
  }; */

  const handleResetPasswordSubmit = async () => {
    if (!selectedOrg) return;
    setTempPasswordError(null);
    setConfirmTempPasswordError(null);
    setModalApiError(null);

    let hasErrors = false;
    if (!tempPassword) {
      setTempPasswordError('Temporary password is required');
      hasErrors = true;
    } else if (tempPassword.length < 6) {
      setTempPasswordError('Temporary password must be at least 6 characters');
      hasErrors = true;
    }

    if (!confirmTempPassword) {
      setConfirmTempPasswordError('Please confirm the temporary password');
      hasErrors = true;
    } else if (tempPassword && confirmTempPassword !== tempPassword) {
      setConfirmTempPasswordError('Passwords do not match');
      hasErrors = true;
    }

    if (hasErrors) return;

    setIsSubmitting(true);
    try {
      const res = await apiService.organizations.resetOrgAdminPassword(selectedOrg.id, {
        temporaryPassword: tempPassword,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to reset Org Admin password');
        return;
      }

      notify.success(res.data.message || `Password reset successfully for ${selectedOrg.adminUser?.name || 'Org Admin'}.`);
      setShowResetPasswordModal(false);
      fetchOrganizations();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreateModal = () => {
    setFormName('');
    setFormAdminEmail('');
    setFormPassword('');
    setFormPlanId(plans[0]?.id || 'plan_002');
    setFormErrors({});
    setModalApiError(null);
    setShowCreateModal(true);
  };

  const validateCreateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formName.trim()) {
      errs.name = 'Organization name is required';
    }
    if (!formAdminEmail.trim()) {
      errs.adminEmail = 'Org Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formAdminEmail.trim())) {
      errs.adminEmail = 'Please enter a valid email address';
    }
    if (!formPassword.trim()) {
      errs.password = 'Initial password is required';
    } else if (formPassword.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (!formPlanId) {
      errs.planId = 'Subscription plan is required';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateSubmit = async () => {
    if (!validateCreateForm()) return;

    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.organizations.createOrganization({
        name: formName.trim(),
        adminEmail: formAdminEmail.trim(),
        password: formPassword,
        planId: formPlanId,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to create organization');
        return;
      }

      notify.success(`${res.data.name} has been created`);
      setShowCreateModal(false);
      setFormName('');
      setFormAdminEmail('');
      setFormPassword('');
      fetchOrganizations();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Edit Modal ───────────────────────────────────────
  const handleOpenEditModal = (org: OrganizationOverview) => {
    setSelectedOrg(org);
    setEditFormName(org.name);
    setEditFormPlanId(org.plan?.id || org.planId || plans[0]?.id || 'plan_002');
    setEditFormErrors({});
    setModalApiError(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedOrg) return;
    if (!editFormName.trim()) {
      setEditFormErrors({ name: 'Organization name is required' });
      return;
    }

    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.organizations.updateAdminOrganization(selectedOrg.id, {
        name: editFormName.trim(),
        planId: editFormPlanId,
      });

      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to update organization');
        return;
      }

      notify.success(`Organization ${res.data.name} updated successfully!`);
      setShowEditModal(false);
      if (showDetailsModal) {
        setShowDetailsModal(false);
      }
      fetchOrganizations();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Details ──────────────────────────────────────────
  const handleOpenDetails = async (org: OrganizationOverview) => {
    setSelectedOrg(org);
    setShowDetailsModal(true);
    try {
      const res = await apiService.organizations.getOrganizationById(org.id);
      if (res.success) {
        setSelectedOrg(res.data);
      }
    } catch {
      // Keep existing overview data
    }
  };

  // ── Open Status Modal ─────────────────────────────────────
  const handleOpenStatusModal = (org: OrganizationOverview) => {
    setSelectedOrg(org);
    setModalApiError(null);
    setShowStatusModal(true);
  };

  const handleStatusSubmit = async () => {
    if (!selectedOrg) return;

    const newStatus = selectedOrg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.organizations.updateAdminOrganization(selectedOrg.id, {
        status: newStatus,
      });

      if (!res.success) {
        setModalApiError(res.error.message || `Failed to ${newStatus.toLowerCase()} organization`);
        return;
      }

      notify.success(`Organization ${selectedOrg.name} is now ${newStatus.toLowerCase()}`);
      setShowStatusModal(false);
      fetchOrganizations();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Open Delete Modal ─────────────────────────────────────
  const handleOpenDeleteModal = (org: OrganizationOverview) => {
    setSelectedOrgToDelete(org);
    setModalApiError(null);
    setShowDeleteModal(true);
  };

  const handleDeleteOrgSubmit = async () => {
    if (!selectedOrgToDelete) return;
    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const res = await apiService.organizations.deleteAdminOrganization(selectedOrgToDelete.id);
      if (!res.success) {
        setModalApiError(res.error.message || 'Failed to delete organization');
        return;
      }

      notify.success(`Organization '${selectedOrgToDelete.name}' deleted successfully`);
      setShowDeleteModal(false);
      setSelectedOrgToDelete(null);
      if (showDetailsModal) {
        setShowDetailsModal(false);
      }
      fetchOrganizations();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Data Table Columns ────────────────────────────────────
  const columns = [
    {
      key: 'name',
      header: 'Organization',
      sortable: true,
      render: (org: OrganizationOverview) => (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-100">{org.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan & Quotas',
      render: (org: OrganizationOverview) => (
        <div>
          <Badge variant="outline" className="text-xs">
            {org.plan?.name || 'Standard'}
          </Badge>
          {org.usage && (
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
              <span>{org.usage.branchCount}/{org.usage.branchLimit} Branches</span>
              <span>•</span>
              <span>{org.usage.staffCount}/{org.usage.staffLimit} Staff</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (org: OrganizationOverview) => (
        <Badge variant={org.status === 'ACTIVE' ? 'success' : 'danger'}>
          {org.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      sortable: true,
      render: (org: OrganizationOverview) => (
        <span className="text-xs text-slate-400">{formatDate(org.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (org: OrganizationOverview) => (
        <div className="flex items-center justify-end">
          <OrgActionMenu
            org={org}
            onViewDetails={() => handleOpenDetails(org)}
            onEdit={() => handleOpenEditModal(org)}
            onResetPassword={() => handleOpenResetPasswordModal(org)}
            onToggleStatus={() => handleOpenStatusModal(org)}
            onDelete={() => handleOpenDeleteModal(org)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Tenant Organizations</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage multi-tenant organizations, subscription plans, and platform resource quotas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => fetchOrganizations()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreateModal}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Organization
          </Button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search organizations by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/50 py-2 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </Card>

      {/* ── Main Data View ── */}
      {isLoading ? (
        <LoadingState message="Loading tenant organizations..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchOrganizations} />
      ) : filteredOrganizations.length === 0 ? (
        <EmptyState
          title="No organizations found"
          description={searchQuery ? 'No organizations matched your search query.' : 'Get started by adding your first tenant organization.'}
          action={
            searchQuery ? (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleOpenCreateModal} leftIcon={<Plus className="h-4 w-4" />}>
                Add Organization
              </Button>
            )
          }
        />
      ) : (
        <Card className="min-h-[220px]">
          <DataTable
            columns={columns}
            data={filteredOrganizations}
            keyExtractor={(item) => item.id}
          />
        </Card>
      )}

      {/* ── Create Organization Modal (4 Fields) ── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Organization"
      >
        <div className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <Input
            label="Organization Name *"
            placeholder="e.g. Acme Cafeterias"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            error={formErrors.name}
          />

          <Input
            label="Org Admin Email *"
            type="email"
            placeholder="e.g. admin@acmecafeteria.com"
            value={formAdminEmail}
            onChange={(e) => setFormAdminEmail(e.target.value)}
            error={formErrors.adminEmail}
          />

          <Input
            label="Password *"
            type="password"
            placeholder="Min. 6 characters"
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            error={formErrors.password}
          />

          {plans.length > 0 && (
            <Select
              label="Plan *"
              value={formPlanId}
              onChange={(e) => setFormPlanId(e.target.value)}
              error={formErrors.planId}
              options={plans.map((p) => ({
                value: p.id,
                label: `${p.name} (₹${p.price}/${p.billingInterval.toLowerCase()})`,
              }))}
            />
          )}

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit} isLoading={isSubmitting} disabled={isSubmitting}>
              Create Organization
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Edit Organization Modal ── */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Organization"
      >
        <div className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Organization ID</label>
            <input
              type="text"
              disabled
              value={selectedOrg?.id || ''}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-400 cursor-not-allowed"
            />
          </div>

          <Input
            label="Organization Name *"
            placeholder="e.g. Acme Cafeterias"
            value={editFormName}
            onChange={(e) => setEditFormName(e.target.value)}
            error={editFormErrors.name}
          />

          {plans.length > 0 && (
            <Select
              label="Assigned Subscription Plan"
              value={editFormPlanId}
              onChange={(e) => setEditFormPlanId(e.target.value)}
              options={plans.map((p) => ({
                value: p.id,
                label: `${p.name} (₹${p.price}/${p.billingInterval.toLowerCase()})`,
              }))}
            />
          )}

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSubmit} isLoading={isSubmitting} disabled={isSubmitting}>
              Save Changes
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Organization Details Modal ── */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Organization Overview"
      >
        {selectedOrg && (
          <div className="space-y-6 py-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100">{selectedOrg.name}</h3>
                <p className="text-xs text-slate-400">ID: {selectedOrg.id}</p>
              </div>
              <Badge variant={selectedOrg.status === 'ACTIVE' ? 'success' : 'danger'}>
                {selectedOrg.status}
              </Badge>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Assigned Org Admin
                </span>
                {selectedOrg.adminUser?.mustChangePassword ? (
                  <Badge variant="warning" className="text-[10px]">
                    Password Reset Pending
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-[10px]">
                    Active
                  </Badge>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {selectedOrg.adminUser?.name || 'Org Admin'}
                  </p>
                  <p className="text-xs font-mono text-slate-400">
                    {selectedOrg.adminUser?.email || 'admin@' + selectedOrg.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleOpenResetPasswordModal(selectedOrg);
                  }}
                  leftIcon={<KeyRound className="h-3.5 w-3.5 text-amber-400" />}
                >
                  Reset Password
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Active Subscription Plan
                </span>
                <Badge variant="outline">{selectedOrg.plan?.name || 'Standard Plan'}</Badge>
              </div>

              {selectedOrg.plan && (
                <div className="mt-3 text-xs">
                  <div>
                    <span className="text-slate-400">Price: </span>
                    <span className="font-semibold text-slate-200">₹{selectedOrg.plan.price}/mo</span>
                  </div>
                </div>
              )}
            </div>

            {selectedOrg.usage && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Resource Usage & Limits
                </h4>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Building2 className="h-3.5 w-3.5 text-violet-400" />
                      <span>Branches</span>
                    </div>
                    <p className="mt-1 text-base font-bold text-slate-100">
                      {selectedOrg.usage.branchCount} / {selectedOrg.usage.branchLimit}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Users className="h-3.5 w-3.5 text-violet-400" />
                      <span>Staff</span>
                    </div>
                    <p className="mt-1 text-base font-bold text-slate-100">
                      {selectedOrg.usage.staffCount} / {selectedOrg.usage.staffLimit}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-center gap-1 text-slate-400">
                      <CreditCard className="h-3.5 w-3.5 text-violet-400" />
                      <span>Cards</span>
                    </div>
                    <p className="mt-1 text-base font-bold text-slate-100">
                      {selectedOrg.usage.cardCount} / {selectedOrg.usage.cardLimit}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <ModalFooter>
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowDetailsModal(false);
                  handleOpenEditModal(selectedOrg);
                }}
                leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              >
                Edit Organization
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* ── Status Toggle Modal ── */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={selectedOrg?.status === 'ACTIVE' ? 'Deactivate Organization' : 'Activate Organization'}
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
              {selectedOrg?.status === 'ACTIVE' ? 'deactivate' : 'activate'}
            </strong>{' '}
            the organization <span className="text-violet-400 font-semibold">{selectedOrg?.name}</span>?
          </p>

          {selectedOrg?.status === 'ACTIVE' && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                Deactivating this organization will prevent its users and staff from logging in or performing card operations.
              </span>
            </div>
          )}

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant={selectedOrg?.status === 'ACTIVE' ? 'danger' : 'primary'}
              onClick={handleStatusSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Confirm {selectedOrg?.status === 'ACTIVE' ? 'Deactivation' : 'Activation'}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
      {/*  Reset Org Admin Password Modal  */}
      <Modal
        isOpen={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        title="Reset Org Admin Password"
      >
        <div className="space-y-4 py-2">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-200 space-y-1">
            <p className="font-semibold">
              Are you sure you want to reset the password for {selectedOrg?.adminUser?.name || 'Org Admin'}?
            </p>
            <p className="text-amber-300/80">
              Setting a temporary password will require the Org Admin to create a new private password upon their next login.
            </p>
          </div>

          <div className="space-y-2 text-xs border border-slate-800 rounded-lg p-3 bg-slate-950/50">
            <div className="flex justify-between">
              <span className="text-slate-400">Organization:</span>
              <span className="font-semibold text-slate-200">{selectedOrg?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Admin Name:</span>
              <span className="font-semibold text-slate-200">{selectedOrg?.adminUser?.name || 'Org Admin'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Admin Email:</span>
              <span className="font-mono text-slate-300">
                {selectedOrg?.adminUser?.email || 'admin@' + (selectedOrg?.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'org') + '.com'}
              </span>
            </div>
          </div>

          <Input
            label="Temporary Password *"
            type="password"
            placeholder="Enter temporary password (min 6 characters)"
            value={tempPassword}
            onChange={(e) => {
              setTempPassword(e.target.value);
              if (tempPasswordError) setTempPasswordError(null);
              if (modalApiError) setModalApiError(null);
            }}
            error={tempPasswordError ?? undefined}
            disabled={isSubmitting}
          />

          <Input
            label="Confirm Temporary Password *"
            type="password"
            placeholder="Confirm temporary password"
            value={confirmTempPassword}
            onChange={(e) => {
              setConfirmTempPassword(e.target.value);
              if (confirmTempPasswordError) setConfirmTempPasswordError(null);
              if (modalApiError) setModalApiError(null);
            }}
            error={confirmTempPasswordError ?? undefined}
            disabled={isSubmitting}
          />

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowResetPasswordModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleResetPasswordSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              leftIcon={<KeyRound className="h-4 w-4" />}
            >
              Reset Org Admin Password
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* ── Delete Organization Confirmation Modal ── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !isSubmitting && setShowDeleteModal(false)}
        title="Delete Organization"
        description="Permanently remove tenant organization and all related data"
        size="md"
      >
        <div className="space-y-4">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Action Failed</p>
                <p>{modalApiError}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-2">
            <p className="text-sm text-slate-200 font-medium">
              Are you sure you want to permanently delete{' '}
              <span className="text-violet-300 font-bold font-mono">
                {selectedOrgToDelete?.name}
              </span>
              ?
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              This action cannot be undone. All branch locations, staff accounts, products, and registered smart cards belonging to this organization will be permanently deleted.
            </p>
          </div>

          <ModalFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteOrgSubmit}
              isLoading={isSubmitting}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Delete Organization
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

export function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationOverview[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedOrg, setSelectedOrg] = useState<OrganizationOverview | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

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
            <span className="text-xs text-slate-400">ID: {org.id}</span>
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
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDetails(org)}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEditModal(org)}
            title="Edit Organization"
          >
            <Edit2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenStatusModal(org)}
            className={org.status === 'ACTIVE' ? 'text-rose-400 hover:text-rose-300' : 'text-emerald-400 hover:text-emerald-300'}
            title={org.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          >
            <Power className="h-4 w-4" />
          </Button>
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
      ) : organizations.length === 0 ? (
        <EmptyState
          title="No organizations found"
          description={searchQuery ? 'No organizations matched your search query.' : 'Get started by adding your first tenant organization.'}
          action={
            searchQuery ? undefined : (
              <Button variant="primary" size="sm" onClick={handleOpenCreateModal} leftIcon={<Plus className="h-4 w-4" />}>
                Add Organization
              </Button>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            data={organizations}
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
    </div>
  );
}

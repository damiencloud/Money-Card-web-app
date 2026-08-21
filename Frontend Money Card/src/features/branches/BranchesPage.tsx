// ─── Branches Management Page (M5) ─────────────────────────
// Complete Branch Management for ORG_ADMIN & SUPER_ADMIN.
// Uses apiService abstraction strictly — does NOT import mock handlers directly.

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { useBranch, usePermissions } from '@/hooks';
import type { Branch, ApiResult, OrganizationOverview } from '@/types';
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
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Power,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export function BranchesPage() {
  const { currentBranch, selectBranch, setBranches: updateBranchContext } = useBranch();
  const { hasPermission } = usePermissions();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Organization Overview (for Plan Usage display)
  const [orgOverview, setOrgOverview] = useState<OrganizationOverview | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchNameInput, setBranchNameInput] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = hasPermission('BRANCH_MANAGE');

  // ── Fetch Branches & Organization Usage ───────────────────
  const fetchBranches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [branchRes, orgRes] = await Promise.all([
        apiService.branches.getBranches({ search: searchQuery }),
        apiService.organizations.getOrganization(),
      ]);

      if (!branchRes.success) {
        setError(branchRes.error.message || 'Failed to load branches');
        return;
      }

      setBranches(branchRes.data.items);
      updateBranchContext(branchRes.data.items);

      if (orgRes.success) {
        setOrgOverview(orgRes.data);
      }
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, updateBranchContext]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      setError(null);
      try {
        const [branchRes, orgRes] = await Promise.all([
          apiService.branches.getBranches({ search: searchQuery }),
          apiService.organizations.getOrganization(),
        ]);
        if (isCancelled) return;

        if (!branchRes.success) {
          setError(branchRes.error.message || 'Failed to load branches');
          return;
        }

        setBranches(branchRes.data.items);
        updateBranchContext(branchRes.data.items);

        if (orgRes.success) {
          setOrgOverview(orgRes.data);
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
  }, [searchQuery, updateBranchContext]);

  // ── Create Branch ─────────────────────────────────────────
  const handleOpenCreate = () => {
    setBranchNameInput('');
    setNameError(null);
    setModalApiError(null);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchNameInput.trim()) {
      setNameError('Branch name is required');
      return;
    }
    setNameError(null);
    setModalApiError(null);

    setIsSubmitting(true);
    try {
      const result: ApiResult<Branch> = await apiService.branches.createBranch({
        name: branchNameInput.trim(),
      });

      if (!result.success) {
        if (result.error.code === 'PLAN_LIMIT_REACHED') {
          setModalApiError(
            result.error.message ||
              'Branch limit reached for your active plan. Please upgrade your subscription to create more branches.',
          );
        } else {
          setModalApiError(result.error.message || 'Failed to create branch');
        }
        return;
      }

      notify.success('Branch created successfully');
      setShowCreateModal(false);
      fetchBranches();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit Branch ───────────────────────────────────────────
  const handleOpenEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setBranchNameInput(branch.name);
    setNameError(null);
    setModalApiError(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    if (!branchNameInput.trim()) {
      setNameError('Branch name is required');
      return;
    }
    setNameError(null);
    setModalApiError(null);

    setIsSubmitting(true);
    try {
      const result = await apiService.branches.updateBranch(selectedBranch.id, {
        name: branchNameInput.trim(),
      });

      if (!result.success) {
        setModalApiError(result.error.message || 'Failed to update branch');
        return;
      }

      notify.success('Branch updated successfully');
      setShowEditModal(false);
      fetchBranches();
    } catch {
      setModalApiError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Toggle Branch Status (Activate / Deactivate) ──────────
  const handleOpenStatusToggle = (branch: Branch) => {
    setSelectedBranch(branch);
    setModalApiError(null);
    setShowStatusModal(true);
  };

  const activeBranchesCount = branches.filter((b) => b.status === 'ACTIVE').length;

  const handleStatusSubmit = async () => {
    if (!selectedBranch) return;

    const newStatus = selectedBranch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (selectedBranch.status === 'ACTIVE' && activeBranchesCount <= 1) {
      setModalApiError('Cannot disable this branch. An organization must have at least one active branch.');
      return;
    }

    setIsSubmitting(true);
    setModalApiError(null);

    try {
      const result = await apiService.branches.updateBranch(selectedBranch.id, {
        status: newStatus,
      });

      if (!result.success) {
        setModalApiError(result.error.message || 'Failed to change branch status');
        return;
      }

      notify.success(
        `Branch ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
      );
      setShowStatusModal(false);

      // If current selected branch was deactivated, recover gracefully
      if (currentBranch?.id === selectedBranch.id && newStatus === 'INACTIVE') {
        const remainingActive = branches.find(
          (b) => b.id !== selectedBranch.id && b.status === 'ACTIVE',
        );
        if (remainingActive) {
          selectBranch(remainingActive);
        }
      }

      fetchBranches();
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
      header: 'Branch Name',
      render: (branch: Branch) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-100">{branch.name}</p>
            <p className="text-xs text-slate-500">ID: {branch.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (branch: Branch) => (
        <Badge variant={branch.status === 'ACTIVE' ? 'success' : 'outline'}>
          {branch.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      render: (branch: Branch) => (
        <span className="text-xs text-slate-400">{formatDate(branch.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (branch: Branch) => {
        return (
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Edit */}
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenEdit(branch)}
                title="Edit Branch"
                leftIcon={<Edit2 className="h-3.5 w-3.5" />}
              >
                Edit
              </Button>
            )}

            {/* Toggle Status */}
            {canManage && (
              <Button
                variant={branch.status === 'ACTIVE' ? 'ghost' : 'outline'}
                size="sm"
                onClick={() => handleOpenStatusToggle(branch)}
                title={branch.status === 'ACTIVE' ? 'Deactivate Branch' : 'Activate Branch'}
                leftIcon={<Power className="h-3.5 w-3.5" />}
              >
                {branch.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Branches</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage organization branch locations and active context.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Branch
          </Button>
        )}
      </div>

      {/* Plan Usage Indicator (if available) */}
      {orgOverview?.usage && (
        <Card padding="sm" className="bg-slate-900/40">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-400">
              Branch Usage ({orgOverview.plan?.name || 'Active Plan'}):
            </span>
            <span className="text-slate-200">
              <strong className="text-violet-400">{orgOverview.usage.branchCount}</strong> /{' '}
              {orgOverview.usage.branchLimit} branches created
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-violet-500 transition-all duration-300"
              style={{
                width: `${Math.min(
                  (orgOverview.usage.branchCount / orgOverview.usage.branchLimit) * 100,
                  100,
                )}%`,
              }}
            />
          </div>
        </Card>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search branches by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-violet-500 focus:outline-none"
          />
        </div>
        <Button variant="outline" size="md" onClick={fetchBranches} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Refresh
        </Button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingState message="Loading branches..." />
      ) : error ? (
        <ErrorState title="Failed to load branches" message={error} onRetry={fetchBranches} />
      ) : branches.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8 text-slate-500" />}
          title="No branches found"
          description={
            searchQuery
              ? `No branches matching "${searchQuery}"`
              : 'Get started by creating your first organization branch.'
          }
          action={
            canManage && !searchQuery ? (
              <Button variant="primary" onClick={handleOpenCreate} leftIcon={<Plus className="h-4 w-4" />}>
                Create Branch
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card padding="none">
          <DataTable<Branch> data={branches} columns={columns} keyExtractor={(item: Branch) => item.id} />
        </Card>
      )}

      {/* ── Create Branch Modal ── */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Branch">
        <form onSubmit={handleCreateSubmit} noValidate className="space-y-4">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <Input
            id="branch-name-create"
            label="Branch Name"
            placeholder="e.g. Main Cafeteria, Downtown Stall"
            value={branchNameInput}
            onChange={(e) => {
              setBranchNameInput(e.target.value);
              if (nameError) setNameError(null);
            }}
            error={nameError ?? undefined}
            autoFocus
            disabled={isSubmitting}
          />

          {orgOverview?.usage && (
            <p className="text-xs text-slate-400">
              Active plan allows up to {orgOverview.usage.branchLimit} branches (
              {orgOverview.usage.branchLimit - orgOverview.usage.branchCount} remaining).
            </p>
          )}

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              Create Branch
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Edit Branch Modal ── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Branch">
        <form onSubmit={handleEditSubmit} noValidate className="space-y-4">
          {modalApiError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{modalApiError}</span>
            </div>
          )}

          <Input
            id="branch-name-edit"
            label="Branch Name"
            placeholder="Enter new branch name"
            value={branchNameInput}
            onChange={(e) => {
              setBranchNameInput(e.target.value);
              if (nameError) setNameError(null);
            }}
            error={nameError ?? undefined}
            autoFocus
            disabled={isSubmitting}
          />

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              Save Changes
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Activate / Deactivate Confirmation Modal ── */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={selectedBranch?.status === 'ACTIVE' ? 'Deactivate Branch' : 'Activate Branch'}
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
              {selectedBranch?.status === 'ACTIVE' ? 'deactivate' : 'activate'}
            </strong>{' '}
            the branch <span className="text-violet-400 font-semibold">{selectedBranch?.name}</span>?
          </p>

          {selectedBranch?.status === 'ACTIVE' && activeBranchesCount <= 1 ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>
                Cannot deactivate this branch. Your organization must have at least one active branch at all times.
              </span>
            </div>
          ) : selectedBranch?.status === 'ACTIVE' ? (
            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg">
              Deactivating a branch will prevent staff from operating in this branch until it is reactivated.
            </p>
          ) : null}

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant={selectedBranch?.status === 'ACTIVE' ? 'danger' : 'primary'}
              onClick={handleStatusSubmit}
              isLoading={isSubmitting}
              disabled={isSubmitting || (selectedBranch?.status === 'ACTIVE' && activeBranchesCount <= 1)}
            >
              Confirm {selectedBranch?.status === 'ACTIVE' ? 'Deactivation' : 'Activation'}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}

import { useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Branch } from '@/types';
import { BranchContext } from './BranchContext';
import { storage, STORAGE_KEYS } from '@/utils';

// ─── Branch Provider ───────────────────────────────────────
// Manages the currently selected branch for branch-scoped operations.
// Supports: current branch, branch switching, persistence.
//
// Branch management screens and actual branch API calls belong to later milestones.
// Does NOT bypass backend branch authorization.

interface BranchProviderProps {
  children: ReactNode;
}

export function BranchProvider({ children }: BranchProviderProps) {
  const [branches, setBranchList] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(() => {
    return storage.get<string>(STORAGE_KEYS.SELECTED_BRANCH_ID);
  });

  // Derive currentBranch from branches + selectedBranchId (no effect needed)
  const currentBranch = useMemo(() => {
    if (branches.length === 0) return null;
    if (selectedBranchId) {
      const found = branches.find((b) => b.id === selectedBranchId);
      if (found) return found;
    }
    // Fallback to first branch
    return branches[0];
  }, [branches, selectedBranchId]);

  // ── Select Branch ─────────────────────────────────────────
  const selectBranch = useCallback((branch: Branch) => {
    setSelectedBranchId(branch.id);
    storage.set(STORAGE_KEYS.SELECTED_BRANCH_ID, branch.id);
  }, []);

  // ── Set Branches ──────────────────────────────────────────
  const setBranches = useCallback((newBranches: Branch[]) => {
    setBranchList(newBranches);
  }, []);

  // ── Clear Branch ──────────────────────────────────────────
  const clearBranch = useCallback(() => {
    setSelectedBranchId(null);
    storage.remove(STORAGE_KEYS.SELECTED_BRANCH_ID);
  }, []);

  return (
    <BranchContext.Provider
      value={{
        currentBranch,
        branches,
        selectBranch,
        setBranches,
        clearBranch,
        isLoading: false,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

import { createContext } from 'react';
import type { Branch } from '@/types';

// ─── Branch Context (separate file for React Fast Refresh) ─

export interface BranchContextValue {
  currentBranch: Branch | null;
  branches: Branch[];
  selectBranch: (branch: Branch) => void;
  setBranches: (branches: Branch[]) => void;
  clearBranch: () => void;
  isLoading: boolean;
}

export const BranchContext = createContext<BranchContextValue | null>(null);

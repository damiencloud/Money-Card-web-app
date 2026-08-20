import { useContext } from 'react';
import { BranchContext } from '@/app/providers/BranchContext';

// ─── useBranch Hook ────────────────────────────────────────
// Access the current branch context for branch-scoped operations.

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}

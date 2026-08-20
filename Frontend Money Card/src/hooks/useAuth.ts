import { useContext } from 'react';
import { AuthContext } from '@/app/providers/AuthContext';

// ─── useAuth Hook ──────────────────────────────────────────
// Access authentication state and actions.

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

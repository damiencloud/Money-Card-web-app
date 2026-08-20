import { createContext } from 'react';
import type { AuthUser, AuthState } from '@/types';

// ─── Auth Context (separate file for React Fast Refresh) ───

export interface AuthContextValue extends AuthState {
  login: (user: AuthUser, accessToken: string) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
  setLoading: (isLoading: boolean) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

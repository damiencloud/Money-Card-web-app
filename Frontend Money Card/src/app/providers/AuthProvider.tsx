import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser, AuthState, ApiResult } from '@/types';
import { AuthContext } from './AuthContext';
import { apiClient } from '@/services/api';
import { apiService } from '@/services/api';
import { storage, STORAGE_KEYS } from '@/utils';

// ─── Auth Provider ─────────────────────────────────────────
// Full authentication state management with:
// - Login / Logout state transitions
// - Session persistence across page refreshes (GET /auth/me)
// - Access-token attachment via apiClient
// - Mid-session 401 interceptor & token refresh
// - Session-expired handling with /login?expired=true redirect
//
// IMPORTANT: Refresh token is NOT stored in localStorage.
// M0 specifies HttpOnly cookie for refresh in React Web.

function createInitialState(): AuthState {
  const savedToken = storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
  if (savedToken) {
    apiClient.setAccessToken(savedToken);
  }
  return {
    user: null,
    accessToken: savedToken,
    isAuthenticated: false,
    isLoading: !!savedToken,
  };
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(createInitialState);
  const isRefreshing = useRef(false);
  const hasInitialized = useRef(false);

  // ── Clear Auth State Helper & Session Expired Redirect ──────
  const clearAuthState = useCallback((isExpired = false) => {
    apiClient.setAccessToken(null);
    storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
    storage.remove(STORAGE_KEYS.SELECTED_BRANCH_ID);
    setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });

    if (isExpired && typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      // Do not redirect User Portal users through Admin login
      // Prevent redirect loop if already on /login
      if (!pathname.startsWith('/portal') && pathname !== '/login') {
        window.location.href = '/login?expired=true';
      }
    }
  }, []);

  // ── Login ─────────────────────────────────────────────────
  const login = useCallback((user: AuthUser, accessToken: string) => {
    apiClient.setAccessToken(accessToken);
    storage.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    setState({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  // ── Logout ────────────────────────────────────────────────
  const logout = useCallback(() => {
    apiService.auth.logout().catch(() => {
      // Ignore
    });
    clearAuthState(false);
  }, [clearAuthState]);

  // ── Update User ───────────────────────────────────────────
  const updateUser = useCallback((user: AuthUser) => {
    setState((prev) => ({ ...prev, user }));
  }, []);

  // ── Set Loading ───────────────────────────────────────────
  const setLoading = useCallback((isLoading: boolean) => {
    setState((prev) => ({ ...prev, isLoading }));
  }, []);

  // ── Token Refresh ─────────────────────────────────────────
  const handleTokenRefresh = useCallback(
    (_currentToken: string) => {
      if (isRefreshing.current) return;
      isRefreshing.current = true;

      apiService.auth
        .refresh(_currentToken)
        .then((refreshResult: ApiResult<{ accessToken: string }>) => {
          if (refreshResult.success) {
            const newToken = refreshResult.data.accessToken;
            apiClient.setAccessToken(newToken);
            storage.set(STORAGE_KEYS.ACCESS_TOKEN, newToken);

            return apiService.auth.getMe().then((meResult: ApiResult<AuthUser>) => {
              if (meResult.success) {
                setState({
                  user: meResult.data,
                  accessToken: newToken,
                  isAuthenticated: true,
                  isLoading: false,
                });
              } else {
                clearAuthState(true);
              }
            });
          } else {
            clearAuthState(true);
          }
        })
        .catch(() => {
          clearAuthState(true);
        })
        .finally(() => {
          isRefreshing.current = false;
        });
    },
    [clearAuthState],
  );

  // ── Session Initialization (validate existing token on mount) ──
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const savedToken = storage.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
    if (!savedToken) return;

    apiService.auth
      .getMe()
      .then((result: ApiResult<AuthUser>) => {
        if (result.success) {
          setState({
            user: result.data,
            accessToken: savedToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          handleTokenRefresh(savedToken);
        }
      })
      .catch(() => {
        clearAuthState(true);
      });
  }, [clearAuthState, handleTokenRefresh]);

  // ── Subscribe to apiClient Session Expired Event ─────────
  useEffect(() => {
    const unsubscribe = apiClient.onSessionExpired(() => {
      clearAuthState(true);
    });
    return unsubscribe;
  }, [clearAuthState]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        updateUser,
        setLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

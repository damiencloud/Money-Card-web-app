import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './AuthProvider';
import { BranchProvider } from './BranchProvider';

// ─── App Providers ─────────────────────────────────────────
// Wraps the application in all required context providers.
// Order matters: Router → Auth → Branch (branch depends on auth context).

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BranchProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#e2e8f0',
                fontSize: '14px',
              },
            }}
            richColors
            closeButton
          />
        </BranchProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

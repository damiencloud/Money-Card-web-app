import { AppProviders } from './providers';
import { AppRoutes } from './routes';

// ─── Root App Component ────────────────────────────────────

export function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}

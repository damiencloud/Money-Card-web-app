import { AlertCircle, LogIn } from 'lucide-react';
// ─── Login Page ────────────────────────────────────────────
// M3 Web Authentication — SUPER_ADMIN & ORG_ADMIN only.
// Staff login is NOT implemented here (Flutter-only).
// Uses apiService abstraction — does NOT import mock handlers directly.

import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks';
import { apiService } from '@/services/api';

// ── Email Validation ─────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_REGEX.test(email.trim())) return 'Please enter a valid email address';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  return null;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionExpired = searchParams.get('expired') === 'true';

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setApiError(null);

      // Client-side validation
      const eErr = validateEmail(email);
      const pErr = validatePassword(password);
      setEmailError(eErr);
      setPasswordError(pErr);
      if (eErr || pErr) return;

      setIsSubmitting(true);
      try {
        const result = await apiService.auth.login({ email: email.trim(), password });

        if (!result.success) {
          setApiError(result.error.message || 'Invalid email or password');
          return;
        }

        const { user, accessToken } = result.data;

        // M3 Web authentication is for SUPER_ADMIN and ORG_ADMIN only.
        // Staff uses Flutter app. Reject Staff login here.
        if (user.role === 'STAFF') {
          setApiError('Staff accounts must use the Staff application to sign in.');
          return;
        }

        login(user, accessToken);

        // If user must change temporary password, redirect immediately to /change-password
        if (user.mustChangePassword) {
          navigate('/change-password', { replace: true });
        } else {
          // Redirect to intended destination or dashboard
          const redirectTo = searchParams.get('redirect') || '/dashboard';
          navigate(redirectTo, { replace: true });
        }
      } catch {
        setApiError('Unable to connect to the server. Please check your network and try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, login, navigate, searchParams],
  );

  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-100">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-400">Sign in to the admin dashboard</p>
        </div>

        {/* Session expired notice */}
        {sessionExpired && !apiError && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-300">
              Your session has expired. Please sign in again.
            </p>
          </div>
        )}

        {/* API error */}
        {apiError && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <p className="text-sm text-rose-300">{apiError}</p>
          </div>
        )}

        {/* Email field */}
        <Input
          id="login-email"
          label="Email"
          type="email"
          placeholder="admin@example.com"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
            if (apiError) setApiError(null);
          }}
          error={emailError ?? undefined}
          disabled={isSubmitting}
          aria-required="true"
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'login-email-error' : undefined}
        />

        {/* Password field */}
        <Input
          id="login-password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError(null);
            if (apiError) setApiError(null);
          }}
          error={passwordError ?? undefined}
          disabled={isSubmitting}
          aria-required="true"
          aria-invalid={!!passwordError}
          aria-describedby={passwordError ? 'login-password-error' : undefined}
        />

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          leftIcon={<LogIn className="h-4 w-4" />}
        >
          Sign In
        </Button>

        {/* Forgot password link */}
        <div className="text-center">
          <Link
            to="/forgot-password"
            className="text-sm text-violet-400 transition-colors hover:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:rounded"
          >
            Forgot your password?
          </Link>
        </div>


      </form>
    </Card>
  );
}

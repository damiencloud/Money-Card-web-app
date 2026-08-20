// ─── Forgot Password Page ──────────────────────────────────
// M0 Rule 14.3: Never reveal whether an account exists.

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Input } from '@/components/ui';
import { apiService } from '@/services/api';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setApiError(null);

      if (!email.trim()) {
        setEmailError('Email is required');
        return;
      }
      if (!EMAIL_REGEX.test(email.trim())) {
        setEmailError('Please enter a valid email address');
        return;
      }
      setEmailError(null);

      setIsSubmitting(true);
      try {
        const result = await apiService.auth.forgotPassword({ email: email.trim() });

        if (!result.success) {
          // Even on error, M0 rule says do NOT reveal account existence.
          // But surface real API errors (network / server).
          setApiError(result.error.message || 'An error occurred. Please try again.');
          return;
        }

        setIsSuccess(true);
      } catch {
        setApiError('Unable to connect to the server. Please check your network and try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [email],
  );

  if (isSuccess) {
    return (
      <Card padding="lg">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Check your email</h2>
            <p className="mt-2 text-sm text-slate-400">
              If an account associated with that email exists, password reset instructions have been
              sent. Please check your inbox and spam folder.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-violet-400 transition-colors hover:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:rounded"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-100">Forgot password?</h2>
          <p className="mt-1 text-sm text-slate-400">
            Enter your email and we&apos;ll send you reset instructions.
          </p>
        </div>

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

        <Input
          id="forgot-email"
          label="Email address"
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
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          leftIcon={<Mail className="h-4 w-4" />}
        >
          Send Reset Instructions
        </Button>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-violet-400 transition-colors hover:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:rounded"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </form>
    </Card>
  );
}

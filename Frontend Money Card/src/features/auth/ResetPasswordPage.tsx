// ─── Reset Password Page ───────────────────────────────────
// Handles password reset via token from URL search params.

import { useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, Button, Input } from '@/components/ui';
import { apiService } from '@/services/api';
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetToken) return;
      setApiError(null);

      // Validate
      let hasErrors = false;
      if (!newPassword) {
        setNewPasswordError('New password is required');
        hasErrors = true;
      } else {
        setNewPasswordError(null);
      }

      if (!confirmPassword) {
        setConfirmPasswordError('Please confirm your password');
        hasErrors = true;
      } else if (newPassword && confirmPassword !== newPassword) {
        setConfirmPasswordError('Passwords do not match');
        hasErrors = true;
      } else {
        setConfirmPasswordError(null);
      }

      if (hasErrors) return;

      setIsSubmitting(true);
      try {
        const result = await apiService.auth.resetPassword({
          token: resetToken,
          newPassword,
        });

        if (!result.success) {
          const code = result.error.code;
          if (code === 'VALIDATION_ERROR') {
            setApiError(result.error.message || 'Invalid or expired reset token.');
          } else {
            setApiError(result.error.message || 'Unable to reset password. Please try again.');
          }
          return;
        }

        setIsSuccess(true);
      } catch {
        setApiError('Unable to connect to the server. Please check your network and try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [newPassword, confirmPassword, resetToken],
  );

  // No token → invalid/expired token page
  if (!resetToken) {
    return (
      <Card padding="lg">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
            <ShieldAlert className="h-8 w-8 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Invalid reset link</h2>
            <p className="mt-2 text-sm text-slate-400">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 text-sm text-violet-400 transition-colors hover:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:rounded"
          >
            Request new reset link
          </Link>
        </div>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card padding="lg">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Password reset successful</h2>
            <p className="mt-2 text-sm text-slate-400">
              Your password has been updated. You can now sign in with your new password.
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
          <h2 className="text-xl font-semibold text-slate-100">Reset your password</h2>
          <p className="mt-1 text-sm text-slate-400">Enter your new password below.</p>
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
          id="reset-new-password"
          label="New password"
          type="password"
          placeholder="Enter new password"
          autoComplete="new-password"
          autoFocus
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (newPasswordError) setNewPasswordError(null);
            if (apiError) setApiError(null);
          }}
          error={newPasswordError ?? undefined}
          disabled={isSubmitting}
          aria-required="true"
          aria-invalid={!!newPasswordError}
        />

        <Input
          id="reset-confirm-password"
          label="Confirm password"
          type="password"
          placeholder="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (confirmPasswordError) setConfirmPasswordError(null);
          }}
          error={confirmPasswordError ?? undefined}
          disabled={isSubmitting}
          aria-required="true"
          aria-invalid={!!confirmPasswordError}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          leftIcon={<KeyRound className="h-4 w-4" />}
        >
          Reset Password
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

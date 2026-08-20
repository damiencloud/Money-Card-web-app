// ─── Change Password Component ─────────────────────────────
// Authenticated-only. Uses apiService abstraction.

import { useState, useCallback } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { apiService } from '@/services/api';
import { KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPwError, setCurrentPwError] = useState<string | null>(null);
  const [newPwError, setNewPwError] = useState<string | null>(null);
  const [confirmPwError, setConfirmPwError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setApiError(null);
      setIsSuccess(false);

      let hasErrors = false;

      if (!currentPassword) {
        setCurrentPwError('Current password is required');
        hasErrors = true;
      } else {
        setCurrentPwError(null);
      }

      if (!newPassword) {
        setNewPwError('New password is required');
        hasErrors = true;
      } else {
        setNewPwError(null);
      }

      if (!confirmPassword) {
        setConfirmPwError('Please confirm your new password');
        hasErrors = true;
      } else if (newPassword && confirmPassword !== newPassword) {
        setConfirmPwError('Passwords do not match');
        hasErrors = true;
      } else {
        setConfirmPwError(null);
      }

      if (hasErrors) return;

      setIsSubmitting(true);
      try {
        const result = await apiService.auth.changePassword({
          currentPassword,
          newPassword,
        });

        if (!result.success) {
          setApiError(result.error.message || 'Unable to change password.');
          return;
        }

        setIsSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch {
        setApiError('Unable to connect to the server. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentPassword, newPassword, confirmPassword],
  );

  return (
    <Card padding="md">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Change Password</h3>
          <p className="mt-1 text-sm text-slate-400">Update your account password.</p>
        </div>

        {isSuccess && (
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <p className="text-sm text-emerald-300">Password changed successfully.</p>
          </div>
        )}

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
          id="change-current-password"
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => {
            setCurrentPassword(e.target.value);
            if (currentPwError) setCurrentPwError(null);
            if (apiError) setApiError(null);
            if (isSuccess) setIsSuccess(false);
          }}
          error={currentPwError ?? undefined}
          disabled={isSubmitting}
          aria-required="true"
        />

        <Input
          id="change-new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (newPwError) setNewPwError(null);
            if (apiError) setApiError(null);
            if (isSuccess) setIsSuccess(false);
          }}
          error={newPwError ?? undefined}
          disabled={isSubmitting}
          aria-required="true"
        />

        <Input
          id="change-confirm-password"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (confirmPwError) setConfirmPwError(null);
            if (isSuccess) setIsSuccess(false);
          }}
          error={confirmPwError ?? undefined}
          disabled={isSubmitting}
          aria-required="true"
        />

        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          leftIcon={<KeyRound className="h-4 w-4" />}
        >
          Update Password
        </Button>
      </form>
    </Card>
  );
}

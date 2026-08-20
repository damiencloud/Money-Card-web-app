import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input } from '@/components/ui';
import { apiService } from '@/services/api';
import { useAuth } from '@/hooks';
import { notify } from '@/utils';
import { KeyRound, AlertCircle, ShieldAlert, LogOut } from 'lucide-react';

export function MandatoryChangePasswordPage() {
  const navigate = useNavigate();
  const { user, login, logout, updateUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPwError, setCurrentPwError] = useState<string | null>(null);
  const [newPwError, setNewPwError] = useState<string | null>(null);
  const [confirmPwError, setConfirmPwError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setApiError(null);

      let hasErrors = false;

      if (!currentPassword) {
        setCurrentPwError('Temporary password is required');
        hasErrors = true;
      } else {
        setCurrentPwError(null);
      }

      if (!newPassword) {
        setNewPwError('New password is required');
        hasErrors = true;
      } else if (newPassword.length < 6) {
        setNewPwError('New password must be at least 6 characters');
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
          setApiError(result.error.message || 'Unable to update password. Please verify your temporary password.');
          return;
        }

        const data = (result.data as any);
        if (data?.token && data?.user) {
          login(data.user, data.token);
        } else if (user) {
          updateUser({ ...user, mustChangePassword: false });
        }

        notify.success('Password changed successfully.');
        navigate('/dashboard', { replace: true });
      } catch {
        setApiError('Unable to connect to the server. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentPassword, newPassword, confirmPassword, login, user, updateUser, navigate],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <ShieldAlert className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-100">Create Your New Password</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your password was reset by the Super Admin. For security, you must create a new private password before continuing.
          </p>
        </div>

        <Card padding="lg" className="border-slate-800 bg-slate-900/90 shadow-2xl">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
              id="current-temp-password"
              label="Current Temporary Password *"
              type="password"
              placeholder="Enter the temporary password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (currentPwError) setCurrentPwError(null);
                if (apiError) setApiError(null);
              }}
              error={currentPwError ?? undefined}
              disabled={isSubmitting}
              aria-required="true"
            />

            <Input
              id="new-private-password"
              label="New Private Password *"
              type="password"
              placeholder="Enter new private password (min 6 characters)"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (newPwError) setNewPwError(null);
                if (apiError) setApiError(null);
              }}
              error={newPwError ?? undefined}
              disabled={isSubmitting}
              aria-required="true"
            />

            <Input
              id="confirm-private-password"
              label="Confirm New Password *"
              type="password"
              placeholder="Confirm new private password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (confirmPwError) setConfirmPwError(null);
                if (apiError) setApiError(null);
              }}
              error={confirmPwError ?? undefined}
              disabled={isSubmitting}
              aria-required="true"
            />

            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                size="lg"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                leftIcon={<KeyRound className="h-4 w-4" />}
              >
                Set New Password & Continue
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-slate-400 hover:text-slate-200"
                onClick={logout}
                leftIcon={<LogOut className="h-4 w-4" />}
              >
                Sign Out
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

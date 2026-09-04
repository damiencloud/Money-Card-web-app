// ─── Change Password Component ─────────────────────────────
// Authenticated-only. Enforces backend strongPasswordSchema with live suggestions.

import { useState, useCallback, useMemo } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { apiService } from '@/services/api';
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [currentPwError, setCurrentPwError] = useState<string | null>(null);
  const [newPwError, setNewPwError] = useState<string | null>(null);
  const [confirmPwError, setConfirmPwError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // ── Live Criteria Validation ──────────────────────────────
  const rules = useMemo(() => {
    return [
      { id: 'length', label: 'At least 8 characters', met: newPassword.length >= 8 },
      { id: 'uppercase', label: 'One uppercase letter [A-Z]', met: /[A-Z]/.test(newPassword) },
      { id: 'lowercase', label: 'One lowercase letter [a-z]', met: /[a-z]/.test(newPassword) },
      { id: 'number', label: 'One number [0-9]', met: /[0-9]/.test(newPassword) },
      {
        id: 'special',
        label: 'One special character (!@#$%...)',
        met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword),
      },
      {
        id: 'match',
        label: 'Passwords match',
        met: Boolean(newPassword && confirmPassword && newPassword === confirmPassword),
      },
    ];
  }, [newPassword, confirmPassword]);

  const strengthCount = useMemo(() => {
    return rules.slice(0, 5).filter((r) => r.met).length;
  }, [rules]);

  const strengthMeta = useMemo(() => {
    if (!newPassword) return null;
    if (strengthCount <= 2) {
      return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400', width: '33%' };
    }
    if (strengthCount <= 4) {
      return { label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-400', width: '66%' };
    }
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-400', width: '100%' };
  }, [newPassword, strengthCount]);

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
      } else if (newPassword.length < 8) {
        setNewPwError('Password must be at least 8 characters long');
        hasErrors = true;
      } else if (newPassword.length > 128) {
        setNewPwError('Password cannot exceed 128 characters');
        hasErrors = true;
      } else if (!/[A-Z]/.test(newPassword)) {
        setNewPwError('Password must contain at least one uppercase letter [A-Z]');
        hasErrors = true;
      } else if (!/[a-z]/.test(newPassword)) {
        setNewPwError('Password must contain at least one lowercase letter [a-z]');
        hasErrors = true;
      } else if (!/[0-9]/.test(newPassword)) {
        setNewPwError('Password must contain at least one number [0-9]');
        hasErrors = true;
      } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword)) {
        setNewPwError('Password must contain at least one special character (!@#$%^&*...)');
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
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-violet-400" />
            Change Password
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Update your organization account password. Must meet strict security policy standards.
          </p>
        </div>

        {isSuccess && (
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <p className="text-sm text-emerald-300 font-medium">Password changed successfully.</p>
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

        {/* Current Password */}
        <Input
          id="change-current-password"
          label="Current password"
          type={showCurrentPw ? 'text' : 'password'}
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => {
            setCurrentPassword(e.target.value);
            if (currentPwError) setCurrentPwError(null);
            if (apiError) setApiError(null);
            if (isSuccess) setIsSuccess(false);
          }}
          rightElement={
            <button
              type="button"
              onClick={() => setShowCurrentPw(!showCurrentPw)}
              className="hover:text-slate-200 transition-colors focus:outline-none"
              tabIndex={-1}
              aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
            >
              {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          error={currentPwError ?? undefined}
          disabled={isSubmitting}
          aria-required="true"
        />

        {/* New Password */}
        <Input
          id="change-new-password"
          label="New password"
          type={showNewPw ? 'text' : 'password'}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (newPwError) setNewPwError(null);
            if (apiError) setApiError(null);
            if (isSuccess) setIsSuccess(false);
          }}
          rightElement={
            <button
              type="button"
              onClick={() => setShowNewPw(!showNewPw)}
              className="hover:text-slate-200 transition-colors focus:outline-none"
              tabIndex={-1}
              aria-label={showNewPw ? 'Hide password' : 'Show password'}
            >
              {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          error={newPwError ?? undefined}
          disabled={isSubmitting}
          aria-required="true"
        />

        {/* Strength Indicator Bar */}
        {strengthMeta && (
          <div className="space-y-1 -mt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Password Strength:</span>
              <span className={`font-semibold ${strengthMeta.text}`}>{strengthMeta.label}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${strengthMeta.color} transition-all duration-300`}
                style={{ width: strengthMeta.width }}
              />
            </div>
          </div>
        )}

        {/* Confirm Password */}
        <Input
          id="change-confirm-password"
          label="Confirm new password"
          type={showConfirmPw ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (confirmPwError) setConfirmPwError(null);
            if (isSuccess) setIsSuccess(false);
          }}
          rightElement={
            <button
              type="button"
              onClick={() => setShowConfirmPw(!showConfirmPw)}
              className="hover:text-slate-200 transition-colors focus:outline-none"
              tabIndex={-1}
              aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
            >
              {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          error={confirmPwError ?? undefined}
          disabled={isSubmitting}
          aria-required="true"
        />

        {/* Live Password Requirements & Suggestions Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-violet-400" />
              Password Requirements
            </span>
            <span className="text-[11px] text-slate-500">All rules must be satisfied</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-slate-400">
            {rules.map((r) => (
              <div
                key={r.id}
                className={`flex items-center gap-2 transition-colors ${
                  r.met ? 'text-emerald-400 font-medium' : 'text-slate-400'
                }`}
              >
                {r.met ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-600 shrink-0 ml-1 mr-1" />
                )}
                <span>{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          leftIcon={<KeyRound className="h-4 w-4" />}
          className="w-full sm:w-auto"
        >
          Update Password
        </Button>
      </form>
    </Card>
  );
}

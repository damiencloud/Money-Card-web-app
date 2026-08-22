import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Card, Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks';
import { apiService } from '@/services/api';
import {
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Building2,
  ArrowRight,
  Loader2,
  Check,
  X,
} from 'lucide-react';

export function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const token = searchParams.get('token') || '';

  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [invitee, setInvitee] = useState<{
    name: string;
    email: string;
    role: string;
    organizationName: string | null;
  } | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Verify activation token on mount
  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setTokenError('No activation token was provided in the link. Please check your invitation email.');
      return;
    }

    setIsVerifying(true);
    setTokenError(null);

    apiService.auth
      .verifyActivationToken(token)
      .then((res) => {
        if (res.success && res.data.valid) {
          setInvitee(res.data.user);
        } else {
          setTokenError(res.error?.message || 'This activation link is invalid or has expired.');
        }
      })
      .catch(() => {
        setTokenError('Unable to connect to the server. Please try again.');
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, [token]);

  // Password complexity checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      setPasswordError(null);
      setConfirmError(null);

      let hasErrors = false;

      if (!password) {
        setPasswordError('Password is required');
        hasErrors = true;
      } else if (!isPasswordValid) {
        setPasswordError('Please satisfy all password security requirements');
        hasErrors = true;
      }

      if (!confirmPassword) {
        setConfirmError('Please confirm your password');
        hasErrors = true;
      } else if (password && confirmPassword !== password) {
        setConfirmError('Passwords do not match');
        hasErrors = true;
      }

      if (hasErrors) return;

      setIsSubmitting(true);
      try {
        const res = await apiService.auth.activateAccount({
          token,
          password,
          confirmPassword,
        });

        if (!res.success) {
          setSubmitError(res.error.message || 'Failed to activate account.');
          return;
        }

        setIsSuccess(true);

        // Seamless auto-login
        if (res.data?.accessToken && res.data?.user) {
          login(res.data.user, res.data.accessToken);
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1200);
        }
      } catch {
        setSubmitError('Unable to connect to the server. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, password, confirmPassword, isPasswordValid, login, navigate],
  );

  // 1. Loading state
  if (isVerifying) {
    return (
      <Card padding="lg" className="text-center">
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          <h3 className="mt-4 text-base font-semibold text-slate-100">Verifying Invitation Link</h3>
          <p className="mt-1 text-xs text-slate-400">Validating your one-time activation token...</p>
        </div>
      </Card>
    );
  }

  // 2. Error / Expired state
  if (tokenError || !invitee) {
    return (
      <Card padding="lg">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Activation Link Invalid</h2>
            <p className="mt-2 text-sm text-slate-400">
              {tokenError || 'This activation link has expired or has already been used.'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-left text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-slate-300">Need a new invitation?</p>
            <p>Please contact your Organization Administrator or Platform Manager to trigger a fresh invitation link.</p>
          </div>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              Return to Sign In <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  // 3. Success state
  if (isSuccess) {
    return (
      <Card padding="lg" className="text-center">
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Account Activated Successfully!</h2>
            <p className="mt-1 text-sm text-slate-400">
              Welcome aboard, <strong className="text-slate-200">{invitee.name}</strong>. Redirecting you to your dashboard...
            </p>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        </div>
      </Card>
    );
  }

  // 4. Set Password Form
  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Account Activation</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            Welcome to {invitee.organizationName || 'Money Card'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Hi <strong className="text-slate-200">{invitee.name}</strong> ({invitee.email}), please choose a secure password to complete your account setup.
          </p>
        </div>

        {invitee.organizationName && (
          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <Building2 className="h-5 w-5 text-slate-400" />
            <div>
              <div className="text-xs font-medium text-slate-400">Assigned Organization</div>
              <div className="text-sm font-semibold text-slate-200">{invitee.organizationName}</div>
            </div>
          </div>
        )}

        {submitError && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <p className="text-sm text-rose-300">{submitError}</p>
          </div>
        )}

        <div className="space-y-4">
          <Input
            id="activate-password"
            label="Create New Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError(null);
              if (submitError) setSubmitError(null);
            }}
            error={passwordError ?? undefined}
            disabled={isSubmitting}
            aria-required="true"
          />

          {/* Realtime password requirements checklist */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-2 text-xs">
            <p className="font-semibold text-slate-300">Password Security Requirements:</p>
            <div className="grid grid-cols-2 gap-2 text-slate-400">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : ''}`}>
                {hasMinLength ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 text-slate-600" />}
                <span>8+ Characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-400' : ''}`}>
                {hasUppercase ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 text-slate-600" />}
                <span>Uppercase Letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-400' : ''}`}>
                {hasLowercase ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 text-slate-600" />}
                <span>Lowercase Letter</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : ''}`}>
                {hasNumber ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 text-slate-600" />}
                <span>Number (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 col-span-2 ${hasSpecial ? 'text-emerald-400' : ''}`}>
                {hasSpecial ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 text-slate-600" />}
                <span>Special Symbol (!@#$%^&*...)</span>
              </div>
            </div>
          </div>

          <Input
            id="activate-confirm-password"
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (confirmError) setConfirmError(null);
            }}
            error={confirmError ?? undefined}
            disabled={isSubmitting}
            aria-required="true"
          />
        </div>

        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          className="w-full"
          leftIcon={<KeyRound className="h-4 w-4" />}
        >
          Activate Account & Sign In
        </Button>
      </form>
    </Card>
  );
}

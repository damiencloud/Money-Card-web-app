// ─── User Portal Current Session Page (M11) ─────────────────
// Displays current active Card Session balance, status, branch context, and navigation.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '@/services/api';
import type { PublicSessionDetail } from '@/types';
import {
  Card,
  Badge,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { formatDate, formatCurrency } from '@/utils';
import {
  CreditCard,
  Building2,
  Clock,
  History,
  Receipt,
  LogOut,
  CheckCircle2,
  QrCode,
} from 'lucide-react';

export function PortalSessionPage() {
  const navigate = useNavigate();
  const sessionToken = sessionStorage.getItem('moneycard_portal_session_token');

  const [sessionDetail, setSessionDetail] = useState<PublicSessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionDetail = useCallback(async () => {
    if (!sessionToken) {
      setIsLoading(false);
      return;
    }

    setError(null);
    try {
      const res = await apiService.userPortal.getPublicSessionDetail(sessionToken);

      if (!res.success) {
        if (res.error.code === 'UNAUTHORIZED' || res.error.code === 'SESSION_NOT_FOUND') {
          sessionStorage.removeItem('moneycard_portal_session_token');
          sessionStorage.removeItem('moneycard_portal_card_number');
          setError('Portal session expired or invalid. Please scan your card QR code again.');
        } else {
          setError(res.error.message || 'Failed to load card session detail');
        }
        return;
      }

      setSessionDetail(res.data);
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      if (!sessionToken) {
        setIsLoading(false);
        return;
      }

      setError(null);
      try {
        const res = await apiService.userPortal.getPublicSessionDetail(sessionToken);
        if (isCancelled) return;

        if (!res.success) {
          if (res.error.code === 'UNAUTHORIZED' || res.error.code === 'SESSION_NOT_FOUND') {
            sessionStorage.removeItem('moneycard_portal_session_token');
            sessionStorage.removeItem('moneycard_portal_card_number');
            setError('Portal session expired or invalid. Please scan your card QR code again.');
          } else {
            setError(res.error.message || 'Failed to load card session detail');
          }
          return;
        }

        setSessionDetail(res.data);
      } catch {
        if (!isCancelled) setError('Unable to connect to server. Please try again.');
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [sessionToken]);

  const handleExitSession = () => {
    sessionStorage.removeItem('moneycard_portal_session_token');
    sessionStorage.removeItem('moneycard_portal_card_number');
    navigate('/portal', { replace: true });
  };

  if (!sessionToken) {
    return (
      <div className="py-8 space-y-6">
        <EmptyState
          icon={<QrCode className="h-8 w-8 text-violet-400" />}
          title="No Active Card Session"
          description="Scan the QR code on your physical Money Card to view live session balance and transaction history."
        />
        <div className="flex justify-center">
          <button
            onClick={() => navigate('/c/qr_token_mc001_8a7b9c')}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:from-violet-500 hover:to-indigo-500"
          >
            <CreditCard className="h-4 w-4" />
            <span>Demo: Scan Sample Card MC-001</span>
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingState message="Loading card session details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <ErrorState title="Session Access Error" message={error} onRetry={fetchSessionDetail} />
      </div>
    );
  }

  if (!sessionDetail) return null;

  const isClosed = sessionDetail.sessionStatus === 'SETTLED';

  return (
    <div className="space-y-6">
      {/* Session Hero Card */}
      <Card padding="lg" className="relative overflow-hidden border-violet-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-violet-950/40">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400">Card Number</span>
              <p className="font-mono text-lg font-bold text-slate-100">
                {sessionDetail.cardDisplayNumber}
              </p>
            </div>
          </div>

          <Badge variant={isClosed ? 'outline' : 'success'} className="text-xs">
            {sessionDetail.sessionStatus}
          </Badge>
        </div>

        {/* Live Balance Section */}
        <div className="py-6 text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {isClosed ? 'Final Settled Balance' : 'Current Wallet Balance'}
          </span>
          <h2 className="mt-1 font-mono text-4xl font-extrabold text-violet-300">
            {formatCurrency(sessionDetail.currentBalance)}
          </h2>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
            <span>{sessionDetail.branchDisplayName}</span>
          </p>
        </div>

        {/* Closed Session Warning Banner */}
        {isClosed && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Session Settled & Closed</span>
            </div>
            <p>
              This session was settled by store staff. Remaining funds were refunded.
            </p>
          </div>
        )}

        {/* Footer info & Exit action */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            Started: {formatDate(sessionDetail.startedAt)}
          </span>

          <button
            onClick={handleExitSession}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Exit Session
          </button>
        </div>
      </Card>

      {/* Navigation Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/portal/transactions"
          className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center transition-all hover:border-violet-500/50 hover:bg-slate-900"
        >
          <History className="h-6 w-6 text-violet-400 mb-2" />
          <span className="text-sm font-semibold text-slate-200">Transaction History</span>
          <span className="mt-0.5 text-xs text-slate-500">View recharges & purchases</span>
        </Link>

        <Link
          to="/portal/receipts"
          className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center transition-all hover:border-violet-500/50 hover:bg-slate-900"
        >
          <Receipt className="h-6 w-6 text-emerald-400 mb-2" />
          <span className="text-sm font-semibold text-slate-200">Purchase Receipts</span>
          <span className="mt-0.5 text-xs text-slate-500">Itemized purchase details</span>
        </Link>
      </div>
    </div>
  );
}

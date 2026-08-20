// ─── User Portal Transactions Page (M11) ───────────────────
// Displays permitted transaction history (Recharges, Purchases, Refunds) for current session.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '@/services/api';
import type { PublicTransaction } from '@/types';
import {
  Card,
  Badge,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { formatDate, formatCurrency } from '@/utils';
import {
  ArrowLeft,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
} from 'lucide-react';

export function PortalTransactionsPage() {
  const navigate = useNavigate();
  const sessionToken = sessionStorage.getItem('moneycard_portal_session_token');

  const [transactions, setTransactions] = useState<PublicTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTxnId, setExpandedTxnId] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!sessionToken) {
      setIsLoading(false);
      return;
    }

    setError(null);
    try {
      const res = await apiService.userPortal.getPublicSessionTransactions(sessionToken);

      if (!res.success) {
        setError(res.error.message || 'Failed to load transaction history');
        return;
      }

      setTransactions(res.data);
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
        const res = await apiService.userPortal.getPublicSessionTransactions(sessionToken);
        if (isCancelled) return;

        if (!res.success) {
          setError(res.error.message || 'Failed to load transaction history');
          return;
        }

        setTransactions(res.data);
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

  if (!sessionToken) {
    navigate('/portal', { replace: true });
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/portal/session"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Transaction History</h1>
          <p className="text-xs text-slate-400">Recharges, purchases, and session settlements.</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading transactions..." />
      ) : error ? (
        <ErrorState title="Failed to load history" message={error} onRetry={fetchTransactions} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={<History className="h-8 w-8 text-slate-500" />}
          title="No transactions recorded"
          description="Your session activity will appear here when recharges or purchases occur."
        />
      ) : (
        <div className="space-y-3">
          {transactions.map((txn) => {
            const isExpanded = expandedTxnId === txn.id;
            const isRecharge = txn.type === 'RECHARGE';
            const isRefund = txn.type === 'REFUND';

            return (
              <Card key={txn.id} padding="sm" className="space-y-3">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() =>
                    txn.items && txn.items.length > 0
                      ? setExpandedTxnId(isExpanded ? null : txn.id)
                      : null
                  }
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isRecharge
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : isRefund
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-violet-500/10 text-violet-400'
                      }`}
                    >
                      {isRecharge ? (
                        <ArrowDownLeft className="h-5 w-5" />
                      ) : isRefund ? (
                        <RotateCcw className="h-5 w-5" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200">
                          {isRecharge
                            ? `Card Recharge (${txn.paymentMethod || 'CASH'})`
                            : isRefund
                              ? 'Session Refund Settlement'
                              : 'Purchase Item'}
                        </span>
                        <Badge
                          variant={txn.status === 'SUCCESS' ? 'success' : 'outline'}
                          className="text-[10px]"
                        >
                          {txn.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400">{formatDate(txn.timestamp)}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-mono text-sm font-bold ${
                        isRecharge
                          ? 'text-emerald-400'
                          : isRefund
                            ? 'text-rose-400'
                            : 'text-slate-200'
                      }`}
                    >
                      {isRecharge ? '+' : '-'}{formatCurrency(txn.amount)}
                    </p>
                    {txn.items && txn.items.length > 0 && (
                      <div className="mt-1 flex items-center justify-end text-[11px] text-violet-400">
                        <span>{txn.items.length} items</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 ml-0.5" />
                        ) : (
                          <ChevronDown className="h-3 w-3 ml-0.5" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Itemized Purchase Breakdown */}
                {isExpanded && txn.items && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-300 pb-1 border-b border-slate-800">
                      <ShoppingBag className="h-3.5 w-3.5 text-violet-400" />
                      <span>Purchased Items Breakdown</span>
                    </div>
                    {txn.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-300">
                        <span>
                          {item.itemName} x{item.quantity}
                        </span>
                        <span className="font-mono text-slate-200">
                          {formatCurrency(item.totalPrice)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

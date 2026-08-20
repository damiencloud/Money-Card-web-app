// ─── User Portal Receipts Page (M11) ───────────────────────
// Displays itemized receipts for purchase transactions in active session.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '@/services/api';
import type { PublicReceipt } from '@/types';
import {
  Card,
  Badge,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/ui';
import { formatDate, formatCurrency } from '@/utils';
import { ArrowLeft, Receipt } from 'lucide-react';

export function PortalReceiptsPage() {
  const navigate = useNavigate();
  const sessionToken = sessionStorage.getItem('moneycard_portal_session_token');

  const [receipts, setReceipts] = useState<PublicReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    if (!sessionToken) {
      setIsLoading(false);
      return;
    }

    setError(null);
    try {
      const res = await apiService.userPortal.getPublicSessionReceipts(sessionToken);

      if (!res.success) {
        setError(res.error.message || 'Failed to load receipts');
        return;
      }

      setReceipts(res.data);
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
        const res = await apiService.userPortal.getPublicSessionReceipts(sessionToken);
        if (isCancelled) return;

        if (!res.success) {
          setError(res.error.message || 'Failed to load receipts');
          return;
        }

        setReceipts(res.data);
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
          <h1 className="text-xl font-bold text-slate-100">Itemized Receipts</h1>
          <p className="text-xs text-slate-400">Digital receipts for purchases made with this session.</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading receipts..." />
      ) : error ? (
        <ErrorState title="Failed to load receipts" message={error} onRetry={fetchReceipts} />
      ) : receipts.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-8 w-8 text-slate-500" />}
          title="No purchase receipts"
          description="Receipts will be generated when food or store purchases occur."
        />
      ) : (
        <div className="space-y-4">
          {receipts.map((rcpt) => (
            <Card key={rcpt.receiptId} padding="md" className="space-y-4 border-slate-800">
              {/* Receipt Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-violet-300">
                    {rcpt.receiptId}
                  </span>
                  <p className="text-[11px] text-slate-400">{formatDate(rcpt.date)}</p>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-400">
                  PAID
                </Badge>
              </div>

              {/* Items List */}
              <div className="space-y-2 text-xs">
                {rcpt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-300">
                    <div>
                      <p className="font-medium text-slate-200">{item.itemName}</p>
                      <p className="text-[11px] text-slate-400">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-slate-100">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Receipt Total */}
              <div className="flex justify-between border-t border-slate-800 pt-3 text-xs">
                <span className="font-semibold text-slate-300">Total Paid</span>
                <span className="font-mono text-base font-bold text-emerald-400">
                  {formatCurrency(rcpt.totalAmount)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

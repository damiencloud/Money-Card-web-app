// ─── QR Entry Resolution Page (M11) ───────────────────────
// Handles public QR code entry (/c/:qrToken or /c/:token), resolves physical card,
// and establishes secure User Portal Session Token.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { LoadingState, Card, Button } from '@/components/ui';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

export function QrResolutionPage() {
  const params = useParams<{ qrToken?: string; token?: string }>();
  const activeToken = params.qrToken || params.token;
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [errorTitle, setErrorTitle] = useState<string>('Card Resolution Error');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resolveQr = async () => {
    if (!activeToken) {
      setErrorTitle('Invalid Link');
      setErrorMessage('No QR code token provided in URL.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiService.userPortal.resolvePublicCard(activeToken);

      if (!res.success) {
        if (res.error.code === 'CARD_BLOCKED') {
          setErrorTitle('Card Blocked');
          setErrorMessage(
            res.error.message || 'This physical card has been blocked. Please visit cafeteria desk.',
          );
        } else if (res.error.code === 'SESSION_NOT_FOUND') {
          setErrorTitle('No Active Session');
          setErrorMessage(
            res.error.message || 'No active session found. Please request cafeteria staff to issue a session.',
          );
        } else {
          setErrorTitle('Invalid QR Code');
          setErrorMessage(res.error.message || 'The scanned QR code is invalid or expired.');
        }
        return;
      }

      sessionStorage.setItem('moneycard_portal_session_token', res.data.sessionToken);
      sessionStorage.setItem('moneycard_portal_card_number', res.data.cardDisplayNumber);

      navigate('/portal/session', { replace: true });
    } catch {
      setErrorTitle('Connection Error');
      setErrorMessage('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    const runResolution = async () => {
      if (!activeToken) {
        setErrorTitle('Invalid Link');
        setErrorMessage('No QR code token provided in URL.');
        setIsLoading(false);
        return;
      }

      try {
        const res = await apiService.userPortal.resolvePublicCard(activeToken);
        if (isCancelled) return;

        if (!res.success) {
          if (res.error.code === 'CARD_BLOCKED') {
            setErrorTitle('Card Blocked');
            setErrorMessage(
              res.error.message || 'This physical card has been blocked. Please visit cafeteria desk.',
            );
          } else if (res.error.code === 'SESSION_NOT_FOUND') {
            setErrorTitle('No Active Session');
            setErrorMessage(
              res.error.message || 'No active session found. Please request cafeteria staff to issue a session.',
            );
          } else {
            setErrorTitle('Invalid QR Code');
            setErrorMessage(res.error.message || 'The scanned QR code is invalid or expired.');
          }
          return;
        }

        sessionStorage.setItem('moneycard_portal_session_token', res.data.sessionToken);
        sessionStorage.setItem('moneycard_portal_card_number', res.data.cardDisplayNumber);

        navigate('/portal/session', { replace: true });
      } catch {
        if (!isCancelled) {
          setErrorTitle('Connection Error');
          setErrorMessage('Unable to connect to server. Please try again.');
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    runResolution();
    return () => {
      isCancelled = true;
    };
  }, [activeToken, navigate]);

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingState message="Resolving Card QR credential & establishing portal session..." />
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      <Card className="border-rose-500/30 bg-slate-900/80">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-100">{errorTitle}</h2>
            <p className="text-sm text-slate-400 max-w-sm">{errorMessage}</p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={resolveQr} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
              Retry Scan
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/portal')} leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
              Return to Portal Home
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

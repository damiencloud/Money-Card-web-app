// ─── Safe QR Representation Component (M7) ─────────────────
// Displays QR code URL & visual card framing without exposing secrets or raw database UUIDs.

import { useState } from 'react';
import { QrCode, Copy, Check, ShieldCheck } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { notify } from '@/utils';

interface QrCodeViewProps {
  physicalCardNumber: string;
  qrToken: string;
}

export function QrCodeView({ physicalCardNumber, qrToken }: QrCodeViewProps) {
  const [copied, setCopied] = useState(false);

  // M0 Rule 15: Opaque HTTPS URL
  const qrUrl = `https://app.moneycard.com/c/${qrToken}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    notify.success('QR URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-violet-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Card QR Credential
          </h4>
        </div>
        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
          Opaque Token
        </Badge>
      </div>

      {/* Visual QR Card Representation */}
      <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl bg-slate-950 p-4 border border-slate-800/80">
        {/* Simulated QR Code Canvas Icon */}
        <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-xl bg-white p-2 shadow-inner">
          {/* Decorative QR Pattern */}
          <div className="relative flex h-full w-full flex-col justify-between p-1 bg-slate-900 rounded">
            <div className="flex justify-between">
              <div className="h-5 w-5 bg-violet-500 rounded-sm p-1">
                <div className="h-full w-full bg-white rounded-xs" />
              </div>
              <div className="h-5 w-5 bg-violet-500 rounded-sm p-1">
                <div className="h-full w-full bg-white rounded-xs" />
              </div>
            </div>
            <div className="flex items-center justify-center py-1">
              <QrCode className="h-8 w-8 text-violet-400 opacity-80" />
            </div>
            <div className="flex justify-between">
              <div className="h-5 w-5 bg-violet-500 rounded-sm p-1">
                <div className="h-full w-full bg-white rounded-xs" />
              </div>
              <div className="h-3 w-3 bg-violet-400 rounded-xs" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-xs text-slate-400">Card:</span>
            <span className="font-mono text-sm font-bold text-violet-300">
              {physicalCardNumber}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">Public QR URL</label>
            <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 border border-slate-800">
              <span className="flex-1 truncate font-mono text-xs text-slate-300">{qrUrl}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy QR URL"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-1 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Encodes opaque URL token — No balance or user secrets stored</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          leftIcon={copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        >
          {copied ? 'Copied' : 'Copy QR URL'}
        </Button>
      </div>
    </div>
  );
}

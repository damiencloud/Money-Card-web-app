import type { ReactNode } from 'react';
import { cn } from '@/utils';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

// ─── Error State ───────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
  icon,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16', className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
        {icon || <AlertTriangle className="h-8 w-8" />}
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold text-slate-300">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

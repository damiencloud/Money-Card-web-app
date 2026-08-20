import type { ReactNode } from 'react';
import { cn } from '@/utils';
import { Inbox } from 'lucide-react';

// ─── Empty State ───────────────────────────────────────────

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16', className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/60 text-slate-500">
        {icon || <Inbox className="h-8 w-8" />}
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold text-slate-300">{title}</h3>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

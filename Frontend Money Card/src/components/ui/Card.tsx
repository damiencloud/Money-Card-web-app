import type { ReactNode } from 'react';
import { cn } from '@/utils';

// ─── Card Component ────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, className, padding = 'md', hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-800/60 bg-slate-900/50 backdrop-blur-sm',
        paddingStyles[padding],
        hover && 'transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-black/20',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── Card Header ───────────────────────────────────────────

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between', className)}>
      <div>
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Card Content ──────────────────────────────────────────

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('mt-4', className)}>{children}</div>;
}

// ─── Stat Card ─────────────────────────────────────────────

export interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ label, title, value, description, icon, trend, className }: StatCardProps) {
  const headline = label || title || '';
  return (
    <Card className={cn('flex items-start gap-4 p-4 sm:p-5 transition-all hover:border-slate-700', className)}>
      {icon && (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-inner">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {headline && (
          <p className="text-xs sm:text-sm font-medium text-slate-400 leading-snug">
            {headline}
          </p>
        )}
        <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          {value}
        </p>
        {description && (
          <p className="mt-1 text-xs text-slate-400/90 leading-normal">
            {description}
          </p>
        )}
        {trend && (
          <p
            className={cn(
              'mt-1.5 text-xs font-semibold',
              trend.isPositive ? 'text-emerald-400' : 'text-rose-400',
            )}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </p>
        )}
      </div>
    </Card>
  );
}

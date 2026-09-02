import type { InputHTMLAttributes } from 'react';
import React, { forwardRef } from 'react';
import { cn } from '@/utils';

// ─── Input Component ───────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, rightElement, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-lg border bg-slate-900/50 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-200',
              'border-slate-700 focus:border-violet-500 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20',
              'hover:border-slate-600',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              rightElement && 'pr-10',
              className,
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

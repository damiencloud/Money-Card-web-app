import { clsx, type ClassValue } from 'clsx';

// ─── cn (className merger) ─────────────────────────────────
// Utility for conditionally joining classNames.
// Usage: cn('base', condition && 'conditional', 'always')

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

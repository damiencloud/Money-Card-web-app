import type { ReactNode } from 'react';
import { useEffect, useCallback } from 'react';
import { cn } from '@/utils';
import { X } from 'lucide-react';

// ==========================================
// Modal Component (Mobile-Responsive & Scroll-Safe)
// ==========================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlay?: boolean;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlay = true,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={cn(
          'relative z-10 w-full max-h-[92vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/60 transition-all duration-300',
          'animate-in fade-in zoom-in-95',
          sizeStyles[size],
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="shrink-0 flex items-start justify-between border-b border-slate-800 px-4 py-3 sm:px-6 sm:py-4">
            <div className="min-w-0 pr-3">
              {title && (
                <h2 id="modal-title" className="text-base sm:text-lg font-semibold text-slate-100 truncate">
                  {title}
                </h2>
              )}
              {description && <p className="mt-0.5 text-xs sm:text-sm text-slate-400">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">{children}</div>
      </div>
    </div>
  );
}

// ==========================================
// Modal Footer (Responsive Button Group)
// ==========================================

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'shrink-0 flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 sm:gap-3 border-t border-slate-800 px-4 py-3 sm:px-6 sm:py-4 mt-2',
        className,
      )}
    >
      {children}
    </div>
  );
}

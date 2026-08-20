// ─── Notification UI Foundation ────────────────────────────
// Reusable frontend toast/feedback utility.
// IMPORTANT: M0 explicitly puts push/backend notifications OUT OF SCOPE.
// This utility handles in-app toast feedback only.

import { toast as sonnerToast } from 'sonner';

export const notify = {
  success(message: string, description?: string) {
    sonnerToast.success(message, { description });
  },

  error(message: string, description?: string) {
    sonnerToast.error(message, { description });
  },

  warning(message: string, description?: string) {
    sonnerToast.warning(message, { description });
  },

  info(message: string, description?: string) {
    sonnerToast.info(message, { description });
  },

  dismiss(toastId?: string | number) {
    sonnerToast.dismiss(toastId);
  },
};

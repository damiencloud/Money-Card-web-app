import type { Card as CardEntity, CardStatus, CardAssignmentStatus } from '@/types';

export interface CardFilterOptions {
  searchQuery?: string;
  statusFilter?: CardStatus | 'ALL' | 'INACTIVE';
  assignmentFilter?: CardAssignmentStatus | 'ALL';
  branchFilter?: string;
}

/**
 * Pure filter function for Org Admin Cards registry.
 * Operates client-side on loaded organization cards with 0ms latency.
 */
export function filterCards(
  cards: CardEntity[],
  filters: CardFilterOptions
): CardEntity[] {
  const {
    searchQuery = '',
    statusFilter = 'ALL',
    assignmentFilter = 'ALL',
    branchFilter = 'ALL',
  } = filters;

  const query = searchQuery.trim().toLowerCase();
  const normalizedStatus = (statusFilter || 'ALL').toUpperCase();
  const normalizedAssignment = (assignmentFilter || 'ALL').toUpperCase();
  const targetBranch = branchFilter || 'ALL';

  return cards.filter((card) => {
    // 1. Text Search (Search by card number, QR token, customer name, phone, session card number)
    if (query.length > 0) {
      const cardNumber = (card.physicalCardNumber || '').toLowerCase();
      const qrToken = (card.qrToken || '').toLowerCase();
      const customerName = (card.activeSession?.customerName || '').toLowerCase();
      const customerPhone = (card.activeSession?.customerPhone || '').toLowerCase();
      const sessionCardNumber = (card.activeSession?.sessionCardNumber || '').toLowerCase();

      const matches =
        cardNumber.includes(query) ||
        qrToken.includes(query) ||
        customerName.includes(query) ||
        customerPhone.includes(query) ||
        sessionCardNumber.includes(query);

      if (!matches) return false;
    }

    // 2. Card Status Filter
    if (normalizedStatus !== 'ALL') {
      const cardStatus = (card.status || '').toUpperCase();

      if (normalizedStatus === 'INACTIVE') {
        // "INACTIVE" represents cards not in an active session (i.e. AVAILABLE or explicitly INACTIVE)
        if (cardStatus !== 'AVAILABLE' && cardStatus !== 'INACTIVE') {
          return false;
        }
      } else if (cardStatus !== normalizedStatus) {
        return false;
      }
    }

    // 3. Assignment Status Filter
    if (normalizedAssignment !== 'ALL') {
      const isAssigned =
        Boolean(card.physicalCardNumber && card.physicalCardNumber.trim()) &&
        card.assignmentStatus !== 'UNASSIGNED';

      const effectiveAssignment = isAssigned ? 'ASSIGNED' : 'UNASSIGNED';

      if (effectiveAssignment !== normalizedAssignment) {
        return false;
      }
    }

    // 4. Branch Filter
    if (targetBranch !== 'ALL') {
      const cardBranch =
        card.activeSession?.branchId ||
        (card as any).currentBranchId ||
        (card as any).branchId;

      if (cardBranch !== targetBranch) {
        return false;
      }
    }

    return true;
  });
}

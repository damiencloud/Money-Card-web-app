// ─── Card Block Reason & Business Logic Messages ───────────────
// Converts technical or raw card block strings into clear, accurate business messages.

export function buildCardBlockReason(
  category: string,
  notes?: string,
  blockerName?: string,
  blockerRole?: string,
): string {
  const roleMap: Record<string, string> = {
    ORG_ADMIN: 'Org Admin',
    SUPER_ADMIN: 'Super Admin',
    BRANCH_MANAGER: 'Branch Manager',
    CASHIER: 'Cashier',
    STAFF: 'Staff',
    MANAGER: 'Manager',
  };
  const roleLabel = blockerRole ? roleMap[blockerRole] || blockerRole : 'Administrator';

  const blocker = blockerName ? `${blockerName} (${roleLabel})` : 'Administrator';
  const cleanNotes = notes?.trim();

  switch (category) {
    case 'Administrative Block':
      return cleanNotes
        ? `Card administratively suspended by ${blocker}: ${cleanNotes}. All cafeteria purchases and recharges are disabled.`
        : `Card administratively suspended by ${blocker}. All cafeteria purchases and recharges are disabled.`;

    case 'Lost or Stolen Card':
      return cleanNotes
        ? `Card reported lost or stolen (recorded by ${blocker}): ${cleanNotes}. Usage immediately halted for balance protection.`
        : `Card reported lost or stolen (recorded by ${blocker}). Usage immediately halted for balance protection.`;

    case 'Suspicious Activity / Fraud':
      return cleanNotes
        ? `Card frozen for suspicious activity by ${blocker}: ${cleanNotes}. Pending security review.`
        : `Card frozen for suspicious activity by ${blocker}. Pending security review.`;

    case 'Damaged / Hardware Fault':
      return cleanNotes
        ? `Card taken out of service due to damage (${blocker}): ${cleanNotes}. Replacement required.`
        : `Card taken out of service due to hardware or QR surface damage (${blocker}). Replacement required.`;

    case 'Customer Request':
      return cleanNotes
        ? `Card temporarily suspended per customer request (${blocker}): ${cleanNotes}.`
        : `Card temporarily suspended per customer request (${blocker}).`;

    case 'Staff Discretion':
      return cleanNotes
        ? `Card blocked by staff discretion (${blocker}): ${cleanNotes}. Counter verification required.`
        : `Card blocked by staff discretion (${blocker}). Counter verification required.`;

    default:
      return cleanNotes
        ? `${category} (${blocker}): ${cleanNotes}`
        : `${category} by ${blocker}. All transactions are disabled.`;
  }
}

export function formatBlockedCardMessage(
  rawReason?: string | null,
  fallbackBlocker?: string | null,
): string {
  if (!rawReason || !rawReason.trim()) {
    return 'This card is blocked by an administrator. All cafeteria purchases and recharges are disabled.';
  }

  const trimmed = rawReason.trim();

  // Pattern 1: Legacy or bracketed format: [Blocked by Name (Role)] Category: Notes or [Blocked by Name (Role)] Category
  const bracketMatch = trimmed.match(/^\[Blocked by ([^\]]+)\]\s*([^:]+?)(?:\s*:\s*(.*))?$/i);
  if (bracketMatch) {
    const [, blocker, category, notes] = bracketMatch;
    const cat = category.trim();
    const cleanNotes = (notes || '').trim();

    if (cat === 'Administrative Block') {
      return cleanNotes
        ? `Card administratively suspended by ${blocker}: ${cleanNotes}. All cafeteria purchases and recharges are disabled.`
        : `Card administratively suspended by ${blocker}. All cafeteria purchases and recharges are disabled.`;
    }
    if (cat === 'Lost or Stolen Card') {
      return cleanNotes
        ? `Card reported lost or stolen (recorded by ${blocker}): ${cleanNotes}. Usage immediately halted for balance protection.`
        : `Card reported lost or stolen (recorded by ${blocker}). Usage immediately halted for balance protection.`;
    }
    if (cat === 'Suspicious Activity / Fraud') {
      return cleanNotes
        ? `Card frozen for suspicious activity by ${blocker}: ${cleanNotes}. Pending security review.`
        : `Card frozen for suspicious activity by ${blocker}. Pending security review.`;
    }
    if (cat === 'Damaged / Hardware Fault') {
      return cleanNotes
        ? `Card taken out of service due to damage (${blocker}): ${cleanNotes}. Replacement required.`
        : `Card taken out of service due to hardware or QR damage (${blocker}). Replacement required.`;
    }
    if (cat === 'Customer Request') {
      return cleanNotes
        ? `Card temporarily suspended per customer request (${blocker}): ${cleanNotes}.`
        : `Card temporarily suspended per customer request (${blocker}).`;
    }
    if (cat === 'Staff Discretion') {
      return cleanNotes
        ? `Card blocked by staff discretion (${blocker}): ${cleanNotes}. Counter verification required.`
        : `Card blocked by staff discretion (${blocker}). Counter verification required.`;
    }

    return cleanNotes
      ? `${cat} (${blocker}): ${cleanNotes}. All transactions are disabled.`
      : `${cat} by ${blocker}. All cafeteria purchases and recharges are disabled.`;
  }

  // Pattern 2: Standalone category string like "Administrative Block"
  if (trimmed === 'Administrative Block') {
    const byStr = fallbackBlocker ? ` by ${fallbackBlocker}` : ' by management';
    return `Card administratively suspended${byStr}. All cafeteria purchases and recharges are disabled.`;
  }
  if (trimmed === 'Lost or Stolen Card') {
    return 'Card reported lost or stolen. Usage immediately halted for balance protection.';
  }
  if (trimmed === 'Suspicious Activity / Fraud') {
    return 'Card frozen for suspicious activity. Pending security review.';
  }
  if (trimmed === 'Damaged / Hardware Fault') {
    return 'Card taken out of service due to hardware or QR surface damage. Replacement required.';
  }
  if (trimmed === 'Customer Request') {
    return 'Card temporarily suspended per customer request.';
  }

  // Already a descriptive sentence
  return trimmed;
}

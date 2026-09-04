// ─── Format Currency ───────────────────────────────────────
// Default to INR (₹) as per the project brief examples.

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Format Date ───────────────────────────────────────────

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

// ─── Format Card Number ────────────────────────────────────

export function formatCardNumber(cardNumber: string): string {
  return cardNumber.startsWith('MC-') ? cardNumber : `MC-${cardNumber}`;
}

// ─── Truncate Text ─────────────────────────────────────────

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

// ─── Transaction Items Formatter ───────────────────────────

export interface FormattedTransactionItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
}

export function extractTransactionItems(rawItems: any): FormattedTransactionItem[] {
  if (!rawItems) return [];
  let items = rawItems;
  if (typeof rawItems === 'string') {
    try {
      items = JSON.parse(rawItems);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(items)) {
    if (typeof items === 'object' && items !== null) {
      items = [items];
    } else {
      return [];
    }
  }

  return items
    .map((it: any) => {
      if (!it) return null;
      if (typeof it === 'string') {
        return { name: it.trim(), quantity: 1 };
      }
      const name =
        it.itemName ||
        it.name ||
        it.productName ||
        it.title ||
        (it.productId ? `Product (${String(it.productId).slice(0, 6)})` : 'Item');
      const quantity = Math.max(1, Number(it.quantity || it.qty || it.count || 1));
      const unitPrice =
        typeof it.unitPrice === 'number'
          ? it.unitPrice
          : typeof it.price === 'number'
          ? it.price
          : undefined;
      const total =
        typeof it.subtotal === 'number'
          ? it.subtotal
          : typeof it.totalAmount === 'number'
          ? it.totalAmount
          : typeof it.totalPrice === 'number'
          ? it.totalPrice
          : unitPrice !== undefined
          ? unitPrice * quantity
          : undefined;

      return {
        name,
        quantity,
        unitPrice,
        total,
      };
    })
    .filter(Boolean) as FormattedTransactionItem[];
}


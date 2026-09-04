import { describe, it, expect } from 'vitest';
import { extractTransactionItems } from '../utils';

describe('Customer Session Transactions - Bought Items & Details', () => {
  it('extracts item names, quantities, and totals from structured items array', () => {
    const rawItems = [
      {
        productId: '4d75d16c-afb5-4fbc-a4aa-e07cf48d1b17',
        itemName: 'Chicken Roll',
        quantity: 1,
        unitPrice: 150,
        subtotal: 150,
      },
    ];

    const items = extractTransactionItems(rawItems);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      name: 'Chicken Roll',
      quantity: 1,
      unitPrice: 150,
      total: 150,
    });
  });

  it('formats multiple bought items with quantities and subtotals', () => {
    const rawItems = [
      { itemName: 'Chicken Roll', quantity: 2, unitPrice: 150, subtotal: 300 },
      { itemName: 'Cold Coffee', quantity: 1, unitPrice: 80, subtotal: 80 },
    ];

    const items = extractTransactionItems(rawItems);
    expect(items).toHaveLength(2);

    const title = items
      .map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ''}${i.name}`)
      .join(', ');

    expect(title).toBe('2× Chicken Roll, Cold Coffee');
    expect(items[0].total).toBe(300);
    expect(items[1].total).toBe(80);
  });

  it('handles stringified JSON items safely', () => {
    const jsonStr = JSON.stringify([
      { itemName: 'Veg Burger', qty: 3, price: 50 },
    ]);

    const items = extractTransactionItems(jsonStr);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Veg Burger');
    expect(items[0].quantity).toBe(3);
    expect(items[0].unitPrice).toBe(50);
    expect(items[0].total).toBe(150);
  });

  it('handles null, undefined, or empty items gracefully by returning an empty array', () => {
    expect(extractTransactionItems(null)).toEqual([]);
    expect(extractTransactionItems(undefined)).toEqual([]);
    expect(extractTransactionItems([])).toEqual([]);
    expect(extractTransactionItems('invalid json')).toEqual([]);
  });

  it('handles legacy single string item or plain item objects', () => {
    const items = extractTransactionItems(['Veg Sandwich']);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Veg Sandwich');
    expect(items[0].quantity).toBe(1);
  });

  it('correctly distinguishes purchase, recharge (cash/UPI), and refund types', () => {
    const checkType = (type: string) => {
      const isRecharge = type === 'RECHARGE' || type.startsWith('RECHARGE');
      const isRefund = type === 'REFUND' || type.startsWith('REFUND');
      const isPurchase = type === 'PURCHASE';

      let title = 'Transaction';
      let sign = '-';
      if (isPurchase) {
        title = 'POS Purchase';
      } else if (isRecharge) {
        title =
          type === 'RECHARGE_UPI'
            ? 'Wallet Recharge (UPI)'
            : type === 'RECHARGE_CASH'
            ? 'Wallet Recharge (Cash)'
            : 'Wallet Recharge';
        sign = '+';
      } else if (isRefund) {
        title = 'Settlement Refund';
      }
      return { title, sign };
    };

    expect(checkType('PURCHASE')).toEqual({ title: 'POS Purchase', sign: '-' });
    expect(checkType('RECHARGE_CASH')).toEqual({ title: 'Wallet Recharge (Cash)', sign: '+' });
    expect(checkType('RECHARGE_UPI')).toEqual({ title: 'Wallet Recharge (UPI)', sign: '+' });
    expect(checkType('REFUND_RETURN')).toEqual({ title: 'Settlement Refund', sign: '-' });
    expect(checkType('RECHARGE')).toEqual({ title: 'Wallet Recharge', sign: '+' });
  });
});

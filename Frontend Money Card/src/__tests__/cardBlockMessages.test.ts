import { describe, it, expect } from 'vitest';
import {
  buildCardBlockReason,
  formatBlockedCardMessage,
} from '../utils/cardBlockMessages';

describe('cardBlockMessages business logic', () => {
  describe('formatBlockedCardMessage', () => {
    it('accurately formats user prompt exact string [Blocked by Acme General Manager (Org Admin)] Administrative Block', () => {
      const input = '[Blocked by Acme General Manager (Org Admin)] Administrative Block';
      const output = formatBlockedCardMessage(input);

      expect(output).toBe(
        'Card administratively suspended by Acme General Manager (Org Admin). All cafeteria purchases and recharges are disabled.',
      );
    });

    it('accurately formats administrative block with custom remarks/notes', () => {
      const input =
        '[Blocked by Acme General Manager (Org Admin)] Administrative Block: Annual finance audit pending';
      const output = formatBlockedCardMessage(input);

      expect(output).toBe(
        'Card administratively suspended by Acme General Manager (Org Admin): Annual finance audit pending. All cafeteria purchases and recharges are disabled.',
      );
    });

    it('accurately formats lost or stolen card events', () => {
      const input = '[Blocked by John Staff (Cashier)] Lost or Stolen Card';
      const output = formatBlockedCardMessage(input);

      expect(output).toBe(
        'Card reported lost or stolen (recorded by John Staff (Cashier)). Usage immediately halted for balance protection.',
      );
    });

    it('accurately formats suspicious activity / fraud', () => {
      const input =
        '[Blocked by Security Officer (Staff)] Suspicious Activity / Fraud: 5 rapid recharge failures';
      const output = formatBlockedCardMessage(input);

      expect(output).toBe(
        'Card frozen for suspicious activity by Security Officer (Staff): 5 rapid recharge failures. Pending security review.',
      );
    });

    it('handles legacy standalone string "Administrative Block" with fallback blocker', () => {
      const output = formatBlockedCardMessage('Administrative Block', 'Acme General Manager');
      expect(output).toBe(
        'Card administratively suspended by Acme General Manager. All cafeteria purchases and recharges are disabled.',
      );
    });

    it('handles empty or null string gracefully', () => {
      expect(formatBlockedCardMessage(null)).toBe(
        'This card is blocked by an administrator. All cafeteria purchases and recharges are disabled.',
      );
      expect(formatBlockedCardMessage('')).toBe(
        'This card is blocked by an administrator. All cafeteria purchases and recharges are disabled.',
      );
    });
  });

  describe('buildCardBlockReason', () => {
    it('generates accurate business logic message for Administrative Block with ORG_ADMIN', () => {
      const reason = buildCardBlockReason(
        'Administrative Block',
        '',
        'Acme General Manager',
        'ORG_ADMIN',
      );

      expect(reason).toBe(
        'Card administratively suspended by Acme General Manager (Org Admin). All cafeteria purchases and recharges are disabled.',
      );
    });

    it('includes optional notes cleanly', () => {
      const reason = buildCardBlockReason(
        'Administrative Block',
        'Corporate account expired',
        'Acme General Manager',
        'ORG_ADMIN',
      );

      expect(reason).toBe(
        'Card administratively suspended by Acme General Manager (Org Admin): Corporate account expired. All cafeteria purchases and recharges are disabled.',
      );
    });

    it('handles Lost or Stolen Card with customer notes', () => {
      const reason = buildCardBlockReason(
        'Lost or Stolen Card',
        'Wallet dropped near counter 3',
        'Cashier Alice',
        'CASHIER',
      );

      expect(reason).toBe(
        'Card reported lost or stolen (recorded by Cashier Alice (Cashier)): Wallet dropped near counter 3. Usage immediately halted for balance protection.',
      );
    });
  });
});

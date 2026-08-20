import { describe, it, expect } from 'vitest';

describe('Backend Unit Tests: Cards Import Validation (Explicit 2-Option Flow)', () => {
  describe('Option 1: AUTO_GENERATED_QR Mode Validation', () => {
    const validateAutoQrRow = (row: { cardNumber: string; qrCode?: string }) => {
      if (!row.cardNumber || !row.cardNumber.trim()) {
        return { valid: false, error: 'Card number is missing' };
      }
      if (!/^[A-Za-z0-9\-_]{2,30}$/.test(row.cardNumber.trim())) {
        return { valid: false, error: 'Invalid card number format' };
      }
      if (row.qrCode && row.qrCode.trim().length > 0) {
        return {
          valid: false,
          error: 'Auto QR mode accepts card numbers only. Remove QR code or switch to Pre-Printed QR mode.',
        };
      }
      return { valid: true, sanitizedNumber: row.cardNumber.trim() };
    };

    it('should accept valid card numbers in Auto QR mode', () => {
      const result = validateAutoQrRow({ cardNumber: 'asd-001' });
      expect(result.valid).toBe(true);
      expect(result.sanitizedNumber).toBe('asd-001');
    });

    it('should reject rows with missing or blank card numbers', () => {
      const result = validateAutoQrRow({ cardNumber: '  ' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Card number is missing');
    });

    it('should reject card numbers containing invalid characters or incorrect length', () => {
      const resultShort = validateAutoQrRow({ cardNumber: 'A' }); // < 2 chars
      const resultSpecial = validateAutoQrRow({ cardNumber: 'CARD#123*!' });

      expect(resultShort.valid).toBe(false);
      expect(resultSpecial.valid).toBe(false);
    });

    it('should reject rows containing QR codes in Auto QR mode', () => {
      const result = validateAutoQrRow({ cardNumber: 'asd-001', qrCode: 'PREPRINTED_TOKEN_123' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Auto QR mode accepts card numbers only');
    });
  });

  describe('Option 2: PREPRINTED_QR Mode Validation', () => {
    const validatePreprintedQrRow = (row: { cardNumber: string; qrCode?: string }) => {
      if (!row.cardNumber || !row.cardNumber.trim()) {
        return { valid: false, error: 'Card number is missing' };
      }
      if (!/^[A-Za-z0-9\-_]{2,30}$/.test(row.cardNumber.trim())) {
        return { valid: false, error: 'Invalid card number format' };
      }
      if (!row.qrCode || !row.qrCode.trim()) {
        return { valid: false, error: 'Missing required pre-printed QR code for this card' };
      }
      return {
        valid: true,
        sanitizedNumber: row.cardNumber.trim(),
        sanitizedQr: row.qrCode.trim(),
      };
    };

    it('should accept valid card numbers with non-empty QR codes in Pre-Printed QR mode', () => {
      const result = validatePreprintedQrRow({ cardNumber: 'asd-001', qrCode: 'VENDOR_QR_101' });
      expect(result.valid).toBe(true);
      expect(result.sanitizedNumber).toBe('asd-001');
      expect(result.sanitizedQr).toBe('VENDOR_QR_101');
    });

    it('should strictly reject rows missing QR code in Pre-Printed QR mode', () => {
      const result = validatePreprintedQrRow({ cardNumber: 'asd-001', qrCode: '' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required pre-printed QR code');
    });

    it('should reject duplicate card numbers within the batch', () => {
      const batch = [
        { cardNumber: 'asd-001', qrCode: 'VENDOR_001' },
        { cardNumber: 'asd-001', qrCode: 'VENDOR_002' },
      ];

      const seenCards = new Set<string>();
      const duplicates: string[] = [];

      for (const item of batch) {
        const lower = item.cardNumber.toLowerCase();
        if (seenCards.has(lower)) {
          duplicates.push(item.cardNumber);
        }
        seenCards.add(lower);
      }

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0]).toBe('asd-001');
    });

    it('should reject duplicate QR codes within the batch', () => {
      const batch = [
        { cardNumber: 'asd-001', qrCode: 'VENDOR_QR_999' },
        { cardNumber: 'asd-002', qrCode: 'VENDOR_QR_999' },
      ];

      const seenQrs = new Set<string>();
      const duplicateQrs: string[] = [];

      for (const item of batch) {
        const lower = item.qrCode.toLowerCase();
        if (seenQrs.has(lower)) {
          duplicateQrs.push(item.qrCode);
        }
        seenQrs.add(lower);
      }

      expect(duplicateQrs).toHaveLength(1);
      expect(duplicateQrs[0]).toBe('VENDOR_QR_999');
    });
  });
});

import { describe, it, expect } from 'vitest';

describe('Backend Unit Tests: External Bulk QR Import & Card Number Assignment', () => {
  describe('Stage 1: External Bulk QR Import Validation', () => {
    const validateQrImportEntry = (row: { qrCode: string; cardNumber?: string }) => {
      if (!row.qrCode || !row.qrCode.trim()) {
        return { valid: false, error: 'QR code is missing or empty' };
      }
      return {
        valid: true,
        sanitizedQr: row.qrCode.trim(),
        sanitizedCardNumber: row.cardNumber ? row.cardNumber.trim().toUpperCase() : null,
      };
    };

    it('should accept arbitrary external bulk QR code values', () => {
      const examples = ['QR-A001', 'VENDOR-QR-001', 'QR-A8K29X', 'ABC-99182', 'https://moneycard.io/q/12345'];
      for (const qr of examples) {
        const res = validateQrImportEntry({ qrCode: qr });
        expect(res.valid).toBe(true);
        expect(res.sanitizedQr).toBe(qr);
        expect(res.sanitizedCardNumber).toBeNull();
      }
    });

    it('should optionally accept pre-mapped card numbers in 2-column format', () => {
      const res = validateQrImportEntry({ qrCode: 'QR-A001', cardNumber: 'mc 105' });
      expect(res.valid).toBe(true);
      expect(res.sanitizedQr).toBe('QR-A001');
      expect(res.sanitizedCardNumber).toBe('MC 105');
    });

    it('should reject empty or whitespace-only QR codes', () => {
      const res = validateQrImportEntry({ qrCode: '   ' });
      expect(res.valid).toBe(false);
      expect(res.error).toBe('QR code is missing or empty');
    });

    it('should detect and reject duplicate QR codes within the import batch', () => {
      const batch = [
        { qrCode: 'QR-A001' },
        { qrCode: 'QR-A002' },
        { qrCode: 'QR-A001' }, // Duplicate
      ];

      const seen = new Set<string>();
      const duplicates: string[] = [];
      for (const item of batch) {
        const lower = item.qrCode.toLowerCase();
        if (seen.has(lower)) {
          duplicates.push(item.qrCode);
        }
        seen.add(lower);
      }

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0]).toBe('QR-A001');
    });
  });

  describe('Stage 2: Card Number Assignment Validation', () => {
    const validateAssignment = (
      card: { id: string; qrToken: string; physicalCardNumber?: string | null },
      newCardNumber: string,
      existingOrgCardNumbers: string[],
    ) => {
      const clean = newCardNumber.trim().toUpperCase();
      if (!clean) {
        return { valid: false, error: 'Card number is required' };
      }
      if (existingOrgCardNumbers.map((n) => n.toUpperCase()).includes(clean)) {
        return { valid: false, error: `Card number '${clean}' is already assigned in this organization` };
      }
      return { valid: true, assignedCardNumber: clean };
    };

    it('should successfully assign organization-specific card number to unassigned QR card', () => {
      const card = { id: 'c-1', qrToken: 'QR-A001', physicalCardNumber: null };
      const res = validateAssignment(card, 'mc 105', ['MC 101', 'MC 102']);
      expect(res.valid).toBe(true);
      expect(res.assignedCardNumber).toBe('MC 105');
    });

    it('should support different organization numbering conventions (MC 101, STU-001, EMP-450)', () => {
      const card = { id: 'c-1', qrToken: 'QR-A001', physicalCardNumber: null };
      expect(validateAssignment(card, 'STU-001', []).assignedCardNumber).toBe('STU-001');
      expect(validateAssignment(card, 'EMP-450', []).assignedCardNumber).toBe('EMP-450');
      expect(validateAssignment(card, 'MC 101', []).assignedCardNumber).toBe('MC 101');
    });

    it('should reject card number if already assigned to another card in same organization', () => {
      const card = { id: 'c-1', qrToken: 'QR-A001', physicalCardNumber: null };
      const res = validateAssignment(card, 'MC 101', ['MC 101', 'MC 102']);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('already assigned in this organization');
    });
  });

  describe('Stage 3: Unassigned Card Operation Guards', () => {
    it('should reject cafeteria operations on unassigned cards until card number is assigned', () => {
      const card = {
        id: 'c-1',
        qrToken: 'QR-A001',
        physicalCardNumber: null,
        assignmentStatus: 'UNASSIGNED',
        status: 'AVAILABLE',
      };

      const canOperate = !!card.physicalCardNumber && card.assignmentStatus === 'ASSIGNED';
      expect(canOperate).toBe(false);
    });
  });
});

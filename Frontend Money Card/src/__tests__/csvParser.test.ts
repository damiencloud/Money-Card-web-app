import { describe, it, expect } from 'vitest';

describe('Frontend Unit Tests: CSV Parser & Multi-Mode Card Import Validation', () => {
  const parseCsvLines = (csvText: string) => {
    return csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  };

  describe('Option 1: Auto-Generate QR Mode Parser', () => {
    const parseAutoQrCsv = (csvText: string) => {
      const lines = parseCsvLines(csvText);
      if (lines.length === 0) return { validCards: [], invalidCards: [] };

      let startIndex = 0;
      const firstLineLower = lines[0].toLowerCase();
      if (firstLineLower.includes('card') || firstLineLower.includes('number')) {
        startIndex = 1;
      }

      const validCards: string[] = [];
      const invalidCards: { rowNumber: number; cardNumber: string; reason: string }[] = [];
      const seenCards = new Set<string>();

      for (let i = startIndex; i < lines.length; i++) {
        const rowNum = i + 1;
        const parts = lines[i].split(',').map((s) => s.replace(/["']/g, '').trim());
        const cardNum = parts[0];
        const qrCode = parts[1] || '';

        if (!cardNum) {
          invalidCards.push({ rowNumber: rowNum, cardNumber: '(empty)', reason: 'Card number is missing' });
          continue;
        }

        if (!/^[A-Za-z0-9\-_]{2,30}$/.test(cardNum)) {
          invalidCards.push({ rowNumber: rowNum, cardNumber: cardNum, reason: 'Invalid format' });
          continue;
        }

        if (qrCode.length > 0) {
          invalidCards.push({
            rowNumber: rowNum,
            cardNumber: cardNum,
            reason: 'Auto QR mode accepts card numbers only. Remove QR code or switch to Pre-Printed QR mode.',
          });
          continue;
        }

        const lower = cardNum.toLowerCase();
        if (seenCards.has(lower)) {
          invalidCards.push({ rowNumber: rowNum, cardNumber: cardNum, reason: 'Duplicate card number within CSV' });
          continue;
        }

        seenCards.add(lower);
        validCards.push(cardNum);
      }

      return { validCards, invalidCards };
    };

    it('should parse valid card numbers without QR tokens', () => {
      const csv = `cardNumber\nasd-001\nasd-002\nasd-003`;
      const result = parseAutoQrCsv(csv);

      expect(result.validCards).toEqual(['asd-001', 'asd-002', 'asd-003']);
      expect(result.invalidCards).toHaveLength(0);
    });

    it('should reject cards with pre-printed QR tokens in Auto QR mode', () => {
      const csv = `cardNumber,qrCode\nasd-001,\nasd-002,VENDOR_QR_TOKEN_102`;
      const result = parseAutoQrCsv(csv);

      expect(result.validCards).toEqual(['asd-001']);
      expect(result.invalidCards).toHaveLength(1);
      expect(result.invalidCards[0].cardNumber).toBe('asd-002');
      expect(result.invalidCards[0].reason).toContain('Auto QR mode accepts card numbers only');
    });

    it('should flag duplicate card numbers within the CSV', () => {
      const csv = `cardNumber\nasd-001\nasd-002\nasd-001`;
      const result = parseAutoQrCsv(csv);

      expect(result.validCards).toEqual(['asd-001', 'asd-002']);
      expect(result.invalidCards).toHaveLength(1);
      expect(result.invalidCards[0].reason).toContain('Duplicate card number');
    });
  });

  describe('Option 2: Pre-Printed Vendor QR Mode Parser', () => {
    const parsePreprintedQrCsv = (csvText: string) => {
      const lines = parseCsvLines(csvText);
      if (lines.length === 0) return { validEntries: [], invalidCards: [] };

      let startIndex = 0;
      const firstLineLower = lines[0].toLowerCase();
      if (firstLineLower.includes('card') || firstLineLower.includes('qr')) {
        startIndex = 1;
      }

      const validEntries: { cardNumber: string; qrToken: string }[] = [];
      const invalidCards: { rowNumber: number; cardNumber: string; reason: string }[] = [];
      const seenCards = new Set<string>();
      const seenQrs = new Set<string>();

      for (let i = startIndex; i < lines.length; i++) {
        const rowNum = i + 1;
        const parts = lines[i].split(',').map((s) => s.replace(/["']/g, '').trim());
        const cardNum = parts[0];
        const qrCode = parts[1] || '';

        if (!cardNum) {
          invalidCards.push({ rowNumber: rowNum, cardNumber: '(empty)', reason: 'Card number is missing' });
          continue;
        }

        if (!qrCode) {
          invalidCards.push({ rowNumber: rowNum, cardNumber: cardNum, reason: 'Missing required pre-printed QR code' });
          continue;
        }

        const lowerCard = cardNum.toLowerCase();
        const lowerQr = qrCode.toLowerCase();

        if (seenCards.has(lowerCard)) {
          invalidCards.push({ rowNumber: rowNum, cardNumber: cardNum, reason: 'Duplicate card number' });
          continue;
        }

        if (seenQrs.has(lowerQr)) {
          invalidCards.push({ rowNumber: rowNum, cardNumber: cardNum, reason: `Duplicate QR code '${qrCode}'` });
          continue;
        }

        seenCards.add(lowerCard);
        seenQrs.add(lowerQr);
        validEntries.push({ cardNumber: cardNum, qrToken: qrCode });
      }

      return { validEntries, invalidCards };
    };

    it('should parse valid card number and QR token pairs', () => {
      const csv = `cardNumber,qrCode\nasd-001,VENDOR_QR_001\nasd-002,VENDOR_QR_002`;
      const result = parsePreprintedQrCsv(csv);

      expect(result.validEntries).toEqual([
        { cardNumber: 'asd-001', qrToken: 'VENDOR_QR_001' },
        { cardNumber: 'asd-002', qrToken: 'VENDOR_QR_002' },
      ]);
      expect(result.invalidCards).toHaveLength(0);
    });

    it('should flag rows with missing QR tokens in Pre-Printed QR mode', () => {
      const csv = `cardNumber,qrCode\nasd-001,VENDOR_QR_001\nasd-002,`;
      const result = parsePreprintedQrCsv(csv);

      expect(result.validEntries).toHaveLength(1);
      expect(result.invalidCards).toHaveLength(1);
      expect(result.invalidCards[0].cardNumber).toBe('asd-002');
      expect(result.invalidCards[0].reason).toContain('Missing required pre-printed QR code');
    });

    it('should flag rows with duplicate QR tokens in the CSV', () => {
      const csv = `cardNumber,qrCode\nasd-001,VENDOR_QR_SAME\nasd-002,VENDOR_QR_SAME`;
      const result = parsePreprintedQrCsv(csv);

      expect(result.validEntries).toHaveLength(1);
      expect(result.invalidCards).toHaveLength(1);
      expect(result.invalidCards[0].reason).toContain("Duplicate QR code 'VENDOR_QR_SAME'");
    });
  });
});

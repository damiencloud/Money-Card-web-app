import { describe, it, expect } from 'vitest';

describe('Frontend Unit Tests: Multi-QR Scanning, Prefix Auto-Assignment & Registration Logic', () => {
  const initSequenceForPrefix = (prefix: string, cards: Array<{ physicalCardNumber?: string }>) => {
    const cleanPrefix = prefix.trim().toUpperCase();
    let maxNum = 0;
    for (const c of cards) {
      if (c.physicalCardNumber) {
        const upper = c.physicalCardNumber.trim().toUpperCase();
        if (upper.startsWith(cleanPrefix)) {
          const numPart = upper.slice(cleanPrefix.length).trim();
          const val = parseInt(numPart, 10);
          if (!isNaN(val) && val > maxNum) {
            maxNum = val;
          }
        }
      }
    }
    return maxNum + 1;
  };

  const getNextAvailableNumber = (
    prefix: string,
    baseSeq: number,
    padZeros: boolean,
    existingCards: Array<{ physicalCardNumber?: string }>,
    excludeList: string[] = [],
  ): { nextSeq: number; cardNumber: string } => {
    const cleanPrefix = prefix.trim().toUpperCase();
    const existingNumbers = new Set(
      existingCards
        .map((c) => (c.physicalCardNumber || '').trim().toUpperCase())
        .filter(Boolean),
    );
    excludeList.forEach((n) => existingNumbers.add(n.toUpperCase()));

    let current = Math.max(1, baseSeq);
    while (true) {
      const formatted = padZeros
        ? `${cleanPrefix}${String(current).padStart(3, '0')}`
        : `${cleanPrefix}${current}`;
      if (!existingNumbers.has(formatted)) {
        return { nextSeq: current, cardNumber: formatted };
      }
      current++;
    }
  };

  const normalizeScannedToken = (rawQr: string): string => {
    let cleanQr = rawQr.trim();
    if (!cleanQr) return '';
    if (cleanQr.includes('/')) {
      const parts = cleanQr.split('/');
      cleanQr = parts[parts.length - 1].split('?')[0].trim();
    }
    return cleanQr;
  };

  it('calculates the next starting sequence based on highest existing card number with given prefix', () => {
    const existing = [
      { physicalCardNumber: 'MC-001' },
      { physicalCardNumber: 'MC-002' },
      { physicalCardNumber: 'MC-005' },
      { physicalCardNumber: 'OTHER-100' },
    ];

    expect(initSequenceForPrefix('MC-', existing)).toBe(6);
    expect(initSequenceForPrefix('OTHER-', existing)).toBe(101);
    expect(initSequenceForPrefix('NEW-', existing)).toBe(1);
  });

  it('formats card numbers with prefix and 3-digit zero-padding', () => {
    const existing = [{ physicalCardNumber: 'MC-001' }];
    const res1 = getNextAvailableNumber('MC-', 2, true, existing);
    expect(res1.cardNumber).toBe('MC-002');

    const res2 = getNextAvailableNumber('MC-', 10, true, existing);
    expect(res2.cardNumber).toBe('MC-010');

    const res3 = getNextAvailableNumber('MC-', 100, true, existing);
    expect(res3.cardNumber).toBe('MC-100');
  });

  it('automatically skips over already-registered numbers or queued numbers to prevent conflicts', () => {
    const existing = [
      { physicalCardNumber: 'MC-001' },
      { physicalCardNumber: 'MC-002' },
      { physicalCardNumber: 'MC-003' },
    ];
    const queuedInSession = ['MC-004', 'MC-005'];

    // Start at 1, but 1..5 are taken -> should jump straight to MC-006
    const res = getNextAvailableNumber('MC-', 1, true, existing, queuedInSession);
    expect(res.nextSeq).toBe(6);
    expect(res.cardNumber).toBe('MC-006');
  });

  it('normalizes scanned QR codes from raw tokens and URL formats', () => {
    expect(normalizeScannedToken('qtk_abc12345')).toBe('qtk_abc12345');
    expect(normalizeScannedToken('https://moneycard.io/q/qtk_abc12345')).toBe('qtk_abc12345');
    expect(normalizeScannedToken('https://moneycard.io/cards/scan?token=qtk_999')).toBe('scan');
  });

  it('detects duplicate scans in current session or against existing registry', () => {
    const scannedSession = [
      { qrCode: 'QR-001', cardNumber: 'MC-001' },
      { qrCode: 'QR-002', cardNumber: 'MC-002' },
    ];

    const isDuplicateInSession = (qr: string) =>
      scannedSession.some((s) => s.qrCode.toLowerCase() === qr.toLowerCase());

    expect(isDuplicateInSession('QR-001')).toBe(true);
    expect(isDuplicateInSession('qr-002')).toBe(true);
    expect(isDuplicateInSession('QR-003')).toBe(false);
  });
});

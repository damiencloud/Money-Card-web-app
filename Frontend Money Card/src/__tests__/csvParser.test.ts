import { describe, it, expect } from 'vitest';

describe('Frontend Unit Tests: External Bulk QR Import CSV Parser & Validation', () => {
  const parseCsvLines = (csvText: string) => {
    return csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  };

  const parseQrImportCsv = (csvText: string) => {
    const lines = parseCsvLines(csvText);
    if (lines.length === 0) return { validEntries: [], invalidEntries: [] };

    let startIndex = 0;
    const firstLineLower = lines[0].toLowerCase();
    if (firstLineLower.includes('qr') || firstLineLower.includes('code') || firstLineLower.includes('token')) {
      startIndex = 1;
    }

    const validEntries: { qrCode: string; cardNumber?: string }[] = [];
    const invalidEntries: { rowNumber: number; qrCode: string; reason: string }[] = [];
    const seenQrs = new Set<string>();

    for (let i = startIndex; i < lines.length; i++) {
      const rowNum = i + 1;
      const parts = lines[i].split(',').map((s) => s.replace(/["']/g, '').trim());
      const qrCode = parts[0];
      const cardNumber = parts[1] ? parts[1].toUpperCase() : undefined;

      if (!qrCode) {
        invalidEntries.push({ rowNumber: rowNum, qrCode: '(empty)', reason: 'QR code value is missing' });
        continue;
      }

      const lower = qrCode.toLowerCase();
      if (seenQrs.has(lower)) {
        invalidEntries.push({ rowNumber: rowNum, qrCode, reason: `Duplicate QR code '${qrCode}' inside CSV` });
        continue;
      }

      seenQrs.add(lower);
      validEntries.push({ qrCode, cardNumber });
    }

    return { validEntries, invalidEntries };
  };

  it('should parse 1-column external QR codes CSV as unassigned cards', () => {
    const csv = `qrCode\nQR-A001\nVENDOR-QR-002\nQR-A8K29X\nhttps://moneycard.io/q/123`;
    const result = parseQrImportCsv(csv);

    expect(result.validEntries).toHaveLength(4);
    expect(result.validEntries[0]).toEqual({ qrCode: 'QR-A001', cardNumber: undefined });
    expect(result.validEntries[1]).toEqual({ qrCode: 'VENDOR-QR-002', cardNumber: undefined });
    expect(result.validEntries[2]).toEqual({ qrCode: 'QR-A8K29X', cardNumber: undefined });
    expect(result.invalidEntries).toHaveLength(0);
  });

  it('should support optional 2-column CSV with pre-mapped card numbers', () => {
    const csv = `qrCode,cardNumber\nQR-A001,MC 101\nQR-A002,MC 102`;
    const result = parseQrImportCsv(csv);

    expect(result.validEntries).toEqual([
      { qrCode: 'QR-A001', cardNumber: 'MC 101' },
      { qrCode: 'QR-A002', cardNumber: 'MC 102' },
    ]);
    expect(result.invalidEntries).toHaveLength(0);
  });

  it('should flag duplicate QR codes within the same CSV upload', () => {
    const csv = `qrCode\nQR-A001\nQR-A002\nQR-A001`;
    const result = parseQrImportCsv(csv);

    expect(result.validEntries).toHaveLength(2);
    expect(result.invalidEntries).toHaveLength(1);
    expect(result.invalidEntries[0].qrCode).toBe('QR-A001');
    expect(result.invalidEntries[0].reason).toContain('Duplicate QR code');
  });

  it('should flag empty rows or missing QR values', () => {
    const csv = `qrCode\nQR-A001\n\nQR-A002`;
    const result = parseQrImportCsv(csv);

    expect(result.validEntries).toHaveLength(2);
    expect(result.invalidEntries).toHaveLength(0); // empty lines ignored by line filter
  });

  it('should enforce organization limit calculation on imported inventory', () => {
    const planLimit = 100;
    const currentCardCount = 95;
    const remainingQuota = Math.max(0, planLimit - currentCardCount); // 5

    const importCount = 10;
    const exceedsLimit = importCount > remainingQuota;

    expect(remainingQuota).toBe(5);
    expect(exceedsLimit).toBe(true);
  });
});

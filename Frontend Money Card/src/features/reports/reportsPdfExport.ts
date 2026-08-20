// ─── Formal Reports PDF Export Utility (M9) ──────────────────
// Generates standard PDF-1.4 documents for formal reports:
// 1. FINANCIAL: Daily Financial Settlement Summary
// 2. INVENTORY: Inventory Movement & Wastage Report
// 3. AUDIT: Card Session Lifetime Audit Report
// 4. PERFORMANCE: Branch Operational Audit Report
// Strictly respects Organization and Branch Scopes.

import type { ReportItem, Branch, Transaction, ProductWithInventory, CardSession } from '@/types';
import { formatCurrency } from '@/utils';

interface GenerateReportPdfOptions {
  report: ReportItem;
  branches: Branch[];
  selectedBranchName: string;
  transactions?: Transaction[];
  inventory?: ProductWithInventory[];
  sessions?: CardSession[];
  organizationName?: string;
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function generateReportPdfBlob({
  report,
  selectedBranchName,
  transactions = [],
  inventory = [],
  sessions = [],
  organizationName = 'Organization Portal',
}: GenerateReportPdfOptions): Blob {
  const objects: string[] = [];

  const addObject = (content: string): number => {
    objects.push(content);
    return objects.length;
  };

  const streamLines: string[] = [];

  // Header Title
  streamLines.push('BT');
  streamLines.push('/F2 16 Tf');
  streamLines.push('0.12 0.12 0.28 rg');
  streamLines.push('50 790 Td');
  streamLines.push(`(${escapePdfText(organizationName.toUpperCase())} - OFFICIAL REPORT) Tj`);
  streamLines.push('ET');

  // Report Title
  streamLines.push('BT');
  streamLines.push('/F2 13 Tf');
  streamLines.push('0.2 0.2 0.45 rg');
  streamLines.push('50 770 Td');
  streamLines.push(`(${escapePdfText(report.title.toUpperCase())}) Tj`);
  streamLines.push('ET');

  // Metadata Subtitle
  streamLines.push('BT');
  streamLines.push('/F1 9 Tf');
  streamLines.push('0.45 0.45 0.55 rg');
  streamLines.push('50 754 Td');
  streamLines.push(`(Category: ${escapePdfText(report.type)}  |  Report ID: ${escapePdfText(report.id)}  |  Generated: ${new Date().toLocaleString()}) Tj`);
  streamLines.push('ET');

  // Divider line
  streamLines.push('0.8 0.8 0.85 RG');
  streamLines.push('1 w');
  streamLines.push('50 744 m 545 744 l S');

  // Scope Info Box
  streamLines.push('0.95 0.95 0.98 rg');
  streamLines.push('50 710 495 24 re f');
  streamLines.push('0.85 0.85 0.9 RG');
  streamLines.push('50 710 495 24 re S');

  streamLines.push('BT');
  streamLines.push('/F2 9 Tf');
  streamLines.push('0.2 0.2 0.4 rg');
  streamLines.push('60 718 Td');
  streamLines.push(`(Branch Scope: ${escapePdfText(selectedBranchName)}) Tj`);
  streamLines.push('180 0 Td');
  streamLines.push(`(Format: PDF Formal Document) Tj`);
  streamLines.push('160 0 Td');
  streamLines.push(`(Auth: VIEW_REPORTS) Tj`);
  streamLines.push('ET');

  let curY = 680;

  // ── REPORT SPECIFIC CONTENT ─────────────────────────────────

  if (report.type === 'FINANCIAL') {
    // Financial Summary
    let totalPurchases = 0;
    let totalRecharges = 0;
    let totalRefunds = 0;

    for (const t of transactions) {
      if (t.type === 'PURCHASE') totalPurchases += t.amount;
      if (t.type === 'RECHARGE') totalRecharges += t.amount;
      if (t.type === 'REFUND') totalRefunds += t.amount;
    }

    streamLines.push('BT');
    streamLines.push('/F2 11 Tf');
    streamLines.push('0.15 0.15 0.35 rg');
    streamLines.push(`50 ${curY} Td`);
    streamLines.push('(1. Financial Settlement Summary) Tj');
    streamLines.push('ET');
    curY -= 35;

    // KPI Cards
    const kpis = [
      { label: 'POS Revenue', val: formatCurrency(totalPurchases) },
      { label: 'Recharges', val: formatCurrency(totalRecharges) },
      { label: 'Refunds Total', val: formatCurrency(totalRefunds) },
      { label: 'Ledger Records', val: `${transactions.length} txns` },
    ];

    kpis.forEach((kpi, idx) => {
      const x = 50 + idx * 128;
      streamLines.push('0.96 0.96 0.99 rg');
      streamLines.push(`${x} ${curY} 118 36 re f`);
      streamLines.push('0.85 0.85 0.92 RG');
      streamLines.push(`${x} ${curY} 118 36 re S`);

      streamLines.push('BT');
      streamLines.push('/F1 8 Tf');
      streamLines.push('0.45 0.45 0.55 rg');
      streamLines.push(`${x + 8} ${curY + 22} Td`);
      streamLines.push(`(${escapePdfText(kpi.label)}) Tj`);
      streamLines.push('ET');

      streamLines.push('BT');
      streamLines.push('/F2 10 Tf');
      streamLines.push('0.1 0.1 0.3 rg');
      streamLines.push(`${x + 8} ${curY + 8} Td`);
      streamLines.push(`(${escapePdfText(kpi.val)}) Tj`);
      streamLines.push('ET');
    });

    curY -= 35;

    // Table Header
    streamLines.push('BT');
    streamLines.push('/F2 11 Tf');
    streamLines.push('0.15 0.15 0.35 rg');
    streamLines.push(`50 ${curY} Td`);
    streamLines.push('(2. Recent Transaction Ledger Records) Tj');
    streamLines.push('ET');
    curY -= 20;

    streamLines.push('0.92 0.92 0.96 rg');
    streamLines.push(`50 ${curY} 495 18 re f`);
    streamLines.push('0.8 0.8 0.88 RG');
    streamLines.push(`50 ${curY} 495 18 re S`);

    streamLines.push('BT');
    streamLines.push('/F2 8 Tf');
    streamLines.push('0.2 0.2 0.35 rg');
    streamLines.push(`58 ${curY + 5} Td`);
    streamLines.push('(Txn ID) Tj');
    streamLines.push('100 0 Td');
    streamLines.push('(Type) Tj');
    streamLines.push('80 0 Td');
    streamLines.push('(Amount (INR)) Tj');
    streamLines.push('90 0 Td');
    streamLines.push('(Status) Tj');
    streamLines.push('90 0 Td');
    streamLines.push('(Timestamp) Tj');
    streamLines.push('ET');
    curY -= 18;

    // Rows
    const rows = transactions.slice(0, 14);
    rows.forEach((t, rIdx) => {
      if (curY < 90) return;
      if (rIdx % 2 === 1) {
        streamLines.push('0.98 0.98 0.99 rg');
        streamLines.push(`50 ${curY} 495 18 re f`);
      }
      streamLines.push('0.9 0.9 0.93 RG');
      streamLines.push(`50 ${curY} 495 18 re S`);

      streamLines.push('BT');
      streamLines.push('/F1 8 Tf');
      streamLines.push('0.2 0.2 0.25 rg');
      streamLines.push(`58 ${curY + 5} Td`);
      streamLines.push(`(${escapePdfText(t.id)}) Tj`);
      streamLines.push('100 0 Td');
      streamLines.push(`(${escapePdfText(t.type)}) Tj`);
      streamLines.push('80 0 Td');
      streamLines.push(`(${escapePdfText(formatCurrency(t.amount))}) Tj`);
      streamLines.push('90 0 Td');
      streamLines.push(`(${escapePdfText(t.status)}) Tj`);
      streamLines.push('90 0 Td');
      streamLines.push(`(${escapePdfText(new Date(t.createdAt).toLocaleDateString())}) Tj`);
      streamLines.push('ET');
      curY -= 18;
    });
  } else if (report.type === 'INVENTORY') {
    // Inventory Report
    streamLines.push('BT');
    streamLines.push('/F2 11 Tf');
    streamLines.push('0.15 0.15 0.35 rg');
    streamLines.push(`50 ${curY} Td`);
    streamLines.push('(1. Product Catalog & Stock Health Breakdown) Tj');
    streamLines.push('ET');
    curY -= 25;

    streamLines.push('0.92 0.92 0.96 rg');
    streamLines.push(`50 ${curY} 495 18 re f`);
    streamLines.push('0.8 0.8 0.88 RG');
    streamLines.push(`50 ${curY} 495 18 re S`);

    streamLines.push('BT');
    streamLines.push('/F2 8 Tf');
    streamLines.push('0.2 0.2 0.35 rg');
    streamLines.push(`58 ${curY + 5} Td`);
    streamLines.push('(Item Name) Tj');
    streamLines.push('140 0 Td');
    streamLines.push('(Category) Tj');
    streamLines.push('100 0 Td');
    streamLines.push('(Price (INR)) Tj');
    streamLines.push('90 0 Td');
    streamLines.push('(Stock Quantity) Tj');
    streamLines.push('80 0 Td');
    streamLines.push('(Status) Tj');
    streamLines.push('ET');
    curY -= 18;

    const rows = inventory.slice(0, 16);
    rows.forEach((item, rIdx) => {
      if (curY < 90) return;
      if (rIdx % 2 === 1) {
        streamLines.push('0.98 0.98 0.99 rg');
        streamLines.push(`50 ${curY} 495 18 re f`);
      }
      streamLines.push('0.9 0.9 0.93 RG');
      streamLines.push(`50 ${curY} 495 18 re S`);

      streamLines.push('BT');
      streamLines.push('/F1 8 Tf');
      streamLines.push('0.2 0.2 0.25 rg');
      streamLines.push(`58 ${curY + 5} Td`);
      streamLines.push(`(${escapePdfText(item.itemName.substring(0, 22))}) Tj`);
      const catText = (Array.isArray(item.category) ? item.category.join(', ') : item.category || 'General').substring(0, 16);
      streamLines.push('140 0 Td');
      streamLines.push(`(${escapePdfText(catText)}) Tj`);
      streamLines.push('100 0 Td');
      streamLines.push(`(${escapePdfText(formatCurrency(item.price))}) Tj`);
      streamLines.push('90 0 Td');
      streamLines.push(`(${item.quantity} units) Tj`);
      streamLines.push('80 0 Td');
      streamLines.push(`(${escapePdfText(item.status)}) Tj`);
      streamLines.push('ET');
      curY -= 18;
    });
  } else {
    // Card Session / General Audit Report
    streamLines.push('BT');
    streamLines.push('/F2 11 Tf');
    streamLines.push('0.15 0.15 0.35 rg');
    streamLines.push(`50 ${curY} Td`);
    streamLines.push('(1. Card Session Lifetime & Balance Audit) Tj');
    streamLines.push('ET');
    curY -= 25;

    streamLines.push('0.92 0.92 0.96 rg');
    streamLines.push(`50 ${curY} 495 18 re f`);
    streamLines.push('0.8 0.8 0.88 RG');
    streamLines.push(`50 ${curY} 495 18 re S`);

    streamLines.push('BT');
    streamLines.push('/F2 8 Tf');
    streamLines.push('0.2 0.2 0.35 rg');
    streamLines.push(`58 ${curY + 5} Td`);
    streamLines.push('(Session ID) Tj');
    streamLines.push('110 0 Td');
    streamLines.push('(Card ID) Tj');
    streamLines.push('90 0 Td');
    streamLines.push('(Current Bal (INR)) Tj');
    streamLines.push('100 0 Td');
    streamLines.push('(Session Status) Tj');
    streamLines.push('90 0 Td');
    streamLines.push('(Created Date) Tj');
    streamLines.push('ET');
    curY -= 18;

    const rows = sessions.slice(0, 16);
    rows.forEach((s, rIdx) => {
      if (curY < 90) return;
      if (rIdx % 2 === 1) {
        streamLines.push('0.98 0.98 0.99 rg');
        streamLines.push(`50 ${curY} 495 18 re f`);
      }
      streamLines.push('0.9 0.9 0.93 RG');
      streamLines.push(`50 ${curY} 495 18 re S`);

      streamLines.push('BT');
      streamLines.push('/F1 8 Tf');
      streamLines.push('0.2 0.2 0.25 rg');
      streamLines.push(`58 ${curY + 5} Td`);
      streamLines.push(`(${escapePdfText(s.id)}) Tj`);
      streamLines.push('110 0 Td');
      streamLines.push(`(${escapePdfText(s.cardId)}) Tj`);
      streamLines.push('90 0 Td');
      streamLines.push(`(${escapePdfText(formatCurrency(s.balance))}) Tj`);
      streamLines.push('100 0 Td');
      streamLines.push(`(${escapePdfText(s.status)}) Tj`);
      streamLines.push('90 0 Td');
      streamLines.push(`(${escapePdfText(new Date(s.createdAt).toLocaleDateString())}) Tj`);
      streamLines.push('ET');
      curY -= 18;
    });
  }

  // Footer Audit Note
  streamLines.push('0.85 0.85 0.9 RG');
  streamLines.push('50 60 m 545 60 l S');

  streamLines.push('BT');
  streamLines.push('/F1 8 Tf');
  streamLines.push('0.5 0.5 0.6 rg');
  streamLines.push('50 45 Td');
  streamLines.push(`(Damien Money Card System - Official PDF Report - ${escapePdfText(report.title)}) Tj`);
  streamLines.push('280 0 Td');
  streamLines.push('(Confidential - Verified M0 Audit Record) Tj');
  streamLines.push('ET');

  const contentStream = streamLines.join('\n');
  const streamLength = contentStream.length;

  // Build PDF Objects
  addObject('<< /Type /Catalog /Pages 2 0 R >>');
  addObject('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`);
  addObject(`<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream`);
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  let pdf = '%PDF-1.4\n';
  const xrefOffsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    xrefOffsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i <= objects.length; i++) {
    const offset = String(xrefOffsets[i]).padStart(10, '0');
    pdf += `${offset} 00000 n \n`;
  }

  pdf += 'trailer\n';
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefStart}\n`;
  pdf += '%%EOF';

  return new Blob([pdf], { type: 'application/pdf' });
}

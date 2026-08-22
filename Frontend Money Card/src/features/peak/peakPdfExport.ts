// ─── Peak & Food Demand Analytics PDF Export Utility ──────────────────
// Generates publication-quality standard PDF documents without any raw UUIDs.

import { jsPDF } from 'jspdf';
import type { PeakAnalyticsOverview } from '@/types';
import { formatCurrency } from '@/utils';

export interface GeneratePeakPdfOptions {
  data: PeakAnalyticsOverview;
  selectedBranchName: string;
  dateRangeLabel: string;
  organizationName?: string;
}

export function buildPeakDemandJsPdf({
  data,
  selectedBranchName,
  dateRangeLabel,
  organizationName = 'Money Card Cafeteria',
}: GeneratePeakPdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(margin, 12, contentWidth, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(`${organizationName.toUpperCase()} - PEAK & FOOD DEMAND REPORT`, margin + 6, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const docId = `DOC-#${Date.now().toString().slice(-8)}`;
  doc.text(`Scope: Organization Admin  |  Document ID: ${docId}  |  Generated: ${new Date().toLocaleString()}`, margin + 6, 30);

  // 2. Filter Bar
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, 38, contentWidth, 10, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Location Scope: ${selectedBranchName}`, margin + 4, 44);
  doc.text(`Date Range: ${dateRangeLabel}`, margin + 80, 44);
  doc.text(`Busiest Day: ${data.busiestDay || 'Friday'}`, margin + 140, 44);

  // 3. Section 1: Executive Demand KPIs
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Operational Rush & Peak Hour Metrics', margin, 54);

  const kpis = [
    { label: 'Busiest Peak Hour', val: data.comparison.busiestHour || '13:00' },
    { label: 'Peak Hours Volume', val: formatCurrency(data.comparison.peakVolume) },
    { label: 'Peak Transactions', val: data.comparison.peakTransactions.toLocaleString() },
    { label: 'Busiest Branch', val: data.comparison.busiestBranchName || selectedBranchName },
  ];

  const cardW = (contentWidth - 9) / 4;
  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, 58, cardW, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, 64);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val.substring(0, 18), x + 3, 71);
  });

  // 4. Section 2: 24-Hour Traffic & Throughput Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. 24-Hour Traffic & Volume Distribution', margin, 84);

  const tableY = 88;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, tableY, contentWidth, 7, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Hour Window', margin + 4, tableY + 5);
  doc.text('Transactions', margin + 45, tableY + 5);
  doc.text('Purchases', margin + 80, tableY + 5);
  doc.text('Recharges', margin + 115, tableY + 5);
  doc.text('Hourly Volume (INR)', margin + 150, tableY + 5);

  let curY = tableY + 7;
  const hourlyRows = data.hourlyDistribution || [];

  hourlyRows.forEach((row, idx) => {
    if (curY > 165) return;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, curY, contentWidth, 5.5, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, curY + 5.5, margin + contentWidth, curY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    const nextH = (row.hour + 1) % 24;
    const windowLabel = `${row.hourLabel} - ${String(nextH).padStart(2, '0')}:00`;
    doc.text(windowLabel, margin + 4, curY + 4);
    doc.text(String(row.transactionCount), margin + 45, curY + 4);
    doc.text(String(row.purchaseCount), margin + 80, curY + 4);
    doc.text(String(row.rechargeCount), margin + 115, curY + 4);
    doc.text(formatCurrency(row.totalVolume), margin + 150, curY + 4);

    curY += 5.5;
  });

  // 5. Section 3: Food & Product Demand Table
  curY = Math.max(curY + 6, 175);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Top Food & Item Demand Summary', margin, curY);

  curY += 4;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, curY, contentWidth, 7, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Food / Product Item', margin + 4, curY + 5);
  doc.text('Category', margin + 65, curY + 5);
  doc.text('Units Sold', margin + 105, curY + 5);
  doc.text('Gross Revenue (INR)', margin + 135, curY + 5);
  doc.text('Stock Status', margin + 168, curY + 5);

  curY += 7;
  const products = data.productDemand || [];

  products.forEach((p, idx) => {
    if (curY > pageHeight - 22) return;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, curY, contentWidth, 5.5, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, curY + 5.5, margin + contentWidth, curY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(p.productName.substring(0, 32), margin + 4, curY + 4);
    doc.text(p.category.substring(0, 20), margin + 65, curY + 4);
    doc.text(`${p.quantitySold} units`, margin + 105, curY + 4);
    doc.text(formatCurrency(p.revenue), margin + 135, curY + 4);
    doc.text(p.stockStatus.replace(/_/g, ' '), margin + 168, curY + 4);

    curY += 5.5;
  });

  // Footer on Page 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated via Money Card Enterprise Platform  |  Confidential & Proprietary', margin, pageHeight - 10);
  doc.text('Page 1 of 1', pageWidth - margin - 16, pageHeight - 10);

  return doc;
}

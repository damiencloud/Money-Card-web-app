import { describe, it, expect } from 'vitest';
import { mockAnalyticsHandlers } from '../services/mock/handlers/analytics';

describe('Org Admin Dashboard: Reports Catalog & Validation (30 Items)', () => {
  it('should return exactly 30 formal reports in the catalog for Org Admin', async () => {
    const res = await mockAnalyticsHandlers.getReports();
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data).toHaveLength(30);
  });

  it('should ensure all 30 reports contain valid IDs, titles, types, and PDF download URLs', async () => {
    const res = await mockAnalyticsHandlers.getReports();
    expect(res.success).toBe(true);
    if (!res.success) return;

    res.data.forEach((report) => {
      expect(report.id).toBeTruthy();
      expect(report.title.length).toBeGreaterThan(5);
      expect(report.type).toBeTruthy();
      expect(report.generatedAt).toBeTruthy();
      expect(report.downloadUrl).toContain('/api/v1/reports/');
      expect(report.downloadUrl).toContain('/pdf');
    });
  });

  it('should correctly filter the 30 reports catalog by search query', async () => {
    const res = await mockAnalyticsHandlers.getReports();
    expect(res.success).toBe(true);
    if (!res.success) return;

    const financialReports = res.data.filter((r) =>
      r.title.toLowerCase().includes('financial') || r.type === 'FINANCIAL_AUDIT',
    );
    expect(financialReports.length).toBeGreaterThan(0);
    expect(financialReports.length).toBeLessThanOrEqual(30);
  });
});

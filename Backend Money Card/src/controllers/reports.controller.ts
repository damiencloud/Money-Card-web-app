import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';

export async function getReportsCatalog(req: Request, res: Response) {
  const orgId = req.user?.organizationId || 'platform';
  const now = new Date();

  const reportTemplates = [
    { title: 'Monthly Financial Settlement & Reconciliation Report', type: 'FINANCIAL_AUDIT' },
    { title: 'Daily Cash Balance & Digital Payment Breakdown', type: 'FINANCIAL_AUDIT' },
    { title: 'Branch Inventory & Product Movement Summary', type: 'INVENTORY_AUDIT' },
    { title: 'Low-Stock Alert & Inventory Reorder Ledger', type: 'INVENTORY_AUDIT' },
    { title: 'Card Session Audit & POS Transaction Ledger', type: 'SESSION_AUDIT' },
    { title: 'Active Smart Card Wallet Balance Audit', type: 'SESSION_AUDIT' },
    { title: 'Tax & GST Financial Summary Report', type: 'TAX_SUMMARY' },
    { title: 'Staff Sales & Counter Performance Audit', type: 'STAFF_PERFORMANCE' },
    { title: 'Multi-Branch Revenue Reconciliation Report', type: 'BRANCH_RECONCILIATION' },
    { title: 'Customer Refund & Chargeback Activity Log', type: 'CUSTOMER_REFUND_LOG' },
    { title: 'Card Issuance & QR Token Generation Ledger', type: 'CARD_ISSUANCE_AUDIT' },
    { title: 'Blocked Card Session & Security Event Audit', type: 'SESSION_AUDIT' },
    { title: 'Hourly Peak Demand & Counter Velocity Report', type: 'FINANCIAL_AUDIT' },
    { title: 'Category-Wise Product Sales & Profitability Analysis', type: 'INVENTORY_AUDIT' },
    { title: 'Daily Recharge & Deposit Summary Report', type: 'FINANCIAL_AUDIT' },
    { title: 'Weekly Multi-Counter Settlement Statement', type: 'BRANCH_RECONCILIATION' },
    { title: 'Executive Lounge VIP Session Activity Audit', type: 'SESSION_AUDIT' },
    { title: 'End-of-Day Terminal Closing & Drawer Balancing', type: 'FINANCIAL_AUDIT' },
    { title: 'Smart Card Replacement & Transfer Audit', type: 'CARD_ISSUANCE_AUDIT' },
    { title: 'Supplier Stock Receipt & Wastage Log', type: 'INVENTORY_AUDIT' },
    { title: 'Quarterly Financial Audit & Revenue Ledger', type: 'FINANCIAL_AUDIT' },
    { title: 'Staff Shift Handover & Cash Reconciliation', type: 'STAFF_PERFORMANCE' },
    { title: 'Failed Transaction & Dispute Resolution Log', type: 'FINANCIAL_AUDIT' },
    { title: 'Annual Subscription & Limit Usage Audit', type: 'BRANCH_RECONCILIATION' },
    { title: 'Unclaimed Card Balance & Inactive Wallet Settlement', type: 'SESSION_AUDIT' },
    { title: 'Top Selling Food & Beverage Item Rankings', type: 'INVENTORY_AUDIT' },
    { title: 'UPI vs Cash Payment Gateway Settlement Audit', type: 'FINANCIAL_AUDIT' },
    { title: 'Customer Session Duration & Counter Dwell Report', type: 'SESSION_AUDIT' },
    { title: 'Emergency Override & Manual Adjustment Audit', type: 'STAFF_PERFORMANCE' },
    { title: 'Master Platform Compliance & System Audit Certificate', type: 'FINANCIAL_AUDIT' },
  ];

  const reports = reportTemplates.map((template, idx) => {
    const reportDate = new Date(now.getTime() - idx * 86400000 * 0.5).toISOString();
    const id = `rep_${(idx + 1).toString().padStart(3, '0')}_${orgId}`;
    return {
      id,
      title: template.title,
      type: template.type,
      generatedAt: reportDate,
      downloadUrl: `/api/v1/reports/${id}/pdf`,
    };
  });

  return sendSuccess(res, reports);
}

export async function getReportPdf(req: Request, res: Response) {
  const { id } = req.params;
  return sendSuccess(res, {
    reportId: id,
    status: 'READY',
    generatedAt: new Date().toISOString(),
  });
}

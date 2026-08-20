import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';

export async function getReportsCatalog(req: Request, res: Response) {
  const orgId = req.user?.organizationId || 'platform';
  const timestamp = new Date().toISOString();

  const reports = [
    {
      id: `rep_financial_${orgId}`,
      title: 'Monthly Financial Settlement & Reconciliation Report',
      type: 'FINANCIAL_AUDIT',
      generatedAt: timestamp,
      downloadUrl: `/api/v1/reports/rep_financial_${orgId}/pdf`,
    },
    {
      id: `rep_inventory_${orgId}`,
      title: 'Branch Inventory & Product Movement Summary',
      type: 'INVENTORY_AUDIT',
      generatedAt: timestamp,
      downloadUrl: `/api/v1/reports/rep_inventory_${orgId}/pdf`,
    },
    {
      id: `rep_session_${orgId}`,
      title: 'Card Session Audit & POS Transaction Ledger',
      type: 'SESSION_AUDIT',
      generatedAt: timestamp,
      downloadUrl: `/api/v1/reports/rep_session_${orgId}/pdf`,
    },
  ];

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

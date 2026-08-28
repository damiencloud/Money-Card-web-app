import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { CardHistoryAction } from '@prisma/client';

export async function listCustomerHistoryEvents(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const {
    search,
    q,
    action,
    cardId,
    cardNumber,
    limit = 50,
    page = 1,
    offset,
  } = req.query as Record<string, any>;

  const where: any = {
    organizationId: orgId,
  };

  if (action && action !== 'ALL') {
    if (Object.values(CardHistoryAction).includes(action as CardHistoryAction)) {
      where.action = action as CardHistoryAction;
    }
  }

  if (cardId) {
    where.cardId = String(cardId);
  }

  if (cardNumber) {
    where.physicalCardNumber = { contains: String(cardNumber).trim(), mode: 'insensitive' };
  }

  const searchTerm = String(search || q || '').trim();
  if (searchTerm) {
    where.OR = [
      { customerName: { contains: searchTerm, mode: 'insensitive' } },
      { customerPhone: { contains: searchTerm, mode: 'insensitive' } },
      { physicalCardNumber: { contains: searchTerm, mode: 'insensitive' } },
      { performedByName: { contains: searchTerm, mode: 'insensitive' } },
      { reason: { contains: searchTerm, mode: 'insensitive' } },
      { branchName: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const take = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
  const skip = offset ? parseInt(String(offset), 10) || 0 : (Math.max(1, parseInt(String(page), 10) || 1) - 1) * take;

  try {
    const [events, total] = await Promise.all([
      prisma.customerHistoryEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.customerHistoryEvent.count({ where }),
    ]);

    const formattedEvents = events.map((e) => ({
      id: e.id,
      cardId: e.cardId,
      sessionId: e.sessionId,
      customerName: e.customerName || 'Customer',
      customerPhone: e.customerPhone || null,
      physicalCardNumber: e.physicalCardNumber,
      action: e.action,
      previousStatus: e.previousStatus,
      newStatus: e.newStatus,
      performedByName: e.performedByName || 'Staff Member',
      performedByUserId: e.performedByUserId,
      branchId: e.branchId,
      branchName: e.branchName || 'Main Branch',
      reason: e.reason || null,
      createdAt: e.createdAt.toISOString(),
    }));

    const pageNum = Math.floor(skip / take) + 1;
    return sendSuccess(res, formattedEvents, 200, {
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
    });
  } catch (err: any) {
    return sendError(res, 500, 'INTERNAL_ERROR', err?.message || 'Failed to fetch customer history events');
  }
}

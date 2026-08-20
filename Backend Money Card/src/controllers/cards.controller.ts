import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { generateQrToken } from '../utils/crypto.js';
import { CardStatus } from '@prisma/client';

export async function getCards(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { status, search, page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const skip = (pageNum - 1) * limitNum;

  const whereClause: any = { organizationId: orgId };
  if (status && ['AVAILABLE', 'ACTIVE', 'BLOCKED'].includes(status)) {
    whereClause.status = status as CardStatus;
  }
  if (search) {
    whereClause.physicalCardNumber = { contains: search, mode: 'insensitive' };
  }

  const [cards, total] = await Promise.all([
    prisma.card.findMany({
      where: whereClause,
      include: {
        sessions: {
          where: { status: 'ACTIVE' },
          take: 1,
          include: { branch: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.card.count({ where: whereClause }),
  ]);

  const formatted = cards.map((c) => {
    const activeSession = c.sessions[0];
    return {
      id: c.id,
      organizationId: c.organizationId,
      physicalCardNumber: c.physicalCardNumber,
      qrToken: c.qrToken,
      status: c.status,
      activeSession: activeSession
        ? {
            id: activeSession.id,
            balance: activeSession.balance,
            branchId: activeSession.branchId,
            branchName: activeSession.branch.name,
            issuedAt: activeSession.issuedAt,
          }
        : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  });

  return sendSuccess(res, formatted, 200, {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
}

export async function createCard(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { physicalCardNumber } = req.body;
  if (!physicalCardNumber || !physicalCardNumber.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Physical card number is required');
  }

  const cleanNum = physicalCardNumber.trim().toUpperCase();
  const existing = await prisma.card.findUnique({
    where: {
      organizationId_physicalCardNumber: {
        organizationId: orgId,
        physicalCardNumber: cleanNum,
      },
    },
  });

  if (existing) {
    return sendError(res, 400, 'VALIDATION_ERROR', `Card '${cleanNum}' already exists in your organization`);
  }

  const qrToken = generateQrToken();
  const card = await prisma.card.create({
    data: {
      organizationId: orgId,
      physicalCardNumber: cleanNum,
      qrToken,
      status: CardStatus.AVAILABLE,
    },
  });

  return sendSuccess(res, card, 201);
}

export async function createCardBatch(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { prefix = 'MC-', startNumber = 1, count = 10 } = req.body;
  const numCount = Math.min(Math.max(1, parseInt(count, 10)), 100);
  const startNum = Math.max(1, parseInt(startNumber, 10));

  const createdCards: any[] = [];

  for (let i = 0; i < numCount; i++) {
    const cardNum = `${prefix}${String(startNum + i).padStart(3, '0')}`;
    const qrToken = generateQrToken();

    try {
      const card = await prisma.card.create({
        data: {
          organizationId: orgId,
          physicalCardNumber: cardNum,
          qrToken,
          status: CardStatus.AVAILABLE,
        },
      });
      createdCards.push(card);
    } catch {
      // Skip duplicates if any
    }
  }

  return sendSuccess(res, { created: createdCards.length, cards: createdCards }, 201);
}

export async function getCardById(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  const card = await prisma.card.findFirst({
    where: { id, organizationId: orgId || undefined },
    include: {
      sessions: {
        orderBy: { issuedAt: 'desc' },
        take: 5,
        include: {
          branch: true,
          transactions: { orderBy: { createdAt: 'desc' } },
        },
      },
    },
  });

  if (!card) {
    return sendError(res, 404, 'NOT_FOUND', 'Card not found');
  }

  return sendSuccess(res, card);
}

export async function blockCard(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  const card = await prisma.card.findFirst({
    where: { id, organizationId: orgId || undefined },
  });

  if (!card) {
    return sendError(res, 404, 'NOT_FOUND', 'Card not found');
  }

  const updated = await prisma.card.update({
    where: { id },
    data: { status: CardStatus.BLOCKED },
  });

  return sendSuccess(res, updated);
}

export async function unblockCard(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  const card = await prisma.card.findFirst({
    where: { id, organizationId: orgId || undefined },
    include: { sessions: { where: { status: 'ACTIVE' } } },
  });

  if (!card) {
    return sendError(res, 404, 'NOT_FOUND', 'Card not found');
  }

  const hasActiveSession = card.sessions.length > 0;
  const updated = await prisma.card.update({
    where: { id },
    data: { status: hasActiveSession ? CardStatus.ACTIVE : CardStatus.AVAILABLE },
  });

  return sendSuccess(res, updated);
}

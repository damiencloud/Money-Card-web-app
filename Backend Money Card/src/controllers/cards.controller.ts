import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { generateQrToken } from '../utils/crypto.js';
import { CardStatus } from '@prisma/client';
import { getEffectiveLimits } from '../utils/limits.js';

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

  // Authoritative Effective Card Limit Check
  const [effectiveLimits, currentCardCount] = await Promise.all([
    getEffectiveLimits(orgId),
    prisma.card.count({ where: { organizationId: orgId } }),
  ]);

  if (currentCardCount >= effectiveLimits.cardLimit) {
    return sendError(
      res,
      409,
      'CARD_LIMIT_REACHED',
      `Your organization has reached its card limit of ${effectiveLimits.cardLimit}. Please upgrade your plan or request a custom limit override to register more cards.`,
    );
  }

  const qrToken = generateQrToken();
  const card = await prisma.$transaction(async (tx) => {
    const countInTx = await tx.card.count({ where: { organizationId: orgId } });
    if (countInTx >= effectiveLimits.cardLimit) {
      throw new Error('CARD_LIMIT_REACHED');
    }

    return tx.card.create({
      data: {
        organizationId: orgId,
        physicalCardNumber: cleanNum,
        qrToken,
        status: CardStatus.AVAILABLE,
      },
    });
  });

  return sendSuccess(res, card, 201);
}

export async function createCardBatch(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const {
    importMode = 'AUTO_GENERATED_QR',
    prefix = 'MC-',
    startNumber = 1,
    count = 10,
    cardNumbers,
    cards: rawCards,
  } = req.body;

  // Determine list of card numbers and QR tokens to create
  let targetCardEntries: { cardNumber: string; qrToken?: string }[] = [];

  if (Array.isArray(cardNumbers) && cardNumbers.length > 0) {
    targetCardEntries = cardNumbers.map((num: string) => ({
      cardNumber: String(num).trim().toUpperCase(),
    }));
  } else if (Array.isArray(rawCards) && rawCards.length > 0) {
    targetCardEntries = rawCards.map((c: any) => ({
      cardNumber: String(c.cardNumber || c.physicalCardNumber || c.number || '').trim().toUpperCase(),
      qrToken: (c.qrToken || c.qrCode || c.token || '').trim(),
    })).filter((c) => !!c.cardNumber);
  } else {
    const numCount = Math.min(Math.max(1, parseInt(count, 10)), 500);
    const startNum = Math.max(1, parseInt(startNumber, 10));
    for (let i = 0; i < numCount; i++) {
      targetCardEntries.push({
        cardNumber: `${prefix}${String(startNum + i).padStart(3, '0')}`,
      });
    }
  }

  const totalToCreate = targetCardEntries.length;
  if (totalToCreate === 0) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'No card numbers provided');
  }

  // Strict Validation based on explicit importMode
  if (importMode === 'PREPRINTED_QR') {
    const seenBatchQrs = new Set<string>();
    for (let idx = 0; idx < targetCardEntries.length; idx++) {
      const entry = targetCardEntries[idx];
      if (!entry.qrToken) {
        return sendError(
          res,
          400,
          'VALIDATION_ERROR',
          `Pre-printed QR import requires a valid qrCode for all cards. Row ${idx + 1} (${entry.cardNumber}) is missing a QR code.`,
        );
      }
      if (seenBatchQrs.has(entry.qrToken)) {
        return sendError(
          res,
          400,
          'DUPLICATE_QR_IN_BATCH',
          `Duplicate QR code '${entry.qrToken}' found within the import file.`,
        );
      }
      seenBatchQrs.add(entry.qrToken);
    }

    // Check if any QR code already exists in DB
    const existingQrCards = await prisma.card.findMany({
      where: { qrToken: { in: Array.from(seenBatchQrs) } },
      select: { qrToken: true, physicalCardNumber: true },
    });

    if (existingQrCards.length > 0) {
      return sendError(
        res,
        400,
        'DUPLICATE_QR',
        `QR code '${existingQrCards[0].qrToken}' already exists in the system (Card: ${existingQrCards[0].physicalCardNumber}).`,
      );
    }
  }

  // Atomically check organization card limits and insert cards
  const result = await prisma.$transaction(async (tx) => {
    const [effectiveLimits, currentCardCount] = await Promise.all([
      getEffectiveLimits(orgId),
      tx.card.count({ where: { organizationId: orgId } }),
    ]);

    const remainingQuota = Math.max(0, effectiveLimits.cardLimit - currentCardCount);

    if (totalToCreate > remainingQuota) {
      throw {
        statusCode: 409,
        code: 'CARD_LIMIT_REACHED',
        message: `You can import only ${remainingQuota} more cards based on your current organization card limit of ${effectiveLimits.cardLimit} (${currentCardCount} current cards).`,
      };
    }

    const createdCards: any[] = [];

    for (const entry of targetCardEntries) {
      // In AUTO_GENERATED_QR mode, always generate a fresh unique cryptographic token
      // In PREPRINTED_QR mode, use the exact provided vendor token
      const token = importMode === 'PREPRINTED_QR' && entry.qrToken ? entry.qrToken : generateQrToken();

      const card = await tx.card.create({
        data: {
          organizationId: orgId,
          physicalCardNumber: entry.cardNumber,
          qrToken: token,
          status: CardStatus.AVAILABLE,
        },
      });
      createdCards.push(card);
    }

    return createdCards;
  }).catch((err) => {
    if (err?.statusCode) {
      return err;
    }
    throw err;
  });

  if (result?.statusCode) {
    return sendError(res, result.statusCode, result.code, result.message);
  }

  return sendSuccess(res, {
    created: result.length,
    importedCount: result.length,
    cards: result,
  }, 201);
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

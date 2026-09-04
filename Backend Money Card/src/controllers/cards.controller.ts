import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { generateQrToken } from '../utils/crypto.js';
import { CardStatus, CardAssignmentStatus, CardHistoryAction, SessionStatus } from '@prisma/client';
import { getEffectiveLimits } from '../utils/limits.js';

export async function getCards(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { status, assignmentStatus, search, page = '1', limit = '50' } = req.query as Record<string, string>;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const skip = (pageNum - 1) * limitNum;

  const whereClause: any = { organizationId: orgId };
  if (status && ['AVAILABLE', 'ACTIVE', 'BLOCKED'].includes(status)) {
    whereClause.status = status as CardStatus;
  }
  if (assignmentStatus && ['ASSIGNED', 'UNASSIGNED'].includes(assignmentStatus)) {
    whereClause.assignmentStatus = assignmentStatus as CardAssignmentStatus;
  }
  if (search) {
    whereClause.OR = [
      { physicalCardNumber: { contains: search, mode: 'insensitive' } },
      { qrToken: { contains: search, mode: 'insensitive' } },
    ];
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
        historyEvents: {
          where: { action: 'CARD_BLOCKED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
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
    const lastBlock = (c as any).historyEvents?.[0] || null;
    return {
      id: c.id,
      organizationId: c.organizationId,
      physicalCardNumber: c.physicalCardNumber || null,
      qrToken: c.qrToken,
      assignmentStatus: c.assignmentStatus,
      status: c.status,
      blockedReason: lastBlock?.reason || null,
      blockedBy: lastBlock?.performedByName || null,
      blockedAt: lastBlock?.createdAt || null,
      activeSession: activeSession
        ? {
            id: activeSession.id,
            balance: activeSession.balance,
            branchId: activeSession.branchId,
            branchName: activeSession.branch.name,
            sessionCardNumber: activeSession.sessionCardNumber || `${c.physicalCardNumber || 'MC'}_${activeSession.cycleNumber || 1}`,
            cycleNumber: activeSession.cycleNumber || 1,
            customerName: activeSession.customerName || null,
            customerPhone: activeSession.customerPhone || null,
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

  const { physicalCardNumber, qrToken: customQrToken } = req.body;
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

  const token = customQrToken ? String(customQrToken).trim() : generateQrToken();

  const existingQr = await prisma.card.findUnique({
    where: { qrToken: token },
  });
  if (existingQr) {
    return sendError(res, 400, 'DUPLICATE_QR', `QR token '${token}' is already registered in the platform.`);
  }

  const card = await prisma.$transaction(async (tx) => {
    const countInTx = await tx.card.count({ where: { organizationId: orgId } });
    if (countInTx >= effectiveLimits.cardLimit) {
      throw new Error('CARD_LIMIT_REACHED');
    }

    return tx.card.create({
      data: {
        organizationId: orgId,
        physicalCardNumber: cleanNum,
        qrToken: token,
        assignmentStatus: CardAssignmentStatus.ASSIGNED,
        status: CardStatus.AVAILABLE,
      },
    });
  });

  return sendSuccess(res, card, 201);
}

export async function importQrCodes(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { qrCodes, mappings, cards: rawCards, cardNumbers } = req.body;

  let targetEntries: { qrCode: string; cardNumber?: string }[] = [];

  if (Array.isArray(qrCodes) && qrCodes.length > 0) {
    targetEntries = qrCodes.map((q: any) => ({
      qrCode: String(q).trim(),
    }));
  } else if (Array.isArray(mappings) && mappings.length > 0) {
    targetEntries = mappings.map((m: any) => ({
      qrCode: String(m.qrCode || m.qrToken || '').trim(),
      cardNumber: m.cardNumber ? String(m.cardNumber).trim().toUpperCase() : undefined,
    }));
  } else if (Array.isArray(rawCards) && rawCards.length > 0) {
    targetEntries = rawCards.map((c: any) => ({
      qrCode: String(c.qrCode || c.qrToken || c.token || '').trim(),
      cardNumber: c.cardNumber || c.physicalCardNumber ? String(c.cardNumber || c.physicalCardNumber).trim().toUpperCase() : undefined,
    }));
  } else if (Array.isArray(cardNumbers) && cardNumbers.length > 0) {
    targetEntries = cardNumbers.map((c: any) => ({
      qrCode: generateQrToken(),
      cardNumber: String(c).trim().toUpperCase(),
    }));
  }

  targetEntries = targetEntries.filter((e) => !!e.qrCode);

  if (targetEntries.length === 0) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'No valid QR codes provided in import payload');
  }

  const seenQrs = new Set<string>();
  const seenCardNumbers = new Set<string>();

  for (let i = 0; i < targetEntries.length; i++) {
    const entry = targetEntries[i];
    if (seenQrs.has(entry.qrCode)) {
      return sendError(
        res,
        400,
        'DUPLICATE_QR_IN_BATCH',
        `Duplicate QR code '${entry.qrCode}' found multiple times in the import batch.`,
      );
    }
    seenQrs.add(entry.qrCode);

    if (entry.cardNumber) {
      if (seenCardNumbers.has(entry.cardNumber)) {
        return sendError(
          res,
          400,
          'DUPLICATE_CARD_IN_BATCH',
          `Duplicate Card Number '${entry.cardNumber}' found multiple times in the import batch.`,
        );
      }
      seenCardNumbers.add(entry.cardNumber);
    }
  }

  const existingQrs = await prisma.card.findMany({
    where: { qrToken: { in: Array.from(seenQrs) } },
    select: { qrToken: true, physicalCardNumber: true },
  });

  if (existingQrs.length > 0) {
    return sendError(
      res,
      400,
      'DUPLICATE_QR',
      `QR code '${existingQrs[0].qrToken}' is already registered in the platform (Card: ${existingQrs[0].physicalCardNumber || 'Unassigned'}).`,
    );
  }

  if (seenCardNumbers.size > 0) {
    const existingCards = await prisma.card.findMany({
      where: {
        organizationId: orgId,
        physicalCardNumber: { in: Array.from(seenCardNumbers) },
      },
      select: { physicalCardNumber: true },
    });

    if (existingCards.length > 0) {
      return sendError(
        res,
        400,
        'DUPLICATE_CARD_NUMBER',
        `Card number '${existingCards[0].physicalCardNumber}' already exists in your organization.`,
      );
    }
  }

  const [effectiveLimits, currentCardCount] = await Promise.all([
    getEffectiveLimits(orgId),
    prisma.card.count({ where: { organizationId: orgId } }),
  ]);

  const remainingQuota = Math.max(0, effectiveLimits.cardLimit - currentCardCount);
  if (targetEntries.length > remainingQuota) {
    return sendError(
      res,
      409,
      'CARD_LIMIT_REACHED',
      `Importing ${targetEntries.length} QR code(s) exceeds your subscription card limit of ${effectiveLimits.cardLimit} (currently ${currentCardCount} registered, ${remainingQuota} remaining quota).`,
    );
  }

  const createdCards = await prisma.$transaction(async (tx) => {
    const created: any[] = [];
    for (const entry of targetEntries) {
      const isAssigned = !!entry.cardNumber;
      const c = await tx.card.create({
        data: {
          organizationId: orgId,
          qrToken: entry.qrCode,
          physicalCardNumber: entry.cardNumber || null,
          assignmentStatus: isAssigned ? CardAssignmentStatus.ASSIGNED : CardAssignmentStatus.UNASSIGNED,
          status: CardStatus.AVAILABLE,
        },
      });
      created.push(c);
    }
    return created;
  });

  const unassignedCount = createdCards.filter((c) => c.assignmentStatus === CardAssignmentStatus.UNASSIGNED).length;
  const assignedCount = createdCards.length - unassignedCount;

  return sendSuccess(res, {
    importedCount: createdCards.length,
    unassignedCount,
    assignedCount,
    cards: createdCards,
  }, 201);
}

export const createCardBatch = importQrCodes;

export async function assignCardNumber(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { id } = req.params;
  const { cardNumber } = req.body;

  if (!cardNumber || !String(cardNumber).trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Card number is required');
  }

  const cleanNum = String(cardNumber).trim().toUpperCase();

  const card = await prisma.card.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!card) {
    return sendError(res, 404, 'NOT_FOUND', 'Card not found in your organization');
  }

  if (card.physicalCardNumber && card.assignmentStatus === CardAssignmentStatus.ASSIGNED) {
    if (card.physicalCardNumber === cleanNum) {
      return sendSuccess(res, card);
    }
  }

  const duplicate = await prisma.card.findFirst({
    where: {
      organizationId: orgId,
      physicalCardNumber: cleanNum,
      id: { not: id },
    },
  });

  if (duplicate) {
    return sendError(
      res,
      400,
      'DUPLICATE_CARD_NUMBER',
      `Card number '${cleanNum}' is already assigned to another QR card in your organization.`,
    );
  }

  const updated = await prisma.card.update({
    where: { id },
    data: {
      physicalCardNumber: cleanNum,
      assignmentStatus: CardAssignmentStatus.ASSIGNED,
    },
  });

  return sendSuccess(res, updated);
}

export async function bulkAssignCardNumbers(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { assignments } = req.body;
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'No card number assignments provided');
  }

  const seenNums = new Set<string>();
  for (const a of assignments) {
    const num = String(a.cardNumber || '').trim().toUpperCase();
    if (!num) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'All mappings must contain a non-empty cardNumber');
    }
    if (seenNums.has(num)) {
      return sendError(res, 400, 'DUPLICATE_CARD_IN_BATCH', `Card number '${num}' is repeated in the assignment batch`);
    }
    seenNums.add(num);
  }

  const existingCards = await prisma.card.findMany({
    where: {
      organizationId: orgId,
      physicalCardNumber: { in: Array.from(seenNums) },
    },
    select: { id: true, physicalCardNumber: true, qrToken: true },
  });

  const existingNumSet = new Set(existingCards.map((c) => c.physicalCardNumber));

  const updatedCards = await prisma.$transaction(async (tx) => {
    const results: any[] = [];
    for (const a of assignments) {
      const cleanNum = String(a.cardNumber).trim().toUpperCase();
      const qr = a.qrCode || a.qrToken;
      const cardId = a.cardId || a.id;

      const card = await tx.card.findFirst({
        where: {
          organizationId: orgId,
          OR: [
            ...(cardId ? [{ id: cardId }] : []),
            ...(qr ? [{ qrToken: String(qr).trim() }] : []),
          ],
        },
      });

      if (!card) {
        throw new Error(`QR Card not found for identifier '${qr || cardId}'`);
      }

      if (existingNumSet.has(cleanNum) && card.physicalCardNumber !== cleanNum) {
        throw new Error(`Card number '${cleanNum}' already exists in your organization`);
      }

      const updated = await tx.card.update({
        where: { id: card.id },
        data: {
          physicalCardNumber: cleanNum,
          assignmentStatus: CardAssignmentStatus.ASSIGNED,
        },
      });
      results.push(updated);
    }
    return results;
  });

  return sendSuccess(res, {
    assignedCount: updatedCards.length,
    cards: updatedCards,
  });
}

export async function blockCard(req: Request, res: Response) {
  const { id } = req.params;
  const { reason = 'Card blocked by administrator' } = req.body || {};
  const orgId = req.user?.organizationId;
  const staffUserId = req.user?.id;
  const staffName = req.user?.name || req.user?.email || 'Administrator';

  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const card = await prisma.card.findFirst({
    where: { id, organizationId: orgId },
    include: {
      sessions: {
        where: { status: 'ACTIVE' },
        include: { branch: true },
      },
    },
  });

  if (!card) {
    return sendError(res, 404, 'NOT_FOUND', 'Card not found in your organization');
  }

  if (card.status === CardStatus.BLOCKED) {
    return sendError(res, 400, 'ALREADY_BLOCKED', 'Card is already blocked');
  }

  const activeSession = card.sessions[0] || null;

  const { updatedCard, auditEvent } = await prisma.$transaction(async (tx) => {
    const updated = await tx.card.update({
      where: { id: card.id },
      data: { status: CardStatus.BLOCKED },
    });

    const event = await tx.customerHistoryEvent.create({
      data: {
        organizationId: orgId,
        cardId: card.id,
        sessionId: activeSession ? activeSession.id : null,
        customerName: activeSession?.customerName || null,
        customerPhone: activeSession?.customerPhone || null,
        physicalCardNumber: card.physicalCardNumber || card.qrToken,
        action: CardHistoryAction.CARD_BLOCKED,
        previousStatus: card.status,
        newStatus: CardStatus.BLOCKED,
        performedByName: staffName,
        performedByUserId: staffUserId || null,
        branchId: activeSession?.branchId || null,
        branchName: activeSession?.branch?.name || null,
        reason: String(reason || 'Reported lost or blocked'),
      },
    });

    return { updatedCard: updated, auditEvent: event };
  });

  return sendSuccess(res, {
    card: updatedCard,
    auditEvent,
    message: `Card ${card.physicalCardNumber || card.qrToken} has been successfully blocked.`,
  });
}

export async function unblockCard(req: Request, res: Response) {
  const { id } = req.params;
  const { reason = 'Card unblocked by administrator' } = req.body || {};
  const orgId = req.user?.organizationId;
  const staffUserId = req.user?.id;
  const staffName = req.user?.name || req.user?.email || 'Administrator';

  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const card = await prisma.card.findFirst({
    where: { id, organizationId: orgId },
    include: {
      sessions: {
        where: { status: 'ACTIVE' },
        include: { branch: true },
      },
    },
  });

  if (!card) {
    return sendError(res, 404, 'NOT_FOUND', 'Card not found in your organization');
  }

  if (card.status !== CardStatus.BLOCKED) {
    return sendError(res, 400, 'NOT_BLOCKED', 'Card is not currently blocked');
  }

  const activeSession = card.sessions[0] || null;

  const { updatedCard, auditEvent } = await prisma.$transaction(async (tx) => {
    const updated = await tx.card.update({
      where: { id: card.id },
      data: { status: CardStatus.AVAILABLE },
    });

    const event = await tx.customerHistoryEvent.create({
      data: {
        organizationId: orgId,
        cardId: card.id,
        sessionId: activeSession ? activeSession.id : null,
        customerName: activeSession?.customerName || null,
        customerPhone: activeSession?.customerPhone || null,
        physicalCardNumber: card.physicalCardNumber || card.qrToken,
        action: CardHistoryAction.CARD_UNBLOCKED,
        previousStatus: card.status,
        newStatus: CardStatus.AVAILABLE,
        performedByName: staffName,
        performedByUserId: staffUserId || null,
        branchId: activeSession?.branchId || null,
        branchName: activeSession?.branch?.name || null,
        reason: String(reason || 'Unblocked and verified identity'),
      },
    });

    return { updatedCard: updated, auditEvent: event };
  });

  return sendSuccess(res, {
    card: updatedCard,
    auditEvent,
    message: `Card ${card.physicalCardNumber || card.qrToken} has been successfully unblocked.`,
  });
}

export async function resolveCard(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  const { qrToken, qrCode, physicalCardNumber, cardNumber } = req.body;
  const rawInput = String(qrToken || qrCode || physicalCardNumber || cardNumber || '').trim();

  if (!rawInput) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'qrToken, qrCode, or cardNumber is required');
  }

  const tokenStr = rawInput.toLowerCase().startsWith('qtk_')
    ? rawInput
    : `qtk_${rawInput.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const card = await prisma.card.findFirst({
    where: {
      organizationId: orgId || undefined,
      OR: [
        { physicalCardNumber: rawInput.toUpperCase() },
        { qrToken: rawInput },
        { qrToken: tokenStr },
        { qrToken: rawInput.toLowerCase() },
      ],
    },
    include: {
      sessions: {
        where: { status: 'ACTIVE' },
        include: { branch: true },
      },
    },
  });

  if (!card) {
    return sendError(res, 404, 'NOT_FOUND', 'Card not found with this identifier or QR code');
  }

  if (card.assignmentStatus === CardAssignmentStatus.UNASSIGNED || !card.physicalCardNumber) {
    return sendError(
      res,
      400,
      'CARD_NOT_ASSIGNED',
      'Card is not assigned yet. Please assign an organization card number in Org Admin portal before use.',
    );
  }

  if (card.status === CardStatus.BLOCKED) {
    const lastBlock = await prisma.customerHistoryEvent.findFirst({
      where: { cardId: card.id, action: 'CARD_BLOCKED' },
      orderBy: { createdAt: 'desc' },
    });
    const blockDetail = lastBlock?.reason ? ` [Reason: ${lastBlock.reason}]` : '';
    return sendError(
      res,
      403,
      'CARD_BLOCKED',
      `Card ${card.physicalCardNumber} is blocked${blockDetail}. Cannot be used for any operations.`,
    );
  }

  const activeSession = card.sessions[0] || null;

  return sendSuccess(res, {
    card: {
      id: card.id,
      physicalCardNumber: card.physicalCardNumber,
      qrToken: card.qrToken,
      assignmentStatus: card.assignmentStatus,
      status: card.status,
    },
    activeSession: activeSession
      ? {
          id: activeSession.id,
          balance: activeSession.balance,
          branchId: activeSession.branchId,
          branchName: activeSession.branch.name,
          sessionCardNumber: activeSession.sessionCardNumber || `${card.physicalCardNumber}_${activeSession.cycleNumber || 1}`,
          cycleNumber: activeSession.cycleNumber || 1,
          customerName: activeSession.customerName || null,
          customerPhone: activeSession.customerPhone || null,
          issuedAt: activeSession.issuedAt,
        }
      : null,
  });
}

export async function getCardById(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const card = await prisma.card.findFirst({
    where: { id, organizationId: orgId },
    include: {
      sessions: {
        orderBy: { issuedAt: 'desc' },
        take: 20,
        include: { branch: true },
      },
      historyEvents: {
        where: { action: 'CARD_BLOCKED' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!card) {
    return sendError(res, 404, 'NOT_FOUND', 'Card not found');
  }

  const lastBlock = (card as any).historyEvents?.[0] || null;

  return sendSuccess(res, {
    ...card,
    blockedReason: lastBlock?.reason || null,
    blockedBy: lastBlock?.performedByName || null,
    blockedAt: lastBlock?.createdAt || null,
  });
}

export async function deleteCard(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;
  const staffUserId = req.user?.id;
  const staffName = req.user?.name || req.user?.email || 'Administrator';
  const { reason = 'Card permanently deleted by administrator' } = req.body || {};

  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const card = await prisma.card.findFirst({
    where: { id, organizationId: orgId },
    include: {
      sessions: {
        where: { status: SessionStatus.ACTIVE },
      },
    },
  });

  if (!card) {
    return sendError(res, 404, 'NOT_FOUND', 'Card not found');
  }

  if (card.sessions.length > 0) {
    return sendError(
      res,
      400,
      'CARD_HAS_ACTIVE_SESSION',
      `Cannot delete card "${card.physicalCardNumber || card.qrToken}" because it currently has an active open session. Settle or return the card first.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    // Record permanent card deletion in customer history before deleting card
    await tx.customerHistoryEvent.create({
      data: {
        organizationId: orgId,
        cardId: null, // Keep null so this audit event remains permanently even after card deletion
        physicalCardNumber: card.physicalCardNumber || card.qrToken,
        action: CardHistoryAction.CARD_DELETED,
        previousStatus: card.status,
        newStatus: card.status,
        performedByName: staffName,
        performedByUserId: staffUserId || null,
        reason: String(reason || 'Card permanently deleted by administrator'),
      },
    });

    // Delete card from registry.
    // Thanks to ON DELETE SET NULL on both customer_history_events.cardId and card_sessions.cardId,
    // all past history records and session records remain fully preserved with physicalCardNumber intact.
    await tx.card.delete({ where: { id } });
  });

  return sendSuccess(res, {
    deleted: true,
    message: `Card "${card.physicalCardNumber || card.qrToken}" permanently deleted. Record preserved in customer history.`,
  });
}

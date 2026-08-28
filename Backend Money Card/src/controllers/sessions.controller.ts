import { recordInventoryMovement } from './products.controller.js';
import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { generateSessionToken } from '../utils/crypto.js';
import { CardStatus, SessionStatus, TransactionType } from '@prisma/client';

export async function listSessions(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { status, branchId, cardId, search, q, limit = 50, page = 1, offset } = req.query as Record<string, any>;

  const validStatuses = Object.values(SessionStatus);
  if (status && status !== 'ALL' && !validStatuses.includes(status as SessionStatus)) {
    return sendError(res, 400, 'VALIDATION_ERROR', `Invalid status filter. Allowed values: ${validStatuses.join(', ')}`);
  }

  const where: any = {
    organizationId: orgId,
  };

  if (status && status !== 'ALL') {
    where.status = status as SessionStatus;
  }

  if (branchId) {
    where.branchId = String(branchId);
  } else if (req.user?.role === 'STAFF' && req.user.assignedBranchIds && req.user.assignedBranchIds.length > 0) {
    where.branchId = { in: req.user.assignedBranchIds };
  }

  if (cardId) {
    where.cardId = String(cardId);
  }

  const searchTerm = String(search || q || '').trim();
  if (searchTerm) {
    where.OR = [
      { customerName: { contains: searchTerm, mode: 'insensitive' } },
      { customerPhone: { contains: searchTerm, mode: 'insensitive' } },
      { sessionCardNumber: { contains: searchTerm, mode: 'insensitive' } },
      { sessionToken: { contains: searchTerm, mode: 'insensitive' } },
      { card: { physicalCardNumber: { contains: searchTerm, mode: 'insensitive' } } },
    ];
  }

  const take = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
  const skip = offset ? parseInt(String(offset), 10) || 0 : (Math.max(1, parseInt(String(page), 10) || 1) - 1) * take;

  try {
    const [sessions, total] = await Promise.all([
      prisma.cardSession.findMany({
        where,
        include: {
          card: true,
          branch: true,
          issuedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { issuedAt: 'desc' },
        take,
        skip,
      }),
      prisma.cardSession.count({ where }),
    ]);

    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      cardId: s.cardId,
      physicalCardNumber: s.card?.physicalCardNumber || null,
      sessionCardNumber: s.sessionCardNumber || (s.card?.physicalCardNumber ? `${s.card.physicalCardNumber}_${s.cycleNumber || 1}` : null),
      cycleNumber: s.cycleNumber || 1,
      branchId: s.branchId,
      branchName: s.branch?.name || null,
      status: s.status,
      balance: s.balance,
      customerName: s.customerName || null,
      customerPhone: s.customerPhone || null,
      startedAt: s.issuedAt.toISOString(),
      settledAt: s.settledAt ? s.settledAt.toISOString() : null,
      createdAt: s.issuedAt.toISOString(),
      updatedAt: s.settledAt ? s.settledAt.toISOString() : s.issuedAt.toISOString(),
      issuedBy: s.issuedBy,
    }));

    const pageNum = Math.floor(skip / take) + 1;
    return sendSuccess(res, formattedSessions, 200, {
      total,
      page: pageNum,
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
    });
  } catch (err: any) {
    return sendError(res, 500, 'INTERNAL_ERROR', err?.message || 'Failed to list card sessions');
  }
}

export async function createSession(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { cardId, branchId, initialAmount = 0, paymentMethod = 'CASH', customerName, customerPhone, userName, phone } = req.body;
  const cleanCustomerName = (customerName || userName || '').trim() || null;
  const cleanCustomerPhone = (customerPhone || phone || '').trim() || null;
  if (!cardId || !branchId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'cardId and branchId are required');
  }

  const card = await prisma.card.findFirst({
    where: { id: cardId, organizationId: orgId },
  });

  if (!card) {
    return sendError(res, 404, 'NOT_FOUND', 'Card not found');
  }

  if (card.status === CardStatus.BLOCKED) {
    return sendError(res, 400, 'CARD_BLOCKED', 'Card is blocked and cannot be issued');
  }

  if (card.status === CardStatus.ACTIVE) {
    return sendError(res, 400, 'CARD_ALREADY_ACTIVE', 'Card already has an active session');
  }

  if (req.user?.role === 'STAFF' && !req.user.assignedBranchIds.includes(branchId)) {
    return sendError(res, 403, 'BRANCH_ACCESS_DENIED', 'You are not assigned to this branch location');
  }

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId: orgId },
  });

  if (!branch) {
    return sendError(res, 404, 'NOT_FOUND', 'Branch not found in your organization');
  }

  if (branch.status !== 'ACTIVE') {
    return sendError(res, 403, 'BRANCH_INACTIVE', 'This branch location is currently disabled or inactive');
  }

  const initAmount = Math.max(0, parseFloat(initialAmount) || 0);
  const sessionToken = generateSessionToken();

  const session = await prisma.$transaction(async (tx) => {
    // Count existing cycles for this physical card to determine internal session cycle (e.g. MC-100_1, MC-100_2)
    const sessionCount = await tx.cardSession.count({
      where: { cardId: card.id },
    });
    const cycleNumber = sessionCount + 1;
    const sessionCardNumber = `${card.physicalCardNumber}_${cycleNumber}`;

    const createdSession = await tx.cardSession.create({
      data: {
        organizationId: orgId,
        branchId,
        cardId: card.id,
        sessionToken,
        balance: initAmount,
        status: SessionStatus.ACTIVE,
        cycleNumber,
        sessionCardNumber,
        customerName: cleanCustomerName,
        customerPhone: cleanCustomerPhone,
        issuedByUserId: req.user?.id,
      },
    });

    await tx.card.update({
      where: { id: card.id },
      data: { status: CardStatus.ACTIVE },
    });

    if (initAmount > 0) {
      await tx.transaction.create({
        data: {
          sessionId: createdSession.id,
          branchId,
          staffUserId: req.user?.id,
          type: paymentMethod === 'UPI' ? TransactionType.RECHARGE_UPI : TransactionType.RECHARGE_CASH,
          amount: initAmount,
          balanceBefore: 0.0,
          balanceAfter: initAmount,
          paymentMethod: paymentMethod === 'UPI' ? 'UPI' : 'CASH',
        },
      });
    }

    return createdSession;
  });

  return sendSuccess(
    res,
    {
      ...session,
      cardId: card.id,
      physicalCardNumber: card.physicalCardNumber,
      sessionCardNumber: session.sessionCardNumber || `${card.physicalCardNumber}_${session.cycleNumber || 1}`,
      cycleNumber: session.cycleNumber || 1,
      customerName: session.customerName,
      customerPhone: session.customerPhone,
      startedAt: session.issuedAt.toISOString(),
      createdAt: session.issuedAt.toISOString(),
      updatedAt: session.issuedAt.toISOString(),
    },
    201,
  );
}

export async function getSessionById(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  const session = await prisma.cardSession.findFirst({
    where: { id, organizationId: orgId || undefined },
    include: {
      card: true,
      branch: true,
      issuedBy: { select: { id: true, name: true, email: true } },
      settledBy: { select: { id: true, name: true, email: true } },
      transactions: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Card session not found');
  }

  return sendSuccess(res, session);
}

export async function getActiveSessionByQr(req: Request, res: Response) {
  const { qrToken } = req.params;
  const orgId = req.user?.organizationId;

  const card = await prisma.card.findFirst({
    where: { qrToken, organizationId: orgId || undefined },
    include: {
      sessions: {
        where: { status: SessionStatus.ACTIVE },
        take: 1,
        include: {
          branch: true,
          transactions: { orderBy: { createdAt: 'desc' } },
        },
      },
    },
  });

  if (!card) {
    return sendError(res, 404, 'NOT_FOUND', 'Card not found with this QR code');
  }

  const activeSession = card.sessions[0] || null;

  return sendSuccess(res, {
    card: {
      id: card.id,
      physicalCardNumber: card.physicalCardNumber,
      qrToken: card.qrToken,
      status: card.status,
    },
    activeSession,
  });
}

export async function rechargeSession(req: Request, res: Response) {
  const { id } = req.params;
  const { amount, paymentMethod = 'CASH', externalReference } = req.body;
  const orgId = req.user?.organizationId;

  const rechargeAmount = parseFloat(amount);
  if (!rechargeAmount || rechargeAmount <= 0) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Recharge amount must be greater than 0');
  }

  const session = await prisma.cardSession.findFirst({
    where: { id, organizationId: orgId || undefined },
    include: { card: true, branch: true },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  if (session.status !== SessionStatus.ACTIVE) {
    return sendError(res, 400, 'INVALID_STATE', 'Cannot recharge an inactive or settled session');
  }

  if (session.branch && session.branch.status !== 'ACTIVE') {
    return sendError(res, 403, 'BRANCH_INACTIVE', 'This branch location is currently disabled or inactive');
  }

  if (req.user?.role === 'STAFF' && !req.user.assignedBranchIds.includes(session.branchId)) {
    return sendError(res, 403, 'BRANCH_ACCESS_DENIED', 'You are not authorized to recharge a session belonging to another branch');
  }

  if (session.card.status === CardStatus.BLOCKED) {
    return sendError(res, 400, 'CARD_BLOCKED', 'Cannot recharge a blocked card');
  }

  const updatedSession = await prisma.$transaction(async (tx) => {
    const balanceBefore = session.balance;
    const balanceAfter = balanceBefore + rechargeAmount;

    const updated = await tx.cardSession.update({
      where: { id },
      data: { balance: balanceAfter },
    });

    const txType = paymentMethod === 'UPI' ? TransactionType.RECHARGE_UPI : TransactionType.RECHARGE_CASH;

    await tx.transaction.create({
      data: {
        sessionId: session.id,
        branchId: session.branchId,
        staffUserId: req.user?.id,
        type: txType,
        amount: rechargeAmount,
        balanceBefore,
        balanceAfter,
        paymentMethod: paymentMethod === 'UPI' ? 'UPI' : 'CASH',
        externalReference,
      },
    });

    return updated;
  });

  return sendSuccess(res, updatedSession);
}

export async function purchaseSession(req: Request, res: Response) {
  const { id } = req.params;
  const { items } = req.body;
  const orgId = req.user?.organizationId;

  if (!Array.isArray(items) || items.length === 0) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Purchase requires at least one item');
  }

  const session = await prisma.cardSession.findFirst({
    where: { id, organizationId: orgId || undefined },
    include: { card: true, branch: true },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  if (session.status !== SessionStatus.ACTIVE) {
    return sendError(res, 400, 'INVALID_STATE', 'Cannot make purchases on an inactive session');
  }

  if (session.card.status === CardStatus.BLOCKED) {
    return sendError(res, 400, 'CARD_BLOCKED', 'Card is blocked');
  }

  if (req.user?.role === 'STAFF' && !req.user.assignedBranchIds.includes(session.branchId)) {
    return sendError(res, 403, 'BRANCH_ACCESS_DENIED', 'You are not authorized to make purchases on a session belonging to another branch');
  }

  // Calculate total and validate stock inside atomic transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      let totalCost = 0;
      const detailedItems: any[] = [];

      for (const it of items) {
        const product = await tx.product.findUnique({
          where: { id: it.productId },
        });

        if (!product) {
          throw new Error(`Product '${it.productId}' not found`);
        }

        const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
        const itemSubtotal = product.price * qty;
        totalCost += itemSubtotal;

        // Check & decrement inventory
        const inventory = await tx.branchInventory.findUnique({
          where: {
            branchId_productId: {
              branchId: session.branchId,
              productId: product.id,
            },
          },
        });

        if (inventory && inventory.quantity < qty) {
          throw new Error(`Insufficient stock for '${product.itemName}'. Available: ${inventory.quantity}`);
        }

        if (inventory) {
          const updatedInv = await tx.branchInventory.update({
            where: { id: inventory.id },
            data: { quantity: { decrement: qty } },
          });

          recordInventoryMovement({
            inventoryId: inventory.id,
            productId: product.id,
            productName: product.itemName,
            branchId: session.branchId,
            changeQuantity: -qty,
            balanceAfter: updatedInv.quantity,
            type: 'PURCHASE',
            reason: `POS Sale (Card #${session.card?.physicalCardNumber || session.id.substring(0, 8)})`,
            staffName: (req as any).user?.name || 'Cashier Staff',
          });
        }

        detailedItems.push({
          productId: product.id,
          itemName: product.itemName,
          unitPrice: product.price,
          quantity: qty,
          subtotal: itemSubtotal,
        });
      }

      if (session.balance < totalCost) {
        throw new Error(`INSUFFICIENT_BALANCE: Current balance is ₹${session.balance.toFixed(2)}, required ₹${totalCost.toFixed(2)}`);
      }

      const balanceBefore = session.balance;
      const balanceAfter = balanceBefore - totalCost;

      const updatedSession = await tx.cardSession.update({
        where: { id },
        data: { balance: balanceAfter },
      });

      const txRecord = await tx.transaction.create({
        data: {
          sessionId: session.id,
          branchId: session.branchId,
          staffUserId: req.user?.id,
          type: TransactionType.PURCHASE,
          amount: totalCost,
          balanceBefore,
          balanceAfter,
          paymentMethod: 'CARD_BALANCE',
          items: detailedItems,
        },
      });

      return { session: updatedSession, transaction: txRecord };
    });

    return sendSuccess(res, result);
  } catch (err: any) {
    const isNotFound = err.message?.includes('not found');
    return sendError(res, isNotFound ? 404 : 400, isNotFound ? 'NOT_FOUND' : 'PURCHASE_FAILED', err.message || 'Purchase failed');
  }
}

export async function returnSession(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  const session = await prisma.cardSession.findFirst({
    where: { id, organizationId: orgId || undefined },
    include: { card: true, branch: true },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  if (session.status === SessionStatus.SETTLED) {
    return sendError(res, 400, 'ALREADY_SETTLED', 'Session is already settled and refunded');
  }

  const refundAmount = session.balance;

  const result = await prisma.$transaction(async (tx) => {
    const settledSession = await tx.cardSession.update({
      where: { id },
      data: {
        balance: 0.0,
        status: SessionStatus.SETTLED,
        settledAt: new Date(),
        settledByUserId: req.user?.id,
        refundAmount,
      },
    });

    if (refundAmount > 0) {
      await tx.transaction.create({
        data: {
          sessionId: session.id,
          branchId: session.branchId,
          staffUserId: req.user?.id,
          type: TransactionType.REFUND_RETURN,
          amount: refundAmount,
          balanceBefore: refundAmount,
          balanceAfter: 0.0,
          paymentMethod: 'DIRECT_REFUND',
        },
      });
    }

    // Reset card status to AVAILABLE
    await tx.card.update({
      where: { id: session.cardId },
      data: { status: CardStatus.AVAILABLE },
    });

    return { session: settledSession, refundAmount };
  });

  return sendSuccess(res, result);
}

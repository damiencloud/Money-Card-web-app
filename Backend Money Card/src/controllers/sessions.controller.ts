import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { generateSessionToken } from '../utils/crypto.js';
import { CardStatus, SessionStatus, TransactionType } from '@prisma/client';

export async function createSession(req: Request, res: Response) {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'User has no associated organization');
  }

  const { cardId, branchId, initialAmount = 0, paymentMethod = 'CASH' } = req.body;
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

  const initAmount = Math.max(0, parseFloat(initialAmount) || 0);
  const sessionToken = generateSessionToken();

  const session = await prisma.$transaction(async (tx) => {
    const createdSession = await tx.cardSession.create({
      data: {
        organizationId: orgId,
        branchId,
        cardId: card.id,
        sessionToken,
        balance: initAmount,
        status: SessionStatus.ACTIVE,
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

  return sendSuccess(res, session, 201);
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
    include: { card: true },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  if (session.status !== SessionStatus.ACTIVE) {
    return sendError(res, 400, 'INVALID_STATE', 'Cannot recharge an inactive or settled session');
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
    include: { card: true },
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

  // Calculate total and validate stock inside atomic transaction
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
        await tx.branchInventory.update({
          where: { id: inventory.id },
          data: { quantity: { decrement: qty } },
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
}

export async function returnSession(req: Request, res: Response) {
  const { id } = req.params;
  const orgId = req.user?.organizationId;

  const session = await prisma.cardSession.findFirst({
    where: { id, organizationId: orgId || undefined },
    include: { card: true },
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

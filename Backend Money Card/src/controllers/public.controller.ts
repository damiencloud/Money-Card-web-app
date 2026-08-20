import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { sendError, sendSuccess } from '../utils/response.js';

export async function resolvePublicQrToken(req: Request, res: Response) {
  const { qrToken } = req.body;
  if (!qrToken || !qrToken.trim()) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'qrToken is required');
  }

  const card = await prisma.card.findUnique({
    where: { qrToken: qrToken.trim() },
    include: {
      organization: { select: { name: true, logoUrl: true } },
      sessions: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: {
          branch: { select: { name: true, location: true } },
        },
      },
    },
  });

  if (!card) {
    return sendError(res, 404, 'NOT_FOUND', 'Card not recognized');
  }

  const activeSession = card.sessions[0] || null;

  return sendSuccess(res, {
    cardStatus: card.status,
    organizationName: card.organization.name,
    organizationLogo: card.organization.logoUrl,
    hasActiveSession: !!activeSession,
    session: activeSession
      ? {
          sessionToken: activeSession.sessionToken,
          branchName: activeSession.branch.name,
          issuedAt: activeSession.issuedAt,
        }
      : null,
  });
}

export async function getPublicSessionBalance(req: Request, res: Response) {
  const { sessionToken } = req.params;

  const session = await prisma.cardSession.findUnique({
    where: { sessionToken },
    include: {
      organization: { select: { name: true, logoUrl: true } },
      branch: { select: { name: true } },
    },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  return sendSuccess(res, {
    sessionToken: session.sessionToken,
    organizationName: session.organization.name,
    branchName: session.branch.name,
    balance: session.balance,
    status: session.status,
    issuedAt: session.issuedAt,
    settledAt: session.settledAt,
    refundAmount: session.refundAmount,
  });
}

export async function getPublicSessionTransactions(req: Request, res: Response) {
  const { sessionToken } = req.params;

  const session = await prisma.cardSession.findUnique({
    where: { sessionToken },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!session) {
    return sendError(res, 404, 'NOT_FOUND', 'Session not found');
  }

  const formatted = session.transactions.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    balanceAfter: tx.balanceAfter,
    paymentMethod: tx.paymentMethod,
    items: tx.items,
    createdAt: tx.createdAt,
  }));

  return sendSuccess(res, formatted);
}

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { sendError } from '../utils/response.js';
import { env } from '../config/env.js';

export class ApiException extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiException';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  return sendError(res, 404, 'NOT_FOUND', `Route '${req.method} ${req.originalUrl}' not found`);
}

export function globalErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ApiException) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      const field = target.join(', ');
      return sendError(
        res,
        409,
        'CONFLICT',
        `A record with this ${field || 'unique field'} already exists`,
      );
    }
    if (err.code === 'P2025') {
      return sendError(res, 404, 'NOT_FOUND', 'Requested resource was not found');
    }
  }

  const isDev = env.NODE_ENV === 'development';
  const message = err instanceof Error ? err.message : 'An unexpected server error occurred';

  if (isDev) {
    console.error('💥 Unhandled Server Error:', err);
  }

  return sendError(
    res,
    500,
    'INTERNAL_ERROR',
    isDev ? message : 'An internal server error occurred. Please contact support.',
  );
}

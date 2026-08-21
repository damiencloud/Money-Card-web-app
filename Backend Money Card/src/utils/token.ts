import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Role } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  organizationId: string | null;
  tokenVersion: number;
}

export function generateAccessToken(payload: TokenPayload): string {
  const expiresIn = (env.JWT_ACCESS_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}

export function generateRefreshToken(payload: TokenPayload): string {
  const expiresIn = (env.JWT_REFRESH_EXPIRES_IN || '30d') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

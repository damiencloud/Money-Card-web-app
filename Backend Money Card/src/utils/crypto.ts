import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateQrToken(): string {
  return `qtk_${crypto.randomBytes(16).toString('hex')}`;
}

export function generateSessionToken(): string {
  return `stk_${crypto.randomBytes(24).toString('hex')}`;
}

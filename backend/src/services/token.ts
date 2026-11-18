import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthUser, TokenPayload } from '../types/domain.js';

export function createAccessToken(user: AuthUser): string {
  const payload: TokenPayload = { ...user, type: 'access' };
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (
    typeof decoded === 'string' ||
    decoded.type !== 'access' ||
    typeof decoded.userId !== 'number' ||
    typeof decoded.marketId !== 'number' ||
    (decoded.role !== 'ADMIN' && decoded.role !== 'EMPLOYEE') ||
    typeof decoded.username !== 'string'
  ) {
    throw new Error('Token inválido.');
  }
  return decoded as TokenPayload;
}

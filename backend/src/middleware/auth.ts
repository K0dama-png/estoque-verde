import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../types/domain.js';
import { HttpError } from '../utils/http-error.js';
import { verifyAccessToken } from '../services/token.js';
import { execute, firstRow, withConnection } from '../database/oracle.js';

export async function authenticate(request: Request, _response: Response, next: NextFunction): Promise<void> {
  const authorization = request.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Token de acesso não informado.', 'UNAUTHENTICATED');
  }

  let payload;
  try {
    payload = verifyAccessToken(authorization.slice(7));
  } catch {
    throw new HttpError(401, 'Token de acesso inválido ou expirado.', 'UNAUTHENTICATED');
  }

  const account = await withConnection(async (connection) => {
    const result = await execute(
      connection,
      `SELECT u.id, u.market_id, u.role, u.username
       FROM app_users u
       INNER JOIN markets m ON m.id = u.market_id
       WHERE u.id = :userId AND u.market_id = :marketId
         AND u.active = 1 AND m.active = 1`,
      { userId: payload.userId, marketId: payload.marketId },
    );
    return firstRow<{ id: number; marketId: number; role: Role; username: string }>(result);
  });
  if (!account) throw new HttpError(401, 'A conta ou o mercado está inativo.', 'ACCOUNT_INACTIVE');

  request.auth = { userId: account.id, marketId: account.marketId, role: account.role, username: account.username };
  next();
}

export function requireRole(...roles: Role[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.auth || !roles.includes(request.auth.role)) {
      throw new HttpError(403, 'Você não tem permissão para realizar esta ação.', 'FORBIDDEN');
    }
    next();
  };
}

export function authOf(request: Request) {
  if (!request.auth) throw new HttpError(401, 'Usuário não autenticado.', 'UNAUTHENTICATED');
  return request.auth;
}

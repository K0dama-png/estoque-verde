import { Router } from 'express';
import { z } from 'zod';
import { execute, firstRow, insertedId, isOracleUniqueViolation, outNumber, withConnection, withTransaction } from '../database/oracle.js';
import { authenticate, authOf } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../services/password.js';
import { createAccessToken } from '../services/token.js';
import { HttpError, notFound } from '../utils/http-error.js';
import { digitsOnly, parseBody } from '../utils/validation.js';

export const authRouter = Router();

const registerSchema = z.object({
  managerName: z.string().trim().min(3).max(120),
  marketName: z.string().trim().min(3).max(150),
  document: z.string().trim().min(11).max(18).transform(digitsOnly),
  city: z.string().trim().min(2).max(100),
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(128),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(6).max(128),
});

interface LoginRow {
  id: number;
  marketId: number;
  name: string;
  username: string;
  role: 'ADMIN' | 'EMPLOYEE';
  passwordHash: string;
  mustChangePassword: number;
  marketName: string;
  marketDocument: string;
  marketCity: string;
}

authRouter.post('/register-market', async (request, response) => {
  const input = parseBody(registerSchema, request);
  const passwordHash = await hashPassword(input.password);

  try {
    const result = await withTransaction(async (connection) => {
      const marketResult = await execute(
        connection,
        `INSERT INTO markets (name, document, city)
         VALUES (:name, :document, :city)
         RETURNING id INTO :id`,
        { name: input.marketName, document: input.document, city: input.city, id: outNumber },
      );
      const marketId = insertedId(marketResult);

      const userResult = await execute(
        connection,
        `INSERT INTO app_users (market_id, name, username, password_hash, role, must_change_password)
         VALUES (:marketId, :name, :username, :passwordHash, 'ADMIN', 0)
         RETURNING id INTO :id`,
        {
          marketId,
          name: input.managerName,
          username: input.username.toLowerCase(),
          passwordHash,
          id: outNumber,
        },
      );
      const userId = insertedId(userResult);

      for (const category of ['Alimentos', 'Bebidas', 'Higiene', 'Limpeza', 'Outros']) {
        await execute(
          connection,
          `INSERT INTO categories (market_id, name, is_default)
           VALUES (:marketId, :name, 1)`,
          { marketId, name: category },
        );
      }

      const auth = { userId, marketId, role: 'ADMIN' as const, username: input.username.toLowerCase() };
      return {
        token: createAccessToken(auth),
        user: {
          id: userId,
          marketId,
          name: input.managerName,
          username: auth.username,
          role: auth.role,
          mustChangePassword: false,
        },
        market: { id: marketId, name: input.marketName, document: input.document, city: input.city },
      };
    });

    response.status(201).json(result);
  } catch (error) {
    if (isOracleUniqueViolation(error)) {
      throw new HttpError(409, 'O CPF/CNPJ do mercado ou o nome de usuário já está cadastrado.', 'DUPLICATE_REGISTRATION');
    }
    throw error;
  }
});

authRouter.post('/login', async (request, response) => {
  const input = parseBody(loginSchema, request);
  const row = await withConnection(async (connection) => {
    const result = await execute(
      connection,
      `SELECT u.id, u.market_id, u.name, u.username, u.role, u.password_hash,
              u.must_change_password, m.name AS market_name, m.document AS market_document,
              m.city AS market_city
       FROM app_users u
       INNER JOIN markets m ON m.id = u.market_id
       WHERE LOWER(u.username) = LOWER(:username)
         AND u.active = 1
         AND m.active = 1`,
      { username: input.username },
    );
    return firstRow<LoginRow>(result);
  });

  if (!row || !(await verifyPassword(input.password, row.passwordHash))) {
    throw new HttpError(401, 'Usuário ou senha inválidos.', 'INVALID_CREDENTIALS');
  }

  const auth = { userId: row.id, marketId: row.marketId, role: row.role, username: row.username };
  response.json({
    token: createAccessToken(auth),
    user: {
      id: row.id,
      marketId: row.marketId,
      name: row.name,
      username: row.username,
      role: row.role,
      mustChangePassword: row.mustChangePassword === 1,
    },
    market: { id: row.marketId, name: row.marketName, document: row.marketDocument, city: row.marketCity },
  });
});

authRouter.get('/me', authenticate, async (request, response) => {
  const auth = authOf(request);
  const row = await withConnection(async (connection) => {
    const result = await execute(
      connection,
      `SELECT u.id, u.market_id, u.name, u.username, u.role, u.must_change_password,
              m.name AS market_name, m.document AS market_document, m.city AS market_city
       FROM app_users u
       INNER JOIN markets m ON m.id = u.market_id
       WHERE u.id = :userId AND u.market_id = :marketId AND u.active = 1 AND m.active = 1`,
      { userId: auth.userId, marketId: auth.marketId },
    );
    return firstRow<Record<string, unknown>>(result);
  });
  if (!row) notFound('Usuário não encontrado.');
  response.json(row);
});

authRouter.post('/change-password', authenticate, async (request, response) => {
  const auth = authOf(request);
  const input = parseBody(changePasswordSchema, request);
  if (input.currentPassword === input.newPassword) {
    throw new HttpError(400, 'A nova senha deve ser diferente da senha atual.', 'PASSWORD_REUSED');
  }

  await withTransaction(async (connection) => {
    const result = await execute(
      connection,
      `SELECT password_hash FROM app_users
       WHERE id = :userId AND market_id = :marketId AND active = 1
       FOR UPDATE`,
      { userId: auth.userId, marketId: auth.marketId },
    );
    const row = firstRow<{ passwordHash: string }>(result);
    if (!row) notFound('Usuário não encontrado.');
    if (!(await verifyPassword(input.currentPassword, row.passwordHash))) {
      throw new HttpError(401, 'A senha atual está incorreta.', 'INVALID_CURRENT_PASSWORD');
    }

    await execute(
      connection,
      `UPDATE app_users
       SET password_hash = :passwordHash, must_change_password = 0, updated_at = SYSTIMESTAMP
       WHERE id = :userId AND market_id = :marketId`,
      { ...auth, passwordHash: await hashPassword(input.newPassword) },
    );
  });

  response.status(204).send();
});

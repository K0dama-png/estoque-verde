import { Router } from 'express';
import { z } from 'zod';
import { execute, insertedId, isOracleUniqueViolation, outNumber, rowsOf, withConnection, withTransaction } from '../database/oracle.js';
import { authenticate, authOf, requireRole } from '../middleware/auth.js';
import { hashPassword } from '../services/password.js';
import { HttpError, notFound } from '../utils/http-error.js';
import { parseBody, parseId } from '../utils/validation.js';

export const usersRouter = Router();
usersRouter.use(authenticate, requireRole('ADMIN'));

const employeeSchema = z.object({
  name: z.string().trim().min(3).max(120),
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(6).max(128),
});

usersRouter.get('/', async (request, response) => {
  const auth = authOf(request);
  const users = await withConnection(async (connection) => {
    const result = await execute(
      connection,
      `SELECT id, market_id, name, username, role, active, must_change_password, created_at
       FROM app_users
       WHERE market_id = :marketId
       ORDER BY CASE role WHEN 'ADMIN' THEN 0 ELSE 1 END, name`,
      { marketId: auth.marketId },
    );
    return rowsOf(result);
  });
  response.json(users);
});

usersRouter.post('/', async (request, response) => {
  const auth = authOf(request);
  const input = parseBody(employeeSchema, request);
  try {
    const employee = await withTransaction(async (connection) => {
      const result = await execute(
        connection,
        `INSERT INTO app_users
           (market_id, name, username, password_hash, role, active, must_change_password)
         VALUES (:marketId, :name, :username, :passwordHash, 'EMPLOYEE', 1, 1)
         RETURNING id INTO :id`,
        {
          marketId: auth.marketId,
          name: input.name,
          username: input.username.toLowerCase(),
          passwordHash: await hashPassword(input.password),
          id: outNumber,
        },
      );
      return {
        id: insertedId(result),
        marketId: auth.marketId,
        name: input.name,
        username: input.username.toLowerCase(),
        role: 'EMPLOYEE',
        active: true,
        mustChangePassword: true,
      };
    });
    response.status(201).json(employee);
  } catch (error) {
    if (isOracleUniqueViolation(error)) {
      throw new HttpError(409, 'Esse nome de usuário já está em uso.', 'USERNAME_IN_USE');
    }
    throw error;
  }
});

usersRouter.patch('/:id/status', async (request, response) => {
  const auth = authOf(request);
  const userId = parseId(request.params.id ?? '', 'Usuário');
  const { active } = parseBody(z.object({ active: z.boolean() }), request);
  if (userId === auth.userId) {
    throw new HttpError(400, 'O gerente não pode inativar o próprio acesso.', 'SELF_DEACTIVATION');
  }

  const changed = await withTransaction(async (connection) => {
    const result = await execute(
      connection,
      `UPDATE app_users
       SET active = :active, updated_at = SYSTIMESTAMP
       WHERE id = :id AND market_id = :marketId AND role = 'EMPLOYEE'`,
      { id: userId, marketId: auth.marketId, active: active ? 1 : 0 },
    );
    return (result.rowsAffected ?? 0) > 0;
  });
  if (!changed) notFound('Funcionário não encontrado.');
  response.status(204).send();
});

usersRouter.post('/:id/reset-password', async (request, response) => {
  const auth = authOf(request);
  const userId = parseId(request.params.id ?? '', 'Usuário');
  const { password } = parseBody(z.object({ password: z.string().min(6).max(128) }), request);
  const changed = await withTransaction(async (connection) => {
    const result = await execute(
      connection,
      `UPDATE app_users
       SET password_hash = :passwordHash, must_change_password = 1, updated_at = SYSTIMESTAMP
       WHERE id = :id AND market_id = :marketId AND role = 'EMPLOYEE' AND active = 1`,
      { id: userId, marketId: auth.marketId, passwordHash: await hashPassword(password) },
    );
    return (result.rowsAffected ?? 0) > 0;
  });
  if (!changed) notFound('Funcionário ativo não encontrado.');
  response.status(204).send();
});

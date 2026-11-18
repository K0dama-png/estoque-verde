import { Router } from 'express';
import { z } from 'zod';
import { execute, insertedId, isOracleUniqueViolation, outNumber, rowsOf, withConnection, withTransaction } from '../database/oracle.js';
import { authenticate, authOf, requireRole } from '../middleware/auth.js';
import { HttpError, notFound } from '../utils/http-error.js';
import { parseBody, parseId } from '../utils/validation.js';

export const categoriesRouter = Router();
categoriesRouter.use(authenticate);

const categorySchema = z.object({ name: z.string().trim().min(2).max(80) });

categoriesRouter.get('/', async (request, response) => {
  const auth = authOf(request);
  const rows = await withConnection(async (connection) => {
    const result = await execute(
      connection,
      `SELECT id, market_id, name, active, is_default, created_at
       FROM categories
       WHERE market_id = :marketId
       ORDER BY active DESC, name`,
      { marketId: auth.marketId },
    );
    return rowsOf(result);
  });
  response.json(rows);
});

categoriesRouter.post('/', requireRole('ADMIN'), async (request, response) => {
  const auth = authOf(request);
  const input = parseBody(categorySchema, request);
  try {
    const id = await withTransaction(async (connection) => {
      const result = await execute(
        connection,
        `INSERT INTO categories (market_id, name)
         VALUES (:marketId, :name)
         RETURNING id INTO :id`,
        { marketId: auth.marketId, name: input.name, id: outNumber },
      );
      return insertedId(result);
    });
    response.status(201).json({ id, marketId: auth.marketId, name: input.name, active: true, isDefault: false });
  } catch (error) {
    if (isOracleUniqueViolation(error)) {
      throw new HttpError(409, 'Já existe uma categoria com esse nome.', 'CATEGORY_EXISTS');
    }
    throw error;
  }
});

categoriesRouter.put('/:id', requireRole('ADMIN'), async (request, response) => {
  const auth = authOf(request);
  const id = parseId(request.params.id ?? '', 'Categoria');
  const input = parseBody(categorySchema, request);
  try {
    const changed = await withTransaction(async (connection) => {
      const result = await execute(
        connection,
        `UPDATE categories SET name = :name, updated_at = SYSTIMESTAMP
         WHERE id = :id AND market_id = :marketId`,
        { id, marketId: auth.marketId, name: input.name },
      );
      return (result.rowsAffected ?? 0) > 0;
    });
    if (!changed) notFound('Categoria não encontrada.');
    response.status(204).send();
  } catch (error) {
    if (isOracleUniqueViolation(error)) {
      throw new HttpError(409, 'Já existe uma categoria com esse nome.', 'CATEGORY_EXISTS');
    }
    throw error;
  }
});

categoriesRouter.patch('/:id/status', requireRole('ADMIN'), async (request, response) => {
  const auth = authOf(request);
  const id = parseId(request.params.id ?? '', 'Categoria');
  const { active } = parseBody(z.object({ active: z.boolean() }), request);
  const changed = await withTransaction(async (connection) => {
    if (!active) {
      const products = await execute(
        connection,
        `SELECT COUNT(*) AS total FROM products
         WHERE market_id = :marketId AND category_id = :id AND active = 1`,
        { marketId: auth.marketId, id },
      );
      const [{ total = 0 } = {}] = rowsOf<{ total: number }>(products);
      if (total > 0) {
        throw new HttpError(409, 'A categoria possui produtos ativos e não pode ser inativada.', 'CATEGORY_IN_USE');
      }
    }

    const result = await execute(
      connection,
      `UPDATE categories SET active = :active, updated_at = SYSTIMESTAMP
       WHERE id = :id AND market_id = :marketId`,
      { id, marketId: auth.marketId, active: active ? 1 : 0 },
    );
    return (result.rowsAffected ?? 0) > 0;
  });
  if (!changed) notFound('Categoria não encontrada.');
  response.status(204).send();
});

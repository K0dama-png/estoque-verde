import { Router } from 'express';
import { z } from 'zod';
import { execute, insertedId, isOracleUniqueViolation, outNumber, rowsOf, withConnection, withTransaction } from '../database/oracle.js';
import { authenticate, authOf, requireRole } from '../middleware/auth.js';
import { HttpError, notFound } from '../utils/http-error.js';
import { digitsOnly, parseBody, parseId } from '../utils/validation.js';

export const suppliersRouter = Router();
suppliersRouter.use(authenticate);

const supplierSchema = z.object({
  name: z.string().trim().min(2).max(150),
  document: z.string().trim().min(11).max(18).transform(digitsOnly),
  phone: z.string().trim().min(8).max(20),
});

suppliersRouter.get('/', async (request, response) => {
  const auth = authOf(request);
  const suppliers = await withConnection(async (connection) => {
    const result = await execute(
      connection,
      `SELECT id, market_id, name, document, phone, active, created_at
       FROM suppliers
       WHERE market_id = :marketId
       ORDER BY active DESC, name`,
      { marketId: auth.marketId },
    );
    return rowsOf(result);
  });
  response.json(suppliers);
});

suppliersRouter.post('/', requireRole('ADMIN'), async (request, response) => {
  const auth = authOf(request);
  const input = parseBody(supplierSchema, request);
  try {
    const id = await withTransaction(async (connection) => {
      const result = await execute(
        connection,
        `INSERT INTO suppliers (market_id, name, document, phone)
         VALUES (:marketId, :name, :document, :phone)
         RETURNING id INTO :id`,
        { marketId: auth.marketId, ...input, id: outNumber },
      );
      return insertedId(result);
    });
    response.status(201).json({ id, marketId: auth.marketId, ...input, active: true });
  } catch (error) {
    if (isOracleUniqueViolation(error)) {
      throw new HttpError(409, 'Este CPF/CNPJ já pertence a um fornecedor do mercado.', 'SUPPLIER_EXISTS');
    }
    throw error;
  }
});

suppliersRouter.put('/:id', requireRole('ADMIN'), async (request, response) => {
  const auth = authOf(request);
  const id = parseId(request.params.id ?? '', 'Fornecedor');
  const input = parseBody(supplierSchema, request);
  try {
    const changed = await withTransaction(async (connection) => {
      const result = await execute(
        connection,
        `UPDATE suppliers
         SET name = :name, document = :document, phone = :phone, updated_at = SYSTIMESTAMP
         WHERE id = :id AND market_id = :marketId`,
        { id, marketId: auth.marketId, ...input },
      );
      return (result.rowsAffected ?? 0) > 0;
    });
    if (!changed) notFound('Fornecedor não encontrado.');
    response.status(204).send();
  } catch (error) {
    if (isOracleUniqueViolation(error)) {
      throw new HttpError(409, 'Este CPF/CNPJ já pertence a outro fornecedor do mercado.', 'SUPPLIER_EXISTS');
    }
    throw error;
  }
});

suppliersRouter.patch('/:id/status', requireRole('ADMIN'), async (request, response) => {
  const auth = authOf(request);
  const id = parseId(request.params.id ?? '', 'Fornecedor');
  const { active } = parseBody(z.object({ active: z.boolean() }), request);
  const changed = await withTransaction(async (connection) => {
    const result = await execute(
      connection,
      `UPDATE suppliers SET active = :active, updated_at = SYSTIMESTAMP
       WHERE id = :id AND market_id = :marketId`,
      { id, marketId: auth.marketId, active: active ? 1 : 0 },
    );
    return (result.rowsAffected ?? 0) > 0;
  });
  if (!changed) notFound('Fornecedor não encontrado.');
  response.status(204).send();
});

import { Router } from 'express';
import { z } from 'zod';
import { execute, rowsOf, withConnection } from '../database/oracle.js';
import { authenticate, authOf } from '../middleware/auth.js';
import { parseQuery } from '../utils/validation.js';

export const movementsRouter = Router();
movementsRouter.use(authenticate);

const querySchema = z.object({
  type: z.enum(['ENTRY', 'EXIT']).optional(),
  reason: z.enum(['SALE', 'LOSS', 'EXPIRY', 'DAMAGE', 'INTERNAL_USE', 'ADJUSTMENT']).optional(),
  productId: z.coerce.number().int().positive().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
}).refine((data) => !data.from || !data.to || data.from <= data.to, {
  message: 'A data inicial deve ser anterior à data final.',
  path: ['from'],
});

movementsRouter.get('/', async (request, response) => {
  const auth = authOf(request);
  const query = parseQuery(querySchema, request);
  const clauses = ['m.market_id = :marketId'];
  const binds: Record<string, string | number> = { marketId: auth.marketId };
  if (query.type) { clauses.push('m.type = :type'); binds.type = query.type; }
  if (query.reason) { clauses.push('m.exit_reason = :reason'); binds.reason = query.reason; }
  if (query.productId) { clauses.push('i.product_id = :productId'); binds.productId = query.productId; }
  if (query.from) { clauses.push("m.created_at >= TO_DATE(:fromDate, 'YYYY-MM-DD')"); binds.fromDate = query.from; }
  if (query.to) { clauses.push("m.created_at < TO_DATE(:toDate, 'YYYY-MM-DD') + 1"); binds.toDate = query.to; }
  binds.offset = (query.page - 1) * query.pageSize;
  binds.pageSize = query.pageSize;

  const data = await withConnection(async (connection) => {
    const itemsResult = await execute(
      connection,
      `SELECT m.id AS movement_id, m.type, m.exit_reason, m.notes, m.created_at,
              u.id AS user_id, u.name AS user_name, i.id AS item_id,
              p.id AS product_id, p.name AS product_name, p.code AS product_code,
              b.id AS batch_id, b.code AS batch_code, i.quantity,
              i.unit_purchase_price, s.id AS supplier_id, s.name AS supplier_name
       FROM stock_movements m
       INNER JOIN app_users u ON u.id = m.created_by AND u.market_id = m.market_id
       INNER JOIN stock_movement_items i ON i.movement_id = m.id AND i.market_id = m.market_id
       INNER JOIN products p ON p.id = i.product_id AND p.market_id = m.market_id
       INNER JOIN batches b ON b.id = i.batch_id AND b.market_id = m.market_id
       LEFT JOIN suppliers s ON s.id = i.supplier_id AND s.market_id = m.market_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY m.created_at DESC, m.id DESC, i.id
       OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`,
      binds,
    );
    const countResult = await execute(
      connection,
      `SELECT COUNT(*) AS total
       FROM stock_movements m
       INNER JOIN stock_movement_items i ON i.movement_id = m.id AND i.market_id = m.market_id
       WHERE ${clauses.join(' AND ')}`,
      Object.fromEntries(Object.entries(binds).filter(([key]) => key !== 'offset' && key !== 'pageSize')),
    );
    return { items: rowsOf(itemsResult), total: rowsOf<{ total: number }>(countResult)[0]?.total ?? 0 };
  });

  response.json({ ...data, page: query.page, pageSize: query.pageSize });
});

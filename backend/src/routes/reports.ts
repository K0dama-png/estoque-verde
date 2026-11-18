import { Router } from 'express';
import { z } from 'zod';
import { execute, rowsOf, withConnection } from '../database/oracle.js';
import { authenticate, authOf, requireRole } from '../middleware/auth.js';
import { parseQuery } from '../utils/validation.js';

export const reportsRouter = Router();
reportsRouter.use(authenticate, requireRole('ADMIN'));

reportsRouter.get('/stock', async (request, response) => {
  const auth = authOf(request);
  const rows = await withConnection(async (connection) => {
    const result = await execute(
      connection,
      `SELECT p.id AS product_id, p.code AS product_code, p.name AS product_name,
              c.name AS category_name, p.unit, p.current_quantity, p.minimum_stock,
              p.maximum_stock, b.id AS batch_id, b.code AS batch_code, b.quantity AS batch_quantity,
              b.purchase_price, b.expiry_date, b.received_at, s.id AS supplier_id, s.name AS supplier_name
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id AND c.market_id = p.market_id
       LEFT JOIN batches b ON b.product_id = p.id AND b.market_id = p.market_id AND b.quantity > 0
       LEFT JOIN suppliers s ON s.id = b.supplier_id AND s.market_id = p.market_id
       WHERE p.market_id = :marketId AND p.active = 1
       ORDER BY p.name, b.expiry_date NULLS LAST, b.received_at`,
      { marketId: auth.marketId },
    );
    return rowsOf(result);
  });
  response.json(rows);
});

reportsRouter.get('/alerts', async (request, response) => {
  const auth = authOf(request);
  const { expiryDays } = parseQuery(z.object({ expiryDays: z.coerce.number().int().min(1).max(365).default(30) }), request);
  const data = await withConnection(async (connection) => {
    const lowStockResult = await execute(
      connection,
      `SELECT id AS product_id, code, name, current_quantity, minimum_stock, unit
       FROM products
       WHERE market_id = :marketId AND active = 1 AND current_quantity <= minimum_stock
       ORDER BY current_quantity - minimum_stock, name`,
      { marketId: auth.marketId },
    );
    const expiryResult = await execute(
      connection,
      `SELECT p.id AS product_id, p.name AS product_name, p.code AS product_code,
              b.id AS batch_id, b.code AS batch_code, b.quantity, b.expiry_date,
              TRUNC(b.expiry_date) - TRUNC(SYSDATE) AS days_until_expiry
       FROM batches b
       INNER JOIN products p ON p.id = b.product_id AND p.market_id = b.market_id
       WHERE b.market_id = :marketId AND p.active = 1 AND b.quantity > 0
         AND b.expiry_date < TRUNC(SYSDATE) + :expiryDays + 1
       ORDER BY b.expiry_date, p.name`,
      { marketId: auth.marketId, expiryDays },
    );
    return { lowStock: rowsOf(lowStockResult), expiringBatches: rowsOf(expiryResult) };
  });
  response.json(data);
});

reportsRouter.get('/dashboard', async (request, response) => {
  const auth = authOf(request);
  const summary = await withConnection(async (connection) => {
    const result = await execute(
      connection,
      `SELECT
         COUNT(*) AS active_products,
         COALESCE(SUM(current_quantity), 0) AS units_in_stock,
         SUM(CASE WHEN current_quantity <= minimum_stock THEN 1 ELSE 0 END) AS low_stock_products,
         (SELECT COUNT(*) FROM batches b
          WHERE b.market_id = :marketId AND b.quantity > 0
            AND b.expiry_date < TRUNC(SYSDATE) + 31) AS expiring_batches
       FROM products
       WHERE market_id = :marketId AND active = 1`,
      { marketId: auth.marketId },
    );
    return rowsOf(result)[0] ?? {};
  });
  response.json(summary);
});

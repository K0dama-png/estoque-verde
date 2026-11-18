import { Router } from 'express';
import { z } from 'zod';
import { execute, firstRow, insertedId, isOracleUniqueViolation, outNumber, rowsOf, withConnection, withTransaction } from '../database/oracle.js';
import { authenticate, authOf, requireRole } from '../middleware/auth.js';
import { HttpError, notFound } from '../utils/http-error.js';
import { parseBody, parseId, parseQuery } from '../utils/validation.js';

export const productsRouter = Router();
productsRouter.use(authenticate);

const productFields = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(500).default(''),
  categoryId: z.number().int().positive(),
  price: z.number().min(0).max(999999999).default(0),
  minimumStock: z.number().int().min(0).max(999999999),
  maximumStock: z.number().int().positive().max(999999999),
  unit: z.enum(['UN', 'KG', 'G', 'L', 'ML', 'CX', 'PCT']),
});

const productSchema = productFields.refine((data) => data.maximumStock >= data.minimumStock, {
  message: 'O estoque máximo deve ser maior ou igual ao estoque mínimo.',
  path: ['maximumStock'],
});

const createProductSchema = productFields.extend({
  initialStock: z.object({
    supplierId: z.number().int().positive(),
    batchCode: z.string().trim().min(1).max(60),
    quantity: z.number().positive().max(999999999),
    purchasePrice: z.number().min(0).max(999999999),
    expiryDate: z.iso.date(),
  }).optional(),
}).refine((data) => data.maximumStock >= data.minimumStock, {
  message: 'O estoque máximo deve ser maior ou igual ao estoque mínimo.',
  path: ['maximumStock'],
});

const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  active: z.enum(['true', 'false', 'all']).default('true'),
});

productsRouter.get('/', async (request, response) => {
  const auth = authOf(request);
  const query = parseQuery(listQuerySchema, request);
  const clauses = ['p.market_id = :marketId'];
  const binds: Record<string, string | number> = { marketId: auth.marketId };
  if (query.active !== 'all') {
    clauses.push('p.active = :active');
    binds.active = query.active === 'true' ? 1 : 0;
  }
  if (query.categoryId) {
    clauses.push('p.category_id = :categoryId');
    binds.categoryId = query.categoryId;
  }
  if (query.search) {
    clauses.push(`(UPPER(p.name) LIKE UPPER(:search) ESCAPE '\\' OR UPPER(p.code) LIKE UPPER(:search) ESCAPE '\\')`);
    binds.search = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`;
  }

  const products = await withConnection(async (connection) => {
    const result = await execute(
      connection,
      `SELECT p.id, p.market_id, p.code, p.name, p.description, p.category_id,
              c.name AS category_name, p.price, p.current_quantity, p.minimum_stock,
              p.maximum_stock, p.unit, p.active,
              (SELECT MIN(b.expiry_date) FROM batches b
               WHERE b.market_id = p.market_id AND b.product_id = p.id AND b.quantity > 0) AS nearest_expiry_date
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id AND c.market_id = p.market_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY p.active DESC, p.name`,
      binds,
    );
    return rowsOf(result);
  });
  response.json(products);
});

productsRouter.get('/:id', async (request, response) => {
  const auth = authOf(request);
  const id = parseId(request.params.id ?? '', 'Produto');
  const data = await withConnection(async (connection) => {
    const productResult = await execute(
      connection,
      `SELECT p.id, p.market_id, p.code, p.name, p.description, p.category_id,
              c.name AS category_name, p.price, p.current_quantity, p.minimum_stock,
              p.maximum_stock, p.unit, p.active, p.created_at, p.updated_at
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id AND c.market_id = p.market_id
       WHERE p.id = :id AND p.market_id = :marketId`,
      { id, marketId: auth.marketId },
    );
    const product = firstRow<Record<string, unknown>>(productResult);
    if (!product) return undefined;

    const batchResult = await execute(
      connection,
      `SELECT b.id, b.code, b.quantity, b.purchase_price, b.expiry_date, b.received_at,
              b.supplier_id, s.name AS supplier_name
       FROM batches b
       INNER JOIN suppliers s ON s.id = b.supplier_id AND s.market_id = b.market_id
       WHERE b.product_id = :id AND b.market_id = :marketId
       ORDER BY CASE WHEN b.quantity > 0 THEN 0 ELSE 1 END, b.expiry_date NULLS LAST, b.received_at`,
      { id, marketId: auth.marketId },
    );
    return { ...product, batches: rowsOf(batchResult) };
  });
  if (!data) notFound('Produto não encontrado.');
  response.json(data);
});

productsRouter.post('/', requireRole('ADMIN'), async (request, response) => {
  const auth = authOf(request);
  const input = parseBody(createProductSchema, request);
  try {
    const id = await withTransaction(async (connection) => {
      const category = await execute(
        connection,
        `SELECT id FROM categories
         WHERE id = :categoryId AND market_id = :marketId AND active = 1`,
        { categoryId: input.categoryId, marketId: auth.marketId },
      );
      if (!firstRow(category)) notFound('Categoria ativa não encontrada.');

      if (input.initialStock) {
        const supplier = await execute(
          connection,
          `SELECT id FROM suppliers
           WHERE id = :supplierId AND market_id = :marketId AND active = 1`,
          { supplierId: input.initialStock.supplierId, marketId: auth.marketId },
        );
        if (!firstRow(supplier)) notFound('Fornecedor ativo não encontrado.');
      }

      const result = await execute(
        connection,
        `INSERT INTO products
           (market_id, category_id, code, name, description, price,
            current_quantity, minimum_stock, maximum_stock, unit)
         VALUES
           (:marketId, :categoryId, :code, :name, :description, :price,
            :initialQuantity, :minimumStock, :maximumStock, :unit)
         RETURNING id INTO :id`,
        {
          marketId: auth.marketId,
          categoryId: input.categoryId,
          code: input.code,
          name: input.name,
          description: input.description,
          price: input.price,
          initialQuantity: input.initialStock?.quantity ?? 0,
          minimumStock: input.minimumStock,
          maximumStock: input.maximumStock,
          unit: input.unit,
          id: outNumber,
        },
      );
      const productId = insertedId(result);

      if (input.initialStock) {
        const stock = input.initialStock;
        const batchResult = await execute(
          connection,
          `INSERT INTO batches
             (market_id, product_id, supplier_id, code, quantity, purchase_price, expiry_date, received_at)
           VALUES
             (:marketId, :productId, :supplierId, :batchCode, :quantity, :purchasePrice,
              TO_DATE(:expiryDate, 'YYYY-MM-DD'), SYSTIMESTAMP)
           RETURNING id INTO :id`,
          { marketId: auth.marketId, productId, ...stock, id: outNumber },
        );
        const batchId = insertedId(batchResult);
        const movementResult = await execute(
          connection,
          `INSERT INTO stock_movements (market_id, type, notes, created_by)
           VALUES (:marketId, 'ENTRY', 'Estoque inicial do produto', :userId)
           RETURNING id INTO :id`,
          { marketId: auth.marketId, userId: auth.userId, id: outNumber },
        );
        await execute(
          connection,
          `INSERT INTO stock_movement_items
             (movement_id, market_id, product_id, batch_id, supplier_id, quantity, unit_purchase_price)
           VALUES
             (:movementId, :marketId, :productId, :batchId, :supplierId, :quantity, :purchasePrice)`,
          {
            movementId: insertedId(movementResult),
            marketId: auth.marketId,
            productId,
            batchId,
            supplierId: stock.supplierId,
            quantity: stock.quantity,
            purchasePrice: stock.purchasePrice,
          },
        );
      }

      return productId;
    });
    response.status(201).json({
      id,
      marketId: auth.marketId,
      code: input.code,
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      price: input.price,
      minimumStock: input.minimumStock,
      maximumStock: input.maximumStock,
      unit: input.unit,
      currentQuantity: input.initialStock?.quantity ?? 0,
      active: true,
    });
  } catch (error) {
    if (isOracleUniqueViolation(error)) {
      throw new HttpError(409, 'Já existe um produto com esse código no mercado.', 'PRODUCT_CODE_EXISTS');
    }
    throw error;
  }
});

productsRouter.put('/:id', requireRole('ADMIN'), async (request, response) => {
  const auth = authOf(request);
  const id = parseId(request.params.id ?? '', 'Produto');
  const input = parseBody(productSchema, request);
  try {
    const changed = await withTransaction(async (connection) => {
      const category = await execute(
        connection,
        `SELECT id FROM categories
         WHERE id = :categoryId AND market_id = :marketId AND active = 1`,
        { categoryId: input.categoryId, marketId: auth.marketId },
      );
      if (!firstRow(category)) notFound('Categoria ativa não encontrada.');
      const result = await execute(
        connection,
        `UPDATE products
         SET category_id = :categoryId, code = :code, name = :name,
             description = :description, price = :price, minimum_stock = :minimumStock,
             maximum_stock = :maximumStock, unit = :unit, updated_at = SYSTIMESTAMP
         WHERE id = :id AND market_id = :marketId`,
        { id, marketId: auth.marketId, ...input },
      );
      return (result.rowsAffected ?? 0) > 0;
    });
    if (!changed) notFound('Produto não encontrado.');
    response.status(204).send();
  } catch (error) {
    if (isOracleUniqueViolation(error)) {
      throw new HttpError(409, 'Já existe outro produto com esse código no mercado.', 'PRODUCT_CODE_EXISTS');
    }
    throw error;
  }
});

productsRouter.patch('/:id/status', requireRole('ADMIN'), async (request, response) => {
  const auth = authOf(request);
  const id = parseId(request.params.id ?? '', 'Produto');
  const { active } = parseBody(z.object({ active: z.boolean() }), request);
  const changed = await withTransaction(async (connection) => {
    const result = await execute(
      connection,
      `UPDATE products SET active = :active, updated_at = SYSTIMESTAMP
       WHERE id = :id AND market_id = :marketId`,
      { id, marketId: auth.marketId, active: active ? 1 : 0 },
    );
    return (result.rowsAffected ?? 0) > 0;
  });
  if (!changed) notFound('Produto não encontrado.');
  response.status(204).send();
});

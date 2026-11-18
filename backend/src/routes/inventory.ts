import { Router } from 'express';
import { z } from 'zod';
import { execute, firstRow, insertedId, outNumber, rowsOf, withTransaction } from '../database/oracle.js';
import { authenticate, authOf } from '../middleware/auth.js';
import { allocateFefo } from '../services/fefo.js';
import type { FefoBatch } from '../types/domain.js';
import { HttpError, notFound } from '../utils/http-error.js';
import { parseBody } from '../utils/validation.js';

export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

const quantitySchema = z.number().positive().max(999999999);

const entrySchema = z.object({
  productId: z.number().int().positive(),
  supplierId: z.number().int().positive(),
  batchCode: z.string().trim().min(1).max(60),
  quantity: quantitySchema,
  purchasePrice: z.number().min(0).max(999999999),
  expiryDate: z.iso.date(),
  notes: z.string().trim().max(500).optional(),
});

const exitReasonSchema = z.enum(['SALE', 'LOSS', 'EXPIRY', 'DAMAGE', 'INTERNAL_USE', 'ADJUSTMENT']);
const exitSchema = z.object({
  reason: exitReasonSchema,
  notes: z.string().trim().max(500).optional(),
  items: z.array(z.object({ productId: z.number().int().positive(), quantity: quantitySchema })).min(1).max(100),
}).superRefine((data, context) => {
  const productIds = new Set<number>();
  data.items.forEach((item, index) => {
    if (productIds.has(item.productId)) {
      context.addIssue({
        code: 'custom',
        path: ['items', index, 'productId'],
        message: 'O mesmo produto não pode aparecer duas vezes na saída.',
      });
    }
    productIds.add(item.productId);
  });
});

interface ExistingBatchRow {
  id: number;
  supplierId: number;
  quantity: number;
  purchasePrice: number;
  expiryDateText: string;
}

inventoryRouter.post('/entries', async (request, response) => {
  const auth = authOf(request);
  const input = parseBody(entrySchema, request);

  const result = await withTransaction(async (connection) => {
    const productResult = await execute(
      connection,
      `SELECT id, name FROM products
       WHERE id = :productId AND market_id = :marketId AND active = 1
       FOR UPDATE`,
      { productId: input.productId, marketId: auth.marketId },
    );
    const product = firstRow<{ id: number; name: string }>(productResult);
    if (!product) notFound('Produto ativo não encontrado.');

    const supplierResult = await execute(
      connection,
      `SELECT id, name FROM suppliers
       WHERE id = :supplierId AND market_id = :marketId AND active = 1`,
      { supplierId: input.supplierId, marketId: auth.marketId },
    );
    const supplier = firstRow<{ id: number; name: string }>(supplierResult);
    if (!supplier) notFound('Fornecedor ativo não encontrado.');

    const batchResult = await execute(
      connection,
      `SELECT id, supplier_id, quantity, purchase_price,
              TO_CHAR(expiry_date, 'YYYY-MM-DD') AS expiry_date_text
       FROM batches
       WHERE market_id = :marketId AND product_id = :productId AND UPPER(code) = UPPER(:batchCode)
       FOR UPDATE`,
      { marketId: auth.marketId, productId: input.productId, batchCode: input.batchCode },
    );
    const existingBatch = firstRow<ExistingBatchRow>(batchResult);
    let batchId: number;
    let averagePurchasePrice = input.purchasePrice;

    if (existingBatch) {
      if (existingBatch.supplierId !== input.supplierId || existingBatch.expiryDateText !== input.expiryDate) {
        throw new HttpError(
          409,
          'Esse código de lote já existe para o produto com outro fornecedor ou validade.',
          'BATCH_DATA_CONFLICT',
        );
      }
      const newQuantity = existingBatch.quantity + input.quantity;
      averagePurchasePrice =
        (existingBatch.quantity * existingBatch.purchasePrice + input.quantity * input.purchasePrice) / newQuantity;
      batchId = existingBatch.id;
      await execute(
        connection,
        `UPDATE batches
         SET quantity = :quantity, purchase_price = :purchasePrice, updated_at = SYSTIMESTAMP
         WHERE id = :id AND market_id = :marketId`,
        { id: batchId, marketId: auth.marketId, quantity: newQuantity, purchasePrice: averagePurchasePrice },
      );
    } else {
      const insertedBatch = await execute(
        connection,
        `INSERT INTO batches
           (market_id, product_id, supplier_id, code, quantity, purchase_price, expiry_date, received_at)
         VALUES
           (:marketId, :productId, :supplierId, :batchCode, :quantity, :purchasePrice,
            TO_DATE(:expiryDate, 'YYYY-MM-DD'), SYSTIMESTAMP)
         RETURNING id INTO :id`,
        {
          marketId: auth.marketId,
          productId: input.productId,
          supplierId: input.supplierId,
          batchCode: input.batchCode,
          quantity: input.quantity,
          purchasePrice: input.purchasePrice,
          expiryDate: input.expiryDate,
          id: outNumber,
        },
      );
      batchId = insertedId(insertedBatch);
    }

    await execute(
      connection,
      `UPDATE products
       SET current_quantity = current_quantity + :quantity, updated_at = SYSTIMESTAMP
       WHERE id = :productId AND market_id = :marketId`,
      { quantity: input.quantity, productId: input.productId, marketId: auth.marketId },
    );

    const movementResult = await execute(
      connection,
      `INSERT INTO stock_movements (market_id, type, notes, created_by)
       VALUES (:marketId, 'ENTRY', :notes, :userId)
       RETURNING id INTO :id`,
      { marketId: auth.marketId, notes: input.notes ?? null, userId: auth.userId, id: outNumber },
    );
    const movementId = insertedId(movementResult);
    await execute(
      connection,
      `INSERT INTO stock_movement_items
         (movement_id, market_id, product_id, batch_id, supplier_id, quantity, unit_purchase_price)
       VALUES
         (:movementId, :marketId, :productId, :batchId, :supplierId, :quantity, :purchasePrice)`,
      {
        movementId,
        marketId: auth.marketId,
        productId: input.productId,
        batchId,
        supplierId: input.supplierId,
        quantity: input.quantity,
        purchasePrice: input.purchasePrice,
      },
    );

    return {
      movementId,
      product: { id: product.id, name: product.name },
      supplier: { id: supplier.id, name: supplier.name },
      batch: { id: batchId, code: input.batchCode, averagePurchasePrice },
      quantity: input.quantity,
    };
  });

  response.status(201).json(result);
});

inventoryRouter.post('/exits', async (request, response) => {
  const auth = authOf(request);
  const input = parseBody(exitSchema, request);

  const result = await withTransaction(async (connection) => {
    const movementResult = await execute(
      connection,
      `INSERT INTO stock_movements (market_id, type, exit_reason, notes, created_by)
       VALUES (:marketId, 'EXIT', :reason, :notes, :userId)
       RETURNING id INTO :id`,
      { marketId: auth.marketId, reason: input.reason, notes: input.notes ?? null, userId: auth.userId, id: outNumber },
    );
    const movementId = insertedId(movementResult);
    const completedItems: Array<Record<string, unknown>> = [];

    for (const item of input.items) {
      const productResult = await execute(
        connection,
        `SELECT id, name, current_quantity FROM products
         WHERE id = :productId AND market_id = :marketId AND active = 1
         FOR UPDATE`,
        { productId: item.productId, marketId: auth.marketId },
      );
      const product = firstRow<{ id: number; name: string; currentQuantity: number }>(productResult);
      if (!product) notFound(`Produto ${item.productId} não encontrado ou inativo.`);
      if (product.currentQuantity < item.quantity) {
        throw new HttpError(409, `Estoque insuficiente para ${product.name}.`, 'INSUFFICIENT_STOCK', {
          productId: product.id,
          requested: item.quantity,
          available: product.currentQuantity,
        });
      }

      const batchesResult = await execute(
        connection,
        `SELECT id, quantity, expiry_date, received_at
         FROM batches
         WHERE market_id = :marketId AND product_id = :productId AND quantity > 0
         ORDER BY expiry_date NULLS LAST, received_at, id
         FOR UPDATE`,
        { marketId: auth.marketId, productId: item.productId },
      );
      const batches = rowsOf<FefoBatch>(batchesResult);
      const allocations = allocateFefo(batches, item.quantity);

      for (const allocation of allocations) {
        await execute(
          connection,
          `UPDATE batches
           SET quantity = quantity - :quantity, updated_at = SYSTIMESTAMP
           WHERE id = :batchId AND market_id = :marketId AND quantity >= :quantity`,
          { quantity: allocation.quantity, batchId: allocation.batchId, marketId: auth.marketId },
        );
        await execute(
          connection,
          `INSERT INTO stock_movement_items
             (movement_id, market_id, product_id, batch_id, quantity)
           VALUES (:movementId, :marketId, :productId, :batchId, :quantity)`,
          {
            movementId,
            marketId: auth.marketId,
            productId: item.productId,
            batchId: allocation.batchId,
            quantity: allocation.quantity,
          },
        );
      }

      await execute(
        connection,
        `UPDATE products
         SET current_quantity = current_quantity - :quantity, updated_at = SYSTIMESTAMP
         WHERE id = :productId AND market_id = :marketId AND current_quantity >= :quantity`,
        { quantity: item.quantity, productId: item.productId, marketId: auth.marketId },
      );
      completedItems.push({ productId: product.id, productName: product.name, quantity: item.quantity, allocations });
    }

    return { movementId, reason: input.reason, items: completedItems };
  });

  response.status(201).json(result);
});

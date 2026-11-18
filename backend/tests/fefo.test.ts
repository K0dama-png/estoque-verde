import assert from 'node:assert/strict';
import test from 'node:test';
import { allocateFefo } from '../src/services/fefo.js';

test('prioriza o lote com vencimento mais próximo', () => {
  const result = allocateFefo(
    [
      { id: 1, quantity: 8, expiryDate: new Date('2027-06-01'), receivedAt: new Date('2026-01-01') },
      { id: 2, quantity: 4, expiryDate: new Date('2027-01-01'), receivedAt: new Date('2026-02-01') },
    ],
    7,
  );

  assert.deepEqual(result, [
    { batchId: 2, quantity: 4 },
    { batchId: 1, quantity: 3 },
  ]);
});

test('deixa lotes sem validade por último', () => {
  const result = allocateFefo(
    [
      { id: 1, quantity: 2, expiryDate: null, receivedAt: new Date('2025-01-01') },
      { id: 2, quantity: 2, expiryDate: new Date('2028-01-01'), receivedAt: new Date('2026-01-01') },
    ],
    3,
  );

  assert.deepEqual(result, [
    { batchId: 2, quantity: 2 },
    { batchId: 1, quantity: 1 },
  ]);
});

test('rejeita a operação quando o saldo é insuficiente', () => {
  assert.throws(
    () => allocateFefo([{ id: 1, quantity: 2, expiryDate: null, receivedAt: new Date() }], 3),
    (error: unknown) => error instanceof Error && error.message.includes('Estoque insuficiente'),
  );
});

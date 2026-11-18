import type { FefoAllocation, FefoBatch } from '../types/domain.js';
import { HttpError } from '../utils/http-error.js';

export function allocateFefo(batches: FefoBatch[], requestedQuantity: number): FefoAllocation[] {
  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
    throw new HttpError(400, 'A quantidade de saída deve ser positiva.', 'INVALID_QUANTITY');
  }

  const orderedBatches = [...batches]
    .filter((batch) => batch.quantity > 0)
    .sort((a, b) => {
      if (a.expiryDate && b.expiryDate) {
        const expiryDifference = a.expiryDate.getTime() - b.expiryDate.getTime();
        if (expiryDifference !== 0) return expiryDifference;
      } else if (a.expiryDate) {
        return -1;
      } else if (b.expiryDate) {
        return 1;
      }
      return a.receivedAt.getTime() - b.receivedAt.getTime();
    });

  const available = orderedBatches.reduce((total, batch) => total + batch.quantity, 0);
  if (available < requestedQuantity) {
    throw new HttpError(409, 'Estoque insuficiente para concluir a saída.', 'INSUFFICIENT_STOCK', {
      requested: requestedQuantity,
      available,
    });
  }

  let remaining = requestedQuantity;
  const allocations: FefoAllocation[] = [];

  for (const batch of orderedBatches) {
    if (remaining === 0) break;
    const quantity = Math.min(batch.quantity, remaining);
    allocations.push({ batchId: batch.id, quantity });
    remaining -= quantity;
  }

  return allocations;
}

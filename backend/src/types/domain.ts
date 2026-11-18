export type Role = 'ADMIN' | 'EMPLOYEE';
export type MovementType = 'ENTRY' | 'EXIT';
export type StockExitReason =
  | 'SALE'
  | 'LOSS'
  | 'EXPIRY'
  | 'DAMAGE'
  | 'INTERNAL_USE'
  | 'ADJUSTMENT';

export interface AuthUser {
  userId: number;
  marketId: number;
  role: Role;
  username: string;
}

export interface TokenPayload extends AuthUser {
  type: 'access';
}

export interface FefoBatch {
  id: number;
  quantity: number;
  expiryDate: Date | null;
  receivedAt: Date;
}

export interface FefoAllocation {
  batchId: number;
  quantity: number;
}

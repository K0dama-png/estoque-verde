export type Role = 'ADMIN' | 'EMPLOYEE';
export type ScreenKey = 'dashboard' | 'products' | 'categories' | 'suppliers' | 'movements' | 'users' | 'reports' | 'profile';
export type MovementType = 'ENTRY' | 'EXIT';
export type StockExitReason = 'SALE' | 'LOSS' | 'EXPIRY' | 'DAMAGE' | 'INTERNAL_USE' | 'ADJUSTMENT';

export interface User {
  id: number;
  marketId: number;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
}

export interface Market {
  id: number;
  name: string;
  document: string;
  city: string;
  active: boolean;
}

export interface RegistrationInput {
  managerName: string;
  marketName: string;
  document: string;
  city: string;
  username: string;
  password: string;
}

export interface Supplier {
  id: number;
  marketId: number;
  name: string;
  document: string;
  phone: string;
  active: boolean;
}

export interface SupplierRegistrationInput {
  name: string;
  document: string;
  phone: string;
}

export interface Category {
  id: number;
  marketId: number;
  name: string;
  active: boolean;
  isDefault: boolean;
}

export interface EmployeeRegistrationInput {
  name: string;
  username: string;
  password: string;
}

export interface Product {
  id: number;
  marketId: number;
  code: string;
  name: string;
  description: string;
  categoryId: number;
  category: string;
  price: number;
  quantity: number;
  minimumStock: number;
  maximumStock: number;
  expiryDate: string;
  unit: string;
  active: boolean;
}

export interface Batch {
  id: number;
  marketId: number;
  productId: number;
  supplierId?: number;
  code: string;
  quantity: number;
  purchasePrice: number;
  expiryDate: string;
  receivedAt: string;
}

export interface Movement {
  id: number;
  marketId: number;
  productId: number;
  productName: string;
  batchCode?: string;
  supplierName?: string;
  purchasePrice?: number;
  exitReason?: StockExitReason;
  type: MovementType;
  quantity: number;
  createdAt: string;
  userName: string;
}

export interface StockExitItemInput {
  productId: number;
  quantity: number;
}

import { apiRequest } from './apiClient';
import type {
  Batch,
  Category,
  EmployeeRegistrationInput,
  Market,
  Movement,
  Product,
  RegistrationInput,
  StockExitItemInput,
  StockExitReason,
  Supplier,
  SupplierRegistrationInput,
  User,
} from '../types';

interface SessionResponse {
  token: string;
  user: Omit<User, 'active'>;
  market: Omit<Market, 'active'>;
}

interface MeResponse {
  id: number;
  marketId: number;
  name: string;
  username: string;
  role: User['role'];
  mustChangePassword: boolean;
  marketName: string;
  marketDocument: string;
  marketCity: string;
}

interface ProductRow {
  id: number;
  marketId: number;
  code: string;
  name: string;
  description: string;
  categoryId: number;
  categoryName: string;
  price: number;
  currentQuantity: number;
  minimumStock: number;
  maximumStock: number;
  unit: string;
  active: boolean;
  nearestExpiryDate?: string | null;
}

interface ProductDetailRow extends ProductRow {
  batches: Array<{
    id: number;
    code: string;
    quantity: number;
    purchasePrice: number;
    expiryDate: string;
    receivedAt: string;
    supplierId: number;
  }>;
}

interface MovementRow {
  movementId: number;
  itemId: number;
  type: Movement['type'];
  exitReason?: StockExitReason;
  createdAt: string;
  userName: string;
  productId: number;
  productName: string;
  batchCode?: string;
  quantity: number;
  unitPurchasePrice?: number;
  supplierName?: string;
}

interface StockReportRow {
  productId: number;
  batchId?: number | null;
  batchCode?: string | null;
  batchQuantity?: number | null;
  purchasePrice?: number | null;
  expiryDate?: string | null;
  receivedAt?: string | null;
  supplierId?: number | null;
}

export interface ApplicationData {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  movements: Movement[];
  users: User[];
  batches: Batch[];
}

export const authApi = {
  async login(username: string, password: string) {
    return normalizeSession(await apiRequest<SessionResponse>('/auth/login', {
      method: 'POST', body: { username, password }, authenticated: false,
    }));
  },
  async registerMarket(input: RegistrationInput) {
    return normalizeSession(await apiRequest<SessionResponse>('/auth/register-market', {
      method: 'POST', body: input, authenticated: false,
    }));
  },
  async me() {
    const data = await apiRequest<MeResponse>('/auth/me');
    return {
      user: {
        id: data.id,
        marketId: data.marketId,
        name: data.name,
        username: data.username,
        role: data.role,
        active: true,
        mustChangePassword: data.mustChangePassword,
      } satisfies User,
      market: {
        id: data.marketId,
        name: data.marketName,
        document: data.marketDocument,
        city: data.marketCity,
        active: true,
      } satisfies Market,
    };
  },
  changePassword(currentPassword: string, newPassword: string) {
    return apiRequest('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
  },
};

export async function loadApplicationData(user: User): Promise<ApplicationData> {
  const commonRequests = await Promise.all([
    apiRequest<ProductRow[]>('/products?active=all'),
    apiRequest<Category[]>('/categories'),
    apiRequest<Supplier[]>('/suppliers'),
    apiRequest<{ items: MovementRow[] }>('/movements?pageSize=100'),
  ]);
  const [productRows, categories, suppliers, movementPage] = commonRequests;
  const [users, stockRows] = user.role === 'ADMIN'
    ? await Promise.all([apiRequest<User[]>('/users'), apiRequest<StockReportRow[]>('/reports/stock')])
    : [[], []] as [User[], StockReportRow[]];

  return {
    products: productRows.map(toProduct),
    categories,
    suppliers,
    movements: movementPage.items.map((row) => toMovement(row, user.marketId)),
    users,
    batches: stockRows.filter((row) => row.batchId && row.batchCode).map((row) => ({
      id: row.batchId!,
      marketId: user.marketId,
      productId: row.productId,
      supplierId: row.supplierId ?? undefined,
      code: row.batchCode!,
      quantity: row.batchQuantity ?? 0,
      purchasePrice: row.purchasePrice ?? 0,
      expiryDate: row.expiryDate ?? '9999-12-31',
      receivedAt: row.receivedAt ?? new Date().toISOString(),
    })),
  };
}

export const usersApi = {
  create(input: EmployeeRegistrationInput) {
    return apiRequest<User>('/users', { method: 'POST', body: input });
  },
  setStatus(id: number, active: boolean) {
    return apiRequest(`/users/${id}/status`, { method: 'PATCH', body: { active } });
  },
};

export const categoriesApi = {
  create(name: string) {
    return apiRequest<Category>('/categories', { method: 'POST', body: { name } });
  },
  update(id: number, name: string) {
    return apiRequest(`/categories/${id}`, { method: 'PUT', body: { name } });
  },
  setStatus(id: number, active: boolean) {
    return apiRequest(`/categories/${id}/status`, { method: 'PATCH', body: { active } });
  },
};

export const suppliersApi = {
  create(input: SupplierRegistrationInput) {
    return apiRequest<Supplier>('/suppliers', { method: 'POST', body: input });
  },
  setStatus(id: number, active: boolean) {
    return apiRequest(`/suppliers/${id}/status`, { method: 'PATCH', body: { active } });
  },
};

export const productsApi = {
  async create(
    product: Omit<Product, 'id' | 'marketId' | 'active'>,
    initialStock?: { batchCode: string; supplierId: number; purchasePrice: number },
  ) {
    return apiRequest('/products', {
      method: 'POST',
      body: {
        code: product.code,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        price: product.price,
        minimumStock: product.minimumStock,
        maximumStock: product.maximumStock,
        unit: product.unit.toUpperCase(),
        ...(product.quantity > 0 && initialStock ? {
          initialStock: {
            ...initialStock,
            quantity: product.quantity,
            expiryDate: product.expiryDate,
          },
        } : {}),
      },
    });
  },
  setStatus(id: number, active: boolean) {
    return apiRequest(`/products/${id}/status`, { method: 'PATCH', body: { active } });
  },
  async detail(id: number, marketId: number) {
    const row = await apiRequest<ProductDetailRow>(`/products/${id}`);
    return {
      product: toProduct(row),
      batches: row.batches.map((batch) => ({
        id: batch.id,
        marketId,
        productId: row.id,
        supplierId: batch.supplierId,
        code: batch.code,
        quantity: batch.quantity,
        purchasePrice: batch.purchasePrice,
        expiryDate: batch.expiryDate,
        receivedAt: batch.receivedAt,
      } satisfies Batch)),
    };
  },
};

export const inventoryApi = {
  entry(input: { productId: number; quantity: number; batchCode: string; expiryDate: string; supplierId: number; purchasePrice: number }) {
    return apiRequest('/inventory/entries', { method: 'POST', body: input });
  },
  exit(items: StockExitItemInput[], reason: StockExitReason) {
    return apiRequest('/inventory/exits', { method: 'POST', body: { items, reason } });
  },
};

function normalizeSession(response: SessionResponse) {
  return {
    token: response.token,
    user: { ...response.user, active: true } satisfies User,
    market: { ...response.market, active: true } satisfies Market,
  };
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    marketId: row.marketId,
    code: row.code,
    name: row.name,
    description: row.description ?? '',
    categoryId: row.categoryId,
    category: row.categoryName,
    price: row.price,
    quantity: row.currentQuantity,
    minimumStock: row.minimumStock,
    maximumStock: row.maximumStock,
    expiryDate: row.nearestExpiryDate ?? '9999-12-31',
    unit: row.unit.toLowerCase(),
    active: row.active,
  };
}

function toMovement(row: MovementRow, marketId: number): Movement {
  return {
    id: row.itemId,
    marketId,
    productId: row.productId,
    productName: row.productName,
    batchCode: row.batchCode,
    supplierName: row.supplierName,
    purchasePrice: row.unitPurchasePrice,
    exitReason: row.exitReason,
    type: row.type,
    quantity: row.quantity,
    createdAt: row.createdAt,
    userName: row.userName,
  };
}

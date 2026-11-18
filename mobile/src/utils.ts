import { Product } from './types';

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(value.length === 10 ? `${value}T12:00:00` : value),
  );

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export const isLowStock = (product: Product) => product.quantity <= product.minimumStock;

export const daysUntilExpiry = (expiryDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate.length === 10 ? `${expiryDate}T00:00:00` : expiryDate);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
};

export const isNearExpiry = (product: Product) => daysUntilExpiry(product.expiryDate) <= 30;

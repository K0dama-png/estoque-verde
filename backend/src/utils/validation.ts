import type { Request } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from './http-error.js';

export function parseBody<T>(schema: ZodType<T>, request: Request): T {
  const result = schema.safeParse(request.body);
  if (!result.success) {
    throw new HttpError(400, 'Dados inválidos.', 'VALIDATION_ERROR', result.error.flatten());
  }
  return result.data;
}

export function parseQuery<T>(schema: ZodType<T>, request: Request): T {
  const result = schema.safeParse(request.query);
  if (!result.success) {
    throw new HttpError(400, 'Filtros inválidos.', 'VALIDATION_ERROR', result.error.flatten());
  }
  return result.data;
}

export function parseId(value: string | string[], field = 'id'): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `${field} inválido.`, 'VALIDATION_ERROR');
  }
  return parsed;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

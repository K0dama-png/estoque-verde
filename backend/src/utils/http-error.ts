export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'REQUEST_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function notFound(message: string): never {
  throw new HttpError(404, message, 'NOT_FOUND');
}

export function forbidden(message = 'Você não tem permissão para realizar esta ação.'): never {
  throw new HttpError(403, message, 'FORBIDDEN');
}

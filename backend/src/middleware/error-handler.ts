import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    error: { code: 'ROUTE_NOT_FOUND', message: `Rota ${request.method} ${request.path} não encontrada.` },
  });
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos.', details: error.flatten() },
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Não foi possível concluir a operação.',
      ...(env.NODE_ENV === 'development' && error instanceof Error ? { details: error.message } : {}),
    },
  });
};

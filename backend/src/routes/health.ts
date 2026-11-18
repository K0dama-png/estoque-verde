import { Router } from 'express';
import { execute, withConnection } from '../database/oracle.js';

export const healthRouter = Router();

healthRouter.get('/', async (_request, response) => {
  await withConnection((connection) => execute(connection, 'SELECT 1 AS database_ok FROM dual'));
  response.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
});

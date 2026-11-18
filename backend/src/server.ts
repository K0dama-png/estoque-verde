import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDatabase, initializeDatabase } from './database/oracle.js';

async function start(): Promise<void> {
  await initializeDatabase();
  const app = createApp();
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`LoteCerto API disponível na porta ${env.PORT}.`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} recebido. Encerrando a API...`);
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('Falha ao iniciar a API:', error);
  process.exit(1);
});

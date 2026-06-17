import { initDb, flushDb } from './db/index.js';
import { createApp } from './app.js';
import { config } from './config.js';
import { log } from './logger.js';

async function main() {
  await initDb();
  const app = createApp();
  app.listen(config.port, () => {
    log.info(`Linkpad server running on http://localhost:${config.port}`);
  });

  // Database writes are debounced — flush pending changes on shutdown
  // (docker stop sends SIGTERM; Ctrl+C sends SIGINT)
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      flushDb();
      process.exit(0);
    });
  }
}

main().catch((e) => log.error(e));

import { initDb } from './db/index.js';
import { createApp } from './app.js';
import { config } from './config.js';

async function main() {
  await initDb();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Linky server running on http://localhost:${config.port}`);
  });
}

main().catch(console.error);

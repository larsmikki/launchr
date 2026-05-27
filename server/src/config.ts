import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const port = Number(process.env.PORT) || 3021;
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

export const config = {
  port,
  dataDir,
  iconsDir: path.join(dataDir, 'icons'),
  dbPath: path.join(dataDir, 'linky.db'),
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [`http://localhost:${port}`, 'http://localhost:3020'],
};

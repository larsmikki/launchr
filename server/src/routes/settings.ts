import { Router, Request, Response } from 'express';
import { queryAll, runSql } from '../db/index.js';

const router = Router();

// #1: Allowlist of accepted setting keys — rejects unknown keys
const SETTINGS_KEYS = new Set([
  'layout_mode', 'column_extra_width', 'link_target',
]);

router.get('/settings', (_req: Request, res: Response) => {
  const rows = queryAll('SELECT key, value FROM settings');
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

router.put('/settings', (req: Request, res: Response) => {
  for (const [key, value] of Object.entries(req.body)) {
    if (!SETTINGS_KEYS.has(key)) continue;
    runSql('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, String(value)]);
  }
  res.json({ ok: true });
});

export default router;

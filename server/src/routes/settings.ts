import { Router, Request, Response } from 'express';
import { queryAll, runSql } from '../db/index.js';
import type { SettingRow } from '../db/types.js';
import { parseBody, settingsUpdate } from '../validation.js';

const router = Router();

router.get('/settings', (_req: Request, res: Response) => {
  const rows = queryAll<SettingRow>('SELECT key, value FROM settings');
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

// #1: Schema strips unknown keys — only allowlisted settings are persisted
router.put('/settings', (req: Request, res: Response) => {
  const parsed = parseBody(settingsUpdate, req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined) continue;
    runSql('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
  }
  res.json({ ok: true });
});

export default router;

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { queryAll, execSql, transaction } from '../db/index.js';
import type { GroupRow, SettingRow, ShortcutRow } from '../db/types.js';
import { config } from '../config.js';
import { parseBody, importPayload } from '../validation.js';

const router = Router();
const ICONS_DIR = config.iconsDir;

router.get('/export', (_req: Request, res: Response) => {
  const settings = queryAll<SettingRow>('SELECT key, value FROM settings');
  const groups = queryAll<GroupRow>('SELECT * FROM groups ORDER BY sort_order, id');
  const shortcuts = queryAll<ShortcutRow>('SELECT * FROM shortcuts ORDER BY sort_order, id');

  // Read icon files as base64
  const icons: Record<string, string> = {};
  for (const sc of shortcuts) {
    if (sc.icon_path) {
      const iconFile = path.join(ICONS_DIR, sc.icon_path);
      if (fs.existsSync(iconFile)) {
        icons[sc.icon_path] = fs.readFileSync(iconFile).toString('base64');
      }
    }
  }

  res.json({ settings, groups, shortcuts, icons });
});

// #1 (code): Validate the whole payload BEFORE touching existing data, then
// replace everything inside one transaction with a single flush at the end.
// A bad backup file now leaves the current data fully intact.
router.post('/import', (req: Request, res: Response) => {
  const parsed = parseBody(importPayload, req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const { settings = [], groups = [], shortcuts = [], icons = {} } = parsed.data;

  transaction(() => {
    execSql('DELETE FROM shortcuts');
    execSql('DELETE FROM groups');
    execSql('DELETE FROM settings');

    for (const s of settings) {
      execSql('INSERT INTO settings (key, value) VALUES (?, ?)', [s.key, s.value]);
    }

    // Preserve original IDs for FK references
    for (const g of groups) {
      execSql(
        'INSERT INTO groups (id, title, color, collapsed, grid_x, grid_y, grid_w, grid_h, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [g.id, g.title, g.color, g.collapsed, g.grid_x, g.grid_y, g.grid_w, g.grid_h, g.sort_order]
      );
    }

    for (const s of shortcuts) {
      execSql(
        'INSERT INTO shortcuts (id, title, url, icon_type, icon_path, favicon_cached, grid_x, grid_y, group_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [s.id, s.title, s.url, s.icon_type, s.icon_path, s.favicon_cached, s.grid_x, s.grid_y, s.group_id, s.sort_order]
      );
    }
  });

  // Replace icon files only after the database import committed
  if (fs.existsSync(ICONS_DIR)) {
    for (const file of fs.readdirSync(ICONS_DIR)) {
      fs.unlinkSync(path.join(ICONS_DIR, file));
    }
  }
  for (const [filename, base64] of Object.entries(icons)) {
    fs.writeFileSync(path.join(ICONS_DIR, filename), Buffer.from(base64, 'base64'));
  }

  res.json({ ok: true });
});

export default router;

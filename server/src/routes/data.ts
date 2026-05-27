import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { queryAll, runSql } from '../db/index.js';
import { config } from '../config.js';

const router = Router();
const ICONS_DIR = config.iconsDir;

router.get('/export', (_req: Request, res: Response) => {
  const settings = queryAll('SELECT key, value FROM settings');
  const groups = queryAll('SELECT * FROM groups ORDER BY sort_order, id');
  const shortcuts = queryAll('SELECT * FROM shortcuts ORDER BY sort_order, id');

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

router.post('/import', (req: Request, res: Response) => {
  const { settings, groups, shortcuts, icons } = req.body;

  // Clear existing data
  runSql('DELETE FROM shortcuts');
  runSql('DELETE FROM groups');
  runSql('DELETE FROM settings');

  // Clear icon files
  if (fs.existsSync(ICONS_DIR)) {
    for (const file of fs.readdirSync(ICONS_DIR)) {
      fs.unlinkSync(path.join(ICONS_DIR, file));
    }
  }

  // Import settings
  if (settings) {
    for (const s of settings) {
      runSql('INSERT INTO settings (key, value) VALUES (?, ?)', [s.key, s.value]);
    }
  }

  // Import groups (preserve original IDs for FK references)
  if (groups) {
    for (const g of groups) {
      runSql(
        'INSERT INTO groups (id, title, color, collapsed, grid_x, grid_y, grid_w, grid_h, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [g.id, g.title, g.color, g.collapsed || 0, g.grid_x || 0, g.grid_y || 0, g.grid_w || 4, g.grid_h || 4, g.sort_order || 0]
      );
    }
  }

  // Import shortcuts
  if (shortcuts) {
    for (const s of shortcuts) {
      runSql(
        'INSERT INTO shortcuts (id, title, url, icon_type, icon_path, favicon_cached, grid_x, grid_y, group_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [s.id, s.title, s.url, s.icon_type || 'favicon', s.icon_path, s.favicon_cached || 0, s.grid_x || 0, s.grid_y || 0, s.group_id, s.sort_order || 0]
      );
    }
  }

  // Restore icon files from base64
  if (icons) {
    const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'];
    for (const [filename, base64] of Object.entries(icons)) {
      if (!/^[a-zA-Z0-9._-]+$/.test(filename) || !allowedExts.some(ext => filename.toLowerCase().endsWith(ext))) {
        return res.status(400).json({ error: `Invalid filename in import: ${filename}` });
      }
      fs.writeFileSync(path.join(ICONS_DIR, filename), Buffer.from(base64 as string, 'base64'));
    }
  }

  res.json({ ok: true });
});

export default router;

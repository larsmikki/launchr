import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { queryAll, queryOne, runSql, execSql, runInsert, saveDb, ICONS_DIR } from './db';
import { fetchFavicon } from './favicon';

const router = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: ICONS_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `manual_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ---- Settings ----

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

// ---- Groups ----

router.get('/groups', (_req: Request, res: Response) => {
  const groups = queryAll('SELECT * FROM groups ORDER BY sort_order, id');
  res.json(groups);
});

router.post('/groups', (req: Request, res: Response) => {
  const { title = '', color = '#e0e7ff', grid_x = 0, grid_y = 0, grid_w = 4, grid_h = 4 } = req.body;
  const id = runInsert(
    'INSERT INTO groups (title, color, grid_x, grid_y, grid_w, grid_h) VALUES (?, ?, ?, ?, ?, ?)',
    [title, color, grid_x, grid_y, grid_w, grid_h]
  );
  const group = queryOne('SELECT * FROM groups WHERE id = ?', [id]);
  res.status(201).json(group);
});

router.put('/groups/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const fields: string[] = [];
  const values: any[] = [];
  for (const col of ['title', 'color', 'collapsed', 'grid_x', 'grid_y', 'grid_w', 'grid_h', 'sort_order']) {
    if (req.body[col] !== undefined) {
      fields.push(`${col} = ?`);
      values.push(req.body[col]);
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(Number(id));
  runSql(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`, values);
  const group = queryOne('SELECT * FROM groups WHERE id = ?', [Number(id)]);
  res.json(group);
});

router.delete('/groups/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  runSql('UPDATE shortcuts SET group_id = NULL WHERE group_id = ?', [id]);
  runSql('DELETE FROM groups WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ---- Shortcuts ----

// #3: Integer columns that must be coerced before storage
const SHORTCUT_INT_COLS = new Set(['favicon_cached', 'grid_x', 'grid_y', 'sort_order']);

router.get('/shortcuts', (_req: Request, res: Response) => {
  const shortcuts = queryAll('SELECT * FROM shortcuts ORDER BY sort_order, id');
  res.json(shortcuts);
});

router.post('/shortcuts', async (req: Request, res: Response) => {
  const { title, url, grid_x = 0, grid_y = 0, group_id = null } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'title and url required' });
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'URL must use http or https protocol' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const shortcutId = runInsert(
    'INSERT INTO shortcuts (title, url, grid_x, grid_y, group_id) VALUES (?, ?, ?, ?, ?)',
    [title, url, grid_x, grid_y, group_id]
  );

  // Fetch favicon before responding so the client gets icon data immediately
  try {
    const iconPath = await fetchFavicon(url, shortcutId);
    if (iconPath) {
      runSql('UPDATE shortcuts SET icon_path = ?, favicon_cached = 1 WHERE id = ?', [iconPath, shortcutId]);
    }
  } catch (e) {
    console.log(`[favicon] Error fetching favicon for ${url}:`, (e as Error).message);
  }

  const shortcut = queryOne('SELECT * FROM shortcuts WHERE id = ?', [shortcutId]);
  res.status(201).json(shortcut);
});

router.put('/shortcuts/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const fields: string[] = [];
  const values: any[] = [];
  for (const col of ['title', 'url', 'icon_type', 'icon_path', 'favicon_cached', 'grid_x', 'grid_y', 'group_id', 'sort_order']) {
    if (req.body[col] !== undefined) {
      fields.push(`${col} = ?`);
      const raw = req.body[col];
      // #3: Coerce integer columns; group_id may be null
      if (col === 'group_id') {
        values.push(raw === null ? null : Number(raw));
      } else if (SHORTCUT_INT_COLS.has(col)) {
        values.push(Number(raw));
      } else {
        values.push(raw);
      }
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  runSql(`UPDATE shortcuts SET ${fields.join(', ')} WHERE id = ?`, values);
  const shortcut = queryOne('SELECT * FROM shortcuts WHERE id = ?', [id]);
  res.json(shortcut);
});

router.delete('/shortcuts/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const shortcut = queryOne('SELECT * FROM shortcuts WHERE id = ?', [id]);
  if (shortcut?.icon_path) {
    const iconFile = path.join(ICONS_DIR, shortcut.icon_path);
    if (fs.existsSync(iconFile)) fs.unlinkSync(iconFile);
  }
  runSql('DELETE FROM shortcuts WHERE id = ?', [id]);
  res.json({ ok: true });
});

// Refresh favicon
router.post('/shortcuts/:id/refresh-favicon', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const shortcut = queryOne('SELECT * FROM shortcuts WHERE id = ?', [id]);
  if (!shortcut) return res.status(404).json({ error: 'Not found' });

  console.log(`[route] calling fetchFavicon for shortcut ${shortcut.id}: ${shortcut.url}`);
  const iconPath = await fetchFavicon(shortcut.url, shortcut.id);
  console.log(`[route] fetchFavicon returned: ${iconPath}`);
  if (iconPath) {
    // Delete the old favicon only after successfully fetching a new one
    if (shortcut.icon_path && shortcut.icon_type === 'favicon' && shortcut.icon_path !== iconPath) {
      const old = path.join(ICONS_DIR, shortcut.icon_path);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    runSql('UPDATE shortcuts SET icon_path = ?, icon_type = ?, favicon_cached = 1 WHERE id = ?', [iconPath, 'favicon', id]);
  }
  // If fetch failed, preserve the existing icon rather than clearing it

  const updated = queryOne('SELECT * FROM shortcuts WHERE id = ?', [id]);
  res.json(updated);
});

// Upload manual icon
router.post('/shortcuts/:id/icon', upload.single('icon'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const shortcut = queryOne('SELECT * FROM shortcuts WHERE id = ?', [id]);
  if (!shortcut) return res.status(404).json({ error: 'Not found' });

  if (shortcut.icon_path && shortcut.icon_type === 'manual') {
    const old = path.join(ICONS_DIR, shortcut.icon_path);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }

  runSql('UPDATE shortcuts SET icon_path = ?, icon_type = ? WHERE id = ?', [req.file.filename, 'manual', id]);
  const updated = queryOne('SELECT * FROM shortcuts WHERE id = ?', [id]);
  res.json(updated);
});

// Remove manual icon (revert to favicon)
router.delete('/shortcuts/:id/icon', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const shortcut = queryOne('SELECT * FROM shortcuts WHERE id = ?', [id]);
  if (!shortcut) return res.status(404).json({ error: 'Not found' });

  if (shortcut.icon_path && shortcut.icon_type === 'manual') {
    const old = path.join(ICONS_DIR, shortcut.icon_path);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }

  let iconPath: string | null = null;
  try {
    iconPath = await fetchFavicon(shortcut.url, id);
  } catch (e) {
    console.log(`[favicon] Error fetching favicon for ${shortcut.url}:`, (e as Error).message);
  }
  runSql('UPDATE shortcuts SET icon_path = ?, icon_type = ?, favicon_cached = ? WHERE id = ?',
    [iconPath, 'favicon', iconPath ? 1 : 0, id]);

  const updated = queryOne('SELECT * FROM shortcuts WHERE id = ?', [id]);
  res.json(updated);
});

// #6: Batch update positions — uses execSql (no per-write flush), one saveDb() at end
router.put('/layout', (req: Request, res: Response) => {
  const { shortcuts: shortcutPositions, groups: groupPositions } = req.body;
  if (shortcutPositions) {
    for (const s of shortcutPositions) {
      execSql('UPDATE shortcuts SET grid_x = ?, grid_y = ?, group_id = ?, sort_order = ? WHERE id = ?',
        [s.grid_x, s.grid_y, s.group_id ?? null, s.sort_order ?? 0, s.id]);
    }
  }
  if (groupPositions) {
    for (const g of groupPositions) {
      execSql('UPDATE groups SET grid_x = ?, grid_y = ?, grid_w = ?, grid_h = ?, sort_order = ? WHERE id = ?',
        [g.grid_x, g.grid_y, g.grid_w ?? 4, g.grid_h ?? 4, g.sort_order ?? 0, g.id]);
    }
  }
  saveDb();
  res.json({ ok: true });
});

// Serve icon files
router.get('/icons/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filepath = path.resolve(ICONS_DIR, filename);
  if (!filepath.startsWith(path.resolve(ICONS_DIR) + path.sep)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!fs.existsSync(filepath)) return res.status(404).send('Not found');
  res.sendFile(filepath);
});

// ---- Export / Import ----

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

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { queryAll, queryOne, runSql, execSql, saveDb, runInsert } from '../db/index.js';
import type { ShortcutRow, SqlParam } from '../db/types.js';
import { config } from '../config.js';
import { fetchFavicon } from '../favicon.js';
import { log } from '../logger.js';
import { parseBody, shortcutCreate, shortcutUpdate, layoutUpdate } from '../validation.js';

const router = Router();
const ICONS_DIR = config.iconsDir;

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

function deleteIconFile(filename: string | null | undefined) {
  if (!filename) return;
  const filepath = path.join(ICONS_DIR, filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
}

router.get('/shortcuts', (_req: Request, res: Response) => {
  const shortcuts = queryAll<ShortcutRow>('SELECT * FROM shortcuts ORDER BY sort_order, id');
  res.json(shortcuts);
});

router.post('/shortcuts', (req: Request, res: Response) => {
  const parsed = parseBody(shortcutCreate, req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const { title, url, grid_x, grid_y, group_id } = parsed.data;

  const shortcutId = runInsert(
    'INSERT INTO shortcuts (title, url, grid_x, grid_y, group_id) VALUES (?, ?, ?, ?, ?)',
    [title, url, grid_x, grid_y, group_id]
  );

  const shortcut = queryOne<ShortcutRow>('SELECT * FROM shortcuts WHERE id = ?', [shortcutId]);
  res.status(201).json(shortcut);

  // #2: Fetch the favicon in the background — the client polls favicon_cached,
  // so the response doesn't wait on up to ~13s of icon-candidate timeouts
  void fetchFavicon(url, shortcutId)
    .then((iconPath) => {
      if (iconPath) {
        runSql('UPDATE shortcuts SET icon_path = ?, favicon_cached = 1 WHERE id = ?', [iconPath, shortcutId]);
      }
    })
    .catch((e) => {
      log.error(`[favicon] Background fetch failed for ${url}:`, (e as Error).message);
    });
});

router.put('/shortcuts/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = parseBody(shortcutUpdate, req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  const fields: string[] = [];
  const values: SqlParam[] = [];
  for (const [col, value] of Object.entries(parsed.data)) {
    if (value === undefined) continue;
    fields.push(`${col} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  runSql(`UPDATE shortcuts SET ${fields.join(', ')} WHERE id = ?`, values);
  const shortcut = queryOne<ShortcutRow>('SELECT * FROM shortcuts WHERE id = ?', [id]);
  res.json(shortcut);
});

router.delete('/shortcuts/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const shortcut = queryOne<ShortcutRow>('SELECT * FROM shortcuts WHERE id = ?', [id]);
  deleteIconFile(shortcut?.icon_path);
  runSql('DELETE FROM shortcuts WHERE id = ?', [id]);
  res.json({ ok: true });
});

// Refresh favicon
router.post('/shortcuts/:id/refresh-favicon', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const shortcut = queryOne<ShortcutRow>('SELECT * FROM shortcuts WHERE id = ?', [id]);
  if (!shortcut) return res.status(404).json({ error: 'Not found' });

  const iconPath = await fetchFavicon(shortcut.url, shortcut.id);
  if (iconPath) {
    // Delete the old favicon only after successfully fetching a new one
    if (shortcut.icon_type === 'favicon' && shortcut.icon_path !== iconPath) {
      deleteIconFile(shortcut.icon_path);
    }
    runSql('UPDATE shortcuts SET icon_path = ?, icon_type = ?, favicon_cached = 1 WHERE id = ?', [iconPath, 'favicon', id]);
  }
  // If fetch failed, preserve the existing icon rather than clearing it

  const updated = queryOne<ShortcutRow>('SELECT * FROM shortcuts WHERE id = ?', [id]);
  res.json(updated);
});

// Upload manual icon
router.post('/shortcuts/:id/icon', upload.single('icon'), (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const shortcut = queryOne<ShortcutRow>('SELECT * FROM shortcuts WHERE id = ?', [id]);
  if (!shortcut) return res.status(404).json({ error: 'Not found' });

  if (shortcut.icon_type === 'manual') deleteIconFile(shortcut.icon_path);

  runSql('UPDATE shortcuts SET icon_path = ?, icon_type = ? WHERE id = ?', [req.file.filename, 'manual', id]);
  const updated = queryOne<ShortcutRow>('SELECT * FROM shortcuts WHERE id = ?', [id]);
  res.json(updated);
});

// Remove manual icon (revert to favicon)
router.delete('/shortcuts/:id/icon', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const shortcut = queryOne<ShortcutRow>('SELECT * FROM shortcuts WHERE id = ?', [id]);
  if (!shortcut) return res.status(404).json({ error: 'Not found' });

  if (shortcut.icon_type === 'manual') deleteIconFile(shortcut.icon_path);

  let iconPath: string | null = null;
  try {
    iconPath = await fetchFavicon(shortcut.url, id);
  } catch (e) {
    log.error(`[favicon] Error fetching favicon for ${shortcut.url}:`, (e as Error).message);
  }
  runSql('UPDATE shortcuts SET icon_path = ?, icon_type = ?, favicon_cached = ? WHERE id = ?',
    [iconPath, 'favicon', iconPath ? 1 : 0, id]);

  const updated = queryOne<ShortcutRow>('SELECT * FROM shortcuts WHERE id = ?', [id]);
  res.json(updated);
});

// #6: Batch update positions — uses execSql (no per-write flush), one saveDb() at end
router.put('/layout', (req: Request, res: Response) => {
  const parsed = parseBody(layoutUpdate, req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const { shortcuts: shortcutPositions, groups: groupPositions } = parsed.data;

  if (shortcutPositions) {
    for (const s of shortcutPositions) {
      execSql('UPDATE shortcuts SET grid_x = ?, grid_y = ?, group_id = ?, sort_order = ? WHERE id = ?',
        [s.grid_x, s.grid_y, s.group_id, s.sort_order, s.id]);
    }
  }
  if (groupPositions) {
    for (const g of groupPositions) {
      execSql('UPDATE groups SET grid_x = ?, grid_y = ?, grid_w = ?, grid_h = ?, sort_order = ? WHERE id = ?',
        [g.grid_x, g.grid_y, g.grid_w, g.grid_h, g.sort_order, g.id]);
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

export default router;

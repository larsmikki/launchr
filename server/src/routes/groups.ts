import { Router, Request, Response } from 'express';
import { queryAll, queryOne, runSql, runInsert } from '../db/index.js';
import type { GroupRow, SqlParam } from '../db/types.js';
import { parseBody, groupCreate, groupUpdate } from '../validation.js';

const router = Router();

router.get('/groups', (_req: Request, res: Response) => {
  const groups = queryAll<GroupRow>('SELECT * FROM groups ORDER BY sort_order, id');
  res.json(groups);
});

router.post('/groups', (req: Request, res: Response) => {
  const parsed = parseBody(groupCreate, req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const { title, color, grid_x, grid_y, grid_w, grid_h } = parsed.data;

  const id = runInsert(
    'INSERT INTO groups (title, color, grid_x, grid_y, grid_w, grid_h) VALUES (?, ?, ?, ?, ?, ?)',
    [title, color, grid_x, grid_y, grid_w, grid_h]
  );
  const group = queryOne<GroupRow>('SELECT * FROM groups WHERE id = ?', [id]);
  res.status(201).json(group);
});

router.put('/groups/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const parsed = parseBody(groupUpdate, req.body);
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
  runSql(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`, values);
  const group = queryOne<GroupRow>('SELECT * FROM groups WHERE id = ?', [id]);
  res.json(group);
});

router.delete('/groups/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  runSql('UPDATE shortcuts SET group_id = NULL WHERE group_id = ?', [id]);
  runSql('DELETE FROM groups WHERE id = ?', [id]);
  res.json({ ok: true });
});

export default router;

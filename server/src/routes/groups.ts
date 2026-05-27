import { Router, Request, Response } from 'express';
import { queryAll, queryOne, runSql, runInsert } from '../db/index.js';

const router = Router();

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

export default router;

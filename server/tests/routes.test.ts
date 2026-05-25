import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import router from '../src/routes';
import { runSql } from '../src/db';

// Mock favicon fetching so tests don't make real network calls
vi.mock('../src/favicon', () => ({
  fetchFavicon: vi.fn().mockResolvedValue(null),
}));

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api', router);
  return app;
}

// Clear all data between tests for isolation
function clearData() {
  runSql('DELETE FROM shortcuts');
  runSql('DELETE FROM groups');
}

// ---- Settings ----

describe('GET /api/settings', () => {
  it('returns default settings', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      layout_mode: 'row',
      column_extra_width: '0',
      link_target: '_blank',
    });
  });
});

describe('PUT /api/settings', () => {
  it('updates a known setting key', async () => {
    const app = buildApp();
    await request(app).put('/api/settings').send({ link_target: '_self' });
    const res = await request(app).get('/api/settings');
    expect(res.body.link_target).toBe('_self');
  });

  it('silently ignores unknown keys (allowlist enforcement)', async () => {
    const app = buildApp();
    await request(app).put('/api/settings').send({ injected_key: 'malicious' });
    const res = await request(app).get('/api/settings');
    expect(res.body.injected_key).toBeUndefined();
  });
});

// ---- Groups ----

describe('Groups CRUD', () => {
  beforeEach(clearData);

  it('creates a group with defaults', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/groups').send({ title: 'Work', color: '#aabbcc' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Work', color: '#aabbcc', collapsed: 0 });
    expect(typeof res.body.id).toBe('number');
  });

  it('returns all groups ordered by sort_order', async () => {
    const app = buildApp();
    await request(app).post('/api/groups').send({ title: 'B' });
    await request(app).post('/api/groups').send({ title: 'A' });
    const res = await request(app).get('/api/groups');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('updates a group', async () => {
    const app = buildApp();
    const create = await request(app).post('/api/groups').send({ title: 'Old' });
    const id = create.body.id;
    const res = await request(app).put(`/api/groups/${id}`).send({ title: 'New', collapsed: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'New', collapsed: 1 });
  });

  it('rejects update with no valid fields', async () => {
    const app = buildApp();
    const create = await request(app).post('/api/groups').send({ title: 'Test' });
    const res = await request(app).put(`/api/groups/${create.body.id}`).send({});
    expect(res.status).toBe(400);
  });

  it('deletes a group and nullifies its shortcuts', async () => {
    const app = buildApp();
    const group = await request(app).post('/api/groups').send({ title: 'G' });
    const groupId = group.body.id;
    await request(app).post('/api/shortcuts').send({ title: 'S', url: 'https://example.com', group_id: groupId });

    await request(app).delete(`/api/groups/${groupId}`);

    const shortcuts = await request(app).get('/api/shortcuts');
    expect(shortcuts.body[0].group_id).toBeNull();

    const groups = await request(app).get('/api/groups');
    expect(groups.body).toHaveLength(0);
  });
});

// ---- Shortcuts ----

describe('Shortcuts CRUD', () => {
  beforeEach(clearData);

  it('creates a shortcut', async () => {
    const app = buildApp();
    const group = await request(app).post('/api/groups').send({ title: 'G' });
    const res = await request(app).post('/api/shortcuts').send({
      title: 'Example',
      url: 'https://example.com',
      group_id: group.body.id,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Example', url: 'https://example.com' });
  });

  it('rejects shortcut with missing title', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/shortcuts').send({ url: 'https://example.com' });
    expect(res.status).toBe(400);
  });

  it('rejects shortcut with non-http URL', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/shortcuts').send({ title: 'T', url: 'ftp://example.com' });
    expect(res.status).toBe(400);
  });

  it('rejects shortcut with invalid URL format', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/shortcuts').send({ title: 'T', url: 'not-a-url' });
    expect(res.status).toBe(400);
  });

  it('updates a shortcut and coerces integer fields', async () => {
    const app = buildApp();
    const group = await request(app).post('/api/groups').send({ title: 'G' });
    const sc = await request(app).post('/api/shortcuts').send({
      title: 'S', url: 'https://example.com', group_id: group.body.id,
    });
    const id = sc.body.id;

    // Send favicon_cached as string "1" — should be coerced to number
    const res = await request(app).put(`/api/shortcuts/${id}`).send({ favicon_cached: '1', title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(typeof res.body.favicon_cached).toBe('number');
    expect(res.body.favicon_cached).toBe(1);
  });

  it('deletes a shortcut', async () => {
    const app = buildApp();
    const group = await request(app).post('/api/groups').send({ title: 'G' });
    const sc = await request(app).post('/api/shortcuts').send({
      title: 'S', url: 'https://example.com', group_id: group.body.id,
    });
    await request(app).delete(`/api/shortcuts/${sc.body.id}`);
    const res = await request(app).get('/api/shortcuts');
    expect(res.body).toHaveLength(0);
  });
});

// ---- Layout ----

describe('PUT /api/layout', () => {
  beforeEach(clearData);

  it('batch-updates shortcut sort order', async () => {
    const app = buildApp();
    const group = await request(app).post('/api/groups').send({ title: 'G' });
    const gid = group.body.id;
    const s1 = await request(app).post('/api/shortcuts').send({ title: 'A', url: 'https://a.com', group_id: gid });
    const s2 = await request(app).post('/api/shortcuts').send({ title: 'B', url: 'https://b.com', group_id: gid });

    const res = await request(app).put('/api/layout').send({
      shortcuts: [
        { id: s1.body.id, grid_x: 0, grid_y: 0, group_id: gid, sort_order: 1 },
        { id: s2.body.id, grid_x: 0, grid_y: 0, group_id: gid, sort_order: 0 },
      ],
    });
    expect(res.status).toBe(200);

    const shortcuts = await request(app).get('/api/shortcuts');
    const a = shortcuts.body.find((s: { id: number }) => s.id === s1.body.id);
    const b = shortcuts.body.find((s: { id: number }) => s.id === s2.body.id);
    expect(a.sort_order).toBe(1);
    expect(b.sort_order).toBe(0);
  });

  it('batch-updates group positions preserving grid dimensions', async () => {
    const app = buildApp();
    const g = await request(app).post('/api/groups').send({ title: 'G', grid_w: 6, grid_h: 3 });
    const gid = g.body.id;

    await request(app).put('/api/layout').send({
      groups: [{ id: gid, grid_x: 2, grid_y: 2, grid_w: 6, grid_h: 3, sort_order: 0 }],
    });

    const groups = await request(app).get('/api/groups');
    expect(groups.body[0]).toMatchObject({ grid_x: 2, grid_y: 2, grid_w: 6, grid_h: 3 });
  });
});

// ---- Export / Import ----

describe('Export and Import', () => {
  beforeEach(clearData);

  it('exports all data', async () => {
    const app = buildApp();
    await request(app).post('/api/groups').send({ title: 'Exported' });
    const res = await request(app).get('/api/export');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('settings');
    expect(res.body).toHaveProperty('groups');
    expect(res.body).toHaveProperty('shortcuts');
    expect(res.body).toHaveProperty('icons');
    expect(res.body.groups[0].title).toBe('Exported');
  });

  it('imports data and clears existing records', async () => {
    const app = buildApp();
    await request(app).post('/api/groups').send({ title: 'Old' });

    const res = await request(app).post('/api/import').send({
      groups: [{ id: 99, title: 'Imported', color: '#ffffff', collapsed: 0, grid_x: 0, grid_y: 0, grid_w: 4, grid_h: 4, sort_order: 0 }],
      shortcuts: [],
      settings: [{ key: 'link_target', value: '_self' }],
    });
    expect(res.status).toBe(200);

    const groups = await request(app).get('/api/groups');
    expect(groups.body).toHaveLength(1);
    expect(groups.body[0].title).toBe('Imported');

    const settings = await request(app).get('/api/settings');
    expect(settings.body.link_target).toBe('_self');
  });

  it('rejects import with invalid icon filename', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/import').send({
      groups: [],
      shortcuts: [],
      settings: [],
      icons: { '../etc/passwd': 'dGVzdA==' },
    });
    expect(res.status).toBe(400);
  });
});

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import { config } from '../config.js';

if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true });
if (!fs.existsSync(config.iconsDir)) fs.mkdirSync(config.iconsDir, { recursive: true });

let db: SqlJsDatabase | undefined;

// #4: Guard — all helpers throw clearly if called before initDb()
function requireDb(): SqlJsDatabase {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

async function initDb(): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs();

  if (fs.existsSync(config.dbPath)) {
    const buffer = fs.readFileSync(config.dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#e0e7ff',
      collapsed INTEGER NOT NULL DEFAULT 0,
      grid_x INTEGER NOT NULL DEFAULT 0,
      grid_y INTEGER NOT NULL DEFAULT 0,
      grid_w INTEGER NOT NULL DEFAULT 4,
      grid_h INTEGER NOT NULL DEFAULT 4,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS shortcuts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      icon_type TEXT NOT NULL DEFAULT 'favicon',
      icon_path TEXT,
      favicon_cached INTEGER NOT NULL DEFAULT 0,
      grid_x INTEGER NOT NULL DEFAULT 0,
      grid_y INTEGER NOT NULL DEFAULT 0,
      group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // #13: Consolidated seeding — single consistent pattern for all defaults
  const defaults: [string, string][] = [
    ['layout_mode', 'row'],
    ['column_extra_width', '0'],
    ['link_target', '_blank'],
  ];
  for (const [key, value] of defaults) {
    db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
  saveDb();

  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.dbPath, buffer);
  }
}

function getDb(): SqlJsDatabase {
  return requireDb();
}

// Helper: run query and return all rows as objects
function queryAll(sql: string, params: any[] = []): any[] {
  const d = requireDb();
  const stmt = d.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: run query and return first row as object
function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: run statement (INSERT/UPDATE/DELETE) and flush to disk
function runSql(sql: string, params: any[] = []): void {
  requireDb().run(sql, params);
  saveDb();
}

// #6: No-flush variant — use for batch operations, call saveDb() once after
function execSql(sql: string, params: any[] = []): void {
  requireDb().run(sql, params);
}

// Run INSERT and return the new row id
function runInsert(sql: string, params: any[] = []): number {
  const d = requireDb();
  d.run(sql, params);
  const result = d.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0] as number;
  saveDb();
  return id;
}

export { initDb, getDb, saveDb, queryAll, queryOne, runSql, execSql, runInsert };

import "server-only";

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { runSeed } from "@/lib/seed";

declare global {
  var __restopos_db: Database.Database | undefined;
}

function ensureDataDir() {
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function hasColumn(db: Database.Database, table: string, column: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function migrate(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurant_config (
      id INTEGER PRIMARY KEY,
      name TEXT,
      address TEXT,
      phone TEXT,
      tax_rate REAL DEFAULT 10,
      currency TEXT DEFAULT 'USD',
      logo TEXT
    );

    CREATE TABLE IF NOT EXISTS menu_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image TEXT,
      available INTEGER DEFAULT 1,
      FOREIGN KEY(category_id) REFERENCES menu_categories(id)
    );

    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      capacity INTEGER DEFAULT 4,
      status TEXT DEFAULT 'available'
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER,
      status TEXT DEFAULT 'new',
      total REAL,
      notes TEXT,
      cooking_at TEXT,
      ready_at TEXT,
      completed_at TEXT,
      cancelled_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      menu_item_id INTEGER,
      quantity INTEGER,
      unit_price REAL,
      special_note TEXT
    );

    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      role TEXT,
      pin TEXT,
      email TEXT,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS printer_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      connection_type TEXT DEFAULT 'bluetooth',
      address TEXT,
      paper_width INTEGER DEFAULT 58
    );
  `);

  if (!hasColumn(db, "orders", "cooking_at")) {
    db.exec(`ALTER TABLE orders ADD COLUMN cooking_at TEXT`);
  }
  if (!hasColumn(db, "orders", "ready_at")) {
    db.exec(`ALTER TABLE orders ADD COLUMN ready_at TEXT`);
  }
  if (!hasColumn(db, "orders", "completed_at")) {
    db.exec(`ALTER TABLE orders ADD COLUMN completed_at TEXT`);
  }
  if (!hasColumn(db, "orders", "cancelled_at")) {
    db.exec(`ALTER TABLE orders ADD COLUMN cancelled_at TEXT`);
  }
}

function initDb() {
  const dataDir = ensureDataDir();
  const dbPath = path.join(dataDir, "restaurant.db");
  const db = new Database(dbPath);

  migrate(db);
  runSeed(db);

  return db;
}

export const db: Database.Database = globalThis.__restopos_db ?? initDb();
globalThis.__restopos_db = db;

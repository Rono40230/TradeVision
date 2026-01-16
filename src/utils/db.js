import Database from '@tauri-apps/plugin-sql';

// Initialize the database
export async function initDB() {
  const db = await Database.load('sqlite:trading.db');

  // Create trades table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL, -- 'buy' or 'sell'
      price REAL NOT NULL,
      quantity REAL NOT NULL,
      strategy TEXT,
      notes TEXT,
      tags TEXT, -- JSON array
      status TEXT DEFAULT 'open', -- 'open', 'closed', 'pending'
      close_price REAL,
      profit_loss REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create portfolios table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      asset_type TEXT NOT NULL, -- 'forex', 'crypto', 'stocks', 'options'
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create strategies table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS strategies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      asset_type TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}
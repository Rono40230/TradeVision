import Database from '@tauri-apps/plugin-sql';

export async function initDB() {
  const db = await Database.load('sqlite:trading.db');

  const oldTableExists = await db.select("SELECT name FROM sqlite_master WHERE type='table' AND name='trades'");
  if (oldTableExists.length > 0) {
      const accountsExists = await db.select("SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'");
      if (accountsExists.length === 0) {
          await db.execute('DROP TABLE IF EXISTS trades');
          await db.execute('DROP TABLE IF EXISTS portfolios');
          await db.execute('DROP TABLE IF EXISTS strategies');
      }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      capital REAL DEFAULT 0,
      alloc_wheel REAL DEFAULT 0,
      margin_wheel_pct REAL DEFAULT 0,
      alloc_growth REAL DEFAULT 0,
      cash_used REAL DEFAULT 0,
      currency TEXT DEFAULT 'EUR',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try { await db.execute("ALTER TABLE accounts ADD COLUMN alloc_wheel REAL DEFAULT 0"); } catch(e) {}
  try { await db.execute("ALTER TABLE accounts ADD COLUMN margin_wheel_pct REAL DEFAULT 0"); } catch(e) {}
  try { await db.execute("ALTER TABLE accounts ADD COLUMN alloc_growth REAL DEFAULT 0"); } catch(e) {}
  try { await db.execute("ALTER TABLE accounts ADD COLUMN alloc_rocket REAL DEFAULT 0"); } catch(e) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER,
      date TEXT NOT NULL,
      symbol TEXT NOT NULL,
      strategy TEXT NOT NULL, 
      status TEXT DEFAULT 'open', 
      notes TEXT,
      asset_type TEXT DEFAULT 'option', 
      profit_loss REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    )
  `);
  
  try { await db.execute("ALTER TABLE trades ADD COLUMN asset_type TEXT DEFAULT 'option'"); } catch(e) {}
  try { await db.execute("ALTER TABLE trades ADD COLUMN profit_loss REAL DEFAULT 0"); } catch(e) {}
  try { await db.execute("ALTER TABLE trades ADD COLUMN open_date TEXT"); } catch(e) {}
  try { await db.execute("ALTER TABLE trades ADD COLUMN target_yield REAL DEFAULT 0"); } catch(e) {}
  try { await db.execute("ALTER TABLE trades ADD COLUMN position_size_pct REAL DEFAULT 0"); } catch(e) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS legs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id INTEGER,
      type TEXT NOT NULL, 
      side TEXT NOT NULL, 
      quantity REAL NOT NULL,
      strike REAL,
      expiration TEXT,
      open_price REAL NOT NULL, 
      close_price REAL,
      current_price REAL,
      status TEXT DEFAULT 'open', 
      FOREIGN KEY(trade_id) REFERENCES trades(id) ON DELETE CASCADE
    )
  `);

  const accounts = await db.select('SELECT * FROM accounts');
  if (accounts.length === 0) {
    await db.execute('INSERT INTO accounts (name, capital) VALUES (?, ?)', ['Rocket Academy', 10000]);
    await db.execute('INSERT INTO accounts (name, capital) VALUES (?, ?)', ['Kasper Academy', 5000]);
  }

  try {
      await db.execute("DELETE FROM trades WHERE id NOT IN (SELECT DISTINCT trade_id FROM legs)");
  } catch (e) {
  }

  return db;
}

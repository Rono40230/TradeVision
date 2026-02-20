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
  
  // New columns for Rocket Lifecycle (Pending -> Open -> Neutralized -> Closed)
  try { await db.execute("ALTER TABLE trades ADD COLUMN exit_partial_price REAL"); } catch(e) {}
  try { await db.execute("ALTER TABLE trades ADD COLUMN exit_partial_date TEXT"); } catch(e) {}
  try { await db.execute("ALTER TABLE trades ADD COLUMN exit_partial_quantity REAL"); } catch(e) {}
  try { await db.execute("ALTER TABLE trades ADD COLUMN trailing_stop REAL"); } catch(e) {}
  try { await db.execute("ALTER TABLE trades ADD COLUMN entry_executed REAL"); } catch(e) {}
  try { await db.execute("ALTER TABLE trades ADD COLUMN exit_price REAL"); } catch(e) {}
  try { await db.execute("ALTER TABLE trades ADD COLUMN exit_date TEXT"); } catch(e) {}
  try { await db.execute("ALTER TABLE trades ADD COLUMN is_deleted INTEGER DEFAULT 0"); } catch(e) {}

  // Add open_date to legs to track assignment dates separately
  try { await db.execute("ALTER TABLE legs ADD COLUMN open_date TEXT"); } catch(e) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS legs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id INTEGER,
      type TEXT NOT NULL, 
      side TEXT NOT NULL, 
      quantity REAL NOT NULL,
      strike REAL,
      expiration TEXT,
      open_date TEXT,
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

  // IB Gateway Historical Trades (Phase 1.2)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS rocket_trades_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ib_trade_id TEXT UNIQUE NOT NULL,
      symbol TEXT NOT NULL,
      asset_class TEXT,
      side TEXT NOT NULL,
      quantity REAL NOT NULL,
      price_avg REAL NOT NULL,
      commission REAL DEFAULT 0,
      realized_pnl REAL,
      unrealized_pnl REAL,
      open_date TEXT NOT NULL,
      close_date TEXT,
      expiry TEXT,
      strike REAL,
      strategy TEXT,
      order_type TEXT,
      synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(strategy) REFERENCES strategies(id)
    )
  `);

  // Create index for performance
  try { await db.execute("CREATE INDEX IF NOT EXISTS idx_ib_trade_id ON rocket_trades_history(ib_trade_id)"); } catch(e) {}
  try { await db.execute("CREATE INDEX IF NOT EXISTS idx_strategy ON rocket_trades_history(strategy)"); } catch(e) {}
  try { await db.execute("CREATE INDEX IF NOT EXISTS idx_symbol ON rocket_trades_history(symbol)"); } catch(e) {}
  try { await db.execute("ALTER TABLE rocket_trades_history ADD COLUMN is_deleted INTEGER DEFAULT 0"); } catch(e) {}

  // Flex Trades IBKR — table principale (remplace rocket_trades_history)
  // 20 champs du struct FlexTrade Rust + strategy (override utilisateur) + is_deleted
  await db.execute(`
    CREATE TABLE IF NOT EXISTS flex_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trade_id TEXT UNIQUE NOT NULL,
      account_id TEXT,
      symbol TEXT NOT NULL,
      asset_class TEXT,
      side TEXT,
      quantity INTEGER DEFAULT 0,
      multiplier INTEGER DEFAULT 1,
      price REAL DEFAULT 0,
      commission REAL DEFAULT 0,
      realized_pnl REAL DEFAULT 0,
      date TEXT,
      time TEXT,
      expiry TEXT,
      strike REAL DEFAULT 0,
      put_call TEXT,
      open_close TEXT,
      exchange TEXT,
      proceeds REAL DEFAULT 0,
      cost_basis REAL DEFAULT 0,
      notes TEXT,
      strategy TEXT,
      is_deleted INTEGER DEFAULT 0,
      synced_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try { await db.execute("CREATE INDEX IF NOT EXISTS idx_flex_trade_id ON flex_trades(trade_id)"); } catch(e) {}
  try { await db.execute("CREATE INDEX IF NOT EXISTS idx_flex_symbol ON flex_trades(symbol)"); } catch(e) {}
  try { await db.execute("CREATE INDEX IF NOT EXISTS idx_flex_date ON flex_trades(date)"); } catch(e) {}

  // Positions ouvertes — saisies manuellement, persistantes entre sessions
  await db.execute(`
    CREATE TABLE IF NOT EXISTS open_positions (
      id            TEXT PRIMARY KEY,
      strategy      TEXT NOT NULL,
      symbol        TEXT NOT NULL,
      asset_class   TEXT NOT NULL DEFAULT 'OPT',
      side          TEXT NOT NULL,
      quantity      INTEGER NOT NULL,
      price         REAL NOT NULL,
      commission    REAL DEFAULT 0,
      open_date     TEXT NOT NULL,
      expiry        TEXT,
      strike        REAL,
      put_call      TEXT,
      notes         TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    )
  `);
  try { await db.execute("CREATE INDEX IF NOT EXISTS idx_op_strategy ON open_positions(strategy)"); } catch(e) {}
  try { await db.execute("CREATE INDEX IF NOT EXISTS idx_op_symbol ON open_positions(symbol)"); } catch(e) {}

  // Sync metadata
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      last_sync_date TEXT,
      trades_synced INTEGER DEFAULT 0,
      next_sync_date TEXT,
      account_id TEXT,
      UNIQUE(account_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT,
      record_id TEXT,
      action TEXT,
      old_value TEXT,
      new_value TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wheel_trade_id INTEGER,
      symbol TEXT NOT NULL,
      assignment_date TEXT NOT NULL,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      type TEXT CHECK(type IN ('PUT_ASSIGNMENT', 'CALL_ASSIGNMENT')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(wheel_trade_id) REFERENCES trades(id) ON DELETE SET NULL
    )
  `);

  return db;
}

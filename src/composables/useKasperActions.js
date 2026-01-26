import { initDB } from "../utils/db.js";
import { 
    db, 
    account, 
    currentAccountId, 
    accountsList, 
    dailyEntries, 
    pairsConfig 
} from './useKasperStore.js';

export async function loadPairs() {
    if (!db.value) return;
    const rows = await db.value.select("SELECT * FROM kasper_pairs");
    
    if (rows.length === 0) {
        const seeds = [
            { symbol: 'BTC', pip_value: 1, sl_pips: 350, risk_pct: 1 },
            { symbol: 'XAUUSD', pip_value: 10, sl_pips: 50, risk_pct: 1 },
            { symbol: 'CHFJPY', pip_value: 7.7, sl_pips: 30, risk_pct: 1 },
            { symbol: 'GBPJPY', pip_value: 9.13, sl_pips: 20, risk_pct: 1 },
            { symbol: 'EURJPY', pip_value: 9.13, sl_pips: 20, risk_pct: 1 },
            { symbol: 'USDJPY', pip_value: 9.13, sl_pips: 20, risk_pct: 1 },
            { symbol: 'EURUSD', pip_value: 10, sl_pips: 15, risk_pct: 1 },
            { symbol: 'GBPUSD', pip_value: 10, sl_pips: 15, risk_pct: 1 },
            { symbol: 'USDCAD', pip_value: 10, sl_pips: 15, risk_pct: 1 },
            { symbol: 'EURGBP', pip_value: 12.5, sl_pips: 15, risk_pct: 1 },
            { symbol: 'NZDJPY', pip_value: 6.96, sl_pips: 15, risk_pct: 1 },
            { symbol: 'XAGUSD', pip_value: 50, sl_pips: 15, risk_pct: 1 },
            { symbol: 'AUDUSD', pip_value: 10, sl_pips: 15, risk_pct: 1 }
        ];

        for (const s of seeds) {
            await db.value.execute("INSERT INTO kasper_pairs (symbol, pip_value, sl_pips, risk_pct) VALUES (?, ?, ?, ?)", [s.symbol, s.pip_value, s.sl_pips, s.risk_pct]);
        }
        pairsConfig.value = await db.value.select("SELECT * FROM kasper_pairs");
    } else {
        pairsConfig.value = rows;
    }
}

export async function loadAccountsList() {
    if (!db.value) return;
    accountsList.value = await db.value.select("SELECT * FROM kasper_accounts ORDER BY id ASC");
}

export async function loadAccount() {
    if (!db.value || !currentAccountId.value) return;
    
    const res = await db.value.select("SELECT * FROM kasper_accounts WHERE id = ?", [currentAccountId.value]);
    if (res.length > 0) {
        // Map 'initial_capital' to 'capital' for compatibility with existing UI
        account.value = { 
            ...res[0], 
            capital: res[0].initial_capital 
        };
    }
}

export async function loadentries() {
    if (!db.value || !currentAccountId.value) return;
    dailyEntries.value = await db.value.select(
        "SELECT * FROM kasper_daily_journal WHERE account_id = ? ORDER BY date ASC", 
        [currentAccountId.value]
    );
}

export async function init() {
    if (db.value) return; // Prevent double init
    
    db.value = await initDB();
    
    // 1. KASPER ACCOUNTS TABLE
    await db.value.execute(`
        CREATE TABLE IF NOT EXISTS kasper_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            account_number TEXT,
            initial_capital REAL DEFAULT 0,
            currency TEXT DEFAULT 'USD',
            is_default BOOLEAN DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    try { await db.value.execute("ALTER TABLE kasper_accounts ADD COLUMN account_number TEXT"); } catch (e) {}

    // Seed default account if none
    const existingAccounts = await db.value.select("SELECT * FROM kasper_accounts");
    let defaultAccountId = 1;
    if (existingAccounts.length === 0) {
            const res = await db.value.execute("INSERT INTO kasper_accounts (name, initial_capital, is_default) VALUES ('Compte Principal', 5000, 1)");
            defaultAccountId = res.lastInsertId;
    } else {
            const def = existingAccounts.find(a => a.is_default);
            defaultAccountId = def ? def.id : existingAccounts[0].id;
    }

    // 2. DAILY JOURNAL MIGRATION (Multi-account support)
    const tableDef = await db.value.select("SELECT sql FROM sqlite_master WHERE type='table' AND name='kasper_daily_journal'");
    
    if (tableDef.length === 0) {
            await db.value.execute(`
            CREATE TABLE IF NOT EXISTS kasper_daily_journal (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER DEFAULT 1,
                date TEXT NOT NULL,
                profit_loss REAL DEFAULT 0,
                risk_used REAL DEFAULT 0,
                notes TEXT,
                details TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, account_id),
                FOREIGN KEY(account_id) REFERENCES kasper_accounts(id)
            )
        `);
    } else if (!tableDef[0].sql.includes('account_id')) {
        await db.value.execute("ALTER TABLE kasper_daily_journal RENAME TO kasper_daily_journal_old");
        await db.value.execute(`
            CREATE TABLE kasper_daily_journal (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER DEFAULT 1,
                date TEXT NOT NULL,
                profit_loss REAL DEFAULT 0,
                risk_used REAL DEFAULT 0,
                notes TEXT,
                details TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, account_id),
                FOREIGN KEY(account_id) REFERENCES kasper_accounts(id)
            )
        `);
        await db.value.execute(`
            INSERT INTO kasper_daily_journal (date, profit_loss, risk_used, notes, details, created_at, account_id)
            SELECT date, profit_loss, risk_used, notes, details, created_at, ? 
            FROM kasper_daily_journal_old
        `, [defaultAccountId]);
        await db.value.execute("DROP TABLE kasper_daily_journal_old");
    }

    // Ensure table exists for Pair Config
    await db.value.execute(`
        CREATE TABLE IF NOT EXISTS kasper_pairs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            pip_value REAL DEFAULT 1,
            sl_pips REAL DEFAULT 10,
            risk_pct REAL DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Init State
    await loadAccountsList();
    
    // If no account selected, select default
    if (!currentAccountId.value && accountsList.value.length > 0) {
        const def = accountsList.value.find(a => a.is_default);
        currentAccountId.value = def ? def.id : accountsList.value[0].id;
        
        // Fix legacy default account data
        if (currentAccountId.value) {
            const acc = accountsList.value.find(a => a.id === currentAccountId.value);
                if (acc.name === 'Compte Principal' && !acc.account_number) {
                await db.value.execute("UPDATE kasper_accounts SET name = 'AXI', account_number = '6618240' WHERE id = ?", [acc.id]);
                await loadAccountsList();
            }
        }
    }

    await loadAccount();
    await loadentries();
    await loadPairs();
}

export async function updatePair(pair) {
    if (!db.value) return;
    await db.value.execute(
        "UPDATE kasper_pairs SET symbol = ?, pip_value = ?, sl_pips = ?, risk_pct = ? WHERE id = ?",
        [pair.symbol, pair.pip_value, pair.sl_pips, pair.risk_pct, pair.id]
    );
    await loadPairs();
}

export async function addPair(symbol) {
    if (!db.value) return;
    await db.value.execute("INSERT INTO kasper_pairs (symbol, pip_value, sl_pips, risk_pct) VALUES (?, 10, 20, 1)", [symbol]);
    await loadPairs();
}

export async function deletePair(id) {
        if (!db.value) return;
        await db.value.execute("DELETE FROM kasper_pairs WHERE id = ?", [id]);
        await loadPairs();
}

export async function switchAccount(id) {
    currentAccountId.value = id;
    await loadAccount();
    await loadentries();
}

export async function addAccount(name, initialCapital, currency, accountNumber) {
    if (!db.value) return;
    await db.value.execute(
        "INSERT INTO kasper_accounts (name, initial_capital, currency, account_number) VALUES (?, ?, ?, ?)", 
        [name, initialCapital, currency || 'USD', accountNumber || '']
    );
    await loadAccountsList();
}

export async function updateCapital(newCapital) {
    if (!db.value || !currentAccountId.value) return;
    await db.value.execute("UPDATE kasper_accounts SET initial_capital = ? WHERE id = ?", [newCapital, currentAccountId.value]);
    await loadAccount();
}

export async function saveDailyEntry(date, profitLoss, riskUsed, details) {
    if (!db.value || !currentAccountId.value) return;
    
    // Check if exists for THIS account
    const existing = await db.value.select(
        "SELECT * FROM kasper_daily_journal WHERE date = ? AND account_id = ?", 
        [date, currentAccountId.value]
    );
    
    const detailsStr = details ? JSON.stringify(details) : null;

    if (existing.length > 0) {
        await db.value.execute(
            "UPDATE kasper_daily_journal SET profit_loss = ?, risk_used = ?, details = ? WHERE date = ? AND account_id = ?", 
            [profitLoss, riskUsed || 0, detailsStr, date, currentAccountId.value]
        );
    } else {
        await db.value.execute(
            "INSERT INTO kasper_daily_journal (date, profit_loss, risk_used, details, account_id) VALUES (?, ?, ?, ?, ?)",
            [date, profitLoss, riskUsed || 0, detailsStr, currentAccountId.value]
        );
    }

    await loadentries();
}

export async function deleteAccount(id) {
    if (!db.value) return;

    // Prevent deleting the last account
    if (accountsList.value.length <= 1) {
        // Impossible de supprimer le dernier compte
        return;
    }

    // Delete associated entries
    await db.value.execute("DELETE FROM kasper_daily_journal WHERE account_id = ?", [id]);
    
    // Delete the account
    await db.value.execute("DELETE FROM kasper_accounts WHERE id = ?", [id]);
    
    // Reload list
    await loadAccountsList();

    // If current account was deleted, switch to the first available one
    if (currentAccountId.value === id) {
        const nextId = accountsList.value[0]?.id;
        if (nextId) {
            await switchAccount(nextId);
        }
    }
}

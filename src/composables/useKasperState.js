import { ref, computed } from 'vue';
import { initDB } from "../utils/db.js";

export function useKasperState() {
    const db = ref(null);
    const account = ref({ capital: 5000 }); // Default fallback
    const dailyEntries = ref([]);
    const pairsConfig = ref([]);
    const currentMonth = ref(new Date());

    // Metrics
    const metrics = computed(() => {
        let totalPlus = 0;
        let totalMinus = 0;
        let totalRisk = 0;
        let count = 0;
        let winningTrades = 0;
        let totalTrades = 0;

        dailyEntries.value.forEach(e => {
            if (e.profit_loss > 0) totalPlus += e.profit_loss;
            if (e.profit_loss < 0) totalMinus += e.profit_loss;
            if (e.risk_used) {
                totalRisk += e.risk_used;
                count++;
            }
            
            if (e.details) {
                try {
                    const trades = JSON.parse(e.details);
                    if (Array.isArray(trades)) {
                        trades.forEach(t => {
                            // Count trades that have a result
                            if (t.result !== null && t.result !== undefined && t.result !== '') {
                                totalTrades++;
                                if (parseFloat(t.result) > 0) winningTrades++;
                            }
                        });
                    }
                } catch (err) {}
            }
        });

        return {
            totalPlus,
            totalMinus,
            result: totalPlus + totalMinus,
            averageRisk: count > 0 ? totalRisk / count : 0,
            winrate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
        };
    });

    async function init() {
        db.value = await initDB();
        
        // Ensure table exists for daily journal
        await db.value.execute(`
            CREATE TABLE IF NOT EXISTS kasper_daily_journal (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL UNIQUE,
                profit_loss REAL DEFAULT 0,
                risk_used REAL DEFAULT 0,
                notes TEXT,
                details TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration for details column
        try { await db.value.execute("ALTER TABLE kasper_daily_journal ADD COLUMN details TEXT"); } catch (e) {}

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

        await loadAccount();
        await loadentries();
        await loadPairs();
    }

    async function loadPairs() {
        if (!db.value) return;
        const rows = await db.value.select("SELECT * FROM kasper_pairs");
        
        if (rows.length === 0) {
            // Seed initial data
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

    async function updatePair(pair) {
        if (!db.value) return;
        await db.value.execute(
            "UPDATE kasper_pairs SET symbol = ?, pip_value = ?, sl_pips = ?, risk_pct = ? WHERE id = ?",
            [pair.symbol, pair.pip_value, pair.sl_pips, pair.risk_pct, pair.id]
        );
        await loadPairs();
    }

    async function addPair(symbol) {
        if (!db.value) return;
        await db.value.execute("INSERT INTO kasper_pairs (symbol, pip_value, sl_pips, risk_pct) VALUES (?, 10, 20, 1)", [symbol]);
        await loadPairs();
    }

    async function deletePair(id) {
         if (!db.value) return;
         await db.value.execute("DELETE FROM kasper_pairs WHERE id = ?", [id]);
         await loadPairs();
    }

    async function loadAccount() {
        if (!db.value) return;
        const res = await db.value.select("SELECT * FROM accounts WHERE name = 'Kasper Academy'");
        if (res.length > 0) {
            account.value = res[0];
        } else {
            // Create if missing
            await db.value.execute("INSERT INTO accounts (name, capital) VALUES ('Kasper Academy', 5000)");
            account.value = { name: 'Kasper Academy', capital: 5000 };
        }
    }

    async function updateCapital(newCapital) {
        if (!db.value) return;
        await db.value.execute("UPDATE accounts SET capital = ? WHERE name = 'Kasper Academy'", [newCapital]);
        await loadAccount();
    }

    async function loadentries() {
        if (!db.value) return;
        // Load all entries for metrics, or maybe just current year? For now all.
        dailyEntries.value = await db.value.select("SELECT * FROM kasper_daily_journal ORDER BY date ASC");
    }

    async function saveDailyEntry(date, profitLoss, riskUsed, details) {
        if (!db.value) return;
        
        // Check if exists
        const existing = dailyEntries.value.find(e => e.date === date);
        const oldPL = existing ? existing.profit_loss : 0;
        const diffPL = parseFloat(profitLoss) - oldPL;
        const detailsStr = details ? JSON.stringify(details) : null;

        if (existing) {
            await db.value.execute(
                "UPDATE kasper_daily_journal SET profit_loss = ?, risk_used = ?, details = ? WHERE date = ?", 
                [profitLoss, riskUsed || 0, detailsStr, date]
            );
        } else {
            await db.value.execute(
                "INSERT INTO kasper_daily_journal (date, profit_loss, risk_used, details) VALUES (?, ?, ?, ?)",
                [date, profitLoss, riskUsed || 0, detailsStr]
            );
        }

        // Capital is FIXED (Invested), do not auto-update it with P/L.
        // P/L are calculated dynamically via metrics.

        await loadentries();
    }

    return {
        account,
        dailyEntries,
        pairsConfig,
        metrics,
        init,
        updateCapital,
        saveDailyEntry,
        updatePair,
        addPair,
        deletePair
    };
}

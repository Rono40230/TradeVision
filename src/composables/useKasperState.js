import { ref, computed } from 'vue';
import { initDB } from "../utils/db.js";

export function useKasperState() {
    const db = ref(null);
    const account = ref({ capital: 5000 }); // Default fallback
    const dailyEntries = ref([]);
    const currentMonth = ref(new Date());

    // Metrics
    const metrics = computed(() => {
        let totalPlus = 0;
        let totalMinus = 0;
        let totalRisk = 0;
        let count = 0;

        dailyEntries.value.forEach(e => {
            if (e.profit_loss > 0) totalPlus += e.profit_loss;
            if (e.profit_loss < 0) totalMinus += e.profit_loss;
            if (e.risk_used) {
                totalRisk += e.risk_used;
                count++;
            }
        });

        return {
            totalPlus,
            totalMinus,
            result: totalPlus + totalMinus,
            averageRisk: count > 0 ? totalRisk / count : 0
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
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await loadAccount();
        await loadentries();
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

    async function saveDailyEntry(date, profitLoss, riskUsed) {
        if (!db.value) return;
        
        // Check if exists
        const existing = dailyEntries.value.find(e => e.date === date);
        const oldPL = existing ? existing.profit_loss : 0;
        const diffPL = parseFloat(profitLoss) - oldPL;

        if (existing) {
            await db.value.execute(
                "UPDATE kasper_daily_journal SET profit_loss = ?, risk_used = ? WHERE date = ?", 
                [profitLoss, riskUsed || 0, date]
            );
        } else {
            await db.value.execute(
                "INSERT INTO kasper_daily_journal (date, profit_loss, risk_used) VALUES (?, ?, ?)",
                [date, profitLoss, riskUsed || 0]
            );
        }

        // Update Capital automatically
        // New Capital = Old Capital + Diff (because Current Capital includes Old P/L)
        // Actually, simpler: Current Capital = Current Capital + (New P/L - Old P/L)
        const newCapital = account.value.capital + diffPL;
        await updateCapital(newCapital);

        await loadentries();
    }

    return {
        account,
        dailyEntries,
        metrics,
        init,
        updateCapital,
        saveDailyEntry
    };
}

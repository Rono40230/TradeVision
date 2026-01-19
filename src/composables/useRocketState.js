import { ref, computed } from 'vue';
import { initDB } from "../utils/db.js";

export function useRocketState() {
    const db = ref(null);
    const account = ref({ capital: 0, cash_used: 0, alloc_wheel: 0, margin_wheel_pct: 0, alloc_growth: 0, alloc_rocket: 0 });
    const plLatent = ref(0);
    const allActiveTrades = ref([]);
    const strategyType = ref('wheel');
    const mmConfig = ref({ capital: 0, alloc_wheel: 0, margin_wheel_pct: 0, alloc_growth: 0, alloc_rocket: 0 });

    // Modals State
    const showSettings = ref(false);
    const showAssignModal = ref(false);
    const tradeToAssign = ref(null);
    const showStatusModal = ref(false);
    const pendingStatusUpdate = ref(null);

    // Initialization
    async function init() {
        try {
            db.value = await initDB();
            try {
                await db.value.execute("ALTER TABLE accounts ADD COLUMN alloc_rocket REAL DEFAULT 0");
            } catch (e) {}
            try {
                await db.value.execute("ALTER TABLE trades ADD COLUMN sub_strategy TEXT");
            } catch (e) {}
            await loadAccountData();
            await loadActiveTrades();
        } catch (e) {
            // Failed to init DB
        }
    }

    async function loadAccountData() {
        if(!db.value) return;
        let result = await db.value.select("SELECT * FROM accounts WHERE name = 'Rocket Academy'");
        
        if (result.length === 0) {
            await db.value.execute("INSERT INTO accounts (name, capital) VALUES ('Rocket Academy', 0)");
            result = await db.value.select("SELECT * FROM accounts WHERE name = 'Rocket Academy'");
        }

        if(result.length > 0) {
            account.value = result[0];
            mmConfig.value = {
                capital: result[0].capital,
                alloc_wheel: result[0].alloc_wheel,
                margin_wheel_pct: result[0].margin_wheel_pct,
                alloc_growth: result[0].alloc_growth,
                alloc_rocket: result[0].alloc_rocket || 0
            };
        }
    }

    async function loadActiveTrades() {
        if(!db.value || !account.value.id) return;
        
        const query = `
            SELECT 
                t.id as trade_id, t.date, t.open_date, t.symbol, t.strategy, t.sub_strategy, t.target_yield, t.position_size_pct,
                l.id as leg_id, l.type, l.side, l.strike, l.expiration, l.open_price, l.quantity, l.status
            FROM legs l
            JOIN trades t ON l.trade_id = t.id
            WHERE t.account_id = ? 
            ORDER BY t.created_at DESC
        `;
        
        const rows = await db.value.select(query, [account.value.id]);
        
        const tradesMap = new Map();
        for (const row of rows) {
            if (!tradesMap.has(row.trade_id)) {
                tradesMap.set(row.trade_id, {
                    id: row.trade_id,
                    date: row.date,
                    open_date: row.open_date,
                    symbol: row.symbol,
                    strategy: row.strategy,
                    sub_strategy: row.sub_strategy,
                    target_yield: row.target_yield,
                    position_size_pct: row.position_size_pct,
                    legs: []
                });
            }
            tradesMap.get(row.trade_id).legs.push(row);
        }
        
        const processedTrades = [];
        for (const trade of tradesMap.values()) {
            const legs = trade.legs;
            
            if (trade.strategy === 'wheel' || trade.strategy === 'rockets') {
                 legs.forEach(leg => {
                    processedTrades.push({
                        id: leg.leg_id,
                        trade_id: trade.id,
                        date: trade.date,
                        open_date: trade.open_date || trade.date,
                        symbol: trade.symbol,
                        strategy: trade.strategy,
                        sub_strategy: trade.sub_strategy,
                        target_yield: trade.target_yield,
                        position_size_pct: trade.position_size_pct,
                        type: leg.type,
                        side: leg.side,
                        strike: leg.strike,
                        expiration: leg.expiration,
                        price: leg.open_price,
                        entry_price: leg.open_price,
                        quantity: leg.quantity,
                        status: leg.status,
                        sub_strategy: (leg.type === 'put' && leg.side === 'short') ? 'Exo Vente PUT' : 
                                      (leg.type === 'call' && leg.side === 'short') ? 'Exo Vente CALL' : 
                                      leg.type
                    });
                });
            }
            else if (trade.strategy === 'pcs') {
                const shortLeg = legs.find(l => l.side === 'short');
                const longLeg = legs.find(l => l.side === 'long');
                if (shortLeg && longLeg) {
                     processedTrades.push({
                        id: trade.id,
                        date: trade.date,
                        symbol: trade.symbol,
                        strategy: trade.strategy,
                        expiration: shortLeg.expiration,
                        strike_short: shortLeg.strike,
                        strike_long: longLeg.strike,
                        price: shortLeg.open_price,
                        quantity: shortLeg.quantity,
                        status: shortLeg.status
                    });
                }
            }
        }

        processedTrades.sort((a, b) => {
            const exA = a.expiration ? new Date(a.expiration).getTime() : 8640000000000000;
            const exB = b.expiration ? new Date(b.expiration).getTime() : 8640000000000000;
            return exA - exB;
        });

        allActiveTrades.value = processedTrades;
        await syncCashUsed();
    }

    async function syncCashUsed() {
        if (!db.value || !account.value.id) return;
        
        // Calculate Wheel Usage
        let used = 0;
        const wheelTrades = allActiveTrades.value.filter(t => t.strategy === 'wheel');
        
        wheelTrades.forEach(t => {
            if (t.status !== 'open' && t.status !== 'pending') return;

            // Cash Secured Put (Short Put) -> Collateral = Strike
            if (t.type === 'put' && t.side === 'short') {
                used += t.strike * 100 * t.quantity;
            }
            // Assigned Stock (Long Stock) -> Invested = Entry Price (Assignment Strike)
            else if (t.type === 'stock' && t.side === 'long') {
                 used += t.entry_price * 100 * t.quantity; 
            }
            // Long Options (Achat Put, Achat Call, Hedge) -> Invested = Premium Paid
            else if (t.side === 'long' && (t.type === 'put' || t.type === 'call')) {
                used += t.entry_price * 100 * t.quantity;
            }
            // Short Call (Covered Call) -> Impact 0 (Covered by stock)
        });

        // Update DB
        await db.value.execute("UPDATE accounts SET cash_used = ? WHERE id = ?", [used, account.value.id]);
        
        // Update Local State without full reload
        account.value.cash_used = used;
    }

    async function saveMMSettings() {
        if(!db.value || !account.value.id) return;
        try {
            const totalCap = (mmConfig.value.alloc_wheel||0) + (mmConfig.value.alloc_growth||0) + (mmConfig.value.alloc_rocket||0);

            await db.value.execute(
                `UPDATE accounts 
                 SET capital = ?, alloc_wheel = ?, margin_wheel_pct = ?, alloc_growth = ?, alloc_rocket = ?
                 WHERE id = ?`,
                [
                    totalCap,
                    mmConfig.value.alloc_wheel,
                    mmConfig.value.margin_wheel_pct,
                    mmConfig.value.alloc_growth,
                    mmConfig.value.alloc_rocket,
                    account.value.id
                ]
            );
            showSettings.value = false;
            await loadAccountData(); 
        } catch (e) {
            if (e.toString().includes("no such column: alloc_rocket")) {
                 try {
                    await db.value.execute("ALTER TABLE accounts ADD COLUMN alloc_rocket REAL DEFAULT 0");
                    await saveMMSettings(); 
                 } catch (ex) {}
            }
        }
    }

    function updateTotalCapital() {
        mmConfig.value.capital = (mmConfig.value.alloc_wheel || 0) + (mmConfig.value.alloc_growth || 0) + (mmConfig.value.alloc_rocket || 0);
    }

    const displayedCapital = computed(() => {
        if (strategyType.value === 'wheel') {
            const base = account.value.alloc_wheel || 0;
            const margin = base * ( (account.value.margin_wheel_pct || 0) / 100 );
            return base + margin;
        } else if (strategyType.value === 'pcs') {
            return account.value.alloc_growth || 0;
        } else if (strategyType.value === 'rockets') {
            return account.value.alloc_rocket || 0;
        }
        return 0;
    });

    const activeTradesWheel = computed(() => allActiveTrades.value.filter(t => t.strategy === 'wheel'));
    const wheelOptions = computed(() => activeTradesWheel.value.filter(t => t.type !== 'stock' && (t.status === 'open' || t.status === 'pending')));
    const wheelStocks = computed(() => activeTradesWheel.value.filter(t => t.type === 'stock' && t.status === 'open'));
    const activeTradesPcs = computed(() => allActiveTrades.value.filter(t => t.strategy === 'pcs' && (t.status === 'open' || t.status === 'pending')));
    const activeTradesRockets = computed(() => allActiveTrades.value.filter(t => t.strategy === 'rockets' && (t.status === 'open' || t.status === 'pending' || t.status === 'neutralized')));

    const currentActiveTrades = computed(() => {
        if (strategyType.value === 'wheel') return wheelOptions.value;
        if (strategyType.value === 'pcs') return activeTradesPcs.value;
        if (strategyType.value === 'rockets') return activeTradesRockets.value;
        return [];
    });
    
    const currentAssignedTrades = computed(() => {
        if (strategyType.value === 'wheel') return wheelStocks.value;
        return [];
    });

    const strategyLabel = computed(() => {
        if (strategyType.value === 'wheel') return 'Wheel';
        if (strategyType.value === 'pcs') return 'Put Credit Spread';
        if (strategyType.value === 'rockets') return 'Rockets';
        return '';
    });

    // Calendar
    const calendarEvents = computed(() => {
        const events = [];
        const now = new Date();
        now.setHours(0,0,0,0);
        const tradesWithExpiry = allActiveTrades.value.filter(t => t.expiration && (t.status === 'open' || t.status === 'pending'));
        const map = new Map();

        tradesWithExpiry.forEach(t => {
            const key = t.expiration;
            if (!map.has(key)) {
                const expDate = new Date(t.expiration);
                const diffTime = expDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                map.set(key, { dateObj: expDate, dateStr: t.expiration, symbols: new Set(), dte: diffDays });
            }
            map.get(key).symbols.add(t.symbol);
        });

        return Array.from(map.values()).sort((a, b) => a.dateObj - b.dateObj).map(e => {
            const d = e.dateObj;
            return {
                day: d.getDate(),
                month: d.toLocaleString('fr-FR', { month: 'short' }).toUpperCase(),
                symbol: Array.from(e.symbols).join(', '),
                dte: e.dte
            };
        });
    });

    // MM Stats
    const wheelStats = computed(() => {
        let used = 0;
        activeTradesWheel.value.forEach(t => {
            if (t.type === 'put' && t.side === 'short' && (t.status === 'open' || t.status === 'pending')) {
                used += t.strike * 100 * t.quantity;
            }
            if (t.type === 'stock' && t.side === 'long' && t.status === 'open') {
                 used += t.entry_price * t.quantity;
            }
        });
        const totalCap = displayedCapital.value;
        return { used, total: totalCap, remaining: totalCap - used, isRespecting: used <= totalCap };
    });

    const pcsStats = computed(() => {
        const openCount = activeTradesPcs.value.filter(t => t.status === 'open' || t.status === 'pending').length;
        return { count: openCount, limit: 10, isRespecting: openCount <= 10 };
    });

    const rocketsStats = computed(() => {
        const openCount = activeTradesRockets.value.filter(t => t.status === 'open').length;
        return { count: openCount, limit: 5, isRespecting: openCount <= 5 };
    });

    const mmStatusText = computed(() => {
        if (strategyType.value === 'wheel') {
            if (!wheelStats.value.isRespecting) return 'CAPITAL DÉPASSÉ';
            if (wheelStats.value.remaining < 1000) return 'CAPITAL ATTEINT';
            return 'MM RESPECTÉ';
        }
        if (strategyType.value === 'pcs') {
            if (!pcsStats.value.isRespecting) return 'LIMITE DÉPASSÉE';
            if (pcsStats.value.count >= pcsStats.value.limit) return 'LIMITE ATTEINTE';
            return `MM RESPECTÉ (${pcsStats.value.count}/10)`;
        }
        if (strategyType.value === 'rockets') {
            if (!rocketsStats.value.isRespecting) return 'LIMITE DÉPASSÉE';
            if (rocketsStats.value.count >= rocketsStats.value.limit) return 'LIMITE ATTEINTE';
            return `MM RESPECTÉ (${rocketsStats.value.count}/5)`;
        }
        return '';
    });

    const mmStatusColor = computed(() => {
        let text = mmStatusText.value;
        if (text.includes('DÉPASSÉ')) return 'red';
        if (text.includes('ATTEINT')) return 'blue';
        return 'green';
    });

    // Actions
    function assignTrade(trade) {
       tradeToAssign.value = trade;
       showAssignModal.value = true;
    }

    async function confirmAssignment() {
        if(!tradeToAssign.value) return;
        const trade = tradeToAssign.value;
        try {
            await db.value.execute(`UPDATE legs SET status = 'assigned' WHERE id = ?`, [trade.id]);
            if (trade.type === 'put') {
                 await db.value.execute(
                    `INSERT INTO legs (trade_id, type, side, quantity, open_price, status) 
                     VALUES (?, 'stock', 'long', ?, ?, 'open')`,
                    [trade.trade_id, trade.quantity, trade.strike]
                );
            }
            await loadActiveTrades();
        } catch (e) {
        } finally {
            showAssignModal.value = false;
            tradeToAssign.value = null;
        }
    }

    function updateStatus(trade, newStatus) {
        pendingStatusUpdate.value = { trade, newStatus };
        showStatusModal.value = true;
    }
    
    async function confirmStatusUpdate() {
        if (!pendingStatusUpdate.value) return;
        const { trade, newStatus } = pendingStatusUpdate.value;
        try {
            const today = new Date().toISOString().split('T')[0];
            if (trade.strategy === 'pcs') {
                 await db.value.execute(`UPDATE legs SET status = ? WHERE trade_id = ?`, [newStatus, trade.id]);
                 if (newStatus === 'open') {
                     await db.value.execute(`UPDATE trades SET status = 'open', open_date = ? WHERE id = ?`, [today, trade.id]);
                 }
            } else {
                 await db.value.execute(`UPDATE legs SET status = ? WHERE id = ?`, [newStatus, trade.id]);
                 if (newStatus === 'open') {
                     await db.value.execute(`UPDATE trades SET status = 'open', open_date = ? WHERE id = ?`, [today, trade.trade_id]);
                 }
            }
            await loadActiveTrades();
        } catch (e) {
        } finally {
            showStatusModal.value = false;
            pendingStatusUpdate.value = null;
        }
    }

    async function onTradeSubmitted() {
        await loadAccountData();
        await loadActiveTrades();
    }

    return {
        // State
        db, account, plLatent, allActiveTrades, strategyType, mmConfig,
        // Modals
        showSettings, showAssignModal, tradeToAssign, showStatusModal, pendingStatusUpdate,
        // Methods
        init, loadAccountData, loadActiveTrades, saveMMSettings, updateTotalCapital,
        assignTrade, confirmAssignment, updateStatus, confirmStatusUpdate, onTradeSubmitted,
        // Computed
        displayedCapital, activeTradesWheel, wheelOptions, wheelStocks, activeTradesPcs, activeTradesRockets,
        currentActiveTrades, currentAssignedTrades, strategyLabel, calendarEvents,
        wheelStats, pcsStats, rocketsStats, mmStatusText, mmStatusColor
    };
}

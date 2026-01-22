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
    const showDeleteModal = ref(false);
    const tradeToDelete = ref(null);

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
            // Migration for Rockets specific fields
            try { await db.value.execute("ALTER TABLE trades ADD COLUMN asset_type TEXT"); } catch (e) {}
            try { await db.value.execute("ALTER TABLE trades ADD COLUMN broker TEXT"); } catch (e) {}
            try { await db.value.execute("ALTER TABLE trades ADD COLUMN stop_loss REAL"); } catch (e) {}
            try { await db.value.execute("ALTER TABLE trades ADD COLUMN entry_stop REAL"); } catch (e) {}
            try { await db.value.execute("ALTER TABLE trades ADD COLUMN entry_limit REAL"); } catch (e) {}

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
                t.asset_type, t.broker, t.stop_loss, t.entry_stop, t.entry_limit,
                t.exit_partial_price, t.exit_partial_date, t.exit_partial_quantity, t.trailing_stop,
                t.entry_executed, t.exit_price, t.exit_date, t.profit_loss,
                l.id as leg_id, l.type, l.side, l.strike, l.expiration, l.open_price, l.open_date as leg_open_date, l.quantity, l.status
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
                    asset_type: row.asset_type,
                    broker: row.broker,
                    stop_loss: row.stop_loss,
                    entry_stop: row.entry_stop,
                    entry_limit: row.entry_limit,
                    target_yield: row.target_yield,
                    position_size_pct: row.position_size_pct,
                    exit_partial_price: row.exit_partial_price,
                    exit_partial_date: row.exit_partial_date,
                    exit_partial_quantity: row.exit_partial_quantity,
                    trailing_stop: row.trailing_stop,
                    entry_executed: row.entry_executed,
                    exit_price: row.exit_price,
                    exit_date: row.exit_date,
                    profit_loss: row.profit_loss,
                    legs: []
                });
            }
            tradesMap.get(row.trade_id).legs.push(row);
        }
        
        const processedTrades = [];
        for (const trade of tradesMap.values()) {
            const legs = trade.legs;
            
            if (trade.strategy === 'wheel') {
                 if (trade.sub_strategy === 'hedge_spread') {
                     // HEDGE SPREAD Consolidé
                     const longLeg = legs.find(l => l.side === 'long');
                     const shortLeg = legs.find(l => l.side === 'short');
                     // We use the short leg status or just first one
                     const mainLeg = longLeg || legs[0]; 
                     
                     if (mainLeg) {
                         // Find price from Long Leg (where we stored the debit)
                         const price = longLeg ? longLeg.open_price : 0;
                         
                         processedTrades.push({
                            id: mainLeg.leg_id, // Use ID for actions, might need trade_id for delete
                            trade_id: trade.id,
                            date: trade.date,
                            open_date: mainLeg.leg_open_date || trade.open_date || trade.date,
                            symbol: trade.symbol,
                            strategy: trade.strategy,
                            sub_strategy: 'hedge_spread', // Explicit for display
                            target_yield: trade.target_yield,
                            position_size_pct: trade.position_size_pct,
                            type: 'spread',
                            side: 'debit',
                            strike: (longLeg ? longLeg.strike : '?') + '/' + (shortLeg ? shortLeg.strike : '?'), // Display 350/300
                            expiration: mainLeg.expiration,
                            price: price, 
                            entry_price: price,
                            quantity: mainLeg.quantity,
                            status: mainLeg.status
                        });
                     }
                 } else {
                     legs.forEach(leg => {
                        processedTrades.push({
                            id: leg.leg_id,
                            trade_id: trade.id,
                            date: trade.date,
                            open_date: leg.leg_open_date || trade.open_date || trade.date,
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
                            // Preserve explicit sub_strategy if it exists (like 'hedge', 'put_long'), otherwise guess
                            sub_strategy: trade.sub_strategy ? trade.sub_strategy :
                                          ((leg.type === 'put' && leg.side === 'short') ? 'Exo Vente PUT' : 
                                          (leg.type === 'call' && leg.side === 'short') ? 'Exo Vente CALL' : 
                                          leg.type)
                        });
                    });
                 }
            }
            else if (trade.strategy === 'pcs') {
                if (trade.sub_strategy === 'ic') {
                    // Iron Condor: 4 Legs
                    const putShort = legs.find(l => l.type === 'put' && l.side === 'short');
                    const putLong = legs.find(l => l.type === 'put' && l.side === 'long');
                    const callShort = legs.find(l => l.type === 'call' && l.side === 'short');
                    const callLong = legs.find(l => l.type === 'call' && l.side === 'long');

                    if (putShort && putLong && callShort && callLong) {
                         processedTrades.push({
                            id: trade.id, // Trade ID
                            date: trade.date,
                            open_date: trade.open_date || trade.date,
                            symbol: trade.symbol,
                            strategy: trade.strategy,
                            sub_strategy: 'ic',
                            expiration: putShort.expiration, // Assume aligned expirations

                            // Strikes
                            strike_short: putShort.strike,   // Vente Put
                            strike_long: putLong.strike,     // Achat Put
                            strike_call_short: callShort.strike, // Vente Call
                            strike_call_long: callLong.strike,   // Achat Call

                            price: (putShort.open_price || 0) + (callShort.open_price || 0), // Total Credit
                            quantity: putShort.quantity,
                            status: putShort.status // Global status
                        });
                    }
                } else {
                    // Standard PCS (Put Credit Spread): 2 Legs
                    const shortLeg = legs.find(l => l.side === 'short');
                    const longLeg = legs.find(l => l.side === 'long');
                    if (shortLeg && longLeg) {
                        processedTrades.push({
                            id: trade.id,
                            date: trade.date,
                            open_date: trade.open_date || trade.date,
                            symbol: trade.symbol,
                            strategy: trade.strategy,
                            sub_strategy: trade.sub_strategy || 'pcs',
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
             else if (trade.strategy === 'rockets') {
                 // Rockets trade (usually 1 leg stock long, but need details from Trade table)
                 const mainLeg = legs[0]; // Assume first leg carries status
                 if(mainLeg) {
                     processedTrades.push({
                        id: mainLeg.leg_id, // Use Leg ID for actions (important for updates/deletes targeting leg table)
                        trade_id: trade.id, // Keep reference to header
                        date: trade.date,
                        open_date: trade.open_date || trade.date,
                        symbol: trade.symbol,
                        strategy: trade.strategy,
                        asset_type: trade.asset_type,
                        broker: trade.broker,
                        stop_loss: trade.stop_loss,
                        entry_stop: trade.entry_stop,
                        entry_limit: trade.entry_limit,
                        
                        exit_partial_price: trade.exit_partial_price,
                        exit_partial_date: trade.exit_partial_date,
                        exit_partial_quantity: trade.exit_partial_quantity,
                        trailing_stop: trade.trailing_stop,
                        entry_executed: trade.entry_executed,
                        exit_price: trade.exit_price,
                        exit_date: trade.exit_date,
                        profit_loss: trade.profit_loss,

                        price: mainLeg.open_price, // Execute price
                        quantity: mainLeg.quantity,
                        status: mainLeg.status
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

    const rocketsTrades = computed(() => {
        const trades = allActiveTrades.value.filter(t => t.strategy === 'rockets');
        return {
            pending: trades.filter(t => t.status === 'pending'),
            risk: trades.filter(t => t.status === 'open'),
            neutralized: trades.filter(t => t.status === 'neutralized'),
            closed: trades.filter(t => t.status === 'closed')
        };
    });

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

    const totalExpectedPremium = computed(() => {
        let total = 0;
        currentActiveTrades.value.forEach(trade => {
             // Skip stocks if ever they get in here
             if (trade.type === 'stock') return;

             let premium = 0;
             if (trade.target_yield) {
                 premium = (trade.strike * 100 * trade.quantity) * (trade.target_yield / 100);
             } else {
                 premium = Math.abs(trade.price * 100 * trade.quantity);
             }

             // If it's a debit trade (Long Option or Spread Debit), we subtract it from the expected premium (Net Premium)
             // Or at least we don't ADD it.
             // Given "Prime Attendue" usually means "Income from selling", expenses should reduce it.
             if (trade.sub_strategy === 'hedge' || trade.sub_strategy === 'hedge_spread' || trade.type === 'spread') {
                 // Hedges display "-" in the table, so they contribute 0 to the sum.
                 return;
             } 
             
             // For everything else displayed in the table (Short Puts, standard Long Puts showing cost), we sum it.
             total += premium;
        });
        return Math.max(0, total);
    });

    const strategyLabel = computed(() => {
        if (strategyType.value === 'wheel') return 'Wheel';
        if (strategyType.value === 'pcs') return 'Put Credit Spread';
        if (strategyType.value === 'rockets') return 'Rockets';
        return '';
    });

    const strategyCashUsed = computed(() => {
        let used = 0;
        const trades = allActiveTrades.value.filter(t => 
            t.strategy === strategyType.value && 
            (t.status === 'open' || t.status === 'pending' || t.status === 'neutralized')
        );

        trades.forEach(t => {
            if (strategyType.value === 'wheel') {
                // Cash Secured Put
                if (t.type === 'put' && t.side === 'short') {
                    used += t.strike * 100 * t.quantity;
                }
                // Assigned Stock or Long Strategy
                else if (t.side === 'long' || t.type === 'stock') {
                     // Prefer executed price, fallback to planned price
                     const price = t.entry_executed || t.entry_price || t.price || 0;
                     used += price * 100 * t.quantity; 
                }
            }
            else if (strategyType.value === 'pcs') {
                // Vertical Spread Risk = Width * 100 * Qty
                if (t.sub_strategy === 'ic') {
                     // Iron Condor Risk = Max width of either side
                     const widthPut = Math.abs((t.strike_short || 0) - (t.strike_long || 0));
                     const widthCall = Math.abs((t.strike_call_short || 0) - (t.strike_call_long || 0));
                     used += Math.max(widthPut, widthCall) * 100 * t.quantity;
                } else {
                     const width = Math.abs((t.strike_short || 0) - (t.strike_long || 0));
                     used += width * 100 * t.quantity;
                }
            }
            else if (strategyType.value === 'rockets') {
                 // Stock/Crypto Long
                 const price = t.entry_executed || t.entry_price || t.price || 0;
                 used += price * t.quantity; // Crypto might not be x100, but logic assumes quantity handles it? 
                 // Note: Rockets usually stocks/crypto directly. If 'stock', logic above usually x100? 
                 // Let's assume quantity is raw units and price is unit price. 
                 // If asset_type is crypto, maybe no multiplier? 
                 // For now, simple P*Q. (Wheel logic used x100, checking Rockets logic...)
                 // Rockets trade entry usually doesn't enforce x100.
            }
        });
        return used;
    });

    const strategyPL = computed(() => {
        // Returns Total Realized P&L for the active strategy
        const trades = allActiveTrades.value.filter(t => 
            t.strategy === strategyType.value && 
            t.profit_loss !== null && t.profit_loss !== undefined
        );
        return trades.reduce((sum, t) => sum + t.profit_loss, 0);
    });

    const totalAssigned = computed(() => {
        if (strategyType.value !== 'wheel') return 0;
        return wheelStocks.value.reduce((sum, t) => {
             const price = t.entry_executed || t.entry_price || t.price || 0;
             return sum + (price * 100 * t.quantity);
        }, 0);
    });

    // Calendar
    const calendarEvents = computed(() => {
        // Filter by Strategy Type first
        if (strategyType.value === 'rockets') return [];

        const events = [];
        const now = new Date();
        now.setHours(0,0,0,0);

        const tradesWithExpiry = allActiveTrades.value.filter(t => 
            t.expiration && 
            (t.status === 'open' || t.status === 'pending') &&
            t.strategy === strategyType.value
        );

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
                 used += t.entry_price * 100 * t.quantity;
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
            if (!wheelStats.value.isRespecting) return 'MM DEPASSE';
            if (wheelStats.value.remaining < 1000) return 'MM ATTEINT';
            return 'MM RESPECTÉ';
        }
        if (strategyType.value === 'pcs') {
            if (!pcsStats.value.isRespecting) return 'MM DEPASSE';
            if (pcsStats.value.count >= pcsStats.value.limit) return 'MM ATTEINT';
            return `MM RESPECTÉ (${pcsStats.value.count}/10)`;
        }
        if (strategyType.value === 'rockets') {
            if (!rocketsStats.value.isRespecting) return 'MM DEPASSE';
            if (rocketsStats.value.count >= rocketsStats.value.limit) return 'MM ATTEINT';
            return `MM RESPECTÉ (${rocketsStats.value.count}/5)`;
        }
        return '';
    });

    const mmStatusColor = computed(() => {
        let text = mmStatusText.value;
        if (text.includes('DEPASSE')) return 'red';
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
                 // The Stock leg starts when the Put expires
                 await db.value.execute(
                    `INSERT INTO legs (trade_id, type, side, quantity, open_price, open_date, status) 
                     VALUES (?, 'stock', 'long', ?, ?, ?, 'open')`,
                    [trade.trade_id, trade.quantity, trade.strike, trade.expiration]
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
    
    async function confirmStatusUpdate(closePrice) {
        if (!pendingStatusUpdate.value) return;
        const { trade, newStatus } = pendingStatusUpdate.value;
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // WHEEL / ROCKETS logic (Per Leg)
            if (trade.strategy !== 'pcs') {
                 let updates = [`status = ?`];
                 let params = [newStatus];

                 // If closing, set close info & calculate P&L
                 if (newStatus === 'closed' && closePrice !== undefined && closePrice !== null) {
                    updates.push(`close_price = ?`);
                    params.push(closePrice);
                    
                    // Simple P&L Calc per leg
                    // Short Put/Call: (Open - Close) * 100 * Qty
                    // Long Put/Call/Stock: (Close - Open) * 100 * Qty
                    let pl = 0;
                    const qty = trade.quantity;
                    const openP = trade.price || trade.open_price || trade.entry_price || 0; // handle various field names
                    
                    if (trade.side === 'short') { // Selling to open
                        pl = (openP - closePrice) * 100 * qty;
                    } else { // Buying to open
                        pl = (closePrice - openP) * 100 * qty;
                    }

                    // Update Trade-level P&L (Accumulative if multiple legs but usually one for these strategies)
                    // Note: If reusing trade_id for multiple legs over time (e.g. rolling), this might need summing.
                    // For now, let's update the trade P&L by adding to it.
                    await db.value.execute(`UPDATE trades SET profit_loss = profit_loss + ? WHERE id = ?`, [pl, trade.trade_id]);
                 }

                 params.push(trade.id); // WHERE id = ?
                 
                 await db.value.execute(`UPDATE legs SET ${updates.join(', ')} WHERE id = ?`, params);

                 if (newStatus === 'open') {
                     await db.value.execute(`UPDATE trades SET status = 'open', open_date = ? WHERE id = ?`, [today, trade.trade_id]);
                 }
            } 
            // PCS logic (Per Trade / Group of legs)
            else if (trade.strategy === 'pcs') {
                 // For PCS, 'trade' represents the header. We close legs associated.
                 await db.value.execute(`UPDATE legs SET status = ? WHERE trade_id = ?`, [newStatus, trade.id]);
                 
                 // If closing PCS, we might want P&L. For now simple status update.
                 // Future todo: Implement price input for PCS close (Debit paid to close).
                 
                 if (newStatus === 'open') {
                     await db.value.execute(`UPDATE trades SET status = 'open', open_date = ? WHERE id = ?`, [today, trade.id]);
                 }
            }
            
            await loadActiveTrades();
            await syncCashUsed(); // Ensure cash is released
        } catch (e) {
            // Error handled silently or add UI notification later
        } finally {
            showStatusModal.value = false;
            pendingStatusUpdate.value = null;
        }
    }

    // -- New Rocket Lifecycle Methods --
    
    async function activateTrade(tradeId, entryPrice, entryDate) {
        if (!db.value) return;
        try {
            await db.value.execute(`
                UPDATE trades 
                SET entry_executed = ?, open_date = ?, status = 'open' 
                WHERE id = ?`, 
                [entryPrice, entryDate, tradeId]
            );

            // Also update legs status
            await db.value.execute(`UPDATE legs SET status = 'open', open_price = ?, open_date = ? WHERE trade_id = ?`, 
                [entryPrice, entryDate, tradeId]
            );

            await loadActiveTrades();
            await syncCashUsed();
        } catch(e) { 
            // Handle error
        }
    }

    async function neutralizeTrade(tradeId, exitPartialPrice, exitPartialDate, exitPartialQty) {
        if (!db.value) return;
        try {
            await db.value.execute(`
                UPDATE trades 
                SET status = 'neutralized', 
                    exit_partial_price = ?, 
                    exit_partial_date = ?, 
                    exit_partial_quantity = ?
                WHERE id = ?`, 
                [exitPartialPrice, exitPartialDate, exitPartialQty, tradeId]
            );
            
            await db.value.execute(`UPDATE legs SET status = 'neutralized' WHERE trade_id = ?`, [tradeId]);

            await loadActiveTrades();
            await syncCashUsed();
        } catch(e) { /* Silent error */ }
    }

    async function closeTrade(tradeId, exitPrice, exitDate) {
        if (!db.value) return;
        try {
            // Get trade info for P&L
            const result = await db.value.select("SELECT * FROM trades WHERE id = ?", [tradeId]);
            if (result.length > 0) {
                const t = result[0];
                // For rockets, we assume single leg structure
                const legs = await db.value.select("SELECT quantity, open_price FROM legs WHERE trade_id = ? LIMIT 1", [tradeId]);
                const leg = legs.length > 0 ? legs[0] : { quantity: 0, open_price: 0 };
                
                const totalQty = leg.quantity;
                // Fallback to leg open_price if trade.entry_executed is missing
                const entry = t.entry_executed || leg.open_price || 0;
                
                // Calculate P&L
                let realizedPL = 0;
                
                // 1. Partial Exit Part (if any)
                if (t.exit_partial_price && t.exit_partial_quantity) {
                     realizedPL += (t.exit_partial_price - entry) * t.exit_partial_quantity;
                }
                
                // 2. Remaining Part
                const remainingQty = totalQty - (t.exit_partial_quantity || 0);
                realizedPL += (exitPrice - entry) * remainingQty;

                await db.value.execute(`
                    UPDATE trades 
                    SET status = 'closed', 
                        exit_price = ?, 
                        exit_date = ?,
                        profit_loss = ?
                    WHERE id = ?`, 
                    [exitPrice, exitDate, realizedPL, tradeId]
                );

                await db.value.execute(`UPDATE legs SET status = 'closed', close_price = ? WHERE trade_id = ?`, [exitPrice, tradeId]);

                await loadActiveTrades();
                await syncCashUsed();
            }
        } catch(e) { /* Silent error */ }
    }

    async function deleteTrade(trade) {
        tradeToDelete.value = trade;
        showDeleteModal.value = true;
    }

    async function updateTradeDate(trade, newDate) {
        if (!trade || !newDate) return;
        try {
            // Update Leg open_date
            await db.value.execute("UPDATE legs SET open_date = ? WHERE id = ?", [newDate, trade.id]);
            
            // Also update main trade open_date if it matches (optional but good for consistency)
            await db.value.execute("UPDATE trades SET open_date = ? WHERE id = ?", [newDate, trade.trade_id]);
            
            await loadActiveTrades();
        } catch (e) {
            // Silent error
        }
    }

    async function updateTradeQuantity(trade, newQuantity) {
        if (!trade || !newQuantity) return;
        try {
            // Update Leg quantity
            await db.value.execute("UPDATE legs SET quantity = ? WHERE id = ?", [newQuantity, trade.id]);
            await loadActiveTrades();
        } catch (e) {
            // Silent error
        }
    }

    async function updateTrailingStop(trade, newStop) {
        if (!trade || !newStop) return;
        try {
            await db.value.execute("UPDATE trades SET trailing_stop = ? WHERE id = ?", [newStop, trade.trade_id]);
            await loadActiveTrades();
        } catch (e) {
            // Silent error
        }
    }

    async function confirmDeleteTrade() {
        if (!tradeToDelete.value) return;
        const trade = tradeToDelete.value;
        
        try {
            if (trade.strategy === 'pcs') {
                 // For PCS, ID refers to the Trade Header
                 await db.value.execute("DELETE FROM legs WHERE trade_id = ?", [trade.id]);
                 await db.value.execute("DELETE FROM trades WHERE id = ?", [trade.id]);
            } else {
                 // For Wheel/Rockets, ID refers to the Leg
                 await db.value.execute("DELETE FROM legs WHERE id = ?", [trade.id]);
                 // Cleanup empty headers
                 await db.value.execute("DELETE FROM trades WHERE id NOT IN (SELECT DISTINCT trade_id FROM legs)");
            }
            
            await loadActiveTrades();
            await syncCashUsed();
        } catch(e) {
             // Error handled silently
        } finally {
            showDeleteModal.value = false;
            tradeToDelete.value = null;
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
        showSettings, showAssignModal, tradeToAssign, showStatusModal, pendingStatusUpdate, showDeleteModal, tradeToDelete,
        // Methods
        init, loadAccountData, loadActiveTrades, saveMMSettings, updateTotalCapital,
        assignTrade, confirmAssignment, updateStatus, confirmStatusUpdate, onTradeSubmitted, deleteTrade, confirmDeleteTrade, updateTradeDate, updateTradeQuantity, updateTrailingStop,
        activateTrade, neutralizeTrade, closeTrade,
        // Computed
        displayedCapital, activeTradesWheel, wheelOptions, wheelStocks, activeTradesPcs, activeTradesRockets, rocketsTrades,
        currentActiveTrades, currentAssignedTrades, strategyLabel, calendarEvents,
        wheelStats, pcsStats, rocketsStats, mmStatusText, mmStatusColor, totalExpectedPremium,
        strategyCashUsed, strategyPL, totalAssigned
    };
}

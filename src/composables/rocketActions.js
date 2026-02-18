import { computed } from 'vue';
import { initDB } from "../utils/db.js";
import { useRocketStore } from './rocketStore.js';
import { processRawTrades } from '../utils/rocketProcessing.js';

export const useRocketActions = () => {
    const store = useRocketStore();
    const { 
        db, account, allActiveTrades, strategyType, mmConfig, 
        showSettings, showAssignModal, tradeToAssign, 
        showStatusModal, pendingStatusUpdate, 
        showDeleteModal, tradeToDelete 
    } = store;

    // --- INITIALIZATION ---
    async function init() {
        try {
            db.value = await initDB();
            // Migrations (Idempotent)
            try { await db.value.execute("ALTER TABLE accounts ADD COLUMN alloc_rocket REAL DEFAULT 0"); } catch (e) {}
            try { await db.value.execute("ALTER TABLE trades ADD COLUMN sub_strategy TEXT"); } catch (e) {}
            try { await db.value.execute("ALTER TABLE trades ADD COLUMN asset_type TEXT"); } catch (e) {}
            try { await db.value.execute("ALTER TABLE trades ADD COLUMN broker TEXT"); } catch (e) {}
            try { await db.value.execute("ALTER TABLE trades ADD COLUMN stop_loss REAL"); } catch (e) {}
            try { await db.value.execute("ALTER TABLE trades ADD COLUMN entry_stop REAL"); } catch (e) {}
            try { await db.value.execute("ALTER TABLE trades ADD COLUMN entry_limit REAL"); } catch (e) {}

            await loadAccountData();
            await loadActiveTrades();
        } catch (e) { } // Silent init error
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
        allActiveTrades.value = processRawTrades(rows);
        await syncCashUsed();
    }

    async function syncCashUsed() {
        if (!db.value || !account.value.id) return;
        let used = 0;
        const wheelTrades = allActiveTrades.value.filter(t => t.strategy === 'wheel');
        wheelTrades.forEach(t => {
            if (t.status !== 'open' && t.status !== 'pending') return;
            if (t.type === 'put' && t.side === 'short') used += t.strike * 100 * t.quantity;
            else if (t.type === 'stock' && t.side === 'long') used += t.entry_price * 100 * t.quantity; 
            else if (t.side === 'long' && (t.type === 'put' || t.type === 'call')) used += t.entry_price * 100 * t.quantity;
        });
        await db.value.execute("UPDATE accounts SET cash_used = ? WHERE id = ?", [used, account.value.id]);
        account.value.cash_used = used;
    }

    // --- CRUD WRAPPERS ---
    async function saveMMSettings() {
        if(!db.value || !account.value.id) return;
        try {
            const totalCap = (mmConfig.value.alloc_wheel||0) + (mmConfig.value.alloc_growth||0) + (mmConfig.value.alloc_rocket||0);
            await db.value.execute(
                `UPDATE accounts SET capital = ?, alloc_wheel = ?, margin_wheel_pct = ?, alloc_growth = ?, alloc_rocket = ? WHERE id = ?`,
                [totalCap, mmConfig.value.alloc_wheel, mmConfig.value.margin_wheel_pct, mmConfig.value.alloc_growth, mmConfig.value.alloc_rocket, account.value.id]
            );
            showSettings.value = false;
            await loadAccountData(); 
        } catch (e) {
            // Error handling tailored for UI feedback or silent catch
        }
    }

    function updateTotalCapital() {
        mmConfig.value.capital = (mmConfig.value.alloc_wheel || 0) + (mmConfig.value.alloc_growth || 0) + (mmConfig.value.alloc_rocket || 0);
    }

    function assignTrade(trade) { tradeToAssign.value = trade; showAssignModal.value = true; }
    async function confirmAssignment() {
        if(!tradeToAssign.value) return;
        const trade = tradeToAssign.value;
        try {
            await db.value.execute(`UPDATE legs SET status = 'assigned' WHERE id = ?`, [trade.id]);
            if (trade.type === 'put') {
                 await db.value.execute(
                    `INSERT INTO legs (trade_id, type, side, quantity, open_price, open_date, status) VALUES (?, 'stock', 'long', ?, ?, ?, 'open')`,
                    [trade.trade_id, trade.quantity, trade.strike, trade.expiration]
                );
            }
            await loadActiveTrades();
        } catch (e) {} finally { showAssignModal.value = false; tradeToAssign.value = null; }
    }

    function updateStatus(trade, newStatus) { pendingStatusUpdate.value = { trade, newStatus }; showStatusModal.value = true; }
    async function confirmStatusUpdate(closePrice) {
        if (!pendingStatusUpdate.value) return;
        const { trade, newStatus } = pendingStatusUpdate.value;
        try {
            const today = new Date().toISOString().split('T')[0];
            if (trade.strategy !== 'pcs') {
                 let updates = [`status = ?`], params = [newStatus];
                 if (newStatus === 'closed' && closePrice !== undefined) {
                    updates.push(`close_price = ?`); params.push(closePrice);
                    let pl = 0; const qty = trade.quantity; const openP = trade.price || trade.open_price || trade.entry_price || 0;
                    if (trade.side === 'short') pl = (openP - closePrice) * 100 * qty; else pl = (closePrice - openP) * 100 * qty;
                    
                    // Update Trade Profit/Loss AND Status
                    await db.value.execute(`
                        UPDATE trades 
                        SET profit_loss = IFNULL(profit_loss, 0) + ?, 
                            status = 'closed', 
                            exit_date = ?, 
                            exit_price = ? 
                        WHERE id = ?`, 
                        [pl, today, closePrice, trade.trade_id]
                    );
                 }
                 params.push(trade.id);
                 await db.value.execute(`UPDATE legs SET ${updates.join(', ')} WHERE id = ?`, params);
                 
                 // Re-opening logic
                 if (newStatus === 'open') await db.value.execute(`UPDATE trades SET status = 'open', open_date = ? WHERE id = ?`, [today, trade.trade_id]);
            } else if (trade.strategy === 'pcs') {
                 await db.value.execute(`UPDATE legs SET status = ? WHERE trade_id = ?`, [newStatus, trade.id]);
                 if (newStatus === 'open') await db.value.execute(`UPDATE trades SET status = 'open', open_date = ? WHERE id = ?`, [today, trade.id]);
            }
            await loadActiveTrades(); await syncCashUsed();
        } catch (e) {} finally { showStatusModal.value = false; pendingStatusUpdate.value = null; }
    }

    async function activateTrade(tradeId, entryPrice, entryDate) {
        try {
            await db.value.execute(`UPDATE trades SET entry_executed = ?, open_date = ?, status = 'open' WHERE id = ?`, [entryPrice, entryDate, tradeId]);
            await db.value.execute(`UPDATE legs SET status = 'open', open_price = ?, open_date = ? WHERE trade_id = ?`, [entryPrice, entryDate, tradeId]);
            await loadActiveTrades(); await syncCashUsed();
        } catch(e) {}
    }

    async function neutralizeTrade(tradeId, exitPartialPrice, exitPartialDate, exitPartialQty) {
        try {
            await db.value.execute(`UPDATE trades SET status = 'neutralized', exit_partial_price = ?, exit_partial_date = ?, exit_partial_quantity = ? WHERE id = ?`, [exitPartialPrice, exitPartialDate, exitPartialQty, tradeId]);
            await db.value.execute(`UPDATE legs SET status = 'neutralized' WHERE trade_id = ?`, [tradeId]);
            await loadActiveTrades(); await syncCashUsed();
        } catch(e) {}
    }

    async function closeTrade(tradeId, exitPrice, exitDate) {
        try {
            const result = await db.value.select("SELECT * FROM trades WHERE id = ?", [tradeId]);
            if (result.length > 0) {
                const t = result[0];
                const legs = await db.value.select("SELECT quantity, open_price FROM legs WHERE trade_id = ? LIMIT 1", [tradeId]);
                const leg = legs[0] || { quantity: 0, open_price: 0 };
                const entry = t.entry_executed || leg.open_price || 0;
                let realizedPL = 0;
                // PL Partiel + PL Restant
                if (t.exit_partial_price && t.exit_partial_quantity) realizedPL += (t.exit_partial_price - entry) * t.exit_partial_quantity;
                realizedPL += (exitPrice - entry) * (leg.quantity - (t.exit_partial_quantity || 0));

                await db.value.execute(`UPDATE trades SET status = 'closed', exit_price = ?, exit_date = ?, profit_loss = ? WHERE id = ?`, [exitPrice, exitDate, realizedPL, tradeId]);
                await db.value.execute(`UPDATE legs SET status = 'closed', close_price = ? WHERE trade_id = ?`, [exitPrice, tradeId]);
                await loadActiveTrades(); await syncCashUsed();
            }
        } catch(e) {}
    }

    async function updateClosedTrade(tradeId, exitDate, exitPrice, profitLoss) {
        try {
            await db.value.execute(
                `UPDATE trades SET exit_date = ?, exit_price = ?, profit_loss = ? WHERE id = ?`,
                [exitDate, exitPrice, profitLoss, tradeId]
            );
        } catch(e) {}
    }

    async function updateClosedTrade(tradeId, exitDate, exitPrice, profitLoss) {
        try {
            await db.value.execute(
                `UPDATE trades SET exit_date = ?, exit_price = ?, profit_loss = ? WHERE id = ?`,
                [exitDate, exitPrice, profitLoss, tradeId]
            );
        } catch(e) {}
    }

    async function deleteTrade(trade) { tradeToDelete.value = trade; showDeleteModal.value = true; }
    async function confirmDeleteTrade() {
        if (!tradeToDelete.value) return;
        const trade = tradeToDelete.value;
        try {
            if (trade.strategy === 'pcs') {
                 await db.value.execute("DELETE FROM legs WHERE trade_id = ?", [trade.id]);
                 await db.value.execute("DELETE FROM trades WHERE id = ?", [trade.id]);
            } else {
                 await db.value.execute("DELETE FROM legs WHERE id = ?", [trade.id]);
                 await db.value.execute("DELETE FROM trades WHERE id NOT IN (SELECT DISTINCT trade_id FROM legs)");
            }
            await loadActiveTrades(); await syncCashUsed();
        } catch(e) {} finally { showDeleteModal.value = false; tradeToDelete.value = null; }
    }

    async function updateTradeDate(trade, newDate) {
        try { await db.value.execute("UPDATE legs SET open_date = ? WHERE id = ?", [newDate, trade.id]);
            await db.value.execute("UPDATE trades SET open_date = ? WHERE id = ?", [newDate, trade.trade_id]);
            await loadActiveTrades(); } catch (e) {}
    }
    async function updateTradeQuantity(trade, no) {
        try { await db.value.execute("UPDATE legs SET quantity = ? WHERE id = ?", [no, trade.id]); await loadActiveTrades(); } catch (e) {}
    }
    async function updateTrailingStop(trade, val) {
        try { await db.value.execute("UPDATE trades SET trailing_stop = ? WHERE id = ?", [val, trade.trade_id]); await loadActiveTrades(); } catch (e) {}
    }

    async function fetchHistory(strategy) {
        if (!db.value) return [];
        let q = '';
        if (strategy === 'rockets') {
             q = `SELECT * FROM trades t WHERE t.strategy = 'rockets' AND t.status = 'closed' ORDER BY t.exit_date ASC`;
        } else if (strategy === 'pcs') {
             q = `SELECT * FROM trades t WHERE t.strategy = 'pcs' AND t.status = 'closed' ORDER BY t.exit_date ASC`;
        } else if (strategy === 'wheel') {
             q = `SELECT t.*, l.type, l.side, l.strike, l.expiration, l.open_price as price, l.quantity
                   FROM trades t
                   LEFT JOIN legs l ON t.id = l.trade_id
                   WHERE t.strategy = 'wheel' AND t.status = 'closed' 
                   ORDER BY t.exit_date ASC`;
        }
        if (q) return await db.value.select(q);
        return [];
    }

    async function onTradeSubmitted() { await loadAccountData(); await loadActiveTrades(); }

    return {
        init, loadAccountData, loadActiveTrades, saveMMSettings, updateTotalCapital,
        assignTrade, confirmAssignment, updateStatus, confirmStatusUpdate, onTradeSubmitted, deleteTrade, confirmDeleteTrade,
        updateTradeDate, updateTradeQuantity, updateTrailingStop, activateTrade, neutralizeTrade, closeTrade, updateClosedTrade,
        fetchHistory
    };
};

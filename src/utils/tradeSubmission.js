import { initDB } from './db.js';

export async function submitTradeToDB(payload, accountId) {
    // Payload contains: strategy, subStrategy, form, quantityToInsert
    const db = await initDB();
    const today = new Date().toISOString().split('T')[0];
    const currentStrategy = payload.strategy;
    const targetYield = payload.form.estimatedYield || 0;
    const posSize = payload.form.positionSizePct || 0;
    const qC = payload.quantityToInsert;
    
    // Determine initial status
    let initialStatus = 'open';
    if (currentStrategy === 'rockets') {
            // If no execution price is set, it's a pending order
            if (!payload.form.price) {
                initialStatus = 'pending';
            }
    }

    // Trade Header
    // We include Rocket fields in the main INSERT to ensure atomicity
    const assetType = (currentStrategy === 'rockets') ? payload.form.assetType : null;
    const broker = (currentStrategy === 'rockets') ? payload.form.broker : null;
    const stopLoss = (currentStrategy === 'rockets') ? payload.form.stopLoss : null;
    const entryStop = (currentStrategy === 'rockets') ? payload.form.entryStop : null;
    const entryLimit = (currentStrategy === 'rockets') ? payload.form.entryLimit : null;

    const result = await db.execute(
        `INSERT INTO trades 
        (account_id, date, open_date, symbol, strategy, sub_strategy, status, target_yield, position_size_pct, 
            asset_type, broker, stop_loss, entry_stop, entry_limit, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
            accountId, today, today, payload.form.symbol.toUpperCase(), currentStrategy, payload.subStrategy, initialStatus, targetYield, posSize,
            assetType, broker, stopLoss, entryStop, entryLimit
        ]
    );
    const tradeId = result.lastInsertId;
    let cashImpact = 0;

    // --- WHEEL ---
    if (currentStrategy === 'wheel') {
        let type = 'put';
        let side = 'short';
        let impact = 0;

        switch (payload.subStrategy) {
            case 'put': // Vente PUT
                type = 'put'; side = 'short';
                impact = (payload.form.strike * 100 * qC);
                break;
            case 'put_long': // Achat PUT
                type = 'put'; side = 'long';
                impact = (Math.abs(payload.form.price) * 100 * qC);
                break;
            case 'call': // Vente CALL
                type = 'call'; side = 'short';
                impact = 0;
                break;
            case 'call_long': // Achat CALL
                type = 'call'; side = 'long';
                impact = (Math.abs(payload.form.price) * 100 * qC);
                break;
            case 'hedge': 
                type = 'put'; side = 'long';
                impact = (Math.abs(payload.form.price) * 100 * qC);
                break;
            case 'hedge_spread':
                // HEDGE SPREAD: 2 legs (Long Put + Short Put)
                // Insert Long Put
                await db.execute(
                    `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                        VALUES (?, 'put', 'long', ?, ?, ?, ?, 'open')`,
                        [tradeId, qC, payload.form.strikeLong, payload.form.expiry, Math.abs(payload.form.price)]
                );
                // Insert Short Put
                await db.execute(
                    `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                        VALUES (?, 'put', 'short', ?, ?, ?, 0, 'open')`,
                        [tradeId, qC, payload.form.strikeShort, payload.form.expiry]
                );
                
                impact = (Math.abs(payload.form.price) * 100 * qC);
                side = 'spread'; 
                break;
        }

        if (payload.subStrategy !== 'hedge_spread') {
            await db.execute(
                `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`,
                [tradeId, type, side, qC, payload.form.strike, payload.form.expiry, payload.form.price]
            );
        }
        cashImpact = impact;
    } 
    // --- PCS ---
    else if (currentStrategy === 'pcs') {
        if (payload.subStrategy === 'pcs') {
            await db.execute(
                `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                    VALUES (?, 'put', 'short', ?, ?, ?, ?, 'open')`,
                [tradeId, qC, payload.form.strikeShort, payload.form.expiry, payload.form.price]
            );
            await db.execute(
                `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                    VALUES (?, 'put', 'long', ?, ?, ?, 0, 'open')`,
                [tradeId, qC, payload.form.strikeLong, payload.form.expiry]
            );
            cashImpact = Math.abs(payload.form.strikeShort - payload.form.strikeLong) * 100 * qC;
        }
        else if (payload.subStrategy === 'ic') {
                // Put Side
                await db.execute(
                `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                    VALUES (?, 'put', 'short', ?, ?, ?, ?, 'open')`,
                [tradeId, qC, payload.form.strikeShort, payload.form.expiry, payload.form.price/2] 
            );
            await db.execute(
                `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                    VALUES (?, 'put', 'long', ?, ?, ?, 0, 'open')`,
                [tradeId, qC, payload.form.strikeLong, payload.form.expiry]
            );
            // Call Side
            await db.execute(
                `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                    VALUES (?, 'call', 'short', ?, ?, ?, ?, 'open')`,
                [tradeId, qC, payload.form.strikeCallShort, payload.form.expiry, payload.form.price/2]
            );
            await db.execute(
                `INSERT INTO legs (trade_id, type, side, quantity, strike, expiration, open_price, status) 
                    VALUES (?, 'call', 'long', ?, ?, ?, 0, 'open')`,
                [tradeId, qC, payload.form.strikeCallLong, payload.form.expiry]
            );

            const widthPut = Math.abs(payload.form.strikeShort - payload.form.strikeLong);
            const widthCall = Math.abs(payload.form.strikeCallShort - payload.form.strikeCallLong);
            cashImpact = Math.max(widthPut, widthCall) * 100 * qC;
        }
    }
    // --- ROCKETS ---
    else if (currentStrategy === 'rockets') {
            const legPrice = initialStatus === 'open' ? payload.form.price : 0;
            await db.execute(
            `INSERT INTO legs (trade_id, type, side, quantity, open_price, status) 
                VALUES (?, 'stock', 'long', ?, ?, ?)`,
            [tradeId, qC, legPrice, initialStatus]
        );
        
        if (initialStatus === 'open') {
            cashImpact = payload.form.price * qC;
        }
    }

    if (cashImpact > 0) {
        await db.execute(`UPDATE accounts SET cash_used = cash_used + ? WHERE id = ?`, [cashImpact, accountId]);
    }
    
    return tradeId;
}

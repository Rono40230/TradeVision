export function processRawTrades(rows) {
    const tradesMap = new Map();
    for (const row of rows) {
        if (!tradesMap.has(row.trade_id)) {
            tradesMap.set(row.trade_id, {
                id: row.trade_id, date: row.date, open_date: row.open_date, symbol: row.symbol,
                strategy: row.strategy, sub_strategy: row.sub_strategy, asset_type: row.asset_type,
                broker: row.broker, stop_loss: row.stop_loss, entry_stop: row.entry_stop,
                entry_limit: row.entry_limit, target_yield: row.target_yield,
                position_size_pct: row.position_size_pct,
                exit_partial_price: row.exit_partial_price, exit_partial_date: row.exit_partial_date,
                exit_partial_quantity: row.exit_partial_quantity, trailing_stop: row.trailing_stop,
                entry_executed: row.entry_executed, exit_price: row.exit_price,
                exit_date: row.exit_date, profit_loss: row.profit_loss, legs: []
            });
        }
        tradesMap.get(row.trade_id).legs.push(row);
    }
    
    const processedTrades = [];
    for (const trade of tradesMap.values()) {
        const legs = trade.legs;
        
        if (trade.strategy === 'wheel') {
             if (trade.sub_strategy === 'hedge_spread') {
                 const longLeg = legs.find(l => l.side === 'long');
                 const shortLeg = legs.find(l => l.side === 'short');
                 const mainLeg = longLeg || legs[0]; 
                 if (mainLeg) {
                     processedTrades.push({
                        id: mainLeg.leg_id, trade_id: trade.id, date: trade.date, 
                        open_date: mainLeg.leg_open_date || trade.open_date || trade.date,
                        symbol: trade.symbol, strategy: trade.strategy, sub_strategy: 'hedge_spread',
                        target_yield: trade.target_yield, position_size_pct: trade.position_size_pct,
                        type: 'spread', side: 'debit',
                        strike: (longLeg ? longLeg.strike : '?') + '/' + (shortLeg ? shortLeg.strike : '?'),
                        expiration: mainLeg.expiration, price: longLeg ? longLeg.open_price : 0, 
                        entry_price: longLeg ? longLeg.open_price : 0, quantity: mainLeg.quantity, status: mainLeg.status
                    });
                 }
             } else {
                 legs.forEach(leg => {
                    processedTrades.push({
                        id: leg.leg_id, trade_id: trade.id, date: trade.date,
                        open_date: leg.leg_open_date || trade.open_date || trade.date,
                        symbol: trade.symbol, strategy: trade.strategy, sub_strategy: trade.sub_strategy,
                        target_yield: trade.target_yield, position_size_pct: trade.position_size_pct,
                        type: leg.type, side: leg.side, strike: leg.strike, expiration: leg.expiration,
                        price: leg.open_price, entry_price: leg.open_price, quantity: leg.quantity, status: leg.status,
                        sub_strategy: trade.sub_strategy ? trade.sub_strategy :
                                      ((leg.type === 'put' && leg.side === 'short') ? 'Exo Vente PUT' : 
                                      (leg.type === 'call' && leg.side === 'short') ? 'Exo Vente CALL' : leg.type)
                    });
                });
             }
        }
        else if (trade.strategy === 'pcs') {
            if (trade.sub_strategy === 'ic') {
                const putShort = legs.find(l => l.type === 'put' && l.side === 'short');
                const callShort = legs.find(l => l.type === 'call' && l.side === 'short');
                const mainLeg = putShort || legs[0];
                if (mainLeg) {
                     processedTrades.push({
                        id: trade.id, date: trade.date, open_date: trade.open_date || trade.date,
                        symbol: trade.symbol, strategy: trade.strategy, sub_strategy: 'ic',
                        expiration: mainLeg.expiration,
                        strike_short: putShort?.strike, strike_long: legs.find(l => l.type === 'put' && l.side === 'long')?.strike,
                        strike_call_short: callShort?.strike, strike_call_long: legs.find(l => l.type === 'call' && l.side === 'long')?.strike,
                        price: (putShort?.open_price || 0) + (callShort?.open_price || 0),
                        quantity: mainLeg.quantity, status: mainLeg.status
                    });
                }
            } else {
                const shortLeg = legs.find(l => l.side === 'short');
                const longLeg = legs.find(l => l.side === 'long');
                if (shortLeg) {
                    processedTrades.push({
                        id: trade.id, date: trade.date, open_date: trade.open_date || trade.date,
                        symbol: trade.symbol, strategy: trade.strategy, sub_strategy: trade.sub_strategy || 'pcs',
                        expiration: shortLeg.expiration, strike_short: shortLeg.strike, strike_long: longLeg?.strike,
                        price: shortLeg.open_price, quantity: shortLeg.quantity, status: shortLeg.status
                    });
                }
            }
        }
         else if (trade.strategy === 'rockets') {
             const mainLeg = legs[0];
             if(mainLeg) {
                 processedTrades.push({
                    id: mainLeg.leg_id, trade_id: trade.id, date: trade.date,
                    open_date: trade.open_date || trade.date, symbol: trade.symbol, strategy: trade.strategy,
                    asset_type: trade.asset_type, broker: trade.broker, stop_loss: trade.stop_loss,
                    entry_stop: trade.entry_stop, entry_limit: trade.entry_limit,
                    exit_partial_price: trade.exit_partial_price, exit_partial_date: trade.exit_partial_date,
                    exit_partial_quantity: trade.exit_partial_quantity, trailing_stop: trade.trailing_stop,
                    entry_executed: trade.entry_executed, exit_price: trade.exit_price, 
                    exit_date: trade.exit_date, profit_loss: trade.profit_loss,
                    price: mainLeg.open_price, quantity: mainLeg.quantity, status: mainLeg.status
                });
             }
        }
    }
    processedTrades.sort((a, b) => (a.expiration ? new Date(a.expiration).getTime() : 8640000000000000) - (b.expiration ? new Date(b.expiration).getTime() : 8640000000000000));
    return processedTrades;
}

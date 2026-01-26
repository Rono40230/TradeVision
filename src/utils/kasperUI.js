export function formatCurrencySimple(val) {
    const v = Number(val);
    if (isNaN(v)) return '0$';
    if (Number.isInteger(v)) return v + '$';
    return v.toFixed(2) + '$'; 
}

export function getDailyTrades(entry, pairsConfig) {
    if (!entry || !entry.details) return null;
    try {
        const trades = JSON.parse(entry.details);
        if (!Array.isArray(trades)) return [];

        return trades.map(t => {
            let riskVal = 0; 
            let riskPctString = '0%';
            
            // USE SNAPSHOT IF AVAILABLE
            if (t.snap_sl !== undefined && t.snap_pip_value !== undefined) {
                riskVal = t.lot * t.snap_pip_value * t.snap_sl;
            } else {
                const config = pairsConfig.find(p => p.symbol === t.pair);
                if (config) {
                    riskVal = t.lot * config.pip_value * config.sl_pips;
                }
            }

            if (entry.startCapital && entry.startCapital > 0 && riskVal > 0) {
                    const pct = (riskVal / entry.startCapital) * 100;
                    const rounded = Math.round(pct * 2) / 2;
                    riskPctString = (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + '%';
            }
            
            return {
                pair: t.pair,
                direction: t.direction || 'Buy',
                lot: t.lot,
                result: t.result,
                riskDisplay: riskPctString 
            };
        });
    } catch (e) { return []; }
}

export function getTradeRiskAmount(trade, pairsConfig) {
    if (!trade.pair || trade.lot <= 0) return 0;

    // USE SNAPSHOT IF AVAILABLE
    if (trade.snap_sl !== undefined && trade.snap_pip_value !== undefined) {
        return trade.lot * trade.snap_pip_value * trade.snap_sl;
    }

    const config = pairsConfig.find(p => p.symbol === trade.pair);
    if (config) {
         // Formula: Lot * PipValue * SL_pips
         return trade.lot * config.pip_value * config.sl_pips;
    }
    return 0;
}

export function formatTradeRiskPercentage(trade, capital, pairsConfig) {
    if (!capital || capital <= 0) return '0%';
    const riskAmount = getTradeRiskAmount(trade, pairsConfig);
    const pct = (riskAmount / capital) * 100;
    const rounded = Math.round(pct * 2) / 2; 
    return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + '%';
}

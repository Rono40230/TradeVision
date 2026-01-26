export function formatCurrency(value, decimals = 2) {
    if (value === undefined || value === null) return '0.00 $';
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value) + ' $';
}

export function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR').format(date);
}

export function getDteClass(dte) {
    if (dte <= 7) return 'dte-critical';
    if (dte <= 21) return 'dte-warning';
    return 'dte-safe';
}

export function getAssetClass(assetType) {
    if (!assetType) return '';
    return assetType.toLowerCase();
}

export function formatPrice(price, assetType) {
    if (price === undefined || price === null || price === '') return '-';
    
    const num = parseFloat(price);
    if (isNaN(num)) return '-';

    let maxDecimals = 6; 
    let minDecimals = 2;

    if (assetType && assetType.toLowerCase() === 'crypto') {
        maxDecimals = 8;
        minDecimals = 2; // Keep 2 as minimum for normal display, but allow up to 8
        if (Math.abs(num) < 1 && num !== 0) {
             minDecimals = 4;
        }
    }

    // Remove trailing zeros for cleaner look up to maxDecimals
    const formatter = new Intl.NumberFormat('fr-FR', { 
        minimumFractionDigits: minDecimals, 
        maximumFractionDigits: maxDecimals 
    });

    return formatter.format(num) + ' $';
}

export function calculateRiskPercentage(trade) {
    if (!trade.entry_stop || !trade.stop_loss) return '-';
    const entry = trade.entry_stop;
    const stop = trade.stop_loss;
    const risk = Math.abs(entry - stop) / entry;
    return (risk * 100).toFixed(2);
}


export function getOccSymbol(trade) {
    if (!trade.symbol || !trade.expiration || !trade.strike || !trade.type) return null;
    const dateObj = new Date(trade.expiration);
    if(isNaN(dateObj.getTime())) return null;
    
    // OCC Format: SYMBOL + YYMMDD + T + PRICE (8 digits)
    // Symbol must be padded to 6 chars? No, standard OCC is roughly 6 chars padded space but here we just concat
    // Actually Yahoo Finance uses specific format.
    // Yahoo Format: AAPL230120C00150000
    
    const y = dateObj.getFullYear().toString().slice(2);
    const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const d = (dateObj.getDate()).toString().padStart(2, '0');
    const typeChar = trade.type.toLowerCase().includes('put') ? 'P' : 'C';
    const strikeVal = Math.round(trade.strike * 1000);
    const strikeStr = strikeVal.toString().padStart(8, '0');
    
    return `${trade.symbol}${y}${m}${d}${typeChar}${strikeStr}`;
}

export function calculateDistanceToStrike(currentPrice, strike) {
    if (!currentPrice || !strike) return null;
    return ((currentPrice - strike) / currentPrice) * 100;
}

export function calculateLinkProfit(entryPrice, currentPrice) {
    if (currentPrice === undefined || !entryPrice) return null;
    return ((entryPrice - currentPrice) / entryPrice) * 100;
}

export function calculatePL(entryPrice, currentPrice, quantity) {
    if (currentPrice === undefined || !entryPrice) return null;
    return (entryPrice - currentPrice) * 100 * quantity;
}

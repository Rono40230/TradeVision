import { normalizeDate } from './dateUtils.js';
import { CSV_MEADERS_MAP } from './constants.js';

function getHumanActionPrefix(assetType, side, putCall) {
    if (assetType === 'OPT') {
        const type = putCall === 'P' ? 'Put' : (putCall === 'C' ? 'Call' : '');
        if (!type) return '';
        const action = ['BUY', 'BOT'].includes(side) ? 'Achat' : (['SELL', 'SLD'].includes(side) ? 'Vente' : '');
        return action ? `${action} ${type}` : '';
    }
    if (assetType === 'STK') {
        const action = ['BUY', 'BOT'].includes(side) ? 'Achat' : (['SELL', 'SLD'].includes(side) ? 'Vente' : '');
        return action ? `${action} Action` : '';
    }
    return '';
}

function calculateProceeds(map, row, quantity, assetType) {
    let val = map.proceeds !== -1 ? parseFloat(row[map.proceeds] || 0) : 0;
    if (val === 0 && quantity !== 0) {
        const p = map.price !== -1 ? parseFloat(row[map.price] || 0) : 0;
        const m = (map.multiplier !== -1 && row[map.multiplier]) ? parseFloat(row[map.multiplier]) : (assetType === 'STK' ? 1 : 100);
        if (p !== 0) val = -1 * quantity * p * m;
    }
    return val;
}

function mapRowToExecution(row, map) {
    const rawSymbol = map.symbol !== -1 ? row[map.symbol] : null;
    if (!rawSymbol && (map.underlying === -1 || !row[map.underlying])) return null;

    const quantity = parseFloat(map.quantity !== -1 ? row[map.quantity] : 0);
    if (isNaN(quantity) || quantity === 0) return null;

    let displaySymbol = rawSymbol;
    const underlying = map.underlying !== -1 ? row[map.underlying] : null;

    if (underlying) displaySymbol = underlying;
    else if (rawSymbol) {
        const simpleTickerMatch = rawSymbol.match(/^([A-Z]+)\s/);
        displaySymbol = simpleTickerMatch ? simpleTickerMatch[1] : (rawSymbol.match(/^([A-Z]+)/) || [])[1];
    }
    displaySymbol = displaySymbol || "UNKNOWN";

    const rawDescription = map.description !== -1 ? row[map.description] : '';
    const finalDate = normalizeDate(map.dateTime !== -1 ? row[map.dateTime] : null, rawDescription);
    let displayDescription = rawDescription.startsWith(displaySymbol) ? rawDescription.substring(displaySymbol.length).trim() : rawDescription;
    displayDescription = displayDescription.replace(/\b\d{1,2}[A-Z]{3}\d{2,4}\b/, '').trim();

    const side = map.side !== -1 ? row[map.side] : '?';
    const assetType = map.assetClass !== -1 ? row[map.assetClass] : 'UNKNOWN';
    const putCall = map.putCall !== -1 ? (row[map.putCall] || '') : '';
    
    const actionPrefix = getHumanActionPrefix(assetType, side, putCall);
    if (actionPrefix) displayDescription = `${actionPrefix} ${displayDescription}`;
    
    if (!displayDescription && assetType === 'OPT') {
        const strike = (map.strike !== -1 && row[map.strike]) ? row[map.strike] : '';
        const expiry = (map.expiry !== -1) ? row[map.expiry] : '';
        displayDescription = `${actionPrefix} ${expiry} ${strike}`;
    }

    return {
        id: map.tradeId !== -1 ? row[map.tradeId] : `gen-${Math.random().toString(36).substr(2, 9)}`,
        date: finalDate, 
        symbol: displaySymbol,
        rawSymbol: rawSymbol,
        underlying: underlying || displaySymbol,
        assetType, description: displayDescription, side, quantity,
        price: map.price !== -1 ? parseFloat(row[map.price]) : 0,
        proceeds: calculateProceeds(map, row, quantity, assetType),
        commission: map.commission !== -1 ? parseFloat(row[map.commission] || 0) : 0,
        strike: (map.strike !== -1 && row[map.strike]) ? parseFloat(row[map.strike]) : null,
        expiry: (map.expiry !== -1) ? row[map.expiry] : null,
        type: putCall || null,
        multiplier: (map.multiplier !== -1 && row[map.multiplier]) ? parseFloat(row[map.multiplier]) : 100,
        realizedPnl: (map.realizedPnl !== -1 && row[map.realizedPnl]) ? parseFloat(row[map.realizedPnl]) : 0,
        costBasis: (map.costBasis !== -1 && row[map.costBasis]) ? parseFloat(row[map.costBasis]) : 0,
        openClose: (map.openClose !== -1) ? row[map.openClose] : '?',
        notes: (map.notes !== -1) ? row[map.notes] : ''
    };
}

function detectColumns(headers) {
    const map = {};
    const findIdx = (aliases) => headers.findIndex(h => aliases.includes(h));
    
    for (const [key, aliases] of Object.entries(CSV_MEADERS_MAP)) {
        map[key] = findIdx(aliases);
    }
    
    // Fix dateTime vs Expiry ambiguity if they match same column
    if (map.dateTime !== -1 && map.dateTime === map.expiry) {
        map.dateTime = headers.indexOf('DateTime');
    }
    return map;
}

export function parseIbkrCsv(rawText) {
    if (!rawText) return [];
    const lines = rawText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    let colMap = {};
    let startIdx = 0;
    
    // Scan headers logic
    for(let i = 0; i < Math.min(lines.length, 50); i++) {
        let line = lines[i].charCodeAt(0) === 0xFEFF ? lines[i].slice(1) : lines[i];
        const headers = line.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const tempMap = detectColumns(headers);
        
        if (tempMap.symbol !== -1 && (tempMap.dateTime !== -1 || tempMap.side !== -1)) {
            colMap = tempMap;
            startIdx = i + 1;
            break;
        }
    }
    
    // Fallback line 0
    if (startIdx === 0 && !colMap.symbol) {
        let line = lines[0].charCodeAt(0) === 0xFEFF ? lines[0].slice(1) : lines[0];
        colMap = detectColumns(line.split(',').map(h => h.trim().replace(/^"|"$/g, '')));
        startIdx = 1;
    }

    // Auto-detect date if missing header
    if (colMap.dateTime === -1 && lines.length > startIdx) {
        const row = lines[startIdx].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const idx = row.findIndex(c => /^(\d{8}|\d{4}-\d{2}-\d{2})$/.test(c));
        if (idx !== -1) colMap.dateTime = idx;
    }

    const executions = [];
    for (let i = startIdx; i < lines.length; i++) {
        const row = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (row.length < 2) continue;
        try {
            const exec = mapRowToExecution(row, colMap);
            if (exec && exec.symbol !== 'Symbol' && exec.assetType !== 'AssetClass') executions.push(exec);
        } catch (e) {}
    }

    // Aggregation logic
    const groupedMap = new Map();
    executions.forEach(exec => {
        const key = `${exec.date}|${exec.side}|${exec.symbol}|${exec.assetType}|${exec.strike}|${exec.expiry}|${exec.type}`;
        if (groupedMap.has(key)) {
            const ex = groupedMap.get(key);
            const totVal = (ex.price * ex.quantity) + (exec.price * exec.quantity);
            ex.quantity += exec.quantity;
            ex.price = parseFloat((totVal / ex.quantity).toFixed(4));
            ex.proceeds = (ex.proceeds || 0) + (exec.proceeds || 0);
            ex.commission += exec.commission;
            ex.realizedPnl = (ex.realizedPnl || 0) + (exec.realizedPnl || 0);
        } else {
            groupedMap.set(key, { ...exec, proceeds: exec.proceeds || 0, realizedPnl: exec.realizedPnl || 0 });
        }
    });

    const parseFrDate = (d) => {
        if (!d || d === 'N/A') return 0;
        const [day, month, year] = d.split('/').map(Number);
        return new Date(year, month - 1, day).getTime();
    };
    return Array.from(groupedMap.values()).sort((a, b) => parseFrDate(b.date) - parseFrDate(a.date));
}

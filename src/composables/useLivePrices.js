import { ref, reactive } from 'vue';
import { fetchPrices } from './useMarketData.js';
import { 
    formatCurrency, 
    getOccSymbol, 
    calculateDistanceToStrike, 
    calculateLinkProfit, 
    calculatePL 
} from '../utils/rocketUtils.js';

const livePrices = reactive({});
const isUpdating = ref(false);
let refreshInterval = null;

export function useLivePrices() {
    
    // --- ACTIONS ---
    async function refreshPrices(tradesList) {
        if(isUpdating.value) return;
        isUpdating.value = true;
        try {
            const symbols = new Set();
            
            tradesList.forEach(t => {
                if(t.symbol) symbols.add(t.symbol);
                
                // Wheel Options
                if (t.strategy === 'wheel' && (t.type === 'put' || t.type === 'call')) {
                     const occ = getOccSymbol(t);
                     if (occ) symbols.add(occ);
                }
                
                // PCS/IC Legs
                if (t.strategy === 'pcs') {
                    addPcsLegs(t, symbols);
                }
            });

            if(symbols.size > 0) {
                const prices = await fetchPrices(Array.from(symbols));
                Object.assign(livePrices, prices);
            }
        } catch(e) { 
            // Silent error
        } finally {
            isUpdating.value = false;
        }
    }

    function addPcsLegs(t, symbols) {
        if (t.strike_short) {
            const occ = getOccSymbol({ ...t, strike: t.strike_short, type: 'put' });
            if (occ) symbols.add(occ);
        }
        if (t.strike_long) {
            const occ = getOccSymbol({ ...t, strike: t.strike_long, type: 'put' });
            if (occ) symbols.add(occ);
        }
        if (t.sub_strategy === 'ic') {
             if (t.item_call_short) {
                const occ = getOccSymbol({ ...t, strike: t.item_call_short, type: 'call' });
                if (occ) symbols.add(occ);
             }
             if (t.item_call_long) {
                const occ = getOccSymbol({ ...t, strike: t.item_call_long, type: 'call' });
                if (occ) symbols.add(occ);
             }
             if (t.strike_call_short) {
                const occ = getOccSymbol({ ...t, strike: t.strike_call_short, type: 'call' });
                if (occ) symbols.add(occ);
             }
             if (t.strike_call_long) {
                const occ = getOccSymbol({ ...t, strike: t.strike_call_long, type: 'call' });
                if (occ) symbols.add(occ);
             }
        }
    }

    function startAutoRefresh(getTrades) {
        refreshPrices(getTrades());
        refreshInterval = setInterval(() => refreshPrices(getTrades()), 15000);
    }
    
    function stopAutoRefresh() {
        if (refreshInterval) clearInterval(refreshInterval);
    }

    // --- HELPERS ---
    
    function getDisplayPrice(symbol) {
        const p = livePrices[symbol]?.price;
        if (!p) return '--';
        
        // Dynamic decimals based on magnitude
        let minDecimals = 2;
        let maxDecimals = p < 1 ? 8 : (p < 10 ? 4 : 2);
        
        return new Intl.NumberFormat('fr-FR', { 
            minimumFractionDigits: minDecimals, 
            maximumFractionDigits: 8 // Allow up to 8 if needed by formatter
        }).format(p) + ' $';
    }

    function getDisplayTrend(symbol) {
        const chg = livePrices[symbol]?.change_percent;
        return (chg === undefined || chg === null) ? '--' : (chg > 0 ? '+' : '') + chg.toFixed(2) + '%';
    }

    function getTrendClass(symbol) {
        const chg = livePrices[symbol]?.change_percent;
        if (chg === undefined || chg === null) return '';
        return chg > 0 ? 'positive' : (chg < 0 ? 'negative' : '');
    }

    // --- WHEEL HELPERS ---
    
    function getDistanceToStrike(trade) {
        const current = livePrices[trade.symbol]?.price;
        const dist = calculateDistanceToStrike(current, trade.strike);
        return dist !== null ? dist.toFixed(2) + '%' : '-';
    }
    
    function getMoneynessClass(trade) {
        const current = livePrices[trade.symbol]?.price;
        if (!current || !trade.strike) return '';
        const isPut = trade.type ? trade.type.toLowerCase().includes('put') : false;
        return (isPut ? current < trade.strike : current > trade.strike) ? 'negative-text' : 'positive-text';
    }

    function getDisplayOptionPrice(trade) {
        const sym = getOccSymbol(trade);
        return (sym && livePrices[sym]) ? formatCurrency(livePrices[sym].price) : '-';
    }

    function getProfitProgress(trade) {
        const sym = getOccSymbol(trade);
        const progress = calculateLinkProfit(trade.price, livePrices[sym]?.price);
        return progress !== null ? progress.toFixed(1) + '%' : '-';
    }

    function getProfitProgressClass(trade) {
        const val = parseFloat(getProfitProgress(trade));
        if (isNaN(val)) return '';
        if (val >= 50) return 'positive-text'; 
        if (val < 0) return 'negative-text';
        return '';
    }

    function getLatentPL(trade) {
        const sym = getOccSymbol(trade);
        const pl = calculatePL(trade.price, livePrices[sym]?.price, trade.quantity);
        return pl !== null ? formatCurrency(pl) : '-';
    }

    function getLatentPLClass(trade) {
        const sym = getOccSymbol(trade);
        const currentPrice = livePrices[sym]?.price;
        if (currentPrice === undefined || !trade.price) return '';
        return (trade.price - currentPrice) >= 0 ? 'positive-text' : 'negative-text';
    }

    // --- PCS HELPERS ---
    
    function getDistanceShort(trade) {
        const current = livePrices[trade.symbol]?.price;
        if (!current || !trade.strike_short) return '-';
        if (trade.strategy === 'pcs' || trade.sub_strategy === 'pcs') {
             const dist = calculateDistanceToStrike(current, trade.strike_short);
             return dist !== null ? dist.toFixed(2) + '%' : '-';
        }
        return '-';
    }

    function getDistanceShortClass(trade) {
        const val = parseFloat(getDistanceShort(trade));
        if (isNaN(val)) return '';
        return val < 2 ? 'negative-text font-bold' : 'positive-text';
    }
    
    function getProbITM(trade) {
        const dist = parseFloat(getDistanceShort(trade));
        if (isNaN(dist)) return '-';
        if (dist < 0) return '99%';
        if (dist < 2) return '~45%';
        if (dist < 5) return '~30%';
        return '< 15%';
    }

    function getSpreadPrice(trade, raw = false) {
        const occShort = getOccSymbol({ ...trade, strike: trade.strike_short, type: 'put' }); 
        const occLong = getOccSymbol({ ...trade, strike: trade.strike_long, type: 'put' }); 
        
        if (occShort && occLong && livePrices[occShort] && livePrices[occLong]) {
            const pShort = livePrices[occShort].price;
            const pLong = livePrices[occLong].price;
            const spreadPrice = pShort - pLong;
            return raw ? spreadPrice : formatCurrency(spreadPrice);
        }
        return raw ? null : '0.00 $';
    }

    function getSpreadProfit(trade) {
        const currentCost = getSpreadPrice(trade, true);
        if (currentCost === null || !trade.price) return '-';
        const profitPct = ((trade.price - currentCost) / trade.price) * 100;
        return profitPct.toFixed(1) + '%';
    }
    
    function getSpreadPL(trade) {
        const currentCost = getSpreadPrice(trade, true);
        if (currentCost === null || !trade.price) return '-';
        const pl = (trade.price - currentCost) * 100 * trade.quantity;
        return formatCurrency(pl);
    }

    function getSpreadPLClass(trade) {
        const currentCost = getSpreadPrice(trade, true);
        if (currentCost === null || !trade.price) return '';
        const val = trade.price - currentCost;
        return val > 0 ? 'positive-text' : (val < 0 ? 'negative-text' : '');
    }
    
    function getSpreadProfitClass(trade) {
        const valStr = getSpreadProfit(trade);
        if(valStr === '-') return '';
        const val = parseFloat(valStr);
        if(val >= 50) return 'positive-text';
        if(val < 0) return 'negative-text';
        return '';
    }

    return {
        livePrices,
        startAutoRefresh,
        stopAutoRefresh,
        getDisplayPrice,
        getDisplayTrend,
        getTrendClass,
        getOccSymbol,
        getDistanceToStrike,
        getMoneynessClass,
        getDisplayOptionPrice,
        getProfitProgress,
        getProfitProgressClass,
        getLatentPL,
        getLatentPLClass,
        getDistanceShort,
        getDistanceShortClass,
        getProbITM,
        getSpreadPrice,
        getSpreadProfit,
        getSpreadPL,
        getSpreadPLClass,
        getSpreadProfitClass
    };
}

import { computed } from 'vue';
import { useRocketStore } from './rocketStore.js';
import { useRocketActions } from './rocketActions.js';
import { useLivePrices } from './useLivePrices.js';

export function useRocketState() {
    const store = useRocketStore();
    const actions = useRocketActions();
    const priceUtils = useLivePrices();

    // Mapping State
    const { 
        db, account, plLatent, allActiveTrades, strategyType, mmConfig,
        showSettings, showAssignModal, tradeToAssign, showStatusModal, pendingStatusUpdate, showDeleteModal, tradeToDelete,
        showCcsModal, tradeToRoll
    } = store;

    // --- COMPUTED PROPERTIES (Logic that relies on State) ---
    const displayedCapital = computed(() => {
        if (strategyType.value === 'wheel') {
            const base = account.value.alloc_wheel || 0;
            const margin = base * ( (account.value.margin_wheel_pct || 0) / 100 );
            return base + margin;
        } else if (strategyType.value === 'pcs') return account.value.alloc_growth || 0;
        else if (strategyType.value === 'rockets') return account.value.alloc_rocket || 0;
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
    
    const currentAssignedTrades = computed(() => (strategyType.value === 'wheel' ? wheelStocks.value : []));

    const totalExpectedPremium = computed(() => {
        let total = 0;
        currentActiveTrades.value.forEach(trade => {
             if (trade.type === 'stock') return;
             if (trade.sub_strategy === 'hedge' || trade.sub_strategy === 'hedge_spread' || trade.type === 'spread') return; 
             
             let premium = 0;
             if (trade.target_yield) premium = (trade.strike * 100 * trade.quantity) * (trade.target_yield / 100);
             else premium = Math.abs(trade.price * 100 * trade.quantity);
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
        const trades = allActiveTrades.value.filter(t => t.strategy === strategyType.value && (t.status === 'open' || t.status === 'pending' || t.status === 'neutralized'));
        trades.forEach(t => {
            if (strategyType.value === 'wheel') {
                if (t.type === 'put' && t.side === 'short') used += t.strike * 100 * t.quantity;
                else if (t.side === 'long' || t.type === 'stock') used += (t.entry_executed || t.entry_price || t.price || 0) * 100 * t.quantity; 
            }
            else if (strategyType.value === 'pcs') {
                if (t.sub_strategy === 'ic') {
                     const mw = Math.max(Math.abs((t.strike_short||0)-(t.strike_long||0)), Math.abs((t.strike_call_short||0)-(t.strike_call_long||0)));
                     used += (mw - (t.price || 0)) * 100 * t.quantity;
                } else {
                     used += (Math.abs((t.strike_short || 0) - (t.strike_long || 0)) - (t.price || 0)) * 100 * t.quantity;
                }
            }
            else if (strategyType.value === 'rockets') {
                 used += (t.entry_executed || t.entry_price || t.price || 0) * t.quantity;
            }
        });
        return used;
    });

    // const strategyPL = computed(() => allActiveTrades.value.filter(t => t.strategy === strategyType.value && t.profit_loss).reduce((sum, t) => sum + t.profit_loss, 0));

    const totalAssigned = computed(() => (strategyType.value === 'wheel' ? wheelStocks.value.reduce((sum, t) => sum + ((t.entry_executed || t.entry_price || t.price || 0) * 100 * t.quantity), 0) : 0));
const rocketGlobalPL = computed(() => {
        if (strategyType.value !== 'rockets') return 0;
        
        let total = 0;
        const prices = priceUtils.livePrices; // Reactive object
        if (!prices) return 0;

        // Force reactivity on the entire object for debugging/robustness (simple hack)
        // Accessing keys ensures we track when new symbols are added
        const _deps = Object.keys(prices).length; 

        // 1. Risk Trades
        const risk = allActiveTrades.value.filter(t => t.strategy === 'rockets' && t.status === 'open');
        risk.forEach(t => {
             const pObj = prices[t.symbol];
             // Log only if needed, but for now just protect against NaN
             if (pObj && pObj.price !== undefined && pObj.price !== null) {
                  const entry = parseFloat(t.entry_executed || t.price || 0);
                  const current = parseFloat(pObj.price);
                  const qty = parseFloat(t.quantity || 0);
                  
                  if (!isNaN(entry) && !isNaN(current) && !isNaN(qty)) {
                      total += (current - entry) * qty;
                  }
             }
        });

        // 2. Neutralized Trades
        const neutralized = allActiveTrades.value.filter(t => t.strategy === 'rockets' && t.status === 'neutralized');
        neutralized.forEach(t => {
             const pObj = prices[t.symbol];
             if (pObj && pObj.price !== undefined && pObj.price !== null) {
                  const entry = parseFloat(t.entry_executed || t.price || 0);
                  const current = parseFloat(pObj.price);
                  const qty = parseFloat(t.quantity || 0);
                  
                  if (!isNaN(entry) && !isNaN(current) && !isNaN(qty)) {
                      total += (current - entry) * qty;
                  }
             }
        });

        return total;
    });

    const totalLatentPL = computed(() => {
        let total = 0;
        const sType = strategyType.value;
        const prices = priceUtils.livePrices; 

        if (sType === 'pcs') {
            activeTradesPcs.value.forEach(trade => {
                const currentCost = priceUtils.getSpreadPrice(trade, true); // true -> raw value
                if (currentCost !== null && trade.price !== undefined) {
                     const pl = (trade.price - currentCost) * 100 * trade.quantity;
                     total += pl;
                }
            });
        } else if (sType === 'wheel') {
            wheelOptions.value.forEach(trade => {
                 const sym = priceUtils.getOccSymbol(trade);
                 // Check proper symbol in prices
                 if (sym && prices[sym] && prices[sym].price !== undefined) {
                     const currentPrice = prices[sym].price;
                     const pl = (trade.price - currentPrice) * 100 * trade.quantity;
                     total += pl;
                 }
            });
        } else if (sType === 'rockets') {
            return rocketGlobalPL.value;
        }

        return total;
    });

    const strategyPL = computed(() => totalLatentPL.value);

    // Calendar,
    const calendarEvents = computed(() => {
        if (strategyType.value === 'rockets') return [];
        const events = [], now = new Date(); now.setHours(0,0,0,0);
        const map = new Map();
        allActiveTrades.value.filter(t => t.expiration && (t.status === 'open' || t.status === 'pending') && t.strategy === strategyType.value).forEach(t => {
            if (!map.has(t.expiration)) map.set(t.expiration, { dateObj: new Date(t.expiration), symbols: new Set(), dte: Math.ceil((new Date(t.expiration)-now)/(86400000)) });
            map.get(t.expiration).symbols.add(t.symbol);
        });
        return Array.from(map.values()).sort((a,b)=>a.dateObj-b.dateObj).map(e=>({day: e.dateObj.getDate(), month: e.dateObj.toLocaleString('fr-FR', {month:'short'}).toUpperCase(), symbol: Array.from(e.symbols).join(', '), dte: e.dte}));
    });

    // MM Stats
    const wheelStats = computed(() => {
        let used = 0;
        activeTradesWheel.value.forEach(t => {
            if (t.type === 'put' && t.side === 'short' && (t.status === 'open' || t.status === 'pending')) used += t.strike * 100 * t.quantity;
            if (t.type === 'stock' && t.side === 'long' && t.status === 'open') used += t.entry_price * 100 * t.quantity;
        });
        const total = displayedCapital.value; return { used, total, remaining: total-used, isRespecting: used <= total };
    });
    const pcsStats = computed(() => { const c = activeTradesPcs.value.filter(t=>t.status==='open'||t.status==='pending').length; return {count:c, limit:10, isRespecting: c<=10}; });
    const rocketsStats = computed(() => { const c = activeTradesRockets.value.filter(t=>t.status==='open').length; return {count:c, limit:5, isRespecting: c<=5}; });

    const mmStatusText = computed(() => {
        const s = strategyType.value;
        if (s==='wheel') return wheelStats.value.isRespecting ? (wheelStats.value.remaining<1000?'MM ATTEINT':'MM RESPECTÉ') : 'MM DEPASSE';
        if (s==='pcs') return pcsStats.value.isRespecting ? (pcsStats.value.count>=10?'MM ATTEINT':`MM RESPECTÉ (${pcsStats.value.count}/10)`) : 'MM DEPASSE';
        if (s==='rockets') return rocketsStats.value.isRespecting ? (rocketsStats.value.count>=5?'MM ATTEINT':`MM RESPECTÉ (${rocketsStats.value.count}/5)`) : 'MM DEPASSE';
        return '';
    });
    const mmStatusColor = computed(() => mmStatusText.value.includes('DEPASSE')?'red':(mmStatusText.value.includes('ATTEINT')?'blue':'green'));

    return {
        // State
        db, account, plLatent, allActiveTrades, strategyType, mmConfig,
        // Modals
        showSettings, showAssignModal, tradeToAssign, showStatusModal, pendingStatusUpdate, showDeleteModal, tradeToDelete,
        showCcsModal, tradeToRoll,
        // Methods (Actions)
        ...actions,
        // Computed
        displayedCapital, activeTradesWheel, wheelOptions, wheelStocks, activeTradesPcs, activeTradesRockets, rocketsTrades,
        currentActiveTrades, currentAssignedTrades, strategyLabel, calendarEvents,
        wheelStats, pcsStats, rocketsStats, mmStatusText, mmStatusColor, totalExpectedPremium,
        strategyCashUsed, strategyPL, totalAssigned
    };
}


import { computed } from 'vue';

export function useDashboardLogic(kasperAccounts, allKasperEntries, rocketAccount, allActiveTrades, livePrices, priceUtils) {
    
    // KASPER LOGIC
    const kasperEntriesByAccount = computed(() => {
        const map = {};
        if (!kasperAccounts.value) return map;
        kasperAccounts.value.forEach(a => map[a.id] = []);
        
        if (allKasperEntries.value && allKasperEntries.value.length > 0) {
            allKasperEntries.value.forEach(e => {
                if (map[e.account_id]) map[e.account_id].push(e);
                // Fallback for migration if account_id is null/1
                else if (e.account_id === undefined && map[1]) map[1].push(e); 
            });
        }
        return map;
    });

    // ROCKET LOGIC
    const rocketBuyingPower = computed(() => rocketAccount.value?.buying_power || rocketAccount.value?.cash || 0);

    const activeTradesByStrategy = computed(() => {
        const map = { wheel: [], pcs: [], rockets: [] };
        if (!allActiveTrades.value) return map;
        allActiveTrades.value.forEach(t => {
            if (map[t.strategy]) map[t.strategy].push(t);
        });
        return map;
    });

    const rocketStatsByStrategy = computed(() => {
        const stats = {
            wheel: { realizedPl: 0, capitalAllocated: rocketAccount.value?.alloc_wheel || 1, capitalUsed: 0, totalAssigned: 0, totalExpectedPremium: 0 },
            pcs: { realizedPl: 0, capitalAllocated: rocketAccount.value?.alloc_growth || 1, capitalUsed: 0, totalAssigned: 0, totalExpectedPremium: 0 },
            rockets: { realizedPl: 0, capitalAllocated: rocketAccount.value?.alloc_rocket || 1, capitalUsed: 0, totalAssigned: 0, totalExpectedPremium: 0 },
        };

        if (allActiveTrades.value) {
            allActiveTrades.value.forEach(t => {
                if (!stats[t.strategy]) return;
                
                // 1. Capital Used Calculation
                let used = 0;
                if (t.strategy === 'wheel') {
                    if (t.type === 'put' && t.side === 'short') used = t.strike * 100 * t.quantity;
                    else if (t.type === 'stock') used = (t.entry_executed || t.entry_price || t.price || 0) * 100 * t.quantity; 
                } else if (t.strategy === 'pcs') {
                    if (t.sub_strategy === 'ic') {
                         const mw = Math.max(Math.abs((t.strike_short||0)-(t.strike_long||0)), Math.abs((t.strike_call_short||0)-(t.strike_call_long||0)));
                         used = (mw - (t.price || 0)) * 100 * t.quantity;
                    } else {
                         used = (Math.abs((t.strike_short || 0) - (t.strike_long || 0)) - (t.price || 0)) * 100 * t.quantity;
                    }
                } else if (t.strategy === 'rockets') {
                    used = (t.entry_executed || t.entry_price || t.price || 0) * t.quantity;
                }
                stats[t.strategy].capitalUsed += used;

                // 2. Total Assigned (Wheel only)
                if (t.strategy === 'wheel' && t.type === 'stock') {
                    const assignedVal = (t.entry_executed || t.entry_price || t.price || 0) * 100 * t.quantity;
                    stats[t.strategy].totalAssigned += assignedVal;
                }

                // 3. Expected Premium
                // Filter out stocks, hedges
                if (t.type !== 'stock' && t.sub_strategy !== 'hedge' && t.sub_strategy !== 'hedge_spread' && t.type !== 'spread') {
                     let premium = 0;
                     if (t.target_yield) premium = (t.strike * 100 * t.quantity) * (t.target_yield / 100);
                     else premium = Math.abs(t.price * 100 * t.quantity);
                     
                     stats[t.strategy].totalExpectedPremium += premium;
                }
            });
        }

        return stats;
    });

    // ALERTS LOGIC
    const rocketAlerts = computed(() => {
        const alerts = [];
        const totalCash = rocketAccount.value?.net_liq || 10000;
        const totalUsed = Object.values(rocketStatsByStrategy.value).reduce((s, x) => s + x.capitalUsed, 0);
        
        if (totalUsed > totalCash * 0.9) alerts.push({ level: 'high', message: 'Marge critique', detail: '90% du capital utilisé' });
        
        return alerts;
    });

    return {
        kasperEntriesByAccount,
        rocketBuyingPower,
        activeTradesByStrategy,
        rocketStatsByStrategy,
        rocketAlerts
    };
}

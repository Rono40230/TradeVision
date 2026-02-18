
import { computed, watchEffect } from 'vue';
import { useRocketStore } from './rocketStore.js';

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
            wheel: { realizedPl: 0, capitalAllocated: 0, capitalUsed: 0, totalAssigned: 0, totalExpectedPremium: 0, plLatent: 0 },
            pcs: { realizedPl: 0, capitalAllocated: 0, capitalUsed: 0, totalAssigned: 0, totalExpectedPremium: 0, plLatent: 0 },
            rockets: { realizedPl: 0, capitalAllocated: 0, capitalUsed: 0, totalAssigned: 0, totalExpectedPremium: 0, plLatent: 0 },
        };
        
        // 0. Capital Allocation (Include Margin for Wheel)
        if (rocketAccount.value) {
            // Wheel: Base + Margin
            const wBase = rocketAccount.value.alloc_wheel || 0;
            const wMargin = wBase * ((rocketAccount.value.margin_wheel_pct || 0) / 100);
            stats.wheel.capitalAllocated = wBase + wMargin;
            
            stats.pcs.capitalAllocated = rocketAccount.value.alloc_growth || 0;
            stats.rockets.capitalAllocated = rocketAccount.value.alloc_rocket || 0;
        }

        if (allActiveTrades.value) {
            allActiveTrades.value.forEach(t => {
                if (!stats[t.strategy]) return;
                
                // FILTER BY STATUS (Match useRocketState logic)
                const isOpen = t.status === 'open';
                const isPending = t.status === 'pending';
                const isNeutralized = t.status === 'neutralized';
                
                // Wheel: Open or Pending (Stocks only if open for some logic, check useRocketState carefully)
                // useRocketState: wheelOptions -> open/pending. wheelStocks -> open.
                // PCS: open/pending.
                // Rockets: open/pending/neutralized.
                
                let isValidForStats = false;
                if (t.strategy === 'wheel') {
                    if (t.type === 'stock') isValidForStats = isOpen; // Stock only counts if open (Assigned)
                    else isValidForStats = isOpen || isPending;
                } else if (t.strategy === 'pcs') {
                    isValidForStats = isOpen || isPending;
                } else if (t.strategy === 'rockets') {
                    isValidForStats = isOpen || isPending || isNeutralized;
                }
                
                if (!isValidForStats) return;

                // 1. Capital Used Calculation
                let used = 0;
                if (t.strategy === 'wheel') {
                    if (t.type === 'put' && t.side === 'short') used = t.strike * 100 * t.quantity;
                    else if (t.side === 'long' || t.type === 'stock') used = (t.entry_executed || t.entry_price || t.price || 0) * 100 * t.quantity; 
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
                if (t.type !== 'stock' && t.sub_strategy !== 'hedge' && t.sub_strategy !== 'hedge_spread' && t.type !== 'spread') {
                     let premium = 0;
                     if (t.target_yield) premium = (t.strike * 100 * t.quantity) * (t.target_yield / 100);
                     else premium = Math.abs(t.price * 100 * t.quantity);
                     
                     stats[t.strategy].totalExpectedPremium += premium;
                }

                // 4. Latent PL
                let tempPL = 0;
                // Treat livePrices as the Reactive object (no .value)
                if (livePrices && priceUtils) {
                    if (t.strategy === 'pcs') {
                        const currentCost = priceUtils.getSpreadPrice(t, true);
                        if (currentCost !== null && t.price !== undefined) {
                            tempPL = (t.price - currentCost) * 100 * t.quantity;
                        }
                    } else if (t.strategy === 'wheel' && t.type !== 'stock') {
                         const sym = priceUtils.getOccSymbol(t);
                         if (sym && livePrices[sym]) {
                             const currentPrice = livePrices[sym].price;
                             if (currentPrice !== undefined) {
                                 tempPL = (t.price - currentPrice) * 100 * t.quantity;
                             }
                         }
                    } else if (t.strategy === 'rockets' || (t.strategy === 'wheel' && t.type === 'stock')) {
                        const sym = t.symbol; 
                        const currentPrice = livePrices[sym]?.price;
                        // Use string-safe parsing
                        const entry = parseFloat(t.entry_executed || t.price || 0);
                        const qty = parseFloat(t.quantity || 0);
                        const curr = parseFloat(currentPrice);
                        
                        if (!isNaN(curr) && !isNaN(entry) && !isNaN(qty)) {
                             tempPL = (curr - entry) * qty;
                        }
                    }
                }
                stats[t.strategy].plLatent += tempPL;
            });
        }

        return stats;
    });

    // ALERTS LOGIC — watchEffect pour s'exécuter même si personne ne lit rocketAlerts
    const { rocketAlerts: storeAlerts } = useRocketStore();
    watchEffect(() => {
        const alerts = [];
        const totalCash = rocketAccount.value?.net_liq || 10000;
        const totalUsed = Object.values(rocketStatsByStrategy.value).reduce((s, x) => s + x.capitalUsed, 0);

        if (totalUsed > totalCash * 0.9) alerts.push({ level: 'high', message: 'Marge critique', detail: '90% du capital utilisé' });

        storeAlerts.value = alerts;
    });

    return {
        kasperEntriesByAccount,
        rocketBuyingPower,
        activeTradesByStrategy,
        rocketStatsByStrategy
    };
}

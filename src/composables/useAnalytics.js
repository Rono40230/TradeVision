import { computed } from 'vue';

/**
 * useAnalytics - Composable pour le calcul des métriques de performance avancées.
 * 
 * @param {Ref<Array>} tradesList - Liste réactive des trades consolidés.
 * Chaque trade doit idéalement avoir : realized_pnl, open_date, close_date, strategy, quantity, price.
 */
export function useAnalytics(tradesList) {
    
    /**
     * Statistiques globales calculées sur l'ensemble des trades clos.
     */
    const stats = computed(() => {
        const trades = Array.isArray(tradesList.value) ? tradesList.value : [];
        if (trades.length === 0) return null;

        // On ne traite que les trades avec un P/L réalisé (trades clos)
        // On trie par date de clôture pour le calcul du drawdown et des streaks
        const closedTrades = trades
            .filter(t => (t.realized_pnl !== undefined && t.realized_pnl !== null))
            .sort((a, b) => {
                const dateA = new Date(a.close_date || a.date);
                const dateB = new Date(b.close_date || b.date);
                return dateA - dateB;
            });

        if (closedTrades.length === 0) return null;

        let totalGains = 0;
        let totalLosses = 0;
        let winnersCount = 0;
        let losersCount = 0;
        let maxWin = 0;
        let maxLoss = 0;
        
        let currentEquity = 0;
        let maxEquity = 0;
        let maxDrawdown = 0;
        
        let currentWinStreak = 0;
        let maxWinStreak = 0;
        let currentLossStreak = 0;
        let maxLossStreak = 0;
        
        let totalHoldingTime = 0;
        let holdingTimeCount = 0;
        let totalCapitalEngaged = 0;
        let capitalEngagementCount = 0;

        closedTrades.forEach(t => {
            const pnl = parseFloat(t.realized_pnl) || 0;
            
            // 1. Classification Win/Loss
            if (pnl > 0) {
                totalGains += pnl;
                winnersCount++;
                maxWin = Math.max(maxWin, pnl);
                
                currentWinStreak++;
                currentLossStreak = 0;
                maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
            } else if (pnl < 0) {
                const absPnl = Math.abs(pnl);
                totalLosses += absPnl;
                losersCount++;
                maxLoss = Math.max(maxLoss, absPnl);
                
                currentLossStreak++;
                currentWinStreak = 0;
                maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
            }

            // 2. Equity Curve & Drawdown (Monétaire)
            currentEquity += pnl;
            if (currentEquity > maxEquity) {
                maxEquity = currentEquity;
            }
            const currentDD = maxEquity - currentEquity;
            if (currentDD > maxDrawdown) {
                maxDrawdown = currentDD;
            }

            // 3. Temps de détention (Holding Time)
            const openDate = t.open_date || t.date;
            const closeDate = t.close_date || t.date;
            if (openDate && closeDate) {
                const start = new Date(openDate);
                const end = new Date(closeDate);
                const duration = (end - start) / (1000 * 60 * 60 * 24); // en jours
                if (!isNaN(duration) && duration >= 0) {
                    totalHoldingTime += duration;
                    holdingTimeCount++;
                }
            }

            // 4. Capital engagé (pour ROI)
            // Estimation : quantité * prix d'ouverture (ou prix moyen)
            // Note: On utilise la valeur absolue car quantity peut être négative (Short)
            const cost = Math.abs((t.quantity || 0) * (t.price || 0));
            if (cost > 0) {
                totalCapitalEngaged += cost;
                capitalEngagementCount++;
            }
        });

        const totalTrades = closedTrades.length;
        const winRate = totalTrades > 0 ? (winnersCount / totalTrades) * 100 : 0;
        const profitFactor = totalLosses > 0 ? totalGains / totalLosses : (totalGains > 0 ? Infinity : 0);
        const avgWin = winnersCount > 0 ? totalGains / winnersCount : 0;
        const avgLoss = losersCount > 0 ? totalLosses / losersCount : 0;
        const rewardRiskRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
        const avgHoldingTime = holdingTimeCount > 0 ? totalHoldingTime / holdingTimeCount : 0;
        
        // ROI global estimé sur l'exposition moyenne
        const avgCapitalPerTrade = capitalEngagementCount > 0 ? totalCapitalEngaged / capitalEngagementCount : 0;
        const totalROI = avgCapitalPerTrade > 0 ? (currentEquity / avgCapitalPerTrade) * 100 : 0;

        return {
            totalTrades,
            winnersCount,
            losersCount,
            winRate: Number(winRate.toFixed(1)),
            totalNetPnl: Number(currentEquity.toFixed(2)),
            totalGains: Number(totalGains.toFixed(2)),
            totalLosses: Number(totalLosses.toFixed(2)),
            profitFactor: profitFactor === Infinity ? '∞' : Number(profitFactor.toFixed(2)),
            avgWin: Number(avgWin.toFixed(2)),
            avgLoss: Number(avgLoss.toFixed(2)),
            maxWin: Number(maxWin.toFixed(2)),
            maxLoss: Number(maxLoss.toFixed(2)),
            rewardRiskRatio: Number(rewardRiskRatio.toFixed(2)),
            maxDrawdown: Number(maxDrawdown.toFixed(2)),
            maxWinStreak,
            maxLossStreak,
            avgHoldingTime: Number(avgHoldingTime.toFixed(1)),
            totalROI: Number(totalROI.toFixed(2)),
            avgCapitalPerTrade: Number(avgCapitalPerTrade.toFixed(2))
        };
    });

    /**
     * Groupement des performances par stratégie.
     */
    const byStrategy = computed(() => {
        const trades = Array.isArray(tradesList.value) ? tradesList.value : [];
        const groups = {};

        trades.forEach(t => {
            const strategy = t.strategy || 'UNKNOWN';
            if (!groups[strategy]) {
                groups[strategy] = {
                    name: strategy,
                    pnl: 0,
                    tradesCount: 0,
                    winners: 0,
                    cost: 0
                };
            }
            const pnl = parseFloat(t.realized_pnl) || 0;
            groups[strategy].pnl += pnl;
            groups[strategy].tradesCount++;
            if (pnl > 0) groups[strategy].winners++;
            
            const cost = Math.abs((t.quantity || 0) * (t.price || 0));
            groups[strategy].cost += cost;
        });

        return Object.values(groups).map(g => ({
            ...g,
            pnl: Number(g.pnl.toFixed(2)),
            winRate: g.tradesCount > 0 ? Number(((g.winners / g.tradesCount) * 100).toFixed(1)) : 0,
            roi: g.cost > 0 ? Number(((g.pnl / g.cost) * 100).toFixed(2)) : 0
        })).sort((a, b) => b.pnl - a.pnl);
    });

    /**
     * Groupement du P/L par mois pour l'historique temporel.
     */
    const monthlyPL = computed(() => {
        const trades = Array.isArray(tradesList.value) ? tradesList.value : [];
        const groups = {};

        trades.forEach(t => {
            const closeDate = t.close_date || t.date;
            if (!closeDate) return;
            
            const date = new Date(closeDate);
            if (isNaN(date.getTime())) return;

            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!groups[monthKey]) {
                groups[monthKey] = {
                    month: monthKey,
                    pnl: 0,
                    tradesCount: 0,
                    winners: 0
                };
            }
            const pnl = parseFloat(t.realized_pnl) || 0;
            groups[monthKey].pnl += pnl;
            groups[monthKey].tradesCount++;
            if (pnl > 0) groups[monthKey].winners++;
        });

        return Object.values(groups)
            .map(g => ({
                ...g,
                pnl: Number(g.pnl.toFixed(2))
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
    });

    return {
        stats,
        byStrategy,
        monthlyPL
    };
}

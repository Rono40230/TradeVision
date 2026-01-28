import { ref, computed } from 'vue';

// -- GLOBAL STATE (Singleton) --
export const db = ref(null);
export const account = ref({ capital: 5000 }); // Default, updated on load
export const currentAccountId = ref(null);
export const accountsList = ref([]);
export const dailyEntries = ref([]);
export const pairsConfig = ref([]);
export const currentMonth = ref(new Date());

// Metrics computed from global 'dailyEntries'
export const metrics = computed(() => {
    let totalPlus = 0;
    let totalMinus = 0;
    let totalRisk = 0;
    let count = 0;
    let winningTrades = 0;
    let totalTrades = 0;

    dailyEntries.value.forEach(e => {
        if (e.profit_loss > 0) totalPlus += e.profit_loss;
        if (e.profit_loss < 0) totalMinus += e.profit_loss;
        if (e.risk_used) {
            totalRisk += e.risk_used;
            count++;
        }
        
        if (e.details) {
            try {
                const trades = JSON.parse(e.details);
                if (Array.isArray(trades)) {
                    trades.forEach(t => {
                        if (t.result !== null && t.result !== undefined && t.result !== '') {
                            totalTrades++;
                            if (parseFloat(t.result) > 0) winningTrades++;
                        }
                    });
                }
            } catch (err) {}
        }
    });

    const daysInCurrentMonth = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0).getDate();
    const startCap = account.value?.capital || 1;
    const currentResult = totalPlus + totalMinus;
    const totalPLPct = (currentResult / startCap) * 100;

    return {
        totalPlus,
        totalMinus,
        result: currentResult,
        averageRiskDaily: count > 0 ? totalRisk / count : 0,
        averageRiskPerTrade: totalTrades > 0 ? totalRisk / totalTrades : 0,
        dailyAvgPLPct: totalPLPct / daysInCurrentMonth,
        winrate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
    };
});

export function useKasperStore() {
    return {
        db,
        account,
        currentAccountId,
        accountsList,
        dailyEntries,
        pairsConfig,
        currentMonth,
        metrics
    };
}

<template>
  <div class="kasper-account-card bento-card">
    <div class="card-header">
        <div class="account-info">
            <h4>{{ safeAccountName }} <span class="acc-num" v-if="safeAccountNumber">#{{ safeAccountNumber }}</span></h4>
        </div>
    </div>

    <!-- CHART AREA -->
    <KasperAccountChart 
        :entries="entries" 
        :investedCapital="stats.investedCapital" 
    />

    <!-- METRICS GRID -->
    <div class="metrics-row">
        <div class="metric-item">
            <span class="lbl">Capital Investi</span>
            <span class="val">{{ formatCurrency(stats.investedCapital) }}</span>
        </div>
        <div class="metric-item">
            <span class="lbl">Résultat Net</span>
            <span class="val" :class="getPnlColor(stats.netResult)">{{ formatCurrency(stats.netResult) }}</span>
        </div>
        <div class="metric-item">
            <span class="lbl">Capital Actuel</span>
            <span class="val text-primary">{{ formatCurrency(stats.currentCapital) }}</span>
        </div>
        <div class="metric-item">
            <span class="lbl">Risque moy/Jour</span>
            <span class="val">{{ formatRiskPct(stats.avgRiskDayVal) }}</span>
        </div>
        <div class="metric-item">
            <span class="lbl">Risque moy/Trade</span>
            <span class="val">{{ formatRiskPct(stats.avgRiskTradeVal) }}</span>
        </div>
        <div class="metric-item">
            <span class="lbl">P/L par Jour</span>
            <span class="val" :class="getPnlColor(stats.dailyAvgPLPct)">{{ formatSimplePct(stats.dailyAvgPLPct) }}</span>
        </div>
        <div class="metric-item">
            <span class="lbl">Winrate</span>
            <span class="val">{{ formatWinrate(stats.winrate) }}</span>
        </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import KasperAccountChart from './KasperAccountChart.vue';

const props = defineProps({
    account: { type: Object, default: () => ({}) },
    entries: { type: Array, default: () => [] }
});

// COMPUTED SAFETIES
const safeAccountName = computed(() => props.account?.name || 'Account');
const safeAccountNumber = computed(() => props.account?.account_number || '');
const safeCapital = computed(() => {
    // DB field is 'initial_capital', Store maps it to 'capital'
    // We check both to be safe
    const val = props.account?.initial_capital ?? props.account?.capital;
    return parseFloat(val) || 0;
});

// HELPERS (Strict copies of KasperMetrics logic)
function formatCurrency(val) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0).replace('US', '');
}

function getPnlColor(val) {
    return (val >= 0 ? 'text-green' : 'text-red');
}

function formatRiskPct(valDollars) {
    if (!valDollars) return '0 %';
    const cap = safeCapital.value || 1;
    const pct = (valDollars / cap) * 100;
    const rounded = Math.round(pct * 2) / 2;
    return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + ' %';
}

function formatSimplePct(val) {
    if (!val) return '0 %';
    return val.toFixed(2) + ' %';
}

function formatWinrate(val) {
    if (!val) return '0%';
    return val.toFixed(0) + '%';
}

// STATS CALCULATION
const stats = computed(() => {
    const invested = safeCapital.value;
    const entries = props.entries || [];
    
    let totalPlus = 0;
    let totalMinus = 0;
    let totalRisk = 0;
    let countRiskDays = 0; 
    
    let winningTrades = 0;
    let totalTrades = 0;

    entries.forEach(e => {
        const pl = parseFloat(e.profit_loss) || 0;
        
        if (pl > 0) totalPlus += pl;
        if (pl < 0) totalMinus += pl;
        
        const rUsed = parseFloat(e.risk_used) || 0;
        if (rUsed !== 0) {
            totalRisk += rUsed;
            countRiskDays++;
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

    const netResult = totalPlus + totalMinus;
    
    const now = new Date();
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    const totalPLPct = invested > 0 ? (netResult / invested) * 100 : 0;
    const dailyAvgPLPct = totalPLPct / daysInCurrentMonth;

    const avgRiskDayVal = countRiskDays > 0 ? totalRisk / countRiskDays : 0;
    const avgRiskTradeVal = totalTrades > 0 ? totalRisk / totalTrades : 0;
    const winrate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
        investedCapital: invested,
        netResult: netResult,
        currentCapital: invested + netResult,
        avgRiskDayVal,
        avgRiskTradeVal,
        dailyAvgPLPct,
        winrate
    };
});
</script>

<style scoped>
.kasper-account-card {
    background-color: rgba(255,255,255,0.03); 
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 12px;
    padding: 1rem;
    display: flex; 
    flex-direction: column;
    min-height: 240px;
    color: #e0e0e0;
}

.card-header {
    margin-bottom: 0.5rem;
}

.account-info h4 {
    margin: 0;
    font-size: 1rem;
    color: #fff;
    font-weight: 600;
}
.acc-num {
    color: #565f89;
    font-size: 0.8rem;
    margin-left: 0.5rem;
    font-weight: normal;
}

.metrics-row {
    display: flex;
    justify-content: space-between;
    padding-top: 1rem;
    border-top: 1px solid rgba(255,255,255,0.1);
    gap: 0.25rem;
    flex-wrap: nowrap;
}

.metric-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    flex: 1; 
    min-width: 0;
}

.lbl {
    font-size: 0.6rem;
    color: #9aa5ce;
    text-transform: uppercase;
    margin-bottom: 4px;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis; 
}

.val {
    font-size: 0.9rem;
    font-weight: 700;
    font-family: 'Segoe UI Mono', monospace;
    white-space: nowrap;
}

.text-green { color: #9ece6a; }
.text-red { color: #f7768e; }
.text-primary { color: #7aa2f7; }

@media (max-width: 1400px) {
    .val { font-size: 0.8rem; }
    .lbl { font-size: 0.6rem; }
}

@media (max-width: 800px) {
    .metrics-row { flex-wrap: wrap; justify-content: center; }
    .metric-item { min-width: 30%; margin-bottom: 0.5rem; }
}
</style>

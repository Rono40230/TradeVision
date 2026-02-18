<template>
  <div class="rocket-strategy-card bento-card" :class="themeClass">
    
    <RocketStrategyHeader
        :strategy="strategy"
        :title="title"
        :icon="icon"
        :plLatent="localPlLatent"
        @open-strategy="$emit('open-strategy', strategy)"
        @open-history="$emit('open-history')"
        @open-mm="$emit('open-mm')"
    />
    
    <!-- Money Management Gauge -->
    <div class="mm-gauge-wrapper" :title="mmTooltip">
        <div class="mm-info">
            <span class="label">Capital Utilisé</span>
            <span class="val" :class="mmColorClass">
                {{ formatCurrency(stats?.capitalUsed) }} / {{ formatCurrency(stats?.capitalAllocated) }} ({{ mmUsagePct }}%)
            </span>
        </div>
        <div class="progress-bar-bg">
            <div class="progress-bar-fill" 
                 :style="{ width: Math.min(mmUsagePct, 100) + '%' }"
                 :class="mmColorClass"
            ></div>
        </div>
    </div>

    <!-- Layout Row: Metrics + Advice -->
    <div class="card-content-row">
        
        <RocketStrategyMetrics
            :strategy="strategy"
            :activeCount="activeCount"
            :plLatent="localPlLatent"
            :expectedPremium="localExpectedPremium"
            :totalAssigned="localTotalAssigned"
            :capitalAvailable="capitalAvailable"
            :plTotal="plTotal"
            :plMensuel="plMensuel"
            :history="chartEntries"
        />
        
        <!-- Footer / Advice -->
        <div class="coach-advice" :class="adviceStatus">
            <span class="icon-bulb">💡</span>
            <p>{{ adviceText }}</p>
        </div>
    </div>
    
    <!-- PERFORMANCE CHART (toutes stratégies) -->
    <StrategyPerformanceChart
        :strategy="strategy"
        :themeColor="themeColor"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import StrategyPerformanceChart from './StrategyPerformanceChart.vue';
import RocketStrategyHeader from './RocketStrategyHeader.vue';
import RocketStrategyMetrics from './RocketStrategyMetrics.vue';

const props = defineProps({
    strategy: String, // 'wheel', 'pcs', 'rockets'
    activeTrades: Array, // Trades currently open
    stats: Object, // { realizedPl: number, capitalAllocated: number, capitalUsed: number, plLatent: number }
    totalAssigned: Number,
    totalExpectedPremium: Number,
    history: { type: Array, default: () => [] } // History of closed trades for chart
});

defineEmits(['open-history', 'open-mm', 'open-strategy']);

const formatCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);

// STRATEGY CONFIG
const config = computed(() => {
    switch(props.strategy) {
        case 'wheel': return { title: 'The Wheel', icon: '🎡' };
        case 'pcs': return { title: 'Put Credit Spreads', icon: '📉' };
        case 'rockets': return { title: 'Rockets', icon: '🚀' };
        default: return { title: props.strategy, icon: '❓' };
    }
});

const title = computed(() => config.value.title);
const icon = computed(() => config.value.icon);

// DATA
const localPlLatent = computed(() => props.stats?.plLatent || 0);
const activeCount = computed(() => props.activeTrades.length);

const localTotalAssigned = computed(() => props.totalAssigned || 0);
const localExpectedPremium = computed(() => props.totalExpectedPremium || 0);
const chartEntries = computed(() => props.history || []);

// THEME CLASS
const themeClass = computed(() => {
    if (props.strategy === 'wheel') return 'theme-wheel';
    if (props.strategy === 'pcs') return 'theme-pcs';
    if (props.strategy === 'rockets') return 'theme-rockets';
    return '';
});

const themeColor = computed(() => {
    if (props.strategy === 'wheel') return '#81c784';
    if (props.strategy === 'pcs') return '#64b5f6';
    if (props.strategy === 'rockets') return '#ba68c8';
    return '#7aa2f7';
});

// MM LOGIC
const mmUsagePct = computed(() => {
    const alloc = props.stats?.capitalAllocated || 1;
    const used = props.stats?.capitalUsed || 0;
    return Math.round((used / alloc) * 100);
});

// Cash Dispo
const capitalAvailable = computed(() => (props.stats?.capitalAllocated || 0) - (props.stats?.capitalUsed || 0));

const mmColorClass = computed(() => {
    if (mmUsagePct.value > 90) return 'critical';
    if (mmUsagePct.value > 75) return 'warning';
    return 'good';
});

const mmTooltip = computed(() => `Utilisé: ${formatCurrency(props.stats?.capitalUsed)} / Alloué: ${formatCurrency(props.stats?.capitalAllocated)}`);

// CALCULATE P/L METRICS
const plTotal = computed(() => {
    if (!chartEntries.value || chartEntries.value.length === 0) return 0;
    return chartEntries.value.reduce((sum, trade) => {
        const pnl = trade.realizedPnl || trade.proceeds || 0;
        return sum + pnl;
    }, 0);
});

const plMensuel = computed(() => {
    if (!chartEntries.value || chartEntries.value.length === 0) return 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return chartEntries.value.reduce((sum, trade) => {
        if (!trade.date) return sum;
        const tradeDate = new Date(trade.date);
        if (tradeDate.getMonth() === currentMonth && tradeDate.getFullYear() === currentYear) {
            const pnl = trade.realizedPnl || trade.proceeds || 0;
            return sum + pnl;
        }
        return sum;
    }, 0);
});

// ADVICE LOGIC
const adviceText = computed(() => {
    if (mmUsagePct.value > 90) return "Attention : Exposition trop élevée ! Réduisez la taille.";
    if (activeCount.value === 0) return "Aucune position active. C'est le moment de scanner !";
    return "Positions sous contrôle.";
});

const adviceStatus = computed(() => {
    if (mmUsagePct.value > 90) return 'danger';
    if (activeCount.value === 0) return 'neutral';
    return 'good';
});
</script>

<style scoped>
.rocket-strategy-card {
    /* Base background fallback */
    background: #1e1e24; 
    border: 1px solid rgba(255,255,255,0.08);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    position: relative;
    overflow: hidden;
    border-radius: 8px; /* Standardize radius */
    transition: transform 0.2s, box-shadow 0.2s;
}

/* --- COLOR THEMES --- */
/* Wheel: Green Pastel Tint */
.rocket-strategy-card.theme-wheel {
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05));
    border-color: rgba(76, 175, 80, 0.3);
}

/* PCS: Blue Pastel Tint */
.rocket-strategy-card.theme-pcs {
    background: linear-gradient(135deg, rgba(33, 150, 243, 0.15), rgba(33, 150, 243, 0.05));
    border-color: rgba(33, 150, 243, 0.3);
}

/* Rockets: Purple Pastel Tint */
.rocket-strategy-card.theme-rockets {
    background: linear-gradient(135deg, rgba(156, 39, 176, 0.15), rgba(156, 39, 176, 0.05));
    border-color: rgba(156, 39, 176, 0.3);
}

/* DEEP SELECTORS TO STYLE CHILD COMPONENTS PER THEME */
.rocket-strategy-card.theme-wheel :deep(.card-header) .title-group .icon,
.rocket-strategy-card.theme-wheel :deep(.card-header) h3 {
    color: #81c784; 
}
.rocket-strategy-card.theme-pcs :deep(.card-header) .title-group .icon,
.rocket-strategy-card.theme-pcs :deep(.card-header) h3 {
    color: #64b5f6; 
}
.rocket-strategy-card.theme-rockets :deep(.card-header) .title-group .icon,
.rocket-strategy-card.theme-rockets :deep(.card-header) h3 {
    color: #ba68c8; 
}

/* MM Gauge */
.mm-gauge-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}
.mm-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    opacity: 0.8;
}
.progress-bar-bg {
    height: 6px;
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
    overflow: hidden;
    position: relative;
}
.progress-bar-fill {
    height: 100%;
    background: #4ade80;
    transition: width 0.5s ease;
}
.progress-bar-fill.warning { background: #facc15; }
.progress-bar-fill.critical { background: #f87171; }

.card-content-row {
    display: flex;
    gap: 1rem;
    align-items: stretch;
}

/* Coach Advice */
.coach-advice {
    flex: 1; /* Advice takes remaining space */
    display: flex;
    gap: 0.75rem;
    align-items: center;
    background: rgba(255,255,255,0.05);
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8rem;
    justify-content: center; /* Center content if short */
}
.coach-advice p { margin: 0; } /* Ensure P has no margin */
.coach-advice.danger { border-left: 3px solid #f87171; }
.coach-advice.warning { border-left: 3px solid #facc15; }
.coach-advice.good { border-left: 3px solid #4ade80; }
.coach-advice.neutral { border-left: 3px solid #94a3b8; }

.coach-advice .icon-bulb { font-size: 1.1rem; }


</style>

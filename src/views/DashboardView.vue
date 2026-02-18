<template>
  <div class="dashboard-container">
    
    <!-- HEADER (Zone A: Vue PDG) -->
    <DashboardHeader
        :currentDate="currentDate"
        :totalNetWorth="totalNetWorth"
        :kasperCapital="kasperCapital"
        :rocketBalanceWheel="rocketBalanceWheel"
        :rocketBalancePcs="rocketBalancePcs"
        :rocketBalanceGrowth="rocketBalanceGrowth"
        @openMmSettings="rocket.showSettings.value = true"
    />

    <!-- BENTO GRID CONTENT -->
    <div class="bento-grid">
        
        <!-- ZONE B: ROCKET ACADEMY SUMMARY -->
        <RocketSummary 
            class="rocket-zone"
            :activeTradesCount="rocketActiveTradesCount"
            :breakdown="breakdown"
            :activeTrades="rocketActiveTrades"
            :plValue="rocketGlobalPL"
            :metrics="rocketPerfMetrics"
        />

        <!-- ZONE C: KASPER ACADEMY SUMMARY -->
        <KasperSummary
            class="kasper-zone"
            :result="kasperResult"
            :metrics="kasperMetrics"
            :chartData="kasperChartData"
        />

        <!-- ZONE D: PERFORMANCE CHART -->
        <div class="bento-card chart-zone">
            <h3>Évolution Performance (Rocket)</h3>
            <PerformanceChart :data="monthlyPL" :height="250" />
        </div>

        <!-- ZONE E: ACTIONS & ALERTS -->
        <DashboardActions 
            class="actions-zone"
            @navigate="(target) => emit('navigate', target)"
        />

    </div>
    
    <RocketModals
        v-model:showSettings="rocket.showSettings.value"
        :mmConfig="rocket.mmConfig.value"
        @update-capital="rocket.updateTotalCapital"
        @save-mm-settings="rocket.saveMMSettings"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRocketState } from '../composables/useRocketState.js';
import { useKasperState } from '../composables/useKasperState.js';
import { useAnalytics } from '../composables/useAnalytics.js';
import RocketModals from "../components/rocket/RocketModals.vue";

// Sub-components
import DashboardHeader from '../components/dashboard/DashboardHeader.vue';
import RocketSummary from '../components/dashboard/RocketSummary.vue';
import KasperSummary from '../components/dashboard/KasperSummary.vue';
import PerformanceChart from '../components/dashboard/PerformanceChart.vue';
import DashboardActions from '../components/dashboard/DashboardActions.vue';

const props = defineProps({
  db: { type: Object, default: null }
});

const emit = defineEmits(['navigate']);

// -- COMPOSABLES --
const rocket = useRocketState();
const kasper = useKasperState();

// Intégration Analytics (utilisant l'historique de trades pour le ROI/WinRate)
const rocketHistory = computed(() => rocket.history.value || []);
const { stats: analyticsStats, monthlyPL } = useAnalytics(rocketHistory);

const rocketPerfMetrics = computed(() => {
    if (!analyticsStats.value) return { roi: 0, winRate: 0, profitFactor: 1.0 };
    return {
        roi: analyticsStats.value.totalROI || 0,
        winRate: analyticsStats.value.winRate || 0,
        profitFactor: analyticsStats.value.profitFactor || 1.0
    };
});

// -- STATE LOCAL --
const currentDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const breakdown = computed(() => {
    // Mapping from useRocketState summary
    const s = rocket.summary.value || {};
    return {
        wheel_put: s.wheel_put || 0,
        wheel_cc: s.wheel_cc || 0,
        wheel_assigned: s.wheel_assigned || 0,
        pcs: s.pcs || 0,
        iron_condor: s.iron_condor || 0,
        rockets_stock: s.rockets_stock || 0,
        rockets_crypto: s.rockets_crypto || 0
    };
});

// -- INIT --
onMounted(async () => {
    await rocket.init();
    await kasper.init();
});

// -- COMPUTED METRICS --
const rocketActiveTradesCount = computed(() => rocket.activeTrades.value?.length || 0);
const rocketActiveTrades = computed(() => rocket.activeTrades.value || []);
const rocketGlobalPL = computed(() => rocket.globalPL.value || 0);

const totalNetWorth = computed(() => (rocket.account.value?.capital || 0) + (kasper.account.value?.total_balance || 0));
const kasperCapital = computed(() => kasper.account.value?.total_balance || 0);
const rocketBalanceWheel = computed(() => rocket.account.value?.alloc_wheel || 0);
const rocketBalancePcs = computed(() => rocket.account.value?.alloc_rocket || 0);
const rocketBalanceGrowth = computed(() => rocket.account.value?.alloc_growth || 0);

// Kasper Data
const kasperResult = computed(() => kasper.summary.value?.net_profit || 0);
const kasperMetrics = computed(() => ({
    winRate: kasper.summary.value?.win_rate || 0,
    profitFactor: kasper.summary.value?.profit_factor || 0,
    totalTrades: kasper.summary.value?.total_trades || 0
}));
const kasperChartData = computed(() => kasper.equityCurve.value || []);

</script>

<style scoped>
.dashboard-container {
    padding: 2rem;
    max-width: 1600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.bento-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    grid-template-rows: auto;
    gap: 1.5rem;
}

.rocket-zone { grid-column: span 8; }
.kasper-zone { grid-column: span 4; }
.chart-zone { grid-column: span 8; }
.actions-zone { grid-column: span 4; }

.bento-card {
    background: var(--surface-color);
    border-radius: 16px;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
}

.bento-card h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
    color: var(--text-secondary);
}

@media (max-width: 1200px) {
    .rocket-zone, .kasper-zone, .chart-zone, .actions-zone { 
        grid-column: span 12; 
    }
}
</style>

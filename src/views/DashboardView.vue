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
            :activeTradesCount="rocketActiveTradesCount"
            :breakdown="breakdown"
            :activeTrades="rocketActiveTrades"
        />

        <!-- ZONE C: KASPER ACADEMY SUMMARY -->
        <KasperSummary
            :result="kasperResult"
            :metrics="kasperMetrics"
            :chartData="kasperChartData"
        />

        <!-- ZONE D: ACTIONS & ALERTS -->
        <DashboardActions 
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
import RocketModals from "../components/rocket/RocketModals.vue";

// Sub-components
import DashboardHeader from '../components/dashboard/DashboardHeader.vue';
import RocketSummary from '../components/dashboard/RocketSummary.vue';
import KasperSummary from '../components/dashboard/KasperSummary.vue';
import DashboardActions from '../components/dashboard/DashboardActions.vue';

const props = defineProps({
  db: { type: Object, default: null }
});

const emit = defineEmits(['navigate']);

// -- COMPOSABLES --
const rocket = useRocketState();
const kasper = useKasperState();

// -- STATE LOCAL --
const currentDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const openTradesCount = ref(0);
const breakdown = ref({
  wheel_put: 0, wheel_cc: 0, wheel_hedge: 0, wheel_assigned: 0,
  pcs: 0, iron_condor: 0, rockets_stock: 0, rockets_crypto: 0
});

// -- INIT --
onMounted(async () => {
    // Initialize both states
    await rocket.init();
    await kasper.init();
});

// Watch DB prop for legacy reasons if db is passed from parent
watch(() => props.db, async (newVal) => {
    if (newVal) {
        await rocket.init();
        await kasper.init();
        loadRocketStats();
    }
});

// -- COMPUTED METRICS --

// 1. Capitals
const rocketCapital = computed(() => rocket.account.value?.capital || 0);
const rocketBalanceWheel = computed(() => rocket.account.value?.alloc_wheel || 0);
const rocketBalancePcs = computed(() => rocket.account.value?.alloc_rocket || 0);
const rocketBalanceGrowth = computed(() => rocket.account.value?.alloc_growth || 0);

const kasperCapital = computed(() => kasper.account.value?.capital || 0);
const totalNetWorth = computed(() => rocketCapital.value + kasperCapital.value);

// 2. Rocket Specifics
const rocketActiveTrades = computed(() => rocket.allActiveTrades.value || []);
const rocketActiveTradesCount = computed(() => rocketActiveTrades.value.length);

// 3. Kasper Specificsmetrics
const kasperMetrics = computed(() => kasper.metrics.value || { result: 0, averageRisk: 0, winrate: 0 });
const kasperResult = computed(() => kasperMetrics.value.result);

const kasperChartData = computed(() => {
    const entries = [...(kasper.dailyEntries.value || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const base = kasper.account.value?.capital || 0;
    
    if (entries.length === 0) {
         return { labels: ['Départ'], values: [base] };
    }

    const labels = [];
    const values = [];
    
    let cumPL = 0;
    entries.forEach(e => {
        cumPL += e.profit_loss;
        labels.push(new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
        values.push(base + cumPL);
    });

    return { labels, values, baseline: base };
});

async function loadRocketStats() {
    if (!props.db) return;
    
     breakdown.value = {
        wheel_put: 0, wheel_cc: 0, wheel_hedge: 0, wheel_assigned: 0,
        pcs: 0, iron_condor: 0, rockets_stock: 0, rockets_crypto: 0
    };

    if (rocket.allActiveTrades.value) {
        openTradesCount.value = rocket.allActiveTrades.value.length;
    }
}

watch(() => props.db, loadLegacyRocketStats, { immediate: true });

async function loadLegacyRocketStats() {
    if(!props.db) return;
    
    // Re-use exact query from original file 
    const params = []; 
    let openQuery = `
    SELECT t.id, t.strategy, t.asset_type, l.type, l.side, l.status as leg_status
    FROM trades t 
    JOIN legs l ON t.id = l.trade_id 
    WHERE t.status != 'closed' AND l.status IN ('open', 'pending', 'neutralized')
    `;
    const openResult = await props.db.select(openQuery, params);
    
    const tradesMap = new Map();
    openResult.forEach(row => {
        if (!tradesMap.has(row.id)) {
            tradesMap.set(row.id, {
                strategy: row.strategy,
                asset_type: row.asset_type,
                legs: []
            });
        }
        tradesMap.get(row.id).legs.push(row);
    });

    for (const trade of tradesMap.values()) {
        if (trade.strategy === 'wheel') {
            const hasShortCall = trade.legs.some(l => l.type === 'call' && l.side === 'short');
            const hasStock = trade.legs.some(l => l.type === 'stock');
            if (hasShortCall) breakdown.value.wheel_cc++;
            else if (hasStock) breakdown.value.wheel_assigned++;
            else breakdown.value.wheel_put++; 
        } else if (trade.strategy === 'pcs') breakdown.value.pcs++;
        else if (trade.strategy === 'iron_condor') breakdown.value.iron_condor++;
        else if (trade.strategy === 'rocket') {
             if (trade.asset_type === 'crypto') breakdown.value.rockets_crypto++;
             else breakdown.value.rockets_stock++;
        }
    }
}
</script>

<style scoped>
.dashboard-container {
    padding: 1.5rem;
    height: 100%;
    overflow-y: auto;
    background-color: var(--bg-color);
    color: var(--text-color);
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

/* BENTO GRID LAYOUT */
.bento-grid {
    display: grid;
    grid-template-columns: 2fr 2fr 1.5fr; /* 3 Columns */
    gap: 1.5rem;
    flex: 1;
}
</style>


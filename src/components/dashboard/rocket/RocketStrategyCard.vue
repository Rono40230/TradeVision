<template>
  <div class="rocket-strategy-card bento-card">
    <div class="card-header">
       <div class="title-group">
           <span class="icon">{{ icon }}</span>
           <h3>{{ title }}</h3>
       </div>
       <div class="pl-badges">
           <span class="badge latent" :class="plLatent >= 0 ? 'green' : 'red'">
               Latent: {{ formatCurrency(plLatent) }}
           </span>
       </div>
    </div>
    
    <!-- Money Management Gauge -->
    <div class="mm-gauge-wrapper" :title="mmTooltip">
        <div class="mm-info">
            <span class="label">Utilisation Capital (MM)</span>
            <span class="val" :class="mmColorClass">{{ mmUsagePct }}%</span>
        </div>
        <div class="progress-bar-bg">
            <div class="progress-bar-fill" 
                 :style="{ width: Math.min(mmUsagePct, 100) + '%' }"
                 :class="mmColorClass"
            ></div>
        </div>
        <div class="limit-marker" v-if="mmLimit" :style="{ left: mmLimit + '%' }"></div>
    </div>

    <!-- Main Metrics -->
    <div class="metrics-row">
        <div class="metric">
            <span class="lbl">Trades Actifs</span>
            <span class="val">{{ activeCount }}</span>
        </div>
        <div class="metric">
            <span class="lbl">P/L Réalisé (YTD)</span>
            <span class="val" :class="plRealized >= 0 ? 'green' : 'red'">{{ formatCurrency(plRealized) }}</span>
        </div>
    </div>

    <!-- Analysis / Coach -->
    <div class="coach-advice" :class="adviceStatus">
        <span class="icon-bulb">💡</span>
        <p>{{ adviceText }}</p>
    </div>

    <!-- Actions Footer -->
    <div class="card-footer">
        <div class="buttons-group">
            <button class="action-btn" @click="$emit('open-history')" title="Historique des trades">
                📜 Historique
            </button>
            <button class="action-btn" @click="$emit('open-mm')" title="Règles Money Management">
                ⚖️ Règles MM
            </button>
        </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    strategy: String, // 'wheel', 'pcs', 'rockets'
    activeTrades: Array, // Trades currently open
    stats: Object, // { realizedPl: number, capitalAllocated: number, capitalUsed: number }
});

const emit = defineEmits(['open-history', 'open-mm']);

const formatCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);

// STRATEGY CONFIG
const config = computed(() => {
    switch(props.strategy) {
        case 'wheel': return { title: 'The Wheel', icon: '🎡' };
        case 'pcs': return { title: 'Put Credit Spreads', icon: '📉' };
        case 'rockets': return { title: 'Rockets (Directionnel)', icon: '🚀' };
        default: return { title: props.strategy, icon: '❓' };
    }
});

const title = computed(() => config.value.title);
const icon = computed(() => config.value.icon);

// DATA
const plLatent = computed(() => {
    // Sum of P/L of active trades (Need to fetch live prices usually, maybe passed in enriched activeTrades?)
    // For now assuming activeTrades have a 'profit_loss' field if calculated, or we sum 0?
    // In RocketState, plLatent is computed globally. We might pass it as a prop or sum it here if trade objects have it.
    // Let's assume passed trades have it or we use 0.
    return props.activeTrades.reduce((sum, t) => sum + (t.latent_pl || 0), 0);
});

const activeCount = computed(() => props.activeTrades.length);
const plRealized = computed(() => props.stats?.realizedPl || 0);

// MM LOGIC
const mmUsagePct = computed(() => {
    if (!props.stats?.capitalAllocated) return 0;
    return Math.round((props.stats.capitalUsed / props.stats.capitalAllocated) * 100);
});

const mmLimit = computed(() => 100); // 100% of allocation

const mmColorClass = computed(() => {
    if (mmUsagePct.value > 100) return 'bg-red';
    if (mmUsagePct.value > 80) return 'bg-orange';
    return 'bg-green';
});

const mmTooltip = computed(() => `${formatCurrency(props.stats?.capitalUsed)} utilisés sur ${formatCurrency(props.stats?.capitalAllocated)}`);

// ADVICE LOGIC
const adviceText = computed(() => {
    if (mmUsagePct.value > 100) return "Attention : Capital alloué dépassé ! Réduisez l'exposition.";
    if (mmUsagePct.value > 80) return "Zone de vigilance : Vous approchez de la limite d'allocation.";
    if (activeCount.value === 0) return "Aucune position. Le capital dort.";
    return "Allocation saine. Stratégie en cours.";
});

const adviceStatus = computed(() => {
    if (mmUsagePct.value > 100) return 'danger';
    if (mmUsagePct.value > 80) return 'warning';
    return 'good';
});

</script>

<style scoped>
.rocket-strategy-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: rgba(30,30,30,0.6);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.title-group { display: flex; align-items: center; gap: 0.5rem; }
.title-group h3 { margin: 0; font-size: 1rem; color: #eee; }
.icon { font-size: 1.2rem; }

.badge { padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; font-family: monospace; }
.badge.green { background: rgba(76, 175, 80, 0.2); color: #81c784; }
.badge.red { background: rgba(244, 67, 54, 0.2); color: #e57373; }

/* MM Gauge */
.mm-gauge-wrapper { display: flex; flex-direction: column; gap: 4px; position: relative; }
.mm-info { display: flex; justify-content: space-between; font-size: 0.7rem; color: #aaa; }
.progress-bar-bg { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
.progress-bar-fill { height: 100%; transition: width 0.5s ease; border-radius: 3px; }

.bg-green { background-color: #4CAF50; color: #4CAF50; }
.bg-orange { background-color: #FF9800; color: #FF9800; }
.bg-red { background-color: #F44336; color: #F44336; }
.progress-bar-fill.bg-green { background-color: #4CAF50; } /* Force bg color for div */
.progress-bar-fill.bg-orange { background-color: #FF9800; }
.progress-bar-fill.bg-red { background-color: #F44336; }


.metrics-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: center; }
.metric { background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 6px; }
.metric .lbl { font-size: 0.7rem; color: #888; display: block; margin-bottom: 2px; }
.metric .val { font-size: 0.9rem; font-weight: bold; color: #fff; }

.coach-advice {
    font-size: 0.8rem;
    padding: 0.75rem;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
    display: flex;
    gap: 0.5rem;
    align-items: center;
}
.coach-advice.danger { border-left: 3px solid #F44336; background: rgba(244,67,54,0.1); }
.coach-advice.warning { border-left: 3px solid #FF9800; background: rgba(255,152,0,0.1); }
.coach-advice.good { border-left: 3px solid #4CAF50; background: rgba(76,175,80,0.1); }

.card-footer { margin-top: auto; }
.buttons-group { display: flex; gap: 0.5rem; }
.action-btn {
    flex: 1;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.2);
    color: #ccc;
    padding: 0.4rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.75rem;
    transition: background 0.2s;
}
.action-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

</style>

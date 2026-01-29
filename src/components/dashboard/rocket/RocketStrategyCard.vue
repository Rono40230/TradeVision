<template>
  <div class="rocket-strategy-card bento-card">
    <div class="card-header">
       <div class="header-top">
           <div class="title-group">
               <span class="icon">{{ icon }}</span>
               <h3>{{ title }}</h3>
               <div class="strategy-actions">
                    <button class="icon-btn-tiny" @click="$emit('open-history')" title="Historique">📜</button>
                    <button class="icon-btn-tiny" @click="$emit('open-mm')" title="Règles MM">⚖️</button>
               </div>
           </div>
           <div class="pl-badges">
               <span class="badge latent" :class="plLatent >= 0 ? 'green' : 'red'">
                   Latent: {{ formatCurrency(plLatent) }}
               </span>
           </div>
       </div>
    </div>
    
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
        <div class="limit-marker" v-if="mmLimit" :style="{ left: mmLimit + '%' }"></div>
    </div>

    <!-- Main Metrics -->
    <div class="metrics-grid">
        <div class="metric-item">
            <span class="lbl">Trades Actifs</span>
            <span class="active-trades-val">{{ activeCount }}</span>
        </div>
        <div class="metric-item">
            <span class="lbl">P/L Réalisé (YTD)</span>
            <span class="val" :class="plRealized >= 0 ? 'green' : 'red'">{{ formatCurrency(plRealized) }}</span>
        </div>
        <div class="metric-item">
            <span class="lbl">Capital Alloué</span>
            <span class="val">{{ formatCurrency(stats?.capitalAllocated) }}</span>
        </div>
        <div class="metric-item">
            <span class="lbl">Capital Dispo</span>
            <span class="val" :class="capitalAvailable >= 0 ? 'green' : 'orange'">
                {{ formatCurrency(capitalAvailable) }}
            </span>
        </div>
    </div>

    <!-- Analysis / Coach -->
    <div class="coach-advice" :class="adviceStatus">
        <span class="icon-bulb">💡</span>
        <p>{{ adviceText }}</p>
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
    return props.activeTrades.reduce((sum, t) => sum + (t.latent_pl || 0), 0);
});

const activeCount = computed(() => props.activeTrades.length);
const plRealized = computed(() => props.stats?.realizedPl || 0);

// MM LOGIC
const mmUsagePct = computed(() => {
    const alloc = props.stats?.capitalAllocated || 1;
    const used = props.stats?.capitalUsed || 0;
    return Math.round((used / alloc) * 100);
});
const capitalAvailable = computed(() => (props.stats?.capitalAllocated || 0) - (props.stats?.capitalUsed || 0));

const mmLimit = computed(() => 90); // Hard limit 90%
const mmColorClass = computed(() => {
    if (mmUsagePct.value > 90) return 'critical';
    if (mmUsagePct.value > 75) return 'warning';
    return 'good';
});

const mmTooltip = computed(() => `Utilisé: ${formatCurrency(props.stats?.capitalUsed)} / Alloué: ${formatCurrency(props.stats?.capitalAllocated)}`);

// ADVICE LOGIC
const adviceText = computed(() => {
    if (mmUsagePct.value > 90) return "Attention : Exposition trop élevée ! Réduisez la taille.";
    if (activeCount.value === 0) return "Aucune position active. C'est le moment de scanner !";
    return "Positions sous contrôle. Surveillez les dates d'expiration.";
});

const adviceStatus = computed(() => {
    if (mmUsagePct.value > 90) return 'danger';
    if (activeCount.value === 0) return 'neutral';
    return 'good';
});
</script>

<style scoped>
.rocket-strategy-card {
    background: #1e1e24; /* Slightly lighter than zone bg */
    border: 1px solid rgba(255,255,255,0.08);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    /* Bento Card Base is global, but local overrides here */
}

.card-header .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.title-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.title-group h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: #e0e0e0;
}

.strategy-actions {
    display: flex;
    gap: 0.25rem;
    margin-left: 0.5rem;
}

.icon-btn-tiny {
    background: rgba(255,255,255,0.1);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 2px 6px;
    transition: background 0.2s;
}
.icon-btn-tiny:hover { background: rgba(255,255,255,0.2); }

.pl-badges .badge {
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: bold;
    background: rgba(255,255,255,0.1);
}
.badge.green { color: #4ade80; background: rgba(74, 222, 128, 0.1); }
.badge.red { color: #f87171; background: rgba(248, 113, 113, 0.1); }

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

.limit-marker {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 2px;
    background: #f87171;
    z-index: 2;
}

/* Metrics Grid */
.metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    background: rgba(0,0,0,0.2);
    padding: 0.75rem;
    border-radius: 8px;
}

.metric-item {
    display: flex;
    flex-direction: column;
}
.metric-item .lbl {
    font-size: 0.7rem;
    opacity: 0.6;
    text-transform: uppercase;
}
.metric-item .val {
    font-size: 0.9rem;
    font-weight: bold;
    font-family: monospace;
}
.metric-item .val.green { color: #4ade80; }
.metric-item .val.orange { color: #facc15; }
.metric-item .val.red { color: #f87171; }
.metric-item .active-trades-val { font-size: 0.9rem; font-weight: bold; font-family: monospace; }

/* Coach Advice */
.coach-advice {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    background: rgba(255,255,255,0.05);
    padding: 0.75rem;
    border-radius: 8px;
    font-size: 0.8rem;
    line-height: 1.4;
}
.coach-advice.danger { border-left: 2px solid #f87171; }
.coach-advice.warning { border-left: 2px solid #facc15; }
.coach-advice.good { border-left: 2px solid #4ade80; }
.coach-advice.neutral { border-left: 2px solid #94a3b8; }

.coach-advice .icon-bulb { font-size: 1.2rem; }
</style>

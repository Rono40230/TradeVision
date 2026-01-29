<template>
  <div class="rocket-strategy-card bento-card" :class="themeClass">
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
           
           <div class="header-status" v-if="strategy === 'wheel' || strategy === 'pcs' || strategy === 'rockets'">
                <!-- Latent badge removed from header to favor metric row for rockets/pcs -->
                <span class="badge latent" :class="localPlLatent >= 0 ? 'green' : 'red'" v-if="strategy === 'wheel'">
                   Latent: {{ formatCurrency(localPlLatent) }}
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
    </div>

    <!-- Main Metrics Row -->
    <div class="metrics-row">
        <!-- Trades Actifs (Always shown) -->
        <div class="metric-item item-active">
            <span class="lbl">Trades Actifs</span>
            <span class="val">{{ activeCount }}</span>
        </div>

        <!-- P/L In-Card (Rockets & PCS) -->
        <div class="metric-item item-pl" v-if="strategy === 'rockets' || strategy === 'pcs'">
             <span class="lbl">P/L Latent</span>
             <span class="val" :class="localPlLatent >= 0 ? 'good-text' : 'warn-text'">{{ formatCurrency(localPlLatent) }}</span>
        </div>

        <!-- Prime Attendue (Wheel Only per RocketHeader) -->
        <div class="metric-item item-premium" v-if="strategy === 'wheel'">
            <span class="lbl">Prime Attendue</span>
            <span class="val premium-badge">{{ formatCurrency(localExpectedPremium) }}</span>
        </div>
        
        <!-- Total des assignations (Wheel Only per RocketHeader) -->
        <div class="metric-item item-assigned" v-if="strategy === 'wheel'">
             <span class="lbl">Total des assignations</span>
             <span class="val">{{ formatCurrency(localTotalAssigned) }}</span>
        </div>

        <!-- Cash Dispo (Always shown) -->
        <div class="metric-item item-avail">
            <span class="lbl">Cash Dispo</span>
            <span class="val" :class="capitalAvailable >= 0 ? 'good-text' : 'warn-text'">{{ formatCurrency(capitalAvailable) }}</span>
        </div>
    </div>
    
    <!-- Footer / Advice -->
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
    stats: Object, // { realizedPl: number, capitalAllocated: number, capitalUsed: number, plLatent: number }
    totalAssigned: Number,
    totalExpectedPremium: Number
});

const emit = defineEmits(['open-history', 'open-mm']);

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

// THEMBE CLASS
const themeClass = computed(() => {
    if (props.strategy === 'wheel') return 'theme-wheel';
    if (props.strategy === 'pcs') return 'theme-pcs';
    if (props.strategy === 'rockets') return 'theme-rockets';
    return '';
});

// MM LOGIC
const mmUsagePct = computed(() => {
    const alloc = props.stats?.capitalAllocated || 1;
    const used = props.stats?.capitalUsed || 0;
    return Math.round((used / alloc) * 100);
});

// Cash Dispo
const capitalAvailable = computed(() => (props.stats?.capitalAllocated || 0) - (props.stats?.capitalUsed || 0));

const mmLimit = computed(() => 90);
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
.rocket-strategy-card.theme-wheel .card-header .title-group .icon,
.rocket-strategy-card.theme-wheel .card-header h3 {
    color: #81c784; /* Light Green Text */
}

/* PCS: Blue Pastel Tint */
.rocket-strategy-card.theme-pcs {
    background: linear-gradient(135deg, rgba(33, 150, 243, 0.15), rgba(33, 150, 243, 0.05));
    border-color: rgba(33, 150, 243, 0.3);
}
.rocket-strategy-card.theme-pcs .card-header .title-group .icon,
.rocket-strategy-card.theme-pcs .card-header h3 {
    color: #64b5f6; /* Light Blue Text */
}

/* Rockets: Purple Pastel Tint */
.rocket-strategy-card.theme-rockets {
    background: linear-gradient(135deg, rgba(156, 39, 176, 0.15), rgba(156, 39, 176, 0.05));
    border-color: rgba(156, 39, 176, 0.3);
}
.rocket-strategy-card.theme-rockets .card-header .title-group .icon,
.rocket-strategy-card.theme-rockets .card-header h3 {
    color: #ba68c8; /* Light Purple Text */
}

.card-header .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.title-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.title-group h3 {
    margin: 0;
    font-size: 1.1rem;
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
    font-size: 1rem;
    padding: 2px 6px;
    transition: background 0.2s;
}
.icon-btn-tiny:hover { background: rgba(255,255,255,0.2); }

.badge.latent {
    font-size: 0.8rem;
    padding: 3px 8px;
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

/* Metrics Row - Horizontal */
.metrics-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 1.5rem;
    background: rgba(0,0,0,0.2);
    padding: 0.75rem;
    border-radius: 6px;
}

.metric-item {
    display: flex;
    flex-direction: column;
    min-width: 80px;
}

.metric-item .lbl {
    font-size: 0.65rem;
    opacity: 0.6;
    text-transform: uppercase;
    margin-bottom: 2px;
}

.metric-item .val {
    font-size: 0.95rem;
    font-weight: 700;
    font-family: monospace;
    color: #fff;
}

.metric-item .val.good-text { color: #4ade80; }
.metric-item .val.warn-text { color: #f87171; }

.premium-badge {
    color: #0ea5e9; 
}

/* Coach Advice */
.coach-advice {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    background: rgba(255,255,255,0.05);
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8rem;
}
.coach-advice.danger { border-left: 3px solid #f87171; }
.coach-advice.warning { border-left: 3px solid #facc15; }
.coach-advice.good { border-left: 3px solid #4ade80; }
.coach-advice.neutral { border-left: 3px solid #94a3b8; }

.coach-advice .icon-bulb { font-size: 1.1rem; }
</style>

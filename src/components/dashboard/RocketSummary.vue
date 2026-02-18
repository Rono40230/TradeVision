<template>
    <div class="bento-card rocket-zone">
        <div class="card-header">
            <h3>🚀 Rocket Academy</h3>
            <div class="header-badges">
                <span class="badge">{{ activeTradesCount }} actifs</span>
                <span class="badge pl-badge" :class="plValue >= 0 ? 'green' : 'red'">
                    {{ plValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) }}
                </span>
            </div>
        </div>
        <div class="card-content">
            <!-- PERFORMANCE METRICS NEW -->
            <div class="performance-grid">
                <div class="perf-item" title="Return On Investment">
                    <span class="label">ROI</span>
                    <span class="value" :class="{ 'green': metrics.roi > 0 }">{{ metrics.roi }}%</span>
                </div>
                <div class="perf-item" title="Taux de réussite">
                    <span class="label">Taux de réussite</span>
                    <span class="value">{{ metrics.winRate }}%</span>
                </div>
                <div class="perf-item" title="Efficiency Ratio">
                    <span class="label">Profit Factor</span>
                    <span class="value">{{ metrics.profitFactor }}</span>
                </div>
            </div>

            <!-- Breakdown Chips -->
            <div class="breakdown-chips">
                <div class="chip" v-if="breakdown.wheel_put > 0"><span>Puts</span><strong>{{ breakdown.wheel_put }}</strong></div>
                <div class="chip" v-if="breakdown.wheel_cc > 0"><span>CC</span><strong>{{ breakdown.wheel_cc }}</strong></div>
                <div class="chip" v-if="breakdown.wheel_assigned > 0"><span>Assigné</span><strong>{{ breakdown.wheel_assigned }}</strong></div>
                <div class="chip" v-if="breakdown.pcs > 0"><span>PCS</span><strong>{{ breakdown.pcs }}</strong></div>
                <div class="chip" v-if="breakdown.iron_condor > 0"><span>IC</span><strong>{{ breakdown.iron_condor }}</strong></div>
                <div class="chip" v-if="breakdown.rockets_stock > 0"><span>Actions</span><strong>{{ breakdown.rockets_stock }}</strong></div>
                <div class="chip" v-if="breakdown.rockets_crypto > 0"><span>Crypto</span><strong>{{ breakdown.rockets_crypto }}</strong></div>
            </div>
            
            <div class="mini-list">
                <p class="section-title">Positions Critiques</p>
                <p v-if="activeTradesCount === 0" class="empty-msg">Aucune position active</p>
                <ul v-else>
                    <li v-for="trade in activeTrades.slice(0, 3)" :key="trade.id">
                        {{ trade.symbol }} ({{ trade.strategy }})
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script setup>
defineProps({
    activeTradesCount: { type: Number, default: 0 },
    breakdown: { type: Object, default: () => ({}) },
    activeTrades: { type: Array, default: () => [] },
    plValue: { type: Number, default: 0 },
    metrics: { 
        type: Object, 
        default: () => ({ roi: 0, winRate: 0, profitFactor: 1.0 }) 
    }
});
</script>

<style scoped>
.bento-card {
    background: var(--surface-color);
    border-radius: 16px;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.card-header h3 { margin: 0; font-size: 1.2rem; display: flex; align-items: center; gap: 0.5rem; }

.header-badges {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.performance-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    background: rgba(255,255,255,0.03);
    padding: 0.8rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
}

.perf-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.perf-item .label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; }
.perf-item .value { font-size: 1.1rem; font-weight: bold; }
.perf-item .value.green { color: #4caf50; }

.badge {
    font-size: 0.8rem;
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
    background: rgba(255,255,255,0.1);
}

.badge.pl-badge { font-weight: bold; }
.badge.pl-badge.green { color: #4caf50; background: rgba(76, 175, 80, 0.1); }
.badge.pl-badge.red { color: #f44336; background: rgba(244, 67, 54, 0.1); }

.breakdown-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 1rem;
}

.chip {
    background: rgba(255,255,255,0.05);
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    display: flex;
    gap: 5px;
}

.chip span { color: var(--text-muted); }

.mini-list .section-title {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
}

.mini-list ul { margin: 0; padding: 0; list-style: none; font-size: 0.85rem; }
.mini-list li { margin-bottom: 4px; }
</style>

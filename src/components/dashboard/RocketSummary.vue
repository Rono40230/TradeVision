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
                     <!-- Limiting to top 3 for dashboard view -->
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
    activeTrades: { type: Array, default: () => [] }
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
    margin-bottom: 1.5rem;
}

.card-header h3 { margin: 0; font-size: 1.2rem; display: flex; align-items: center; gap: 0.5rem; }

.badge {
    font-size: 0.8rem;
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
    background: rgba(255,255,255,0.1);
}

.rocket-zone .section-title {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.2rem;
}

.breakdown-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.chip {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
}
.chip strong { color: var(--text-color); }
.chip span { color: var(--text-muted); }

.mini-list ul { padding: 0; list-style: none; }
.mini-list li { margin-bottom: 0.5rem; padding: 0.5rem; background: rgba(0,0,0,0.2); border-radius: 4px; border-left: 3px solid #f44336; }
.empty-msg { color: var(--text-muted); font-style: italic; font-size: 0.9rem; }
</style>

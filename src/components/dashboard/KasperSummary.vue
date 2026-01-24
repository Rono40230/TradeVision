<template>
    <div class="bento-card kasper-zone">
         <div class="card-header">
            <h3>👻 Kasper Academy</h3>
            <span class="badge" :class="result >= 0 ? 'green' : 'red'">
                {{ result >= 0 ? '+' : ''}}{{ formatCurrency(result) }} (Mois)
            </span>
        </div>
        <div class="card-content">
            <div class="metrics-grid">
                <div class="metric">
                    <span class="lbl">Risque Moyen</span>
                    <span class="val">{{ formatCurrency(metrics.averageRisk) }}</span>
                </div>
                <div class="metric">
                    <span class="lbl">Win Rate</span>
                    <span class="val">{{ formatWinrate(metrics.winrate) }}</span> 
                </div>
            </div>
            <!-- Capital Chart -->
            <div class="chart-wrapper" style="height: 140px; margin-top: 1rem;">
                 <SimpleLineChart 
                    :labels="chartData.labels" 
                    :data="chartData.values"
                    :baseline="chartData.baseline"
                    color="#9c27b0"
                    fillColor="rgba(156, 39, 176, 0.05)"
                    label="Capital ($)"
                 />
            </div>
        </div>
    </div>
</template>

<script setup>
import SimpleLineChart from './SimpleLineChart.vue';

defineProps({
    result: { type: Number, default: 0 },
    metrics: { type: Object, default: () => ({ averageRisk: 0, winrate: 0 }) },
    chartData: { type: Object, default: () => ({ labels: [], values: [] }) }
});

function formatCurrency(val) {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0) + ' $';
}

function formatWinrate(val) {
    if (!val) return '0%';
    return val.toFixed(0) + '%';
}
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
.badge.green { background: rgba(76, 175, 80, 0.2); color: #81c784; }
.badge.red { background: rgba(244, 67, 54, 0.2); color: #e57373; }

.metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
}
.metric { display: flex; flex-direction: column; background: rgba(0,0,0,0.2); padding: 0.8rem; border-radius: 8px; }
.metric .lbl { font-size: 0.8rem; color: var(--text-muted); }
.metric .val { font-size: 1.2rem; font-weight: bold; }
</style>

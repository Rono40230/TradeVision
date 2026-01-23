<template>
    <div class="kasper-metrics">
        <div class="metric-group">
            <span class="label">Capital Investi</span>
            <span class="value action-value" @click="$emit('openCapitalModal')">{{ formatCurrency(account?.capital) }}</span>
             <button class="icon-btn edit-cap-btn" @click="$emit('openCapitalModal')" title="Saisir capital de départ">✎</button>
        </div>
        <div class="metric-group" :class="(metrics?.result || 0) >= 0 ? 'positive' : 'negative'">
            <span class="label">Résultat Net</span>
            <span class="value">{{ formatCurrency(metrics?.result) }}</span>
        </div>
        <div class="metric-group text-primary">
            <span class="label">Capital Actuel</span>
            <span class="value">{{ formatCurrency(currentCapital) }}</span>
        </div>
        <div class="metric-group">
            <span class="label">Risque Moyen</span>
            <span class="value">{{ formatRiskPct(metrics?.averageRisk) }}</span>
        </div>
        <div class="metric-group">
            <span class="label">Winrate</span>
            <span class="value">{{ formatWinrate(metrics?.winrate) }}</span>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    account: Object,
    metrics: Object
});

defineEmits(['openCapitalModal']);

const currentCapital = computed(() => {
    return (props.account?.capital || 0) + (props.metrics?.result || 0);
});

function formatCurrency(val) {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0) + ' $';
}

function formatRiskPct(val) {
    // val is dollars average risk
    const cap = props.account?.capital || 1;
    // Pct
    const pct = (val / cap) * 100;
    // Round to 0.5
    const rounded = Math.round(pct * 2) / 2;
    // Remove .0 if integer
    return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + ' %';
}

function formatWinrate(val) {
    if (!val) return '0%';
    return val.toFixed(0) + '%';
}
</script>

<style scoped>
.kasper-metrics {
    display: flex;
    justify-content: space-around;
    background: var(--surface-color);
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.2);
}

.metric-group {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.metric-group .label {
    font-size: 0.85rem;
    color: var(--text-muted);
    text-transform: uppercase;
    margin-bottom: 0.25rem;
}

.metric-group .value {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--text-color);
}

.action-value {
    cursor: pointer;
    border-bottom: 1px dashed var(--text-muted);
}
.action-value:hover { color: var(--accent-color); }

.metric-group.positive .value { color: #4caf50; }
.metric-group.negative .value { color: #f44336; }

.edit-cap-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    margin-left: 0.5rem;
    font-size: 1rem;
}
.edit-cap-btn:hover { color: var(--accent-color); }

.text-primary .value { color: #2196F3; }
</style>

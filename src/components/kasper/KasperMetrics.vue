<template>
    <div class="kasper-metrics">
        <div class="metric-group">
            <span class="label">Capital Investi</span>
            <span class="value action-value" @click="$emit('openCapitalModal')">{{ formatCurrency(account?.capital) }}</span>
             <button class="icon-btn edit-cap-btn" @click="$emit('openCapitalModal')" title="Saisir capital de départ">✎</button>
        </div>
        <div class="metric-group positive">
            <span class="label">Plus-Values</span>
            <span class="value">+{{ formatCurrency(metrics?.totalPlus) }}</span>
        </div>
        <div class="metric-group negative">
            <span class="label">Moins-Values</span>
            <span class="value">{{ formatCurrency(metrics?.totalMinus) }}</span>
        </div>
        <div class="metric-group" :class="(metrics?.result || 0) >= 0 ? 'positive' : 'negative'">
            <span class="label">Résultat Net</span>
            <span class="value">{{ formatCurrency(metrics?.result) }}</span>
        </div>
        <div class="metric-group">
            <span class="label">Risque Moyen</span>
            <span class="value">{{ formatCurrency(metrics?.averageRisk) }}</span>
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

function formatCurrency(val) {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0) + ' $';
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
</style>

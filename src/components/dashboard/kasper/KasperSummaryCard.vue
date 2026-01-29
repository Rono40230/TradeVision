<template>
  <div class="kasper-summary-panel">
    <div class="global-metrics-row">
        <div class="metric big">
            <span class="label">Total Capital</span>
            <span class="value">{{ formatCurrency(totalCapital) }}</span>
        </div>
         <div class="metric">
            <span class="label">P/L Total</span>
            <span class="value" :class="totalPl >= 0 ? 'text-green' : 'text-red'">
                {{ totalPl >= 0 ? '+' : '' }}{{ formatCurrency(totalPl) }}
            </span>
        </div>
         <div class="metric">
            <span class="label">Comptes</span>
            <span class="value">{{ accountsCount }}</span>
        </div>
    </div>
    
    <button class="mm-btn" @click="$emit('open-mm')">
        <span class="icon">⚖️</span> Money Management
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    accounts: Array, // Array of account objects with 'capital'
    allEntries: Array // Array of all daily entries for aggregation logic
});

const emit = defineEmits(['open-mm']);

const formatCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);

const totalCapital = computed(() => (props.accounts || []).reduce((sum, a) => sum + (parseFloat(a.initial_capital) || parseFloat(a.capital) || 0), 0));
const accountsCount = computed(() => (props.accounts || []).length);

const totalPl = computed(() => {
    return (props.allEntries || []).reduce((sum, e) => sum + (e.profit_loss || 0), 0);
});
</script>

<style scoped>
.kasper-summary-panel {
    background: rgba(122, 162, 247, 0.05);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap; 
    gap: 1rem;
}

.global-metrics-row {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
}

.metric { display: flex; flex-direction: column; }
.metric.big .value { font-size: 1.5rem; color: #fff; }
.metric .label { font-size: 0.7rem; color: #a9b1d6; text-transform: uppercase; }
.metric .value { font-size: 1.1rem; font-weight: bold; font-family: monospace; color: #c0caf5; }

.text-green { color: #9ece6a !important; }
.text-red { color: #f7768e !important; }

.mm-btn {
    background: rgba(122, 162, 247, 0.1);
    color: #7aa2f7;
    border: 1px solid rgba(122, 162, 247, 0.3);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
}
.mm-btn:hover { background: rgba(122, 162, 247, 0.2); }

@media (max-width: 600px) {
    .kasper-summary-panel { flex-direction: column; align-items: stretch; }
    .global-metrics-row { justify-content: space-between; }
    .mm-btn { justify-content: center; }
}
</style>

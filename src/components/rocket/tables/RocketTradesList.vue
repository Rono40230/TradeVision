<template>
  <div class="rocket-tables-container">
    <div class="market-status">
      <div v-if="loading" class="loading-state">
        <span class="loading-spinner"></span> Récupération des prix en cours...
      </div>
    </div>

    <RocketPendingTable 
      :trades="pendingTrades"
      @activate-rocket="(t) => $emit('activate-rocket', t)"
      @edit="(t) => $emit('open-entry', t)"
      @delete="(t) => $emit('delete-trade', t)"
    />

    <RocketRiskTable
      :trades="riskTrades"
      @neutralize-rocket="(t) => $emit('neutralize-rocket', t)"
      @close-rocket="(t) => $emit('close-rocket', t)"
      @edit="(t) => $emit('open-entry', t)"
      @delete="(t) => $emit('delete-trade', t)"
    />

    <RocketNeutralizedTable 
      :trades="neutralizedTrades"
      @close-rocket="(t) => $emit('close-rocket', t)"
      @edit="(t) => $emit('open-entry', t)"
      @delete="(t) => $emit('delete-trade', t)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import RocketPendingTable from './rockets/RocketPendingTable.vue';
import RocketRiskTable from './rockets/RocketRiskTable.vue';
import RocketNeutralizedTable from './rockets/RocketNeutralizedTable.vue';
import { useLivePrices } from '../../../composables/useLivePrices.js';

const props = defineProps({
  trades: { type: [Array, Object], required: true }
});

const emit = defineEmits([
  'activate-rocket', 'close-rocket', 'neutralize-rocket', 'open-entry', 'delete-trade'
]);

// Use shared pricing logic
const { loading } = useLivePrices(props);

// Categorize trades - Handle both Array (legacy) and Object (pre-sorted from store)
const pendingTrades = computed(() => {
    if (Array.isArray(props.trades)) return props.trades.filter(t => t.status === 'pending');
    return props.trades.pending || [];
});

const riskTrades = computed(() => {
    if (Array.isArray(props.trades)) return props.trades.filter(t => t.status === 'open');
    return props.trades.risk || [];
});

const neutralizedTrades = computed(() => {
    if (Array.isArray(props.trades)) return props.trades.filter(t => t.status === 'neutralized');
    return props.trades.neutralized || [];
});

const closedTrades = computed(() => {
    if (Array.isArray(props.trades)) return props.trades.filter(t => t.status === 'closed');
    return props.trades.closed || [];
});

</script>

<style scoped>
.rocket-tables-container { display: flex; flex-direction: column; gap: 2rem; }
.market-status { height: 2px; margin-bottom: 0.5rem; transition: all 0.3s ease; }
.loading-state { color: #888; font-size: 0.8rem; display: flex; align-items: center; gap: 8px; font-style: italic; }
.loading-spinner { width: 12px; height: 12px; border: 2px solid #555; border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

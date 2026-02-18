<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-content bento-card">
      <header class="modal-header">
        <h3>Historique des Trades : {{ strategyTitle }}</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </header>
      
      <div class="modal-body">
        <!-- STRATÉGIE THEME STRIPE -->
        <div class="strategy-theme-stripe" :class="strategy"></div>

        <RocketClosedTable 
            v-if="strategy === 'rockets'"
            :trades="localHistory" 
            @delete="handleDelete"
            @update-trade="handleUpdate"
        />

        <PcsClosedTable 
            v-else-if="strategy === 'pcs'"
            :trades="localHistory" 
            @delete="handleDelete" 
        />

        <WheelClosedTable 
            v-else-if="strategy === 'wheel'"
            :trades="localHistory" 
            @delete="handleDelete" 
        />
        
        <div v-else class="placeholder-msg">
            <p>Historique pour {{ strategy }} bientôt disponible.</p>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import RocketClosedTable from '../../rocket/tables/rockets/RocketClosedTable.vue';
import PcsClosedTable from '../../rocket/tables/rockets/PcsClosedTable.vue';
import WheelClosedTable from '../../rocket/tables/rockets/WheelClosedTable.vue';
import { useRocketState } from '../../../composables/useRocketState.js';

const props = defineProps({
  strategy: { type: String, required: true },
  history: { type: Array, default: () => [] }
});

const emit = defineEmits(['close', 'delete-trade']);

const { updateClosedTrade, fetchHistory } = useRocketState();

// Copie locale pour rafraichissement sans fermer le modal
const localHistory = ref([...props.history]);
watch(() => props.history, (v) => { localHistory.value = [...v]; }, { immediate: true });

async function reloadHistory() {
    localHistory.value = await fetchHistory(props.strategy);
}

async function handleUpdate(data) {
    await updateClosedTrade(data.id, data.exit_date, data.exit_price, data.profit_loss);
    await reloadHistory();
}

const strategyTitle = computed(() => {
    switch(props.strategy) {
        case 'wheel': return 'The Wheel';
        case 'pcs': return 'Put Credit Spreads';
        case 'rockets': return 'Rockets';
        default: return props.strategy.toUpperCase();
    }
});

function handleDelete(trade) {
    if(confirm('Supprimer définitivement ce trade de l\'historique ?')) {
        emit('delete-trade', trade);
    }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #1e1e1e;
  width: 95%;
  max-width: 1500px; /* LARGEOUR POUR TABLEAU */
  height: 85vh;
  border-radius: 12px;
  border: 1px solid #333;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalPop {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #252526;
  border-bottom: 1px solid #333;
}

.modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #e0e0e0;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.close-btn:hover { color: #fff; }

.modal-body {
    padding: 1.5rem;
    position: relative;
    flex: 1;
    overflow-y: auto;
}

.strategy-theme-stripe {
    height: 4px;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
}
.strategy-theme-stripe.wheel { background: #4CAF50; box-shadow: 0 0 10px rgba(76, 175, 80, 0.4); }
.strategy-theme-stripe.pcs { background: #2196F3; box-shadow: 0 0 10px rgba(33, 150, 243, 0.4); }
.strategy-theme-stripe.rockets { background: #9C27B0; box-shadow: 0 0 10px rgba(156, 39, 176, 0.4); }

.placeholder-msg {
    text-align: center;
    color: #888;
    margin-top: 2rem;
}

/* Force RocketClosedTable to fit modal theme better if needed, 
   but scoped styles in that component should handle it nicely. 
   We might need to override the background to transparent to blend with modal. 
*/
:deep(.rocket-section) {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
}
:deep(.rocket-section.closed) {
    border-left: none !important;
}
:deep(.section-title) {
    display: none; /* Hide duplicate title */
}
</style>

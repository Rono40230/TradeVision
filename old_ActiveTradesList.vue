<template>
  <div class="right-column-lists">
      <!-- Active Trades Block -->
      <div class="active-trades-block">
        <div class="active-trades-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 v-if="strategyType !== 'rockets'" style="margin: 0;">Trades en Cours</h3>
            
            <!-- View Switcher for Wheel -->
            <div v-if="strategyType === 'wheel'" class="view-switcher">
                <button class="switcher-btn" :class="{ active: wheelViewMode === 'journal' }" @click="wheelViewMode = 'journal'">📓 Journal</button>
                <button class="switcher-btn" :class="{ active: wheelViewMode === 'pilotage' }" @click="wheelViewMode = 'pilotage'">✈️ Pilotage</button>
            </div>

            <!-- View Switcher for PCS -->
            <div v-if="strategyType === 'pcs'" class="view-switcher">
                <button class="switcher-btn" :class="{ active: pcsViewMode === 'journal' }" @click="pcsViewMode = 'journal'">📓 Journal</button>
                <button class="switcher-btn" :class="{ active: pcsViewMode === 'pilotage' }" @click="pcsViewMode = 'pilotage'">✈️ Pilotage</button>
            </div>
        </div>

        <div class="table-container">
            
            <!-- WHEEL STRATEGY LAYOUT -->
             <div v-if="strategyType === 'wheel'" class="wheel-layout" :class="{ 'has-assignments': assignedTrades.length > 0 }">
                <div class="wheel-main-table">
                     <WheelTradesTable 
                        :trades="currentWheelTrades"
                        :view-mode="wheelViewMode"
                        @update-status="handleUpdateStatus"
                        @update-date="(t, d) => $emit('update-date', t, d)"
                        @assign="(t) => $emit('assign', t)"
                        @delete="(t) => $emit('delete', t)"
                    />
                </div>

                <div v-if="assignedTrades.length > 0" class="wheel-assignments-table">
                    <AssignmentsTable 
                        :trades="assignedTrades"
                        @close-assignment="(trade) => handleUpdateStatus(trade, 'closed')"
                        @open-cc-modal="(t) => $emit('open-cc-modal', t)"
                        @delete="(t) => $emit('delete', t)"
                    />
                </div>
            </div>

            <!-- PCS TABLE -->
            <PcsTradesTable 
                v-if="strategyType === 'pcs'"
                :trades="pcsTrades"
                :view-mode="pcsViewMode"
                @update-status="handleUpdateStatus"
                @update-date="(t, d) => $emit('update-date', t, d)"
                @delete="(t) => $emit('delete', t)"
            />

            <!-- ROCKETS TABLES -->
            <RocketTradesList 
                v-if="strategyType === 'rockets'"
                :trades="rocketsTrades"
                @activate-rocket="(t) => $emit('activate-rocket', t)"
                @neutralize-rocket="(t) => $emit('neutralize-rocket', t)"
                @close-rocket="(t) => $emit('close-rocket', t)"
                @delete-trade="(t) => $emit('delete', t)"
                @update-quantity="(t, q) => $emit('update-quantity', t, q)"
                @update-trailing-stop="(t, v) => $emit('update-trailing-stop', t, v)"
                @update-date="(t, d) => $emit('update-date', t, d)"
            />
        </div>
      </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useLivePrices } from '../../composables/useLivePrices.js';
import WheelTradesTable from './tables/WheelTradesTable.vue';
import PcsTradesTable from './tables/PcsTradesTable.vue';
import RocketTradesList from './tables/RocketTradesList.vue';
import AssignmentsTable from './tables/AssignmentsTable.vue';

const props = defineProps({
    strategyType: { type: String, required: true },
    wheelOptions: { type: Array, default: () => [] },
    pcsTrades: { type: Array, default: () => [] },
    rocketsTrades: { type: [Array, Object], default: () => ({ pending: [], risk: [], neutralized: [], closed: [] }) },
    assignedTrades: { type: Array, default: () => [] },
    account: { type: Object, default: () => ({ id: null }) }
});

const emit = defineEmits(['update-status', 'assign', 'delete', 'update-date', 'update-quantity', 'update-trailing-stop', 'refresh-data', 'activate-rocket', 'neutralize-rocket', 'close-rocket', 'open-cc-modal']);

const wheelViewMode = ref('journal'); 
const pcsViewMode = ref('journal'); 

const currentWheelTrades = computed(() => {
    // In original code, wheelOptions are filtered by default in parent, but let's pass them through.
    return props.wheelOptions || [];
});

// Live Prices Management
const priceUtils = useLivePrices();

function getAllTradesForRefresh() {
    let all = [];
    if (props.strategyType === 'wheel') all = [...(props.wheelOptions || []), ...(props.assignedTrades || [])];
    if (props.strategyType === 'pcs') all = [...(props.pcsTrades || [])];
    if (props.strategyType === 'rockets') {
        all = [
            ...(props.rocketsTrades.risk || []),
            ...(props.rocketsTrades.neutralized || [])
        ];
    }
    return all;
}

onMounted(() => {
    priceUtils.startAutoRefresh(getAllTradesForRefresh);
});

onUnmounted(() => {
    priceUtils.stopAutoRefresh();
});

// Handlers
function handleUpdateStatus(trade, newStatus) {
    // Parent expects object payload for update-status
    emit('update-status', { trade, newStatus });
}

</script>

<style scoped>
.right-column-lists {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
}

.active-trades-block {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    flex: 1;      
    /* overflow-y: auto; REMOVED to allow inner flex containers to scroll */   
    display: flex;
    flex-direction: column;
    min-height: 0; /* Important for flex nesting */
}

.active-trades-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
}

.view-switcher {
    display: flex;
    background-color: var(--bg-secondary);
    border-radius: 6px;
    padding: 2px;
}

.switcher-btn {
    background: transparent;
    border: none;
    color: var(--text-color);
    padding: 6px 12px;
    font-size: 0.9rem;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
}

.switcher-btn.active {
    background-color: var(--primary-color);
    color: white;
    font-weight: bold;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.switcher-btn:hover:not(.active) {
    background-color: rgba(255, 255, 255, 0.1);
}

.table-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    margin-top: 1rem;
    overflow: hidden; /* Prevent container double scroll */
}

/* Wheel Layout */
.wheel-layout {
    display: flex;
    flex-direction: column;
    gap: 20px;
    height: 100%;
}

.wheel-layout.has-assignments {
    /* Vertical stacking is default column, just sharing space */
}

.wheel-main-table {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
}

.wheel-layout.has-assignments .wheel-main-table {
    flex: 2; /* 2/3 Height */
    border-bottom: 1px dashed var(--border-color);
    padding-bottom: 1rem;
}

.wheel-assignments-table {
    flex: 1; /* 1/3 Height */
    /* overflow-y: auto; REMOVED to allow internal scrolling */
    overflow: hidden; 
    min-height: 0;
    /* Remove previous left border styles */
    border-left: none; 
    padding-left: 0;
    padding-top: 1rem;
}
</style>


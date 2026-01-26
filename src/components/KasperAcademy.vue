<template>
  <div class="kasper-academy">
    
    <KasperMetrics 
        :account="account" 
        :metrics="metrics" 
        @openCapitalModal="showCapModal = true"
    />

    <div class="kasper-main-row">
        <KasperMmTable 
            :pairsConfig="pairsConfig" 
            :account="account"
            :currentCapital="realTimeCapital"
            @updatePair="updatePairConfig"
            @deletePair="confirmDeletePair"
            @addPair="addNewPair"
        >
             <template #projections>
                 <KasperProjections :baseRiskAmount="baseRiskAmount" />
             </template>
        </KasperMmTable>

        <KasperCalendar 
            :dailyEntries="enrichedDailyEntries"
            :pairsConfig="pairsConfig"
            @openDayModal="onOpenDayModal"
        />
    </div>

    <!-- Modals -->
    <KasperDayModal
        v-if="showDayModal"
        :date="selectedDayDate"
        :entry="selectedDayEntry"
        :pairsConfig="pairsConfig"
        :currentCapital="realTimeCapital"
        @close="showDayModal = false"
        @save="onSaveDay"
    />

    <KasperCapitalModal 
        v-if="showCapModal"
        :currentCapital="account?.capital" 
        @close="showCapModal = false"
        @save="onSaveCapital"
    />

    <KasperDeletePairModal
        v-if="showDeletePairModal"
        :pair="pairToDelete"
        @close="showDeletePairModal = false"
        @confirm="executeDeletePair"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useKasperState } from '../composables/useKasperState.js';
import KasperMetrics from './kasper/KasperMetrics.vue';
import KasperMmTable from './kasper/KasperMmTable.vue';
import KasperProjections from './kasper/KasperProjections.vue';
import KasperCalendar from './kasper/KasperCalendar.vue';
import KasperDayModal from './kasper/KasperDayModal.vue';
import KasperCapitalModal from './kasper/KasperCapitalModal.vue';
import KasperDeletePairModal from './kasper/KasperDeletePairModal.vue';

const { 
    account, metrics, dailyEntries, pairsConfig,
    init, saveDailyEntry, updateCapital, updatePair, addPair, deletePair 
} = useKasperState();

const showDayModal = ref(false);
const showCapModal = ref(false);
const showDeletePairModal = ref(false);
const pairToDelete = ref(null);
const selectedDayDate = ref('');
const selectedDayEntry = ref(null);

onMounted(() => {
    init();
});

const realTimeCapital = computed(() => {
    const cap = parseFloat(account.value?.capital) || 0;
    const res = parseFloat(metrics.value?.result) || 0;
    const total = cap + res;
    return total > 0 ? total : 1; // Avoid division by zero
});

const baseRiskAmount = computed(() => {
    // Uses realTimeCapital for calculation
    const cap = realTimeCapital.value;
    if (pairsConfig.value.length > 0) {
        return cap * (pairsConfig.value[0].risk_pct / 100);
    }
    return cap * 0.01;
});

const enrichedDailyEntries = computed(() => {
    if (!dailyEntries.value || !account.value) return [];
    
    // Calculate total PL so we can find the "Start Capital" relative to current status
    // Correction: account.capital is now the FIXED Invested Capital. 
    // So StartBase is simply that capital.
    const startBase = (account.value.capital || 0);

    let currentAccumulated = 0;
            
    // Use map to create new objects with start/end capital info
    return dailyEntries.value.map(e => {
        const startCap = startBase + currentAccumulated;
        const pl = e.profit_loss || 0;
        const endCap = startCap + pl;
        
        currentAccumulated += pl;
        
        return {
            ...e, // keep original fields including details
            startCapital: startCap,
            endCapital: endCap
        };
    });
});

// Handlers
async function updatePairConfig(pair) {
    await updatePair(pair);
}

async function addNewPair(symbol) {
    await addPair(symbol);
}

function confirmDeletePair(pair) {
    pairToDelete.value = pair;
    showDeletePairModal.value = true;
}

async function executeDeletePair() {
    if (pairToDelete.value) {
        await deletePair(pairToDelete.value.id);
        showDeletePairModal.value = false;
        pairToDelete.value = null;
    }
}

function onOpenDayModal({ date, entry }) {
    selectedDayDate.value = date;
    selectedDayEntry.value = entry;
    showDayModal.value = true;
}

async function onSaveDay({ date, pl, risk, tradeList }) {
    await saveDailyEntry(date, pl, risk, tradeList);
    showDayModal.value = false;
}

async function onSaveCapital(amount) {
    await updateCapital(amount);
    showCapModal.value = false;
}
</script>

<style scoped>
.kasper-academy {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    padding: 1rem;
    gap: 1.5rem;
    background-color: var(--bg-color);
}

.kasper-main-row {
    display: flex;
    gap: 1.5rem;
    flex: 1;
    min-height: 0;
}
</style>

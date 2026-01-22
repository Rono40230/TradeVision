<template>
  <div class="kasper-academy">
    <div class="kasper-top-section">
        <KasperMetrics 
            class="metrics-panel"
            :account="account" 
            :metrics="metrics" 
            @openCapitalModal="showCapModal = true"
        />
        <KasperCapitalChart 
            class="chart-panel"
            :account="account"
            :dailyEntries="dailyEntries"
        />
    </div>

    <div class="kasper-main-row">
        <KasperMmTable 
            :pairsConfig="pairsConfig" 
            :account="account"
            @updatePair="updatePairConfig"
            @deletePair="confirmDeletePair"
            @addPair="addNewPair"
        >
             <template #projections>
                 <KasperProjections :baseRiskAmount="baseRiskAmount" />
             </template>
        </KasperMmTable>

        <KasperCalendar 
            :dailyEntries="dailyEntries"
            @openDayModal="onOpenDayModal"
        />
    </div>

    <!-- Modals -->
    <KasperDayModal
        v-if="showDayModal"
        :date="selectedDayDate"
        :entry="selectedDayEntry"
        :pairsConfig="pairsConfig"
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
import KasperCapitalChart from './kasper/KasperCapitalChart.vue';
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

const baseRiskAmount = computed(() => {
    if (pairsConfig.value.length > 0 && account.value) {
        return (account.value.capital || 0) * (pairsConfig.value[0].risk_pct / 100);
    }
    return (account.value ? account.value.capital : 0) * 0.01;
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

.kasper-top-section {
    display: flex;
    gap: 1.5rem;
    height: 160px; /* Fixed height for top section to keep chart stable */
    min-height: 160px;
}

.metrics-panel {
    flex: 2; /* Takes 2/3 of space */
}

.chart-panel {
    flex: 1; /* Takes 1/3 of space */
}

.kasper-main-row {
    display: flex;
    gap: 1.5rem;
    flex: 1;
    min-height: 0;
}
</style>

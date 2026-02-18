<template>
  <div class="dashboard-cockpit">

    <div class="cockpit-content">
        <!-- ZONE KASPER (Gauche) -->
        <section class="zone-kasper">
            <div class="kasper-grid">
                <!-- Summary -->
                <KasperSummaryCard 
                    :accounts="kasperAccounts" 
                    :allEntries="allKasperEntries" 
                    @open-mm="openModal('kasper-mm')"
                />

                <!-- Accounts Cards -->
                <KasperAccountCard 
                    v-for="acc in kasperAccounts" 
                    :key="acc.id" 
                    :account="acc"
                    :entries="kasperEntriesByAccount[acc.id] || []"
                    @open-account="onOpenKasperAccount"
                    @open-mm="openModal('kasper-mm')"
                />
            </div>
        </section>

        <!-- ZONE ROCKET (Droite) -->
        <section class="zone-rocket">

            <!-- GRAPHIQUE DE SYNTHÈSE -->
            <SynthesisChart />

            <div class="rocket-grid">
                <RocketStrategyCard 
                    v-for="strat in ['wheel', 'pcs', 'rockets']"
                    :key="strat"
                    :strategy="strat"
                    :activeTrades="activeTradesByStrategy[strat] || []"
                    :stats="rocketStatsByStrategy[strat]"
                    :totalAssigned="rocketStatsByStrategy[strat]?.totalAssigned || 0"
                    :totalExpectedPremium="rocketStatsByStrategy[strat]?.totalExpectedPremium || 0"
                    :history="strat === 'rockets' ? rocketClosedHistory : []"
                    @open-strategy="onOpenStrategy"
                    @open-history="openModal('rocket-history-strat', strat)"
                    @open-mm="openModal('rocket-mm', strat)"
                />
            </div>
        </section>
    </div>

    <!-- MODALES TABLEAU DE BORD -->
    <DashboardModals
        :currentModal="currentModal"
        :modalData="modalData"
        :rocketClosedHistory="rocketClosedHistory"
        :pcsClosedHistory="pcsClosedHistory"
        :wheelClosedHistory="wheelClosedHistory"
        :kasperActiveAccount="kasperActiveAccount"
        :kasperPairsConfig="kasperPairsConfig"
        :kasperRealTimeCapital="kasperRealTimeCapital"
        :kasperBaseRiskAmount="kasperBaseRiskAmount"
        :modalTitle="modalTitle"
        @close="closeModal"
        @updatePair="updatePair"
        @deletePair="deletePair"
        @addPair="addPair"
    />
  </div>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue';
import KasperSummaryCard from '../components/dashboard/kasper/KasperSummaryCard.vue';
import KasperAccountCard from '../components/dashboard/kasper/KasperAccountCard.vue';
import SynthesisChart from '../components/dashboard/rocket/SynthesisChart.vue';
import RocketStrategyCard from '../components/dashboard/rocket/RocketStrategyCard.vue';
import DashboardModals from '../components/dashboard/DashboardModals.vue';

import { useRocketState } from '../composables/useRocketState.js';
import { useKasperState } from '../composables/useKasperState.js';
import { useDashboardLogic } from '../composables/useDashboardLogic.js';
import { useLivePrices } from '../composables/useLivePrices.js';
import { useRocketStore } from '../composables/rocketStore.js';
import { currentAccountId } from '../composables/useKasperStore.js';

const emit = defineEmits(['navigate']);

const { strategyType } = useRocketStore();

const { init: initRocket, account: rocketAccount, allActiveTrades, db: rocketDb, fetchHistory } = useRocketState();
const { livePrices, getOccSymbol, getSpreadPrice } = useLivePrices();
const { 
    init: initKasper, 
    accountsList: kasperAccounts, 
    db: kasperDb,
    pairsConfig: kasperPairsConfig,
    account: kasperActiveAccount,
    metrics: kasperMetrics,
    updatePair,
    addPair,
    deletePair
} = useKasperState();

const allKasperEntries = ref([]);
const rocketClosedHistory = ref([]);
const pcsClosedHistory = ref([]);
const wheelClosedHistory = ref([]);
const currentModal = ref(null);
const modalData = ref(null);

const {
    kasperEntriesByAccount,
    rocketBuyingPower,
    activeTradesByStrategy,
    rocketStatsByStrategy
} = useDashboardLogic(kasperAccounts, allKasperEntries, rocketAccount, allActiveTrades, livePrices, { getOccSymbol, getSpreadPrice });

// Kasper Modal Computed
const kasperRealTimeCapital = computed(() => {
    const cap = parseFloat(kasperActiveAccount.value?.initial_capital ?? kasperActiveAccount.value?.capital) || 0;
    const res = parseFloat(kasperMetrics.value?.result) || 0;
    const total = cap + res;
    return total > 0 ? total : 1;
});

const kasperBaseRiskAmount = computed(() => {
    const cap = kasperRealTimeCapital.value;
    if (kasperPairsConfig.value && kasperPairsConfig.value.length > 0) {
        return cap * (kasperPairsConfig.value[0].risk_pct / 100);
    }
    return cap * 0.01;
});

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

onMounted(async () => {
    try {
        await Promise.all([initRocket(), initKasper()]);
        if (kasperDb.value) {
            allKasperEntries.value = await kasperDb.value.select("SELECT * FROM kasper_daily_journal ORDER BY date ASC");
        }
        if (rocketDb.value) {
            rocketClosedHistory.value = await fetchHistory('rockets');
            pcsClosedHistory.value = await fetchHistory('pcs');
            wheelClosedHistory.value = await fetchHistory('wheel');
        }
    } catch (e) { }
});

const openModal = async (type, data = null) => {
    currentModal.value = type;
    modalData.value = data;

    if (type === 'rocket-history-strat' && data) {
         const results = await fetchHistory(data);
         if (data === 'rockets') rocketClosedHistory.value = results;
         else if (data === 'pcs') pcsClosedHistory.value = results;
         else if (data === 'wheel') wheelClosedHistory.value = results;
    }
};
const closeModal = () => currentModal.value = null;

const onOpenStrategy = (strat) => {
    strategyType.value = strat;
    emit('navigate', 'rocket-academy');
};

const onOpenKasperAccount = (accountId) => {
    currentAccountId.value = accountId;
    emit('navigate', 'kasper-academy');
};
const modalTitle = computed(() => {
    if (currentModal.value === 'kasper-mm') return 'Règles MM - Kasper';
    if (currentModal.value === 'rocket-history') return 'Historique Global - Rocket';
    modalData.value ? `Info (${currentModal.value} - ${modalData.value})` : `Info (${currentModal.value})`;
});
</script>

<style scoped src="../components/dashboard/dashboard-layout.css"></style>

<style scoped>
</style>

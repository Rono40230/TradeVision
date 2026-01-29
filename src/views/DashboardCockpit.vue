<template>
  <div class="dashboard-cockpit">
    <div class="cockpit-content">
        <!-- ZONE KASPER (Gauche) -->
        <section class="zone-kasper">
            <header class="zone-header">
                <div class="title-group">
                    <h2>KASPER ACADEMY</h2>
                </div>
            </header>
            
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
                    @open-mm="openModal('kasper-mm')"
                />
            </div>
        </section>

        <!-- ZONE ROCKET (Droite) -->
        <section class="zone-rocket">
            <header class="zone-header">
                <div class="title-group">
                    <h2>ROCKET ACADEMY</h2>
                </div>
            </header>

            <!-- ALERT SYSTEM -->
            <RocketAlertsCard :alerts="rocketAlerts" />

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
                    @open-history="openModal('rocket-history-strat', strat)"
                    @open-mm="openModal('rocket-mm', strat)"
                />
            </div>
        </section>
    </div>

    <!-- Placeholder Modals (To be implemented) -->
    <div v-if="currentModal" class="modal-backdrop" @click.self="closeModal">
        <!-- MODAL KASPER MM -->
        <div v-if="currentModal === 'kasper-mm'" class="modal-large">
            <header class="modal-header">
                <h3>Money Management ({{ kasperActiveAccount?.name }})</h3>
                <button class="close-btn" @click="closeModal">×</button>
            </header>
            <div class="modal-body">
                <KasperMmTable 
                    :pairsConfig="kasperPairsConfig" 
                    :account="kasperActiveAccount"
                    :currentCapital="kasperRealTimeCapital"
                    @updatePair="updatePair"
                    @deletePair="deletePair"
                    @addPair="addPair"
                >
                     <template #projections>
                         <KasperProjections :baseRiskAmount="kasperBaseRiskAmount" />
                     </template>
                </KasperMmTable>
            </div>
        </div>

        <!-- DEFAULT / OTHER MODALS -->
        <div v-else class="modal-simple" @click.stop>
            <h3>{{ modalTitle }}</h3>
            <p>Contenu en cours de développement...</p>
            <button @click="closeModal">Fermer</button>
        </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue';
import DashboardHeaderGlobal from '../components/dashboard/DashboardHeaderGlobal.vue';
import KasperSummaryCard from '../components/dashboard/kasper/KasperSummaryCard.vue';
import KasperAccountCard from '../components/dashboard/kasper/KasperAccountCard.vue';
import RocketAlertsCard from '../components/dashboard/rocket/RocketAlertsCard.vue';
import RocketStrategyCard from '../components/dashboard/rocket/RocketStrategyCard.vue';
import KasperMmTable from '../components/kasper/KasperMmTable.vue';
import KasperProjections from '../components/kasper/KasperProjections.vue';

import { useRocketState } from '../composables/useRocketState.js';
import { useKasperState } from '../composables/useKasperState.js';
import { useDashboardLogic } from '../composables/useDashboardLogic.js';
import { useLivePrices } from '../composables/useLivePrices.js';

const { init: initRocket, account: rocketAccount, allActiveTrades, db: rocketDb } = useRocketState();
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
const currentModal = ref(null);
const modalData = ref(null);

const {
    kasperEntriesByAccount,
    rocketBuyingPower,
    activeTradesByStrategy,
    rocketStatsByStrategy,
    rocketAlerts
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
            // Fetch closed trades for Rockets strategy for the chart
            // We need trades with strategy='rockets' and status='closed'
            const q = `SELECT t.pl_realized, t.exit_date, t.profit_loss 
                       FROM trades t 
                       WHERE t.strategy = 'rockets' AND t.status = 'closed' 
                       ORDER BY t.exit_date ASC`;
            rocketClosedHistory.value = await rocketDb.value.select(q);
        }
    } catch (e) { }
});

const openModal = (type, data = null) => {
    currentModal.value = type;
    modalData.value = data;
};
const closeModal = () => currentModal.value = null;
const modalTitle = computed(() => {
    if (currentModal.value === 'kasper-mm') return 'Règles MM - Kasper';
    if (currentModal.value === 'rocket-history') return 'Historique Global - Rocket';
    modalData.value ? `Info (${currentModal.value} - ${modalData.value})` : `Info (${currentModal.value})`;
});
</script>

<style scoped src="../components/dashboard/dashboard-layout.css"></style>

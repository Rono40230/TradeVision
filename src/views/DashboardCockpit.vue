<template>
  <div class="dashboard-cockpit">
    <div class="cockpit-content">
        <!-- ZONE KASPER (Gauche) -->
        <section class="zone-kasper">
            <header class="zone-header">
                <div class="title-group">
                    <button class="nav-title-btn kasper" @click="$emit('navigate', 'kasper-academy')">
                         <h3>KASPER ACADEMY</h3>
                         <span class="btn-icon">➜</span>
                    </button>
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
                    <button class="nav-title-btn rocket" @click="$emit('navigate', 'rocket-academy')">
                         <h3>ROCKET ACADEMY</h3>
                         <span class="btn-icon">➜</span>
                    </button>
                </div>
                <div class="title-group" style="margin-top: 0.5rem;">
                    <button class="nav-title-btn historique" @click="$emit('navigate', 'historique')">
                         <h3>📊 IB HISTORY</h3>
                         <span class="btn-icon">➜</span>
                    </button>
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
import RocketAlertsCard from '../components/dashboard/rocket/RocketAlertsCard.vue';
import RocketStrategyCard from '../components/dashboard/rocket/RocketStrategyCard.vue';
import DashboardModals from '../components/dashboard/DashboardModals.vue';

import { useRocketState } from '../composables/useRocketState.js';
import { useKasperState } from '../composables/useKasperState.js';
import { useDashboardLogic } from '../composables/useDashboardLogic.js';
import { useLivePrices } from '../composables/useLivePrices.js';

const emit = defineEmits(['navigate']);

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
const modalTitle = computed(() => {
    if (currentModal.value === 'kasper-mm') return 'Règles MM - Kasper';
    if (currentModal.value === 'rocket-history') return 'Historique Global - Rocket';
    modalData.value ? `Info (${currentModal.value} - ${modalData.value})` : `Info (${currentModal.value})`;
});
</script>

<style scoped src="../components/dashboard/dashboard-layout.css"></style>

<style scoped>
.title-group {
    width: 100%;
}

.nav-title-btn {
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 0.8rem 1.2rem;
    cursor: pointer;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.2s ease;
    width: 100%;
    margin: 0;
}

.nav-title-btn.kasper {
    background-color: rgba(173, 216, 230, 0.1); /* Pastel Blue - 10% opacity */
    color: #ADD8E6;            /* Light Blue Text for contrast */
    border-color: rgba(173, 216, 230, 0.3);
}

.nav-title-btn.rocket {
    background-color: rgba(152, 251, 152, 0.1); /* Pastel Green - 10% opacity */
    color: #98FB98;            /* Light Green Text for contrast */
    border-color: rgba(152, 251, 152, 0.3);
}

.nav-title-btn.historique {
    background-color: rgba(255, 165, 0, 0.1); /* Pastel Orange - 10% opacity */
    color: #FFB366;            /* Light Orange Text for contrast */
    border-color: rgba(255, 165, 0, 0.3);
}

.nav-title-btn h3 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 800;
    letter-spacing: 0.5px;
}

.nav-title-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    /* Brighten slightly on hover */
    filter: brightness(1.05); 
}

.nav-title-btn.kasper:hover {
    /* Styles handled by brightness filter above, preserving colors */
}

.nav-title-btn.rocket:hover {
   /* Styles handled by brightness filter above, preserving colors */
}

.btn-icon {
    font-size: 1.2rem;
    opacity: 0.8;
    transition: transform 0.2s;
    font-weight: bold;
}

.nav-title-btn:hover .btn-icon {
    transform: translateX(5px);
    opacity: 1;
}
</style>

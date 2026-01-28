<template>
  <div class="rocket-academy">
    <!-- 1. Money Management Block (Fixed Top) -->
    <RocketHeader 
        :account="{ ...account, cash_used: strategyCashUsed }"
        :displayed-capital="displayedCapital"
        :strategy-label="strategyLabel"
        :mm-status-text="mmStatusText"
        :mm-status-color="mmStatusColor"
        :calendar-events="calendarEvents"
        :total-expected-premium="totalExpectedPremium"
        :total-assigned="totalAssigned"
        :pl-latent="totalLatentPL"
        @open-settings="showSettings = true"
    />

    <!-- All Modals Wrapper -->
    <RocketAllModals
        ref="rocketAllModals"
        v-model:showCCModal="showCCModal"
        :ccTrade="ccTrade"
        @refresh="handleCCRefresh"
        @activate="({tradeId, price, date}) => activateTrade(tradeId, price, date)"
        @neutralize="({tradeId, price, date, quantity}) => neutralizeTrade(tradeId, price, date, quantity)"
        @close="({tradeId, price, date}) => closeTrade(tradeId, price, date)"
    />

    <div class="main-layout">
        <!-- 2. Trade Entry Block (Left Column) -->
        <TradeEntryForm 
            v-model="strategyType" 
            :account="account" 
            :displayed-capital="displayedCapital" 
            @trade-submitted="onTradeSubmitted" 
        />

        <!-- Right Column -->
        <div class="right-column">
            <ActiveTradesList
                :strategy-type="strategyType"
                :wheel-options="wheelOptions"
                :pcs-trades="activeTradesPcs"
                :rockets-trades="rocketsTrades"
                :assigned-trades="currentAssignedTrades"
                :account="account"
                @update-status="(p) => updateStatus(p.trade, p.newStatus)"
                @assign="assignTrade"
                @delete="deleteTrade"
                @update-date="(t, d) => updateTradeDate(t, d)"
                @update-quantity="(t, q) => updateTradeQuantity(t, q)"
                @update-trailing-stop="(t, v) => updateTrailingStop(t, v)"
                @refresh-data="onTradeSubmitted"
                @activate-rocket="openActivationModal"
                @neutralize-rocket="openNeutralizationModal"
                @close-rocket="openClosureModal"
                @open-cc-modal="openCCModal"
                @roll-pcs="(t) => { tradeToRoll = t; showCcsModal = true; }"
            />
        </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import RocketHeader from './rocket/RocketHeader.vue';
import TradeEntryForm from './rocket/TradeEntryForm.vue';
import ActiveTradesList from './rocket/ActiveTradesList.vue';
import RocketAllModals from './rocket/RocketAllModals.vue';
import { useRocketState } from '../composables/useRocketState.js';

const {
    account, strategyType,
    showSettings,
    init, onTradeSubmitted,
    displayedCapital, strategyLabel, mmStatusText, mmStatusColor, calendarEvents,
    wheelOptions, activeTradesPcs, rocketsTrades, currentAssignedTrades,
    updateStatus, assignTrade, deleteTrade,
    showCcsModal, tradeToRoll,
    totalExpectedPremium, updateTradeDate, updateTradeQuantity, updateTrailingStop,
    strategyCashUsed, totalAssigned,
    activateTrade, neutralizeTrade, closeTrade,
    totalLatentPL
} = useRocketState();

const rocketAllModals = ref(null);
const showCCModal = ref(false);
const ccTrade = ref(null);

function openActivationModal(trade) {
    if (rocketAllModals.value) rocketAllModals.value.openActivation(trade);
}

function openNeutralizationModal(trade) {
    if (rocketAllModals.value) rocketAllModals.value.openNeutralization(trade);
}

function openClosureModal(trade) {
    if (rocketAllModals.value) rocketAllModals.value.openClosure(trade);
}

function openCCModal(trade) {
    ccTrade.value = trade;
    showCCModal.value = true;
}

function handleCCRefresh() {
    showCCModal.value = false;
    onTradeSubmitted(); // Refresh data
}

onMounted(async () => {
    await init();
});
</script>

<style scoped>
.rocket-academy {
    display: flex;
    flex-direction: column;
    flex: 1; 
    min-height: 0; 
    overflow: hidden;
    color: var(--text-color);
}

.main-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
    gap: 1rem;
    padding: 0 1rem 1rem 1rem;
}

.right-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
}
</style>

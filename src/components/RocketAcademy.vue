<template>
  <div class="rocket-academy">
    <header>
      <h1>TradeVision pour la Rocket Academy</h1>
      <div id="header-actions">
        <span class="mm-status-badge" :class="mmStatusColor" v-if="mmStatusText">{{ mmStatusText }}</span>
        <button class="settings-btn" @click="showSettings = true">⚙️ Paramétrer le MM</button>
      </div>
    </header>

    <!-- 1. Money Management Block (Fixed Top) - Extracted Component -->
    <RocketHeader 
        :account="account"
        :pl-latent="plLatent"
        :displayed-capital="displayedCapital"
        :strategy-label="strategyLabel"
        :mm-status-text="mmStatusText"
        :mm-status-color="mmStatusColor"
        :calendar-events="calendarEvents"
        :total-expected-premium="totalExpectedPremium"
        @open-settings="showSettings = true"
    />

    <RocketModals
        v-model:showSettings="showSettings"
        :mmConfig="mmConfig"
        v-model:showAssignModal="showAssignModal"
        :tradeToAssign="tradeToAssign"
        v-model:showStatusModal="showStatusModal"
        :pendingStatusUpdate="pendingStatusUpdate"
        v-model:showDeleteModal="showDeleteModal"
        :tradeToDelete="tradeToDelete"
        @update-capital="updateTotalCapital"
        @save-mm-settings="saveMMSettings"
        @confirm-assignment="confirmAssignment"
        @confirm-status-update="confirmStatusUpdate"
        @confirm-delete="confirmDeleteTrade"
    />

    <div class="main-layout">
        <!-- 2. Trade Entry Block (Left Column) -->
        <!-- 2. Trade Entry Block (Left Column) - Extracted Component -->
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
                :rockets-trades="activeTradesRockets"
                :assigned-trades="currentAssignedTrades"
                :account="account"
                @update-status="(p) => updateStatus(p.trade, p.newStatus)"
                @assign="assignTrade"
                @delete="deleteTrade"
                @update-date="(t, d) => updateTradeDate(t, d)"
                @refresh-data="onTradeSubmitted"
            />
        </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import RocketHeader from './rocket/RocketHeader.vue';
import TradeEntryForm from './rocket/TradeEntryForm.vue';
import ActiveTradesList from './rocket/ActiveTradesList.vue';
import RocketModals from './rocket/RocketModals.vue';
import { useRocketState } from '../composables/useRocketState.js';

const {
    account, plLatent, strategyType, mmConfig,
    showSettings, showAssignModal, tradeToAssign, showStatusModal, pendingStatusUpdate,
    init, saveMMSettings, updateTotalCapital, confirmAssignment, confirmStatusUpdate, onTradeSubmitted,
    displayedCapital, strategyLabel, mmStatusText, mmStatusColor, calendarEvents,
    wheelOptions, activeTradesPcs, activeTradesRockets, currentAssignedTrades,
    updateStatus, assignTrade, deleteTrade,
    showDeleteModal, tradeToDelete, confirmDeleteTrade,
    totalExpectedPremium, updateTradeDate
} = useRocketState();

onMounted(async () => {
    await init();
});
</script>

<style scoped>
.rocket-academy {
    display: flex;
    flex-direction: column;
    flex: 1; /* Take remaining space in parent (instead of full height + header) */
    min-height: 0; /* Allow shrinking below content size */
    overflow: hidden;
    color: var(--text-color);
}

header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

#header-actions {
    display: flex;
    gap: 1rem;
}

h1 {
  font-size: 1.8rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-color);
  text-align: left;
}

/* Main Layout */
.main-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
    gap: 1rem;
    padding: 0 1rem 1rem 1rem;
}

/* Right Column */
.right-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden; /* Container does not scroll, children do */
    height: 100%;
}

.settings-btn {
    background: var(--accent-color);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: background 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.settings-btn:hover {
    background: var(--accent-hover);
}

.mm-status-badge {
    padding: 0.4rem 1.2rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 700;
    margin-right: 1.5rem;
    color: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.mm-status-badge.green { background-color: #4caf50; }
.mm-status-badge.blue { background-color: #2196F3; }
.mm-status-badge.red { background-color: #f44336; }
</style>

<template>
  <div class="rocket-academy">
    <!-- 1. Money Management Block (Fixed Top) - Extracted Component -->
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

    <RocketActionModals 
        ref="rocketActionModals" 
        @activate="({tradeId, price, date}) => activateTrade(tradeId, price, date)"
        @neutralize="({tradeId, price, date, quantity}) => neutralizeTrade(tradeId, price, date, quantity)"
        @close="({tradeId, price, date}) => closeTrade(tradeId, price, date)"
    />

    <CoveredCallModal 
        :visible="showCCModal"
        :account="account"
        :trade="ccTrade"
        @close="showCCModal = false"
        @refresh="handleCCRefresh"
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
            />
        </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import RocketHeader from './rocket/RocketHeader.vue';
import TradeEntryForm from './rocket/TradeEntryForm.vue';
import ActiveTradesList from './rocket/ActiveTradesList.vue';
import RocketModals from './rocket/RocketModals.vue';
import RocketActionModals from './rocket/RocketActionModals.vue';
import CoveredCallModal from './rocket/CoveredCallModal.vue';
import { useRocketState } from '../composables/useRocketState.js';
import { useLivePrices } from '../composables/useLivePrices.js';

const {
    account, strategyType, mmConfig,
    showSettings, showAssignModal, tradeToAssign, showStatusModal, pendingStatusUpdate,
    init, saveMMSettings, updateTotalCapital, confirmAssignment, confirmStatusUpdate, onTradeSubmitted,
    displayedCapital, strategyLabel, mmStatusText, mmStatusColor, calendarEvents,
    wheelOptions, activeTradesPcs, rocketsTrades, currentAssignedTrades,
    updateStatus, assignTrade, deleteTrade,
    showDeleteModal, tradeToDelete, confirmDeleteTrade,
    totalExpectedPremium, updateTradeDate, updateTradeQuantity, updateTrailingStop,
    strategyCashUsed, strategyPL, totalAssigned,
    activateTrade, neutralizeTrade, closeTrade
} = useRocketState();

const priceUtils = useLivePrices();

const totalLatentPL = computed(() => {
    let total = 0;

    if (strategyType.value === 'pcs') {
        // Calculation must match getSpreadPL logic in useLivePrices
        activeTradesPcs.value.forEach(trade => {
            const currentCost = priceUtils.getSpreadPrice(trade, true); // true -> raw value
            if (currentCost !== null && trade.price !== undefined) {
                 const pl = (trade.price - currentCost) * 100 * trade.quantity;
                 total += pl;
            }
        });
    } else if (strategyType.value === 'wheel') {
        // 1. Options (Short Puts/Calls) - EXCLUDING ASSIGNMENTS as requested
        wheelOptions.value.forEach(trade => {
             // P/L = (Entry - Current) * 100 * Qty
             // Need to get Option Price
             const sym = priceUtils.getOccSymbol(trade);
             if (sym && priceUtils.livePrices[sym]) {
                 const currentPrice = priceUtils.livePrices[sym].price;
                 const pl = (trade.price - currentPrice) * 100 * trade.quantity;
                 total += pl;
             }
        });
    } else if (strategyType.value === 'rockets') {
        // 1. RISK Trades
        const riskTrades = rocketsTrades.value.risk || [];
        riskTrades.forEach(trade => {
             const currentPrice = priceUtils.livePrices[trade.symbol]?.price;
             const entry = trade.entry_executed || trade.price || 0;
             if (currentPrice) {
                 const diff = (currentPrice - entry) * trade.quantity;
                 total += diff;
             }
        });
        
        // 2. NEUTRALIZED Trades
        const neutralized = rocketsTrades.value.neutralized || [];
        neutralized.forEach(trade => {
             const currentPrice = priceUtils.livePrices[trade.symbol]?.price;
             const entry = trade.entry_executed || trade.price || 0;
             if (currentPrice) {
                 const diff = (currentPrice - entry) * trade.quantity;
                 total += diff;
            }
        });
    }

    return total;
});

const rocketActionModals = ref(null);
const showCCModal = ref(false);
const ccTrade = ref(null);

function openActivationModal(trade) {
    if (rocketActionModals.value) rocketActionModals.value.openActivation(trade);
}

function openNeutralizationModal(trade) {
    if (rocketActionModals.value) rocketActionModals.value.openNeutralization(trade);
}

function openClosureModal(trade) {
    if (rocketActionModals.value) rocketActionModals.value.openClosure(trade);
}

function openCCModal(trade) {
    ccTrade.value = trade;
    showCCModal.value = true;
}

function handleCCRefresh() {
    showCCModal.value = false;
    onTradeSubmitted();
}

// REMOVED LOCAL STATE AND HANDLERS (Moved to RocketActionModals)

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
    /* Styles handled in RocketHeader provided globally or scoped within header */
}

</style>

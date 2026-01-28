<template>
    <div class="all-modals-wrapper">
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
            @activate="emitActivate"
            @neutralize="emitNeutralize"
            @close="emitClose"
        />

        <CoveredCallModal 
            :visible="showCCModal"
            :account="account"
            :trade="ccTrade"
            @close="$emit('update:showCCModal', false)"
            @refresh="$emit('refresh')"
        />

        <CcsRollModal
            :visible="showCcsModal"
            :trade="tradeToRoll"
            @close="showCcsModal = false"
            @refresh="$emit('refresh')"
        />
    </div>
</template>

<script setup>
import { ref } from 'vue';
import RocketModals from './RocketModals.vue';
import RocketActionModals from './RocketActionModals.vue';
import CoveredCallModal from './CoveredCallModal.vue';
import CcsRollModal from './CcsRollModal.vue';
import { useRocketState } from '../../composables/useRocketState.js';

// We can simply access state directly since it is global singletons
const {
    account, mmConfig,
    showSettings, showAssignModal, tradeToAssign, showStatusModal, pendingStatusUpdate,
    showDeleteModal, tradeToDelete, showCcsModal, tradeToRoll,
    saveMMSettings, updateTotalCapital, confirmAssignment, confirmStatusUpdate, confirmDeleteTrade
} = useRocketState();

const props = defineProps({
    showCCModal: Boolean,
    ccTrade: Object
});

const emit = defineEmits(['update:showCCModal', 'refresh', 'activate', 'neutralize', 'close']);

const rocketActionModals = ref(null);

function openActivation(trade) {
    if (rocketActionModals.value) rocketActionModals.value.openActivation(trade);
}
function openNeutralization(trade) {
    if (rocketActionModals.value) rocketActionModals.value.openNeutralization(trade);
}
function openClosure(trade) {
    if (rocketActionModals.value) rocketActionModals.value.openClosure(trade);
}

// Re-emit events from RocketActionModals up to parent if needed, 
// OR handle them directly via store actions if we import them?
// The parent RocketAcademy was calling activateTrade(id, price, date).
// Let's forward them for now to match current architecture.
const emitActivate = (p) => emit('activate', p);
const emitNeutralize = (p) => emit('neutralize', p);
const emitClose = (p) => emit('close', p);

// Expose methods for parent to call via template ref
defineExpose({
    openActivation,
    openNeutralization,
    openClosure
});
</script>

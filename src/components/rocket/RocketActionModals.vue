<template>
    <div class="rocket-action-modals">
        <RocketActivationModal 
            :visible="showActivationModal"
            :trade="activationTrade"
            @close="showActivationModal = false"
            @confirm="handleActivationConfirm"
        />

        <RocketNeutralizationModal
            :visible="showNeutralizationModal"
            :trade="neutralizationTrade"
            @close="showNeutralizationModal = false"
            @confirm="handleNeutralizationConfirm"
        />

        <RocketClosureModal
            :visible="showClosureModal"
            :trade="closureTrade"
            @close="showClosureModal = false"
            @confirm="handleClosureConfirm"
        />
    </div>
</template>

<script setup>
import { ref } from 'vue';
import RocketActivationModal from './RocketActivationModal.vue';
import RocketNeutralizationModal from './RocketNeutralizationModal.vue';
import RocketClosureModal from './RocketClosureModal.vue';

const emit = defineEmits(['activate', 'neutralize', 'close']);

const showActivationModal = ref(false);
const activationTrade = ref(null);

const showNeutralizationModal = ref(false);
const neutralizationTrade = ref(null);

const showClosureModal = ref(false);
const closureTrade = ref(null);

function openActivation(trade) {
    activationTrade.value = trade;
    showActivationModal.value = true;
}

function openNeutralization(trade) {
    neutralizationTrade.value = trade;
    showNeutralizationModal.value = true;
}

function openClosure(trade) {
    closureTrade.value = trade;
    showClosureModal.value = true;
}

function handleActivationConfirm({ date, price }) {
    if (activationTrade.value) {
        emit('activate', { 
            tradeId: activationTrade.value.trade_id, 
            price, 
            date 
        });
        showActivationModal.value = false;
        activationTrade.value = null;
    }
}

function handleNeutralizationConfirm({ date, price, quantity }) {
    if (neutralizationTrade.value) {
        emit('neutralize', {
            tradeId: neutralizationTrade.value.trade_id,
            price,
            date,
            quantity
        });
        showNeutralizationModal.value = false;
        neutralizationTrade.value = null;
    }
}

function handleClosureConfirm({ date, price }) {
    if (closureTrade.value) {
        emit('close', {
            tradeId: closureTrade.value.trade_id,
            price,
            date
        });
        showClosureModal.value = false;
        closureTrade.value = null;
    }
}

defineExpose({
    openActivation,
    openNeutralization,
    openClosure
});
</script>

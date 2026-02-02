<template>
    <!-- ROCKET MM MODAL (Has its own backdrop) -->
    <RocketMmModal 
        v-if="currentModal === 'rocket-mm'" 
        :strategy="modalData" 
        @close="$emit('close')" 
    />

    <!-- ROCKET HISTORY MODAL -->
    <RocketHistoryModal
        v-if="currentModal === 'rocket-history-strat'"
        :strategy="modalData"
        :history="
            modalData === 'rockets' ? rocketClosedHistory : 
            modalData === 'pcs' ? pcsClosedHistory : 
            modalData === 'wheel' ? wheelClosedHistory : []
        "
        @close="$emit('close')"
    />

    <!-- OTHER MODALS (Shared Backdrop) -->
    <div v-if="currentModal && currentModal !== 'rocket-mm' && currentModal !== 'rocket-history-strat'" class="modal-backdrop" @click.self="$emit('close')">
        <!-- MODAL KASPER MM -->
        <div v-if="currentModal === 'kasper-mm'" class="modal-large">
            <header class="modal-header">
                <h3>Money Management ({{ kasperActiveAccount?.name }})</h3>
                <button class="close-btn" @click="$emit('close')">×</button>
            </header>
            <div class="modal-body">
                <KasperMmTable 
                    :pairsConfig="kasperPairsConfig" 
                    :account="kasperActiveAccount"
                    :currentCapital="kasperRealTimeCapital"
                    @updatePair="$emit('updatePair', $event)"
                    @deletePair="$emit('deletePair', $event)"
                    @addPair="$emit('addPair', $event)"
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
            <button @click="$emit('close')">Fermer</button>
        </div>
    </div>
</template>

<script setup>
import RocketMmModal from './rocket/RocketMmModal.vue';
import RocketHistoryModal from './rocket/RocketHistoryModal.vue';
import KasperMmTable from '../kasper/KasperMmTable.vue';
import KasperProjections from '../kasper/KasperProjections.vue';

defineProps({
    currentModal: String,
    modalData: [String, null],
    rocketClosedHistory: Array,
    pcsClosedHistory: Array,
    wheelClosedHistory: Array,
    kasperActiveAccount: Object,
    kasperPairsConfig: Array,
    kasperRealTimeCapital: Number,
    kasperBaseRiskAmount: Number,
    modalTitle: String
});

defineEmits(['close', 'updatePair', 'deletePair', 'addPair']);
</script>

<style scoped>
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
}

.modal-large {
    background: #2a2a2a;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    width: 90%;
    max-width: 1200px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
}

.close-btn {
    background: none;
    border: none;
    color: #a0a0a0;
    font-size: 2rem;
    cursor: pointer;
    padding: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
}

.close-btn:hover {
    background: rgba(255,255,255,0.1);
    color: #e0e0e0;
}

.modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
}

.modal-simple {
    background: #2a2a2a;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    max-width: 500px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.modal-simple h3 {
    margin-top: 0;
}

.modal-simple button {
    background: #396cd8;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
    margin-top: 1rem;
}

.modal-simple button:hover {
    background: #4a7ce8;
}
</style>

<template>
  <div class="rocket-modals">
    <!-- MM Settings Modal -->
    <div v-if="showSettings" class="modal-overlay">
        <div class="modal-content">
            <h3>Configuration Money Management</h3>
            
            <div class="input-group">
                <label>Capital Initial ($)</label>
                <input type="number" :value="mmConfig.capital" class="input-field" readonly style="background: #222; opacity: 0.7;" />
                <span class="note-text" style="display:block; text-align:right;">(Calculé : Wheel + PCS + Rocket)</span>
            </div>

            <div class="flex-row">
                <div class="input-group half">
                    <label>Capital Wheel ($)</label>
                    <input type="number" v-model.number="mmConfig.alloc_wheel" class="input-field" @input="onCapitalInput" />
                </div>
                <div class="input-group half">
                    <label>Marge (en %)</label>
                    <div class="pct-wrapper">
                        <input type="number" v-model.number="mmConfig.margin_wheel_pct" class="input-field" />
                        <span class="pct-symbol">%</span>
                    </div>
                </div>
            </div>

            <div class="input-group">
                <label>Capital PCS ($)</label>
                <input type="number" v-model.number="mmConfig.alloc_growth" class="input-field" @input="onCapitalInput" />
            </div>

            <div class="input-group">
                <label>Capital Rocket ($)</label>
                <input type="number" v-model.number="mmConfig.alloc_rocket" class="input-field" @input="onCapitalInput" />
            </div>

            <div class="modal-actions">
                <button class="cancel-btn" @click="$emit('update:showSettings', false)">Annuler</button>
                <button class="submit-btn" @click="$emit('save-mm-settings')">Sauvegarder</button>
            </div>
        </div>
    </div>

    <!-- Assignment Confirmation Modal -->
    <div v-if="showAssignModal && tradeToAssign" class="modal-overlay">
        <div class="modal-content">
            <h3>Confirmation d'Assignation</h3>
            <p style="text-align: center; margin-bottom: 2rem;">
                Confirmez-vous l'assignation pour <strong>{{ tradeToAssign.symbol }}</strong> ?<br>
                <span class="note-text" v-if="tradeToAssign.type === 'put'">Cela entrainera l'achat de l'action au strike {{ tradeToAssign.strike }}.</span>
            </p>
            <div class="modal-actions">
                <button class="cancel-btn" @click="$emit('update:showAssignModal', false)">Annuler</button>
                <button class="submit-btn" @click="$emit('confirm-assignment')">Confirmer</button>
            </div>
        </div>
    </div>

    <!-- Status Change Confirmation Modal -->
    <div v-if="showStatusModal && pendingStatusUpdate" class="modal-overlay">
        <div class="modal-content">
            <h3>Changement de Statut</h3>
            <p style="text-align: center; margin-bottom: 2rem;">
                Confirmez-vous le passage du statut à <strong>{{ formatStatusLabel(pendingStatusUpdate.newStatus) }}</strong> pour <strong>{{ pendingStatusUpdate.trade.symbol }}</strong> ?
            </p>

            <div v-if="pendingStatusUpdate.newStatus === 'closed'" class="input-group">
                <label>Prix de Clôture</label>
                <input type="number" step="0.01" v-model.number="closePrice" class="input-field" placeholder="ex: 0.05 ou 150.00" />
            </div>

            <div class="modal-actions">
                <button class="cancel-btn" @click="closeStatusModal">Annuler</button>
                <button class="submit-btn" @click="confirmStatus">Confirmer</button>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal && tradeToDelete" class="modal-overlay">
        <div class="modal-content danger-zone">
            <h3 class="text-danger">Supprimer le Trade</h3>
            <p style="text-align: center; margin-bottom: 2rem;">
                Voulez-vous vraiment supprimer définitivement le trade sur <strong>{{ tradeToDelete.symbol }}</strong> ?<br>
                <small class="text-muted">Cette action est irréversible et supprimera l'historique associé.</small>
            </p>
            <div class="modal-actions">
                <button class="cancel-btn" @click="$emit('update:showDeleteModal', false)">Annuler</button>
                <button class="delete-btn-confirm" @click="$emit('confirm-delete')">Supprimer Définitivement</button>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    showSettings: Boolean,
    mmConfig: { type: Object, required: true },
    showAssignModal: Boolean,
    tradeToAssign: Object,
    showStatusModal: Boolean,
    pendingStatusUpdate: Object,
    showDeleteModal: Boolean,
    tradeToDelete: Object
});

const emit = defineEmits([
    'update:showSettings',
    'update:showAssignModal',
    'update:showStatusModal',
    'update:showDeleteModal',
    'save-mm-settings',
    'confirm-assignment',
    'confirm-status-update',
    'confirm-delete',
    'update-capital'
]);

const closePrice = ref(null);

watch(() => props.showStatusModal, (val) => {
    if (val) closePrice.value = null;
});

function closeStatusModal() {
    emit('update:showStatusModal', false);
}

function confirmStatus() {
    emit('confirm-status-update', closePrice.value);
}

function onCapitalInput() {
    emit('update-capital');
}

function formatStatusLabel(status) {
    if (status === 'closed') return 'Clôturé';
    if (status === 'open') return 'Ouvert';
    return status;
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: var(--surface-color);
    padding: 2rem;
    border-radius: 8px;
    width: 400px;
    max-width: 90%;
    border: 1px solid var(--border-color);
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}

.modal-content.danger-zone {
    border-color: #ef4444;
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.2);
}

.text-danger {
    color: #ef4444;
}

.delete-btn-confirm {
    background: #dc2626;
    color: white;
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
}
.delete-btn-confirm:hover {
    background: #b91c1c;
}

.modal-content h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    text-align: center;
}

.input-group {
    margin-bottom: 1.2rem;
}

.input-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-muted);
}

.input-field {
    width: 100%;
    padding: 0.8rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-color);
    font-size: 1rem;
}
.input-field:focus {
    outline: none;
    border-color: var(--accent-color);
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
}

.cancel-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    padding: 0.6rem 1.2rem;
    border-radius: 4px;
    cursor: pointer;
}
.cancel-btn:hover {
    background: rgba(255,255,255,0.05);
    color: var(--text-color);
}

.submit-btn {
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
}
.submit-btn:hover {
    filter: brightness(1.1);
}

.flex-row {
    display: flex;
    gap: 1rem;
}
.half {
    flex: 1;
}

.pct-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}
.pct-symbol {
    position: absolute;
    right: 15px;
    color: var(--text-muted);
    font-size: 0.9rem;
    pointer-events: none;
}
.note-text {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-style: italic;
    margin-top: 0.5rem;
}
</style>
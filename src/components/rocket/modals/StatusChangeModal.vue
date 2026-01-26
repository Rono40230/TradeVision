<template>
    <div v-if="show" class="modal-overlay">
        <div class="modal-content">
            <h3>Confirmer Changement Statut</h3>
            <div v-if="pendingUpdate">
                <p>
                    Passer le trade 
                    <strong>{{ pendingUpdate.trade.symbol }}</strong> 
                    en 
                    <span :class="'badge ' + (pendingUpdate.newStatus || '').toLowerCase()">
                        {{ formatStatusLabel(pendingUpdate.newStatus) }}
                    </span> ?
                </p>

                <div v-if="pendingUpdate.newStatus === 'closed'" class="input-group" style="margin-top: 1.5rem;">
                    <label>Prix de clôture ($)</label>
                    <input type="number" step="0.01" v-model.number="localClosePrice" class="input-field" placeholder="ex: 0.05 ou 150.00" />
                    <span class="note-text">
                        Laisser vide pour prix actuel du marché
                    </span>
                </div>

                <div class="modal-actions">
                    <button class="cancel-btn" @click="$emit('update:show', false)">Annuler</button>
                    <button class="submit-btn" @click="handleConfirm">Confirmer</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    show: Boolean,
    pendingUpdate: Object // Expected { trade: Object, newStatus: String }
});

const emit = defineEmits(['update:show', 'confirm']);

const localClosePrice = ref(null);

watch(() => props.show, (val) => {
    if (val) {
        // Reset price when opening
        localClosePrice.value = null;
    }
});

function handleConfirm() {
    emit('confirm', localClosePrice.value);
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
    text-align: center;
}

.modal-content h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
}

.badge {
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
}
.badge.open { background: rgba(0, 255, 0, 0.15); color: #00ff00; }
.badge.closed { background: rgba(128, 128, 128, 0.2); color: #aaa; }
.badge.assigned { background: rgba(255, 165, 0, 0.2); color: orange; }

.input-group {
    margin-bottom: 1.2rem;
    text-align: left;
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

.note-text {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-style: italic;
    margin-top: 0.5rem;
    display: block;
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
</style>

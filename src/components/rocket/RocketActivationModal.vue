<template>
<div v-if="visible" class="modal-overlay">
    <div class="modal-content">
        <h3>Activation du Trade</h3>
        <p>Veuillez confirmer les détails de l'exécution.</p>
        
        <div class="input-group">
            <label>Date d'exécution</label>
            <input type="date" v-model="form.date" class="input-field" />
        </div>

        <div class="input-group">
            <label>Prix d'exécution réel</label>
            <input type="number" v-model.number="form.price" class="input-field" step="any" />
        </div>

        <div class="modal-actions">
            <button class="cancel-btn" @click="$emit('close')">Annuler</button>
            <button class="confirm-btn" @click="confirm">Confirmer</button>
        </div>
    </div>
</div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    visible: Boolean,
    trade: Object
});

const emit = defineEmits(['close', 'confirm']);

const form = ref({
    date: new Date().toISOString().split('T')[0],
    price: 0
});

watch(() => props.trade, (newTrade) => {
    if (newTrade) {
        form.value.price = newTrade.entry_stop || newTrade.entry_limit || 0;
        form.value.date = new Date().toISOString().split('T')[0];
    }
}, { immediate: true });

function confirm() {
    emit('confirm', { ...form.value });
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: var(--surface-color);
    padding: 2rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    width: 350px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    color: var(--text-color);
}

h3 { margin: 0; }

.input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.input-field {
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: white;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
}

.confirm-btn {
    background: #4caf50;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}

.cancel-btn {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border-color);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}
</style>

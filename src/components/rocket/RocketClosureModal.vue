<template>
    <div v-if="visible" class="modal-overlay">
        <div class="modal-content">
            <h3>Clôturer le Trade</h3>
            <p v-if="trade">
                {{ trade.symbol }} - {{ trade.quantity - (trade.exit_partial_quantity || 0) }} actions restantes.
            </p>

            <div class="form-group">
                <label>Date de clôture</label>
                <input type="date" v-model="form.date" class="input-field" />
            </div>

            <div class="form-group">
                <label>Prix de clôture</label>
                <input type="number" v-model.number="form.price" step="any" class="input-field" />
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
    date: '',
    price: 0
});

watch(() => props.trade, (newTrade) => {
    if (newTrade) {
        // Defaults
        form.value.date = new Date().toISOString().split('T')[0];
        // Default price to Current Price or Entry Price or Trailing Stop if available
        form.value.price = newTrade.trailing_stop || newTrade.exit_partial_price || newTrade.entry_executed || 0;
    }
}, { immediate: true });

function confirm() {
    emit('confirm', { ...form.value });
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: #2c2c2c;
    padding: 2rem;
    border-radius: 8px;
    width: 400px;
    border: 1px solid #444;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}

h3 {
    margin-top: 0;
    color: #e0e0e0;
}

.form-group {
    margin-bottom: 1rem;
}

label {
    display: block;
    margin-bottom: 0.5rem;
    color: #aaa;
    font-size: 0.9rem;
}

.input-field {
    width: 100%;
    padding: 0.5rem;
    background: #333;
    border: 1px solid #555;
    color: white;
    border-radius: 4px;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
}

.cancel-btn {
    background: transparent;
    border: 1px solid #666;
    color: #ccc;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}

.confirm-btn {
    background: #f44336; /* Red for close */
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}
.confirm-btn:hover {
    background: #d32f2f;
}
</style>
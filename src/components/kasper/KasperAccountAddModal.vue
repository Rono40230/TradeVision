<template>
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
            <h3>Nouveau Portefeuille</h3>
            
            <div class="form-group">
                <label>Nom du compte/broker</label>
                <input v-model="newAccountName" placeholder="ex: Interactive Brokers" ref="nameInput">
            </div>

            <div class="form-group">
                <label>N° du compte (Optionnel)</label>
                <input v-model="newAccountNumber" placeholder="ex: U12345678">
            </div>
            
            <div class="form-group">
                <label>Capital de départ</label>
                <input v-model.number="newAccountCapital" type="number" placeholder="ex: 5000">
            </div>

            <div class="form-group">
                <label>Devise</label>
                <select v-model="newAccountCurrency">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                </select>
            </div>

            <div class="modal-actions">
                <button class="btn cancel" @click="$emit('close')">Annuler</button>
                <button class="btn confirm" @click="handleConfirm" :disabled="!newAccountName">Créer</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
    show: Boolean
});

const emit = defineEmits(['close', 'confirm']);

const newAccountName = ref('');
const newAccountNumber = ref('');
const newAccountCapital = ref(5000);
const newAccountCurrency = ref('USD');
const nameInput = ref(null);

watch(() => props.show, (val) => {
    if (val) {
        newAccountName.value = '';
        newAccountNumber.value = '';
        newAccountCapital.value = 5000;
        newAccountCurrency.value = 'USD';
        nextTick(() => {
            if(nameInput.value) nameInput.value.focus();
        });
    }
});

function handleConfirm() {
    if(!newAccountName.value) return;
    emit('confirm', {
        name: newAccountName.value,
        capital: newAccountCapital.value,
        currency: newAccountCurrency.value,
        accountNumber: newAccountNumber.value
    });
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
}

.modal-content {
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    padding: 2rem;
    border-radius: 16px;
    width: 400px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}

.modal-content h3 {
    margin: 0;
    font-size: 1.4rem;
    color: var(--text-color);
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-group label {
    font-size: 0.9rem;
    color: var(--text-muted);
}

.form-group input, .form-group select {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    padding: 0.8rem;
    border-radius: 8px;
    color: var(--text-color);
    font-size: 1rem;
}

.form-group select {
    color: #000; /* Force black text for dropdown */
    background-color: #fff; /* Force white background for consistency with OS dropdowns */
}

.form-group input:focus {
    border-color: var(--primary-color);
    outline: none;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
}

.btn {
    padding: 0.8rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    border: none;
}

.btn.cancel {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border-color);
}

.btn.confirm {
    background: #90CAF9; /* Bleu pastel */
    color: #121212;
}

.btn.confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>

<template>
  <div v-if="visible" class="modal-overlay">
    <div class="modal-content">
      <h3>Vendre un Covered Call (Rouler)</h3>
      
      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

      <div class="form-grid">
        <div class="input-group">
            <label>Symbole</label>
            <input type="text" :value="symbol" disabled class="input-field disabled" />
        </div>
        
        <div class="input-group">
            <label>Sub-Stratégie</label>
            <input type="text" value="Covered Call" disabled class="input-field disabled" />
        </div>

        <div class="input-group">
            <label>Date Expiration</label>
            <input type="date" v-model="form.expiry" class="input-field" />
        </div>

        <div class="input-group">
            <label>Strike</label>
            <input type="number" v-model.number="form.strike" placeholder="ex: 150" class="input-field" />
        </div>

        <div class="input-group">
            <label>Quantité (Contrats)</label>
            <input type="number" :value="quantityContracts" disabled class="input-field disabled" />
            <small class="helper-text">Correspond à {{ quantityShares }} actions</small>
        </div>

        <div class="input-group">
            <label>Crédit (Prime)</label>
            <input type="number" step="0.01" v-model.number="form.price" placeholder="ex: 1.50" class="input-field" />
        </div>
      </div>

      <div class="modal-actions">
        <button class="cancel-btn" @click="$emit('close')">Annuler</button>
        <button class="confirm-btn" @click="submitOrder">Valider l'Ordre</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { initDB } from '../../utils/db.js';

const props = defineProps({
  visible: Boolean,
  account: Object,
  trade: Object // The assigned stock leg trade
});

const emit = defineEmits(['close', 'refresh']);

const form = ref({
  expiry: '',
  strike: '',
  price: ''
});

const errorMsg = ref('');

// Auto-fill form when trade changes
watch(() => props.trade, (newTrade) => {
  if (newTrade) {
    form.value.strike = ''; // User decides new strike
    form.value.price = '';
    form.value.expiry = '';
    errorMsg.value = '';
  }
});

const symbol = computed(() => props.trade ? props.trade.symbol : '');
const quantityContracts = computed(() => props.trade ? props.trade.quantity : 0);
const quantityShares = computed(() => quantityContracts.value * 100);

async function submitOrder() {
    errorMsg.value = '';
    if (!form.value.expiry || !form.value.strike || !form.value.price) {
        errorMsg.value = "Veuillez remplir tous les champs (Date, Strike, Prime)";
        return;
    }

    try {
        const db = await initDB();
        const today = new Date().toISOString().split('T')[0];
        
        // 1. Create Trade Header
        // Strategy = Wheel, Sub = 'call' (Covered Call)
        const result = await db.execute(
            `INSERT INTO trades (account_id, date, open_date, symbol, strategy, sub_strategy, status, target_yield, position_size_pct, created_at) 
             VALUES (?, ?, ?, ?, 'wheel', 'call', 'open', 0, 0, datetime('now'))`,
            [props.account.id, today, today, symbol.value]
        );
        
        const tradeId = result.lastInsertId;

        // 2. Insert Leg (Short Call)
        await db.execute(
            `INSERT INTO legs (trade_id, type, side, strike, expiration, open_price, quantity, status) 
             VALUES (?, 'call', 'short', ?, ?, ?, ?, 'open')`,
            [
                tradeId,
                form.value.strike,
                form.value.expiry,
                form.value.price,
                quantityContracts.value
            ]
        );

        emit('refresh');
        emit('close');
    } catch (e) {
        errorMsg.value = "Erreur lors de la création de l'ordre : " + e.message;
    }
}
</script>

<style scoped>
.modal-overlay {
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
}

.error-msg {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    border: 1px solid rgba(239, 68, 68, 0.2);
}

.modal-content {
  background: #1e1e1e;
  padding: 2rem;
  border-radius: 12px;
  width: 500px;
  max-width: 90%;
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}

h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-color);
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.input-group {
    display: flex;
    flex-direction: column;
    text-align: left;
}
.input-group label {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
}

.input-field {
    background: #2c2c2c;
    border: 1px solid #333;
    padding: 0.8rem;
    border-radius: 6px;
    color: white;
    font-size: 1rem;
}
.input-field.disabled {
    background: #252525;
    color: #888;
    cursor: not-allowed;
}

.helper-text {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.cancel-btn, .confirm-btn {
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  font-weight: 500;
}

.cancel-btn {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}
.cancel-btn:hover {
    color: var(--text-color);
    border-color: var(--text-color);
}

.confirm-btn {
  background: var(--accent-color);
  color: white;
}
.confirm-btn:hover {
  background: var(--accent-hover);
}
</style>

<template>
    <div class="modal-overlay">
        <div class="modal-content large-modal">
            <h3>Saisie du {{ formatDate(date) }}</h3>
            
            <div class="modal-trades-list">
                <div class="trade-row-header">
                    <span>Paire</span>
                    <span>Résultat</span>
                </div>
                <div v-for="(trade, idx) in localForm.tradeList" :key="idx" class="trade-row">
                     <select v-model="trade.pair">
                         <option value="" disabled>Paire</option>
                         <option v-for="p in pairsConfig" :key="p.id" :value="p.symbol">{{ p.symbol }}</option>
                     </select>
                     <input type="number" v-model.number="trade.result" placeholder="+/- $" @change="calculateDayTotals">
                     <button class="icon-btn delete-btn" @click="removeTradeRow(idx)">×</button>
                </div>
                <button class="icon-btn add-btn-full" @click="addTradeRow">+ Ajouter un trade</button>
            </div>

            <div class="day-summary">
                <div class="form-group">
                    <label>Total Résultat ($)</label>
                    <input type="number" step="0.01" v-model.number="localForm.pl" readonly class="readonly-input">
                </div>
                <div class="form-group">
                    <label>Total Risque Utilisé ($)</label>
                    <input type="number" step="0.01" v-model.number="localForm.risk">
                </div>
            </div>

            <div class="modal-actions">
                <button @click="$emit('close')">Annuler</button>
                <button class="primary" @click="saveDay">Enregistrer</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
    date: String,
    entry: Object,
    pairsConfig: Array
});

const emit = defineEmits(['close', 'save']);

const localForm = ref({ pl: 0, risk: 0, tradeList: [] });

onMounted(() => {
    // Init form from props
    let trades = [];
    if (props.entry && props.entry.details) {
        try {
            trades = JSON.parse(props.entry.details);
        } catch(e) { trades = []; }
    }

    localForm.value = {
        pl: props.entry ? props.entry.profit_loss : 0,
        risk: props.entry ? props.entry.risk_used : 0,
        tradeList: trades.length > 0 ? trades : [{ pair: '', result: 0 }]
    };
});

function formatDate(isoStr) {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
}

function addTradeRow() {
    localForm.value.tradeList.push({ pair: '', result: 0 });
}

function removeTradeRow(index) {
    localForm.value.tradeList.splice(index, 1);
    calculateDayTotals();
}

function calculateDayTotals() {
    const sum = localForm.value.tradeList.reduce((acc, t) => acc + (t.result || 0), 0);
    localForm.value.pl = sum;
}

function saveDay() {
    const validTrades = localForm.value.tradeList.filter(t => t.pair && t.pair !== '');
    
    emit('save', {
        date: props.date,
        pl: localForm.value.pl,
        risk: localForm.value.risk,
        tradeList: validTrades
    });
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
.modal-content.large-modal {
    width: 400px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    background: var(--surface-color); /* Ensure bg is set if scoped variables are available, otherwise inherits */
    padding: 20px;
    border-radius: 8px;
}
.modal-trades-list {
    max-height: 300px;
    overflow-y: auto;
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
    padding: 0.5rem;
    border-radius: 4px;
}

.trade-row-header {
    display: flex;
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
    padding-right: 2rem;
}
.trade-row-header span:first-child { flex: 1; }
.trade-row-header span:last-child { width: 100px; text-align: center; }

.trade-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    align-items: center;
}
.trade-row select {
    flex: 1;
    background: white;
    color: black;
    border: 1px solid var(--border-color);
    padding: 0.4rem;
    font-size: 1rem;
}
.trade-row input {
    width: 100px; 
    text-align: right;
    font-size: 1rem;
    background: #444;
    color: white;
    border: 1px solid #555;
}
.add-btn-full {
    width: 100%;
    background: var(--surface-color);
    border: 1px dashed var(--text-muted);
    color: var(--text-muted);
    padding: 0.5rem;
    cursor: pointer;
}
.add-btn-full:hover {
    border-color: var(--accent-color);
    color: var(--accent-color);
}

.day-summary {
    border-top: 1px solid var(--border-color);
    padding-top: 1rem;
}
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; color: var(--text-muted); }
.form-group input { 
    width: 100%; 
    padding: 0.5rem; 
    background: var(--bg-color); 
    border: 1px solid var(--border-color);
    color: var(--text-color);
    border-radius: 4px;
    font-size: 1.1rem;
}
.readonly-input {
    background: #333;
    border: none;
    font-weight: bold;
}
.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
}
.modal-actions button {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-color);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}
.modal-actions button.primary {
    background: var(--accent-color);
    border-color: var(--accent-color);
    color: white;
}
.icon-btn.delete-btn { color: #f44336; font-size: 1.2rem; padding: 0 0.5rem; background: none; border: none; cursor: pointer; }
</style>

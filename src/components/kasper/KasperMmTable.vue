<template>
    <div class="mm-table-section">
        <div class="mm-table-wrapper">
             <table class="kasper-mm-table">
                 <thead>
                     <tr>
                         <th>Paire</th>
                         <th>Valeur PIPS ($)</th>
                         <th>Nb PIPS (SL)</th>
                         <th>Risque (%)</th>
                         <th>Investi</th>
                         <th>Lot</th>
                         <th>Actions</th>
                     </tr>
                 </thead>
                 <tbody>
                     <tr v-for="pair in pairsConfig" :key="pair.id">
                         <td>{{ pair.symbol }}</td>
                         <td>
                             <input type="number" v-model.number="pair.pip_value" step="0.1" @change="onUpdatePair(pair)">
                         </td>
                         <td>
                             <input type="number" v-model.number="pair.sl_pips" step="1" @change="onUpdatePair(pair)">
                         </td>
                         <td>
                             <input type="number" v-model.number="pair.risk_pct" step="0.1" @change="onUpdatePair(pair)">%
                         </td>
                         <td class="calculated">
                             {{ calculateInvested(pair) }}
                         </td>
                         <td class="highlight-lot">
                             {{ calculateLot(pair) }}
                         </td>
                         <td>
                             <button class="icon-btn delete-btn" @click="$emit('deletePair', pair)" title="Supprimer">×</button>
                         </td>
                     </tr>
                     <!-- Add New Row -->
                     <tr class="add-row">
                         <td colspan="7">
                             <input type="text" v-model="newPairSymbol" placeholder="Ajouter symbole (ex: ETHUSD)" @keyup.enter="addNewPair">
                             <button class="icon-btn add-btn" @click="addNewPair">+</button>
                         </td>
                     </tr>
                 </tbody>
             </table>
        </div>
        <slot name="projections"></slot>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
    pairsConfig: Array,
    account: Object,
    currentCapital: Number
});

const emit = defineEmits(['updatePair', 'deletePair', 'addPair']);

const newPairSymbol = ref('');

function onUpdatePair(pair) {
    emit('updatePair', pair);
}

function addNewPair() {
    if (newPairSymbol.value.trim()) {
        emit('addPair', newPairSymbol.value.trim().toUpperCase());
        newPairSymbol.value = '';
    }
}

function calculateInvested(pair) {
    if (!props.currentCapital || !pair) return '0 $';
    const amount = props.currentCapital * (pair.risk_pct / 100);
    return Math.ceil(amount) + ' $'; 
}

function calculateLot(pair) {
    if (!props.currentCapital || !pair || pair.sl_pips === 0 || pair.pip_value === 0) return '0.00';
    const riskAmount = props.currentCapital * (pair.risk_pct / 100);
    const lot = riskAmount / (pair.sl_pips * pair.pip_value);
    return lot.toFixed(2);
}
</script>

<style scoped>
.mm-table-section {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    background: var(--surface-color);
    padding: 1rem;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.mm-table-wrapper {
    overflow-x: auto;
}

.kasper-mm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
}

.kasper-mm-table th {
    text-align: left;
    padding: 0.75rem;
    background: #004dcf;
    color: white;
    font-weight: bold;
    border: 1px solid #333;
}

.kasper-mm-table td {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    vertical-align: middle;
}

.kasper-mm-table input {
    width: 60px;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--text-muted);
    color: var(--text-color);
    padding: 0.25rem;
    border-radius: 4px;
    text-align: center;
}

.kasper-mm-table .highlight-lot {
    background: #008000;
    color: white;
    font-weight: bold;
    text-align: center;
}
.kasper-mm-table .calculated {
    font-weight: bold;
    text-align: center;
}

.icon-btn.delete-btn { color: #f44336; font-size: 1.2rem; padding: 0 0.5rem; background: none; border: none; cursor: pointer; }
.icon-btn.add-btn { background: var(--accent-color); color: white; border-radius: 4px; width: 30px; border: none; cursor: pointer;}
.add-row input { 
    width: 200px; 
    text-align: left; 
    margin-right: 1rem; 
    text-transform: uppercase;
}
</style>

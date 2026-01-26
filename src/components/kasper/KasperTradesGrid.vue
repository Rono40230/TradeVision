<template>
    <div class="modal-trades-list">
        <!-- GRID HEADER -->
        <div class="trades-grid-header">
            <span class="col-header text-center">Paire</span>
            <span class="col-header text-center">Type</span>
            <span class="col-header text-center">Lot</span>
            <span class="col-header text-center">Risque</span>
            <span class="col-header text-center">P/L ($)</span>
            <span class="col-header"></span>
        </div>
        
        <!-- ROWS -->
        <div v-for="(trade, idx) in modelValue" :key="idx" class="trade-row-grid">
             <!-- 1. Pair (Dropdown) -->
             <select 
                v-model="trade.pair" 
                class="input-field input-pair text-center"
                @change="onPairChange(trade)"
             >
                <option value="" disabled selected>Choisir</option>
                <option v-for="p in sortedPairs" :key="p.id" :value="p.symbol">
                    {{ p.symbol }}
                </option>
             </select>
             
             <!-- 2. Type (Buy/Sell) -->
             <select v-model="trade.direction" class="input-field input-type text-center" :class="trade.direction.toLowerCase()">
                 <option value="Buy">BUY</option>
                 <option value="Sell">SELL</option>
             </select>

             <!-- 3. Lot Size -->
             <input 
                type="number" 
                class="input-field input-lot text-center"
                v-model.number="trade.lot" 
                step="0.01"
                placeholder="0.00"
                @input="onChange"
             >

             <!-- 4. Risk Display (Calculated) -->
             <div class="input-field input-read-only text-center text-white">
                 {{ formatTradeRiskPercentage(trade, currentCapital, pairsConfig) }}
             </div>

             <!-- 5. Result (PL) -->
             <input 
                type="number" 
                class="input-field input-pl text-center"
                :class="{ 'plus': trade.result > 0, 'minus': trade.result < 0 }"
                v-model.number="trade.result" 
                placeholder="0.00" 
                @change="onChange"
             >
             
             <!-- 6. Action -->
             <div class="action-cell">
                <button class="icon-btn delete-btn" @click="removeTradeRow(idx)" title="Supprimer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
             </div>
        </div>
        
        <button class="add-btn-clean" @click="addTradeRow">
            <span>+</span> Ajouter un trade
        </button>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { getTradeRiskAmount, formatTradeRiskPercentage } from '../../utils/kasperUI.js';

const props = defineProps({
    modelValue: { type: Array, default: () => [] },
    pairsConfig: Array,
    currentCapital: Number
});

const emit = defineEmits(['update:modelValue', 'update:totals']);

const sortedPairs = computed(() => {
    return props.pairsConfig ? [...props.pairsConfig].sort((a,b) => a.symbol.localeCompare(b.symbol)) : [];
});

function onChange() {
    emit('update:totals'); // Signal parent to recalc global totals
}

function onPairChange(trade) {
    if (trade.pair && props.pairsConfig) {
        const config = props.pairsConfig.find(p => p.symbol === trade.pair);
        if (config) {
            // SNAPSHOT: Store current SL and Pip Value to freeze risk calculation
            trade.snap_sl = config.sl_pips;
            trade.snap_pip_value = config.pip_value;
        }
    }
    onChange();
}

function addTradeRow() {
    props.modelValue.push({ pair: '', direction: 'Buy', lot: 0.01, result: 0 });
    onChange();
}

function removeTradeRow(index) {
    props.modelValue.splice(index, 1);
    onChange();
}
</script>

<style scoped>
.modal-trades-list {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
}

/* GRID SETUP - UPDATED FOR 6 COLUMNS (Added Risk) */
.trades-grid-header, .trade-row-grid {
    display: grid;
    /* Pair=1.5, Type=1, Lot=0.8, Risk=0.8, PL=1, Action=40px */
    grid-template-columns: 1.5fr 1fr 0.8fr 0.8fr 1fr 40px; 
    gap: 0.8rem;
    align-items: center;
}

.trades-grid-header {
    margin-bottom: 1rem;
    padding: 0 0.8rem;
}

.col-header {
    font-size: 0.75rem;
    font-weight: 600; text-transform: uppercase; color: #6f6f85; letter-spacing: 0.5px; text-align: center; 
}
/* ROWS */
.trade-row-grid {
    background: #25252e; padding: 0.6rem 0.8rem; border-radius: 8px; margin-bottom: 0.8rem;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2); border: 1px solid transparent; transition: all 0.2s ease;
}
.trade-row-grid:hover { background: #2a2a35; border-color: #3f3f4e; transform: translateY(-1px); }
/* INPUTS */
.input-field {
    background: #18181f; border: 1px solid #333; color: #e0e0e0; padding: 0.6rem 0.5rem;
    border-radius: 6px; font-size: 0.95rem; width: 100%; box-sizing: border-box;
    transition: border-color 0.2s; text-align: center; 
}
.input-field:focus { border-color: #7986cb; outline: none; background: #121216; }
.input-field::placeholder { color: #555; }
.input-read-only { border-color: transparent; background: transparent; font-family: monospace; font-weight: 600; }
/* Specific Inputs */
select.input-field { cursor: pointer; appearance: none; background-image: none; padding-right: 0.5rem; text-align-last: center; }
.input-pair { font-weight: 600; letter-spacing: 0.5px; }
.input-lot { font-family: monospace; }
.input-pl { font-weight: bold; }
.input-pl.plus { color: #81c784; }
.input-pl.minus { color: #e57373; }
.text-white { color: #fff; }
.input-type.buy { color: #81c784; }
.input-type.sell { color: #e57373; }
.action-cell { display: flex; justify-content: center; }
.icon-btn.delete-btn {
    background: transparent; border: none; color: #555; padding: 6px;
    border-radius: 6px; cursor: pointer; transition: all 0.2s; display: flex;
}
.icon-btn.delete-btn:hover { background: rgba(229, 115, 115, 0.15); color: #e57373; }
.add-btn-clean {
    width: 100%; margin-top: 1rem; background: rgba(255,255,255,0.03); border: 1px dashed #444;
    color: #888; padding: 0.8rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem;
    transition: all 0.2s; display: flex; justify-content: center; align-items: center; gap: 0.5rem;
}
.add-btn-clean:hover { border-color: #666; color: #ccc; background: rgba(255,255,255,0.05); }
</style>

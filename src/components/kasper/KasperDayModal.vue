<template>
    <div class="modal-overlay">
        <div class="modal-content large-modal">
            <div class="modal-header">
                <h3>Saisie du {{ formatDate(date) }}</h3>
                <button class="close-icon" @click="$emit('close')">&times;</button>
            </div>
            
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
                <div v-for="(trade, idx) in localForm.tradeList" :key="idx" class="trade-row-grid">
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
                        @input="calculateDayTotals"
                     >

                     <!-- 4. Risk Display (Calculated) -->
                     <div class="input-field input-read-only text-center text-white">
                         {{ getTradeRisk(trade) }}
                     </div>

                     <!-- 5. Result (PL) -->
                     <input 
                        type="number" 
                        class="input-field input-pl text-center"
                        :class="{ 'plus': trade.result > 0, 'minus': trade.result < 0 }"
                        v-model.number="trade.result" 
                        placeholder="0.00" 
                        @change="calculateDayTotals"
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

            <div class="day-summary">
                <div class="summary-card">
                    <label>Résultat Net</label>
                    <span class="summary-value" :class="localForm.pl >= 0 ? 'green' : 'red'">
                        {{ localForm.pl > 0 ? '+' : '' }}{{ localForm.pl }} $
                    </span>
                </div>
                <div class="summary-card">
                    <label>Risque Utilisé</label>
                    <span class="summary-value white">
                        {{ riskPercentageDisplay }}
                    </span>
                </div>
            </div>

            <div class="modal-actions">
                <button class="btn-cancel" @click="$emit('close')">Annuler</button>
                <button class="btn-primary" @click="saveDay">Enregistrer</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const props = defineProps({
    date: String,
    entry: Object,
    pairsConfig: Array,
    currentCapital: { type: Number, default: 0 }
});

const emit = defineEmits(['close', 'save']);

const localForm = ref({ pl: 0, risk: 0, tradeList: [] });

const sortedPairs = computed(() => {
    return props.pairsConfig ? [...props.pairsConfig].sort((a,b) => a.symbol.localeCompare(b.symbol)) : [];
});

onMounted(() => {
    // Init form from props
    let trades = [];
    if (props.entry && props.entry.details) {
        try {
            trades = JSON.parse(props.entry.details);
            trades = trades.map(t => ({
                pair: t.pair || '',
                direction: t.direction || 'Buy',
                lot: t.lot || 0.01,
                result: t.result || 0
            }));
        } catch(e) { trades = []; }
    }

    localForm.value = {
        pl: props.entry ? props.entry.profit_loss : 0,
        risk: props.entry ? props.entry.risk_used : 0,
        tradeList: trades.length > 0 ? trades : [{ pair: '', direction: 'Buy', lot: 0.01, result: 0 }]
    };
    
    calculateDayTotals();
});

function formatDate(isoStr) {
    if (!isoStr) return '';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
}

function onPairChange(trade) {
    calculateDayTotals();
}

function addTradeRow() {
    localForm.value.tradeList.push({ pair: '', direction: 'Buy', lot: 0.01, result: 0 });
    calculateDayTotals();
}

function removeTradeRow(index) {
    localForm.value.tradeList.splice(index, 1);
    calculateDayTotals();
}

/* HELPER: Get Risk Amount in $ for a single row */
function getTradeRiskAmount(trade) {
    if (!trade.pair || trade.lot <= 0) return 0;
    const config = props.pairsConfig.find(p => p.symbol === trade.pair);
    if (config) {
         // Formula: Lot * PipValue * SL_pips
         return trade.lot * config.pip_value * config.sl_pips;
    }
    return 0;
}

/* HELPER: Display Percentage for single row */
function getTradeRisk(trade) {
    const riskAmt = getTradeRiskAmount(trade);
    if (riskAmt <= 0) return '0%';

    // Assuming we calculate risk % based on CURRENT capital passed in prop
    // This is "Risk used relative to current account size"
    if (!props.currentCapital || props.currentCapital === 0) return '0%';
    
    const pct = (riskAmt / props.currentCapital) * 100;
    const rounded = Math.round(pct * 2) / 2;
    return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + '%';
}

function calculateDayTotals() {
    // 1. Calculate Profit & Loss
    const sumPL = localForm.value.tradeList.reduce((acc, t) => acc + (t.result || 0), 0);
    localForm.value.pl = parseFloat(sumPL.toFixed(2));

    // 2. Calculate Total Risk Amount ($)
    const sumRisk = localForm.value.tradeList.reduce((acc, t) => {
        return acc + getTradeRiskAmount(t);
    }, 0);
    localForm.value.risk = parseFloat(sumRisk.toFixed(2));
}

const riskPercentageDisplay = computed(() => {
    if (!props.currentCapital || props.currentCapital === 0) return '0 %';
    // Sum of risk is already stored in localForm.risk (in $)
    const pct = (localForm.value.risk / props.currentCapital) * 100;
    const rounded = Math.round(pct * 2) / 2;
    return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + ' %';
});

function saveDay() {
    const validTrades = localForm.value.tradeList.filter(t => t.pair && t.pair.trim() !== '');
    
    emit('save', {
        date: props.date,
        pl: localForm.value.pl,
        risk: localForm.value.risk,
        tradeList: validTrades
    });
}
</script>

<style scoped>
/* -------- OVERLAY & CONTAINER -------- */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
}
.modal-content.large-modal {
    width: 750px; /* Widened slightly for extra column */
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    background: #1e1e24;
    color: #e0e0e0;
    border-radius: 16px;
    border: 1px solid #333;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.9);
    padding: 0;
}

/* -------- HEADER -------- */
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #2a2a35;
    background: rgba(255,255,255,0.02);
    position: relative; 
}
.modal-header h3 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 500;
    letter-spacing: -0.5px;
    color: #fff;
    width: 100%;
    text-align: center;
}
.close-icon {
    background: none;
    border: none;
    font-size: 2rem;
    color: #666;
    cursor: pointer;
    line-height: 1;
    position: absolute;
    right: 1.5rem;
    top: 50%;
    transform: translateY(-50%);
}
.close-icon:hover { color: #fff; }

/* -------- LIST AREA -------- */
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
    font-weight: 600;
    text-transform: uppercase;
    color: #6f6f85;
    letter-spacing: 0.5px;
    text-align: center; 
}

/* ROWS */
.trade-row-grid {
    background: #25252e;
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    margin-bottom: 0.8rem;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    border: 1px solid transparent;
    transition: all 0.2s ease;
}
.trade-row-grid:hover {
    background: #2a2a35;
    border-color: #3f3f4e;
    transform: translateY(-1px);
}

/* -------- INPUTS -------- */
.input-field {
    background: #18181f;
    border: 1px solid #333;
    color: #e0e0e0;
    padding: 0.6rem 0.5rem;
    border-radius: 6px;
    font-size: 0.95rem;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.2s;
    text-align: center; 
}
.input-field:focus {
    border-color: #7986cb;
    outline: none;
    background: #121216;
}
.input-field::placeholder { color: #555; }

.input-read-only {
    border-color: transparent;
    background: transparent;
    font-family: monospace;
    font-weight: 600;
}

/* Specific Inputs */
select.input-field {
    cursor: pointer;
    appearance: none;
    background-image: none; 
    padding-right: 0.5rem;
    text-align-last: center;
}

.input-pair { font-weight: 600; letter-spacing: 0.5px; }
.input-lot { font-family: monospace; }
.input-pl { font-weight: bold; }

/* Color coding for PL input text */
.input-pl.plus { color: #81c784; }
.input-pl.minus { color: #e57373; }

.text-red { color: #e57373; }
.text-white { color: #fff; }

/* Type dropdown tweaks */
.input-type.buy { color: #81c784; }
.input-type.sell { color: #e57373; }

/* Delete Button */
.action-cell { display: flex; justify-content: center; }
.icon-btn.delete-btn {
    background: transparent;
    border: none;
    color: #555;
    padding: 6px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
}
.icon-btn.delete-btn:hover {
    background: rgba(229, 115, 115, 0.15);
    color: #e57373;
}

/* ADD BUTTON */
.add-btn-clean {
    width: 100%;
    margin-top: 1rem;
    background: rgba(255,255,255,0.03);
    border: 1px dashed #444;
    color: #888;
    padding: 0.8rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
}
.add-btn-clean:hover {
    border-color: #666;
    color: #ccc;
    background: rgba(255,255,255,0.05);
}

/* -------- FOOTER / SUMMARY -------- */
.day-summary {
    background: #18181f; 
    border-top: 1px solid #2a2a35;
    padding: 1.5rem 2rem;
    display: flex;
    justify-content: center; 
    gap: 3rem;
}

.summary-card {
    display: flex;
    flex-direction: column;
    align-items: center; 
}
.summary-card label {
    font-size: 0.75rem;
    text-transform: uppercase;
    color: #666;
    margin-bottom: 0.2rem;
}
.summary-value {
    font-size: 1.3rem;
    font-weight: 600;
}
.summary-value.green { color: #81c784; }
.summary-value.red { color: #e57373; }
.summary-value.white { color: #fff; }

/* ACTIONS */
.modal-actions {
    padding: 1rem 2rem 2rem 2rem;
    display: flex;
    justify-content: center; 
    gap: 1rem;
    background: #18181f;
    border-radius: 0 0 16px 16px;
}

.btn-cancel {
    padding: 0.6rem 1.5rem;
    background: transparent;
    border: 1px solid #444;
    color: #aaa;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
}
.btn-cancel:hover { border-color: #666; color: #fff; }

.btn-primary {
    padding: 0.6rem 2rem;
    background: #7b1fa2; 
    border: none;
    color: #fff;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    box-shadow: 0 4px 12px rgba(123, 31, 162, 0.3);
    transition: all 0.2s;
}
.btn-primary:hover { 
    background: #8e24aa;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(123, 31, 162, 0.4);
}
</style>

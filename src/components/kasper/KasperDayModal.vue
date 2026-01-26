<template>
    <div class="modal-overlay">
        <div class="modal-content large-modal">
            <div class="modal-header">
                <h3>Saisie du {{ formatDate(date) }}</h3>
                <button class="close-icon" @click="$emit('close')">&times;</button>
            </div>
            
            <KasperTradesGrid 
                v-model="localForm.tradeList"
                :pairsConfig="pairsConfig"
                :currentCapital="currentCapital"
                @update:totals="calculateDayTotals"
            />

            <KasperDaySummary 
                :pl="localForm.pl"
                :riskDisplay="riskPercentageDisplay"
            />

            <div class="modal-actions">
                <button class="btn-cancel" @click="$emit('close')">Annuler</button>
                <button class="btn-primary" @click="saveDay">Enregistrer</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { getTradeRiskAmount } from '../../utils/kasperUI.js';
import KasperTradesGrid from './KasperTradesGrid.vue';
import KasperDaySummary from './KasperDaySummary.vue';

const props = defineProps({
    date: String,
    entry: Object,
    pairsConfig: Array,
    currentCapital: { type: Number, default: 0 }
});

const emit = defineEmits(['close', 'save']);

const localForm = ref({ pl: 0, risk: 0, tradeList: [] });

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
                result: t.result || 0,
                // Preserve snapshots
                snap_sl: t.snap_sl,
                snap_pip_value: t.snap_pip_value
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

function calculateDayTotals() {
    // 1. Calculate Profit & Loss
    const sumPL = localForm.value.tradeList.reduce((acc, t) => acc + (t.result || 0), 0);
    localForm.value.pl = parseFloat(sumPL.toFixed(2));

    // 2. Calculate Total Risk Amount ($)
    const sumRisk = localForm.value.tradeList.reduce((acc, t) => {
        return acc + getTradeRiskAmount(t, props.pairsConfig);
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

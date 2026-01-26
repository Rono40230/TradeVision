<template>
  <div class="entry-block">
    <h3>Saisie d'Ordre</h3>
    <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
    
    <!-- Strategy Selector -->
    <div class="strategy-nav">
        <button :class="{ active: modelValue === 'wheel' }" @click="updateStrategy('wheel')">Wheel</button>
        <button :class="{ active: modelValue === 'pcs' }" @click="updateStrategy('pcs')">PCS</button>
        <button :class="{ active: modelValue === 'rockets' }" @click="updateStrategy('rockets')">Rockets</button>
    </div>

    <!-- WHEEL Form -->
    <WheelEntryForm 
        v-if="modelValue === 'wheel'"
        v-model="form"
        v-model:subStrategy="renteSubStrategy"
        @submit="handleSubmit"
    />

    <!-- PCS Form -->
    <PcsEntryForm 
        v-if="modelValue === 'pcs'"
        v-model="form"
        v-model:subStrategy="croissanceSubStrategy"
        @submit="handleSubmit"
    />

    <!-- ROCKETS Form -->
    <RocketEntryForm 
        v-if="modelValue === 'rockets'"
        v-model="form"
        :mmWarning="mmWarning"
        @submit="handleSubmit"
    />
  </div>
</template>

<script setup>
import { ref, computed, watchEffect, watch } from 'vue';
import { submitTradeToDB } from '../../utils/tradeSubmission.js';
import WheelEntryForm from './WheelEntryForm.vue';
import PcsEntryForm from './PcsEntryForm.vue';
import RocketEntryForm from './RocketEntryForm.vue';

const props = defineProps({
    modelValue: { type: String, required: true }, // strategyType
    account: { type: Object, required: true },
    displayedCapital: { type: Number, default: 0 }
});

const emit = defineEmits(['update:modelValue', 'trade-submitted']);

const renteSubStrategy = ref('put');
const croissanceSubStrategy = ref('pcs');
const errorMsg = ref('');
const mmWarning = ref('');

const form = ref({
    symbol: '', expiry: '', assetType: 'Action', riskProfile: 'Neutre',
    broker: 'IBKR', stopLoss: null, entryStop: null, entryLimit: null,
    strike: null, positionSizePct: 10, estimatedYield: null,
    strikeShort: null, strikeLong: null, strikeCallShort: null, strikeCallLong: null,
    price: null, quantity: 1
});

function updateStrategy(val) {
    emit('update:modelValue', val);
}

// Logic Computation kept in parent for now
const computedQuantity = computed(() => {
    // WHEEL Logic
    if (props.modelValue === 'wheel' && renteSubStrategy.value === 'put') {
       if (props.account.alloc_wheel > 0 && form.value.strike > 0 && form.value.positionSizePct) {
            const totalCap = props.displayedCapital; 
            const budgetForTrade = totalCap * (form.value.positionSizePct / 100);
            return Math.floor(budgetForTrade / (form.value.strike * 100)) || 1;
       }
       return 1;
    }

    // PCS Logic
    if (props.modelValue === 'pcs') {
        const allocGrowth = props.account.alloc_growth || 0;
        if (allocGrowth <= 0) return 1;
        const tradeBudget = allocGrowth * 0.10; // 10%

        if (croissanceSubStrategy.value === 'pcs') {
            if (form.value.strikeShort && form.value.strikeLong) {
                const width = Math.abs(form.value.strikeShort - form.value.strikeLong);
                if (width === 0) return 1;
                const riskPerContract = width * 100;
                return Math.floor(tradeBudget / riskPerContract) || 1;
            }
        } else if (croissanceSubStrategy.value === 'ic') {
             const widthPut = (form.value.strikeShort && form.value.strikeLong) ? Math.abs(form.value.strikeShort - form.value.strikeLong) : 0;
             const widthCall = (form.value.strikeCallShort && form.value.strikeCallLong) ? Math.abs(form.value.strikeCallShort - form.value.strikeCallLong) : 0;
             const maxWidth = Math.max(widthPut, widthCall);
             if (maxWidth > 0) return Math.floor(tradeBudget / (maxWidth * 100)) || 1;
        }
        return 1;
    }

    // ROCKETS Logic
    if (props.modelValue === 'rockets') {
        const capital = props.displayedCapital;
        const { assetType, riskProfile, entryStop, entryLimit, stopLoss } = form.value;
        const entry = entryStop || entryLimit; 
        
        if (!capital || !entry || !stopLoss) return 0;
        
        let riskPct = 0.01; 
        if (assetType === 'ETF') {
            if (riskProfile === 'Peu Risqué') riskPct = 0.02;     
            else if (riskProfile === 'Neutre') riskPct = 0.03;    
            else if (riskProfile === 'Risqué') riskPct = 0.04;    
        } else {
            if (riskProfile === 'Peu Risqué') riskPct = 0.005;    
            else if (riskProfile === 'Neutre') riskPct = 0.01;    
            else if (riskProfile === 'Risqué') riskPct = 0.02;    
        }

        const riskAmount = capital * riskPct;
        const riskPerShare = Math.abs(entry - stopLoss);
        if (riskPerShare === 0) return 0;

        let rawQty = riskAmount / riskPerShare;
        const maxAlloc = capital * 0.05;
        const maxQtyByAlloc = maxAlloc / entry;

        let finalQty = rawQty;
        if (finalQty > maxQtyByAlloc) finalQty = maxQtyByAlloc;

        if (assetType === 'Crypto') finalQty = parseFloat(finalQty.toFixed(6));
        else finalQty = Math.floor(finalQty);
        
        return Math.max(finalQty, 0);
    }
    return form.value.quantity;
});

watch(computedQuantity, (newVal) => {
   const isQuantityComputed = (props.modelValue === 'wheel' && renteSubStrategy.value === 'put') || props.modelValue === 'pcs' || props.modelValue === 'rockets';
   if (isQuantityComputed) {
       form.value.quantity = newVal;
   } 
});

watchEffect(() => {
   if (props.modelValue === 'rockets') {
        mmWarning.value = '';
        const capital = props.displayedCapital;
        const { assetType, riskProfile, entryStop, entryLimit, stopLoss } = form.value;
        const entry = entryStop || entryLimit;
        
        if (capital && entry && stopLoss) {
             const maxAlloc = capital * 0.05;
             const maxQtyByAlloc = maxAlloc / entry;
             if (form.value.quantity >= maxQtyByAlloc && maxQtyByAlloc > 0) {
                 mmWarning.value = `Plafonné à 5% du capital (${maxAlloc.toFixed(0)} $)`;
             }
        }
   }
});

async function handleSubmit() {
    errorMsg.value = '';
    if (!props.account || !props.account.id) { errorMsg.value = "Compte non chargé."; return; }
    if (!form.value.symbol) { errorMsg.value = "Symbole requis."; return; }
    if ((props.modelValue === 'wheel' || props.modelValue === 'pcs') && !form.value.expiry) {
        errorMsg.value = "Date d'expiration requise."; return;
    }

    const payload = {
        strategy: props.modelValue,
        subStrategy: (props.modelValue === 'wheel' ? renteSubStrategy.value : (props.modelValue === 'pcs' ? croissanceSubStrategy.value : null)),
        form: { ...form.value },
        quantityToInsert: form.value.quantity 
    };

    try {
        await submitTradeToDB(payload, props.account.id);
        emit('trade-submitted');
        resetForm();
    } catch(e) {
        errorMsg.value = "Erreur: " + e.message;
    }
}

function resetForm() {
    form.value.symbol = ''; form.value.price = null; form.value.quantity = 1;
    form.value.strike = null; form.value.strikeShort = null; form.value.strikeLong = null;
    form.value.strikeCallShort = null; form.value.strikeCallLong = null;
    form.value.estimatedYield = null;
    form.value.stopLoss = null; form.value.entryStop = null; form.value.entryLimit = null;
    errorMsg.value = '';
}
</script>

<style scoped>
.error-msg {
    background: rgba(255, 0, 0, 0.1); color: #ff6b6b; padding: 0.5rem;
    border-radius: 4px; margin-bottom: 1rem; font-size: 0.9rem; border: 1px solid rgba(255, 0, 0, 0.2);
}
.entry-block {
    width: 330px; box-sizing: border-box; background: var(--surface-color);
    border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem 2rem;
    display: flex; flex-direction: column; overflow-y: auto;
}
.strategy-nav {
    display: flex; margin-bottom: 1.5rem; border: 1px solid var(--border-color);
    border-radius: 6px; overflow: hidden; flex-shrink: 0; min-height: 40px;
}
.strategy-nav button {
    flex: 1; background: transparent; border: none; color: var(--text-muted);
    padding: 0.8rem; cursor: pointer; font-weight: 500;
}
.strategy-nav button.active { background: var(--accent-color); color: white; }
</style>

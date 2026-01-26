<template>
    <div class="rockets-entry-form">
        <div class="input-group">
            <label>Type d'actif</label>
            <select v-model="localForm.assetType" @change="emitUpdate" class="input-field">
                <option value="Action">Action</option>
                <option value="ETF">ETF</option>
                <option value="Crypto">Crypto</option>
            </select>
        </div>

        <div class="input-group">
            <label>Profil de Risque</label>
            <select v-model="localForm.riskProfile" @change="emitUpdate" class="input-field">
                <option value="Peu Risqué">Peu Risqué</option>
                <option value="Neutre">Neutre</option>
                <option value="Risqué">Risqué</option>
            </select>
        </div>

        <div class="input-group">
            <label>Broker</label>
            <select v-model="localForm.broker" @change="emitUpdate" class="input-field">
                <option value="IBKR">IBKR</option>
                <option value="Binance">Binance</option>
                <option value="Gate.io">Gate.io</option>
            </select>
        </div>

        <div class="input-group">
            <label>Symbole</label>
            <input type="text" :value="localForm.symbol" @input="updateSymbol" placeholder="ex: BTCUSDT" class="input-field" />
        </div>

        <div class="sub-strategy" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
             <div class="input-group">
                <label>Entrée Stop</label>
                <input type="number" v-model.number="localForm.entryStop" @input="emitUpdate" class="input-field" step="any" />
            </div>
             <div class="input-group">
                <label>Entrée Limit</label>
                <input type="number" v-model.number="localForm.entryLimit" @input="emitUpdate" class="input-field" step="any" />
            </div>
        </div>

        <div class="input-group">
            <label>Invalidation</label>
            <input type="number" v-model.number="localForm.stopLoss" @input="emitUpdate" class="input-field" step="any" placeholder="Prix Stop Loss" />
        </div>

        <div class="quantity-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
             <div class="input-group">
                <label>Quantité</label>
                 <input type="number" 
                    v-model.number="localForm.quantity"
                    class="input-field" 
                    step="any"
                    @input="emitUpdate"
                />
                <small v-if="mmWarning" style="color: #ff9800; display: block; margin-top: 4px;">{{ mmWarning }}</small>
            </div>
             <div class="input-group">
                <label>Montant Position</label>
                 <input type="text" 
                    :value="moneyFormat((localForm.entryStop || localForm.entryLimit || 0) * localForm.quantity)"
                    class="input-field computed-field" 
                    readonly
                />
            </div>
        </div>

        <button type="button" class="submit-btn" @click="$emit('submit')">Enregistrer l'Ordre</button>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { formatCurrency } from '../../utils/rocketUtils.js';

const props = defineProps({
    modelValue: Object,
    mmWarning: String
});
const emit = defineEmits(['update:modelValue', 'submit']);

const localForm = ref({ ...props.modelValue });

function emitUpdate() {
    emit('update:modelValue', localForm.value);
}

function updateSymbol(e) {
    localForm.value.symbol = e.target.value.toUpperCase();
    emitUpdate();
}

function moneyFormat(val) {
    return formatCurrency(val);
}

watch(() => props.modelValue, (newVal) => {
    Object.assign(localForm.value, newVal);
}, { deep: true });
</script>

<style scoped>
.input-group { margin-bottom: 1rem; }
.input-group label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: #888; }
.input-field {
    width: 100%; background: #2a2a2a; border: 1px solid #444; color: #e0e0e0;
    padding: 0.8rem; border-radius: 4px; font-size: 1rem; box-sizing: border-box;
}
.submit-btn { width: 100%; background: #4caf50; color: white; border: none; padding: 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 1rem; }
.submit-btn:hover { background: #43a047; }

/* Force black text for selects as requested */
select.input-field {
    color: black !important;
    background-color: #f0f0f0 !important;
    font-weight: 500;
}
</style>

<template>
    <div class="wheel-entry-form">
        <div class="sub-strategy" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <label><input type="radio" v-model="localForm.subStrategy" value="put" @change="emitUpdate" /> Vente PUT</label>
            <label><input type="radio" v-model="localForm.subStrategy" value="put_long" @change="emitUpdate" /> Achat PUT</label>
            <label><input type="radio" v-model="localForm.subStrategy" value="call" @change="emitUpdate" /> Vente CALL</label>
            <label><input type="radio" v-model="localForm.subStrategy" value="call_long" @change="emitUpdate" /> Achat CALL</label>
        </div>
        
        <div class="sub-strategy" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <label><input type="radio" v-model="localForm.subStrategy" value="hedge" @change="emitUpdate" /> Hedge Simple</label>
            <label><input type="radio" v-model="localForm.subStrategy" value="hedge_spread" @change="emitUpdate" /> Hedge Spread</label>
        </div>

        <div class="input-group">
            <label>Symbole</label>
            <input type="text" :value="localForm.symbol" @input="updateSymbol" placeholder="ex: SPY" class="input-field" />
        </div>
        
        <div class="input-group">
            <label>Date Expiration</label>
            <input type="date" v-model="localForm.expiry" @input="emitUpdate" class="input-field" />
        </div>

        <div v-if="['put', 'put_long', 'call', 'call_long'].includes(localForm.subStrategy)" class="input-group">
            <label>Taille de position (%)</label>
            <select v-model.number="localForm.positionSizePct" @change="emitUpdate" class="input-field">
                <option :value="5">5 %</option>
                <option :value="10">10 %</option>
                <option :value="15">15 %</option>
            </select>
        </div>

        <div v-if="localForm.subStrategy === 'hedge_spread'" class="complex-legs">
             <h4>Hedge (Spread)</h4>
             <div class="input-group">
                <label>Pente Protection (Achat Put)</label>
                <input type="number" v-model="localForm.strikeLong" @input="emitUpdate" class="input-field" />
            </div>
             <div class="input-group">
                <label>Pente Financement (Vente Put)</label>
                <input type="number" v-model="localForm.strikeShort" @input="emitUpdate" class="input-field" />
            </div>
        </div>

        <div class="inline-inputs-row">
            <div v-if="localForm.subStrategy !== 'hedge_spread'" class="input-group">
                <label>Strike</label>
                <input type="number" v-model="localForm.strike" @input="emitUpdate" placeholder="350" class="input-field" />
            </div>

            <div class="input-group">
                <label>Prix</label>
                <input type="number" v-model="localForm.price" @input="emitUpdate" placeholder="2.43" class="input-field" />
            </div>
        </div>

        <div class="inline-inputs-row">
            <div class="input-group" v-if="localForm.subStrategy !== 'hedge'">
                <label>Rendement brut</label>
                <input type="number" v-model="localForm.estimatedYield" @input="emitUpdate" placeholder="ex: 12.5" class="input-field" />
            </div>

            <div class="input-group">
                <label>Quantité</label>
                <input 
                    type="number" 
                    v-model.number="localForm.quantity"
                    @input="emitUpdate"
                    class="input-field" 
                />
            </div>
        </div>
        
        <button type="button" class="submit-btn" @click="$emit('submit')">
            Enregistrer l'Ordre
        </button>
    </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
    modelValue: Object, // Form data
    subStrategy: String
});
const emit = defineEmits(['update:modelValue', 'update:subStrategy', 'submit']);

const localForm = ref({ ...props.modelValue, subStrategy: props.subStrategy || 'put' });

function emitUpdate() {
    emit('update:modelValue', localForm.value);
    emit('update:subStrategy', localForm.value.subStrategy);
}

function updateSymbol(e) {
    localForm.value.symbol = e.target.value.toUpperCase();
    emitUpdate();
}

watch(() => props.modelValue, (newVal) => {
    // Merge props into local, avoiding overwrite if user is typing
    // Ideally we assume Parent controls state, so we sync.
    Object.assign(localForm.value, newVal);
}, { deep: true });
</script>

<style scoped>
/* Reuse styles from parent via slots or keep them simple/local */
.sub-strategy {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    background: rgba(255,255,255,0.03);
    padding: 1rem;
    border-radius: 6px;
}
.input-group { margin-bottom: 1rem; }
.input-group label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: #888; }
.input-field {
    width: 100%; background: #2a2a2a; border: 1px solid #444; color: #e0e0e0;
    padding: 0.8rem; border-radius: 4px; font-size: 1rem; box-sizing: border-box;
}
select.input-field {
    color: black;
    background-color: white; 
}
.complex-legs { border: 1px dashed #444; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; }
.inline-inputs-row { display: flex; gap: 10px; }
.inline-inputs-row .input-group { flex: 1; }
.submit-btn { width: 100%; background: #4caf50; color: white; border: none; padding: 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 1rem; }
.submit-btn:hover { background: #43a047; }
</style>

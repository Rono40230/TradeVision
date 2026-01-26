<template>
    <div class="pcs-entry-form">
        <div class="sub-strategy">
            <label><input type="radio" v-model="localForm.subStrategy" value="pcs" @change="emitUpdate" /> PCS (Standard)</label>
            <label><input type="radio" v-model="localForm.subStrategy" value="ic" @change="emitUpdate" /> Iron Condor</label>
        </div>

        <div class="input-group">
            <label>Symbole</label>
            <input type="text" :value="localForm.symbol" @input="updateSymbol" placeholder="ex: TESLA" class="input-field" />
        </div>
        
        <div class="input-group">
            <label>Date Expiration</label>
            <input type="date" v-model="localForm.expiry" @input="emitUpdate" class="input-field" />
        </div>
            
        <!-- STANDARD PCS LEGS -->
        <div v-if="localForm.subStrategy === 'pcs'" class="complex-legs">
            <div class="flex-row">
                <div class="input-group half">
                    <label>Vente limite put</label>
                    <input type="number" v-model="localForm.strikeShort" @input="emitUpdate" class="input-field" />
                </div>
                <div class="input-group half">
                    <label>Achat limite put</label>
                    <input type="number" v-model="localForm.strikeLong" @input="emitUpdate" class="input-field" />
                </div>
            </div>
        </div>

        <!-- IRON CONDOR LEGS -->
        <div v-if="localForm.subStrategy === 'ic'" class="complex-legs">
            <div class="flex-row">
                <div class="input-group half">
                    <label>Vente limite put</label>
                    <input type="number" v-model="localForm.strikeShort" @input="emitUpdate" class="input-field" />
                </div>
                <div class="input-group half">
                    <label>Achat limite put</label>
                    <input type="number" v-model="localForm.strikeLong" @input="emitUpdate" class="input-field" />
                </div>
            </div>
            <div class="flex-row">
                <div class="input-group half">
                    <label>Vente limite call</label>
                    <input type="number" v-model="localForm.strikeCallShort" @input="emitUpdate" class="input-field" />
                </div>
                <div class="input-group half">
                    <label>Achat limite call</label>
                    <input type="number" v-model="localForm.strikeCallLong" @input="emitUpdate" class="input-field" />
                </div>
            </div>
        </div>

        <div class="input-group">
            <label>Crédit Net H.M. (Négatif)</label>
            <input type="number" v-model="localForm.price" @input="emitUpdate" placeholder="-1.50" class="input-field" step="0.01" />
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

        <button type="button" class="submit-btn" @click="$emit('submit')">Enregistrer l'Ordre</button>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    modelValue: Object,
    subStrategy: String
});
const emit = defineEmits(['update:modelValue', 'update:subStrategy', 'submit']);

const localForm = ref({ ...props.modelValue, subStrategy: props.subStrategy || 'pcs' });

function emitUpdate() {
    emit('update:modelValue', localForm.value);
    emit('update:subStrategy', localForm.value.subStrategy);
}

function updateSymbol(e) {
    localForm.value.symbol = e.target.value.toUpperCase();
    emitUpdate();
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
.complex-legs { border: 1px dashed #444; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; }
.flex-row { display: flex; gap: 1rem; }
.input-group.half { width: 50%; }
.sub-strategy { display: flex; gap: 1rem; margin-bottom: 1.5rem; background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 6px; }
.submit-btn { width: 100%; background: #4caf50; color: white; border: none; padding: 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 1rem; }
.submit-btn:hover { background: #43a047; }
</style>

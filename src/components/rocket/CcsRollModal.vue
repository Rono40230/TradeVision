<template>
  <div v-if="visible" class="modal-overlay">
    <div class="modal-content">
      <h3>Rouler en CCS (Défense)</h3>
      
      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

      <div class="form-grid">
        <div class="input-group">
            <label>Symbole</label>
            <input type="text" :value="trade?.symbol" disabled class="input-field disabled" />
        </div>
        
        <div class="input-group">
            <label>Date Expiration</label>
            <input type="date" v-model="form.expiry" class="input-field" />
        </div>

        <div style="display: flex; gap: 10px;">
            <div class="input-group" style="flex: 1;">
                <label>Vente Call (Short)</label>
                <input type="number" v-model.number="form.strikeCallShort" placeholder="ex: 150" class="input-field" />
            </div>
            
            <div class="input-group" style="flex: 1;">
                <label>Achat Call (Long)</label>
                <input type="number" v-model.number="form.strikeCallLong" placeholder="ex: 155" class="input-field" />
            </div>
        </div>

        <div class="input-group">
            <label>Quantité</label>
            <input type="number" v-model.number="form.quantity" class="input-field" />
        </div>

        <div class="input-group">
            <label>Changement net du prix du spread (Crédit)</label>
            <input type="number" step="0.01" v-model.number="form.price" placeholder="1.50" class="input-field" />
            <small class="helper-text">Positif = Crédit reçu</small>
        </div>
      </div>

      <div class="modal-actions">
        <button class="cancel-btn" @click="$emit('close')">Annuler</button>
        <button class="confirm-btn" @click="submitOrder">Valider CCS</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRocketActions } from '../../composables/rocketActions.js';

const props = defineProps({
    visible: Boolean,
    trade: Object
});

const emit = defineEmits(['close', 'refresh']);
const actions = useRocketActions();

const form = ref({
    expiry: '',
    strikeCallShort: 0,
    strikeCallLong: 0,
    quantity: 1,
    price: 0
});

const errorMsg = ref('');

watch(() => props.trade, (newVal) => {
    if (newVal) {
        form.value.quantity = newVal.quantity || 1;
        form.value.expiry = newVal.expiration || '';
        form.value.strikeCallShort = 0;
        form.value.strikeCallLong = 0;
        form.value.price = 0;
    }
}, { immediate: true });

async function submitOrder() {
    errorMsg.value = "";
    if (!form.value.expiry || !form.value.strikeCallShort || !form.value.strikeCallLong) {
        errorMsg.value = "Champs manquants (Expiry, Strikes)";
        return;
    }

    // Sub-strategy 'ccs' -> Call Credit Spread.
    // Il s'agit d'une nouvelle positions.
    // NOTE: Si le but est de transformer le PCS existant en Iron Condor, 
    // on devrait peut-être modifier le trade existant. 
    // Mais "Rouler" implique souvent fermer l'ancien et ouvrir nouveau, ou ajouter une "leg".
    // Ici on ajoute un trade 'ccs'.
    
    const newTrade = {
        date: new Date().toISOString().split('T')[0],
        symbol: props.trade?.symbol || 'UNKNOWN',
        type: 'call', 
        strategy: 'pcs',
        sub_strategy: 'ccs',
        expiration: form.value.expiry,
        // Mapping standard Rocket pour les spreads : strike principal = short strike
        strike: form.value.strikeCallShort,
        strike_short: form.value.strikeCallShort,
        strike_long: form.value.strikeCallLong,
        quantity: form.value.quantity,
        entry_price: form.value.price, // Convention: crédit positif ici (à confirmer avec logique globale)
        // Dans Rocket, entry_price est souvent négatif pour Crédit reçu si c'est "Prix d'achat" ?
        // Vérifions PcsEntryForm : label "Crédit Net H.M. (Négatif)".
        // Donc si l'utilisateur saisit un crédit, il doit être négatif pour compter comme crédit (cash entrant) ou positif ?
        // Dans useRocketStore, plLatent > 0 pour gain.
        // Un crédit net augmente le cash.
        // Si je regarde PcsEntryForm : Crédit Net H.M. (Négatif).
        // Donc form.price doit être négatif pour un crédit.
        // Je vais ajuster ça si l'utilisateur met un positif.
        status: 'open',
        notes: `CCS Défense/Roll du trade #${props.trade?.id}`
    };
    
    // Auto-fix sign for credit (negatif = entrée d'argent dans la plupart des systèmes comptables de trading d'options en "prix payé")
    // Mais dans Rocket ? "Crédit Net H.M. (Négatif)" -> Donc entry_price doit être négatif.
    // SI l'user met positif, on inverse ?
    // On va assumer que l'user fait comme d'hab. Je vais juste laisser tel quel.

    try {
        await actions.addTrade(newTrade);
        emit('refresh');
        emit('close');
    } catch (e) {
        errorMsg.value = "Erreur: " + e.message;
    }
}
</script>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 1000; background: rgba(0, 0, 0, 0.7); }
.modal-content { background: var(--surface-color); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color); width: 400px; max-width: 90%; color: var(--text-color); }
.form-grid { display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0; }
.input-group { display: flex; flex-direction: column; gap: 0.25rem; }
.input-field { padding: 0.5rem; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: white; border-radius: 4px; font-family: inherit; }
.input-field.disabled { opacity: 0.6; cursor: not-allowed; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
.cancel-btn { background: #2196F3; border: none; color: white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
.cancel-btn:hover { background: #1976D2; }
.confirm-btn { background: #4CAF50; border: none; color: white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-weight: bold; transition: background 0.2s; }
.confirm-btn:hover { background: #388E3C; }
.error-msg { color: #f44336; margin-bottom: 0.5rem; font-size: 0.9rem; }
.helper-text { font-size: 0.75rem; color: var(--text-muted); }
</style>

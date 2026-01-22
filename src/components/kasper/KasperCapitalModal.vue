<template>
    <div class="modal-overlay">
        <div class="modal-content">
            <h3>Définir le Capital de Départ</h3>
            <p class="warning-text">Attention : Ceci écrasera le capital actuel.</p>
            <div class="form-group">
                <label>Montant ($)</label>
                <input type="number" step="100" v-model.number="tempCapital">
            </div>
            <div class="modal-actions">
                <button @click="$emit('close')">Annuler</button>
                <button class="primary" @click="onSave">Valider</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps(['currentCapital']);
const emit = defineEmits(['close', 'save']);
const tempCapital = ref(0);

onMounted(() => {
    tempCapital.value = props.currentCapital || 5000;
});

function onSave() {
    emit('save', tempCapital.value);
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
.modal-content {
    background: var(--surface-color);
    padding: 20px;
    border-radius: 8px;
    width: 300px;
}
.warning-text { color: #ff9800; font-size: 0.9rem; margin-bottom: 1rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; color: var(--text-muted); }
.form-group input { width: 100%; padding: 0.5rem; background: var(--bg-color); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 4px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }
.modal-actions button { background: transparent; border: 1px solid var(--border-color); color: var(--text-color); padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
.modal-actions button.primary { background: var(--accent-color); border-color: var(--accent-color); color: white; }
</style>

<template>
    <div class="modal-overlay">
        <div class="modal-content warning-modal">
            <h3>Supprimer la paire ?</h3>
            <p v-if="pair">Voulez-vous vraiment retirer <b>{{ pair.symbol }}</b> de votre tableau MM ?</p>
            
            <div class="modal-actions">
                <button @click="$emit('close')">Annuler</button>
                <button class="danger" @click="$emit('confirm')">Supprimer</button>
            </div>
        </div>
    </div>
</template>

<script setup>
defineProps(['pair']);
defineEmits(['close', 'confirm']);
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
.modal-content.warning-modal {
    background: var(--surface-color);
    padding: 20px;
    border-radius: 8px;
    width: 300px;
}
.modal-content.warning-modal h3 {
    color: #f44336;
    border-bottom: 2px solid #f44336;
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
}
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }
.modal-actions button { background: transparent; border: 1px solid var(--border-color); color: var(--text-color); padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
.modal-actions button.danger { background: #f44336; border-color: #f44336; color: white; }
</style>

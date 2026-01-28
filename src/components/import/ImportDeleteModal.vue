<script setup lang="ts">
defineProps<{
    show: boolean
}>();

const emit = defineEmits(['confirm', 'cancel']);
</script>

<template>
    <div v-if="show" class="modal-overlay">
        <div class="modal-content">
            <h3>⚠️ Confirmation</h3>
            <p>Voulez-vous vraiment supprimer cette ligne de l'import ?</p>
            <p class="modal-subtext">Cette action est irréversible pour la session en cours.</p>
            
            <div class="modal-actions">
                <button class="modal-btn cancel" @click="$emit('cancel')">Annuler</button>
                <button class="modal-btn confirm" @click="$emit('confirm')">Confirmer</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
}

.modal-content {
    background: #2a2a2a;
    padding: 2rem;
    border-radius: 12px;
    border: 1px solid #444;
    width: 400px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.modal-content h3 {
    margin-top: 0;
    color: #ffd700; /* Gold warning */
}

.modal-subtext {
    font-size: 0.9rem;
    color: #888;
    margin-bottom: 2rem;
}

.modal-actions {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
}

.modal-btn {
    flex: 1;
    padding: 0.8rem;
    border: none;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
}

.modal-btn.cancel {
    background: #2196F3;
    color: white;
}

.modal-btn.cancel:hover {
    background: #1976D2;
}

.modal-btn.confirm {
    background: transparent;
    border: 1px solid #f44336;
    color: #f44336;
}

.modal-btn.confirm:hover {
    background: #f44336;
    color: white;
}
</style>

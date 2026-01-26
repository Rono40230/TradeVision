<template>
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content danger-zone">
            <h3 class="danger-title">Supprimer le portefeuille ?</h3>
            <p>
                Vous êtes sur le point de supprimer définitivement le compte 
                <strong>{{ account?.name }}</strong>.
            </p>
            <p>
                Cette action effacera également <strong>tout l'historique de trading</strong> associé à ce compte.<br>
                Cette action est irréversible.
            </p>
            <div class="modal-actions">
                <button class="btn cancel" @click="$emit('close')">Annuler</button>
                <button class="btn delete-confirm" @click="$emit('confirm')">Supprimer Définitivement</button>
            </div>
        </div>
    </div>
</template>

<script setup>
defineProps({
    show: Boolean,
    account: Object
});

defineEmits(['close', 'confirm']);
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
}

.modal-content {
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    padding: 2rem;
    border-radius: 16px;
    width: 400px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
}

.btn {
    padding: 0.8rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    border: none;
}

.btn.cancel {
    background: #2196F3;
    color: white;
    border: none;
}
.btn.cancel:hover {
    background: #1976D2;
}

/* Danger Modal Styles */
.modal-content.danger-zone {
    border-color: #f44336;
    box-shadow: 0 10px 40px rgba(244, 67, 54, 0.2);
}
.danger-title {
    color: #f44336;
    margin: 0;
    font-size: 1.4rem;
}
.btn.delete-confirm {
    background: #f44336;
    color: white;
}
.btn.delete-confirm:hover {
    background: #d32f2f;
}
</style>

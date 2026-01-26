<template>
    <div v-if="show" class="modal-overlay">
        <div class="modal-content">
            <h3>Supprimer le Trade</h3>
            <p v-if="trade">
                Êtes-vous certain de vouloir supprimer définitivement le trade 
                <strong>{{ trade.symbol }}</strong> ({{ trade.type }}) ?
            </p>
            <p class="warning-text">
                Cette action est irréversible.
            </p>

            <div class="modal-actions">
                <button class="cancel-btn" @click="$emit('update:show', false)">Annuler</button>
                <button class="submit-btn danger" @click="$emit('confirm')">Supprimer</button>
            </div>
        </div>
    </div>
</template>

<script setup>
defineProps({
    show: Boolean,
    trade: Object
});

defineEmits(['update:show', 'confirm']);
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: var(--surface-color);
    padding: 2rem;
    border-radius: 8px;
    width: 400px;
    max-width: 90%;
    border: 1px solid var(--border-color);
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    text-align: center;
}

.modal-content h3 {
    margin-top: 0;
    margin-bottom: 1.5rem;
}

.warning-text {
    color: var(--danger-color);
    font-size: 0.9rem;
    margin: 1.5rem 0;
    font-weight: bold;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
}

.cancel-btn {
    background: #2196F3;
    border: none;
    color: white;
    padding: 0.6rem 1.2rem;
    border-radius: 4px;
    cursor: pointer;
}
.cancel-btn:hover {
    background: #1976D2;
    color: white;
}

.submit-btn {
    background: var(--accent-color);
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
}
.submit-btn.danger {
    background-color: #f44336;
}
.submit-btn.danger:hover {
    background-color: #d32f2f;
}
</style>

<template>
    <div v-if="show" class="modal-overlay">
        <div class="modal-content">
            <h3>Confirmer l'Assignation</h3>
            <p v-if="trade">
                Voulez-vous vraiment assigner le trade 
                <strong>{{ trade.symbol }} {{ trade.type }} {{ trade.strike }}</strong> ?
            </p>
            <p class="warning-text">
                Cela clôturera ce trade et ouvrira une nouvelle position "Shares" automatiquement.
            </p>

            <div class="modal-actions">
                <button class="cancel-btn" @click="$emit('update:show', false)">Annuler</button>
                <button class="submit-btn danger" @click="$emit('confirm')">Confirmer Assignation</button>
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
    color: #ffd700;
    font-size: 0.9rem;
    background: rgba(255, 215, 0, 0.1);
    padding: 1rem;
    border-radius: 4px;
    margin: 1.5rem 0;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
}

.cancel-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    padding: 0.6rem 1.2rem;
    border-radius: 4px;
    cursor: pointer;
}
.cancel-btn:hover {
    background: rgba(255,255,255,0.05);
    color: var(--text-color);
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
    background-color: var(--danger-color);
}
.submit-btn:hover {
    filter: brightness(1.1);
}
</style>

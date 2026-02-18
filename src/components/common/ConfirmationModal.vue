<script setup>
defineProps({
    show: Boolean,
    title: {
        type: String,
        default: 'Confirmation'
    },
    message: {
        type: String,
        default: 'Êtes-vous sûr de vouloir effectuer cette action ?'
    },
    confirmText: {
        type: String,
        default: 'Confirmer'
    },
    cancelText: {
        type: String,
        default: 'Annuler'
    },
    type: {
        type: String,
        default: 'warning' // 'warning', 'danger', 'info'
    }
});

const emit = defineEmits(['confirm', 'cancel']);
</script>

<template>
    <div v-if="show" class="modal-overlay" @click.self="$emit('cancel')">
        <div class="modal-content" :class="type">
            <h3>{{ title }}</h3>
            <p>{{ message }}</p>
            
            <div class="modal-actions">
                <button class="modal-btn cancel" @click="$emit('cancel')">{{ cancelText }}</button>
                <button class="modal-btn confirm" :class="type" @click="$emit('confirm')">{{ confirmText }}</button>
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
    z-index: 2000;
    backdrop-filter: blur(4px);
}

.modal-content {
    background: #1e1e1e;
    padding: 24px;
    border-radius: 12px;
    border: 1px solid #333;
    width: 90%;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
}

h3 {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 1.4rem;
}

p {
    color: #ccc;
    margin-bottom: 24px;
    line-height: 1.5;
}

.modal-actions {
    display: flex;
    gap: 12px;
}

.modal-btn {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.modal-btn.cancel {
    background: #444;
    color: white;
}

.modal-btn.cancel:hover {
    background: #555;
}

/* Types */
.modal-content.warning h3 { color: #f39c12; }
.modal-btn.confirm.warning { background: #f39c12; color: white; }
.modal-btn.confirm.warning:hover { background: #e67e22; }

.modal-content.danger h3 { color: #e74c3c; }
.modal-btn.confirm.danger { background: #e74c3c; color: white; }
.modal-btn.confirm.danger:hover { background: #c0392b; }

.modal-content.info h3 { color: #3498db; }
.modal-btn.confirm.info { background: #3498db; color: white; }
.modal-btn.confirm.info:hover { background: #2980b9; }
</style>

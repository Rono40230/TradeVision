<template>
    <div class="bento-card action-zone">
        <h3>Actions Rapides</h3>
        <div class="action-buttons">
            <button class="action-btn rocket-btn" @click="$emit('navigate', 'rocket-academy')">
                <span>+</span> Saisir Option
            </button>
            <button class="action-btn kasper-btn" @click="$emit('navigate', 'kasper-academy')">
                <span>+</span> Journal Kasper
            </button>
            <button class="action-btn import-btn" @click="$emit('navigate', 'import')">
                <span>📥</span> Import IBKR
            </button>
        </div>
        
        <h3 class="mt-4">Alertes</h3>
        <div class="alerts-list">
            <div class="alert-item warning">
                <span class="icon">⚠️</span>
                <span>Vérifier assignations (Vendredi)</span>
            </div>
            <div class="alert-item info">
                <span class="icon">ℹ️</span>
                <span>Revue mensuelle à faire</span>
            </div>
        </div>
    </div>
</template>

<script setup>
defineEmits(['navigate']);
</script>

<style scoped>
.bento-card {
    background: var(--surface-color);
    border-radius: 16px;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
}

.action-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.action-btn {
    padding: 0.8rem;
    border: none;
    border-radius: 8px;
    color: white;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: transform 0.1s;
}
.action-btn:hover { transform: translateY(-2px); }

.rocket-btn { background: linear-gradient(90deg, #d32f2f 0%, #f44336 100%); }
.kasper-btn { background: linear-gradient(90deg, #7b1fa2 0%, #9c27b0 100%); }

.import-btn { 
    background: #333; 
    color: #a0a0a0; 
    border: 1px dashed #555; 
    margin-top: 0.5rem; 
}
.import-btn:hover { 
    background: #444; 
    color: white; 
    border-color: #888; 
}

.alerts-list { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
.alert-item { padding: 0.8rem; border-radius: 8px; font-size: 0.9rem; display: flex; gap: 0.5rem; align-items: center; }
.alert-item.warning { background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); color: #ffb74d; }
.alert-item.info { background: rgba(33, 150, 243, 0.1); border: 1px solid rgba(33, 150, 243, 0.3); color: #64b5f6; }

.mt-4 { margin-top: 1.5rem; }
</style>

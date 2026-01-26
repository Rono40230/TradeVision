<template>
    <div class="dropdown-menu" @click.stop>
        <div class="menu-header">Mes Portefeuilles</div>
        
        <div 
            v-for="acc in accountsList" 
            :key="acc.id" 
            class="menu-item"
            :class="{ active: acc.id === currentAccountId }"
            @click="$emit('select', acc.id)"
        >
            <div class="item-content">
                <span class="acc-name">{{ acc.name }}</span>
                <span v-if="acc.account_number" class="acc-num-badge">#{{ acc.account_number }}</span>
            </div>
            <div class="item-actions">
                <span class="acc-currency">{{ acc.currency }}</span>
                <!-- Only show delete if strictly more than 1 account -->
                <button 
                    v-if="accountsList.length > 1"
                    class="btn-delete-mini" 
                    @click.stop="$emit('askDelete', acc)"
                    title="Supprimer ce portefeuille"
                >🗑</button>
            </div>
        </div>

        <div class="divider"></div>
        
        <div class="menu-item add-action" @click="$emit('openAdd')">
            <span>+ Nouveau Portefeuille</span>
        </div>
    </div>
</template>

<script setup>
defineProps({
    accountsList: { type: Array, required: true },
    currentAccountId: { type: Number, required: true }
});

defineEmits(['select', 'askDelete', 'openAdd']);
</script>

<style scoped>
.dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    width: 280px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    overflow: hidden;
    padding: 0.5rem 0;
}

.menu-header {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    color: var(--text-muted);
    font-weight: 600;
    letter-spacing: 1px;
}

.menu-item {
    padding: 0.8rem 1rem;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background 0.2s;
}

.item-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.item-actions {
    display: flex;
    align-items: center;
    gap: 0.8rem;
}

.menu-item:hover {
    background: rgba(255,255,255,0.05);
}

.menu-item.active {
    background: rgba(156, 39, 176, 0.1); /* Kasper purple tint */
    border-left: 3px solid #9c27b0;
}

.menu-item.active .acc-name {
    color: #9c27b0;
}

.acc-name {
    font-weight: 500;
}

.acc-num-badge {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-family: monospace;
}

.acc-currency {
    font-size: 0.8rem;
    color: var(--text-muted);
    background: rgba(255,255,255,0.05);
    padding: 2px 6px;
    border-radius: 4px;
}

.btn-delete-mini {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    color: var(--text-muted);
    opacity: 0.6;
    transition: all 0.2s;
    padding: 4px;
    line-height: 1;
    border-radius: 4px;
}

.menu-item:hover .btn-delete-mini {
    opacity: 0.8;
}

.btn-delete-mini:hover {
    opacity: 1 !important;
    color: #f44336; /* Red on hover */
    background: rgba(244, 67, 54, 0.1);
    transform: scale(1.1);
}

.divider {
    height: 1px;
    background: var(--border-color);
    margin: 0.5rem 0;
}

.add-action {
    color: var(--primary-color);
    font-weight: 600;
}
</style>

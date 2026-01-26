<template>
    <div class="account-switcher-container">
        
        <div class="switcher-trigger" @click.stop="toggleDropdown">
            <span class="label">Compte actif :</span>
            <span class="current-name">{{ currentAccountName }}</span>
            <span v-if="currentAccountNumber" class="current-num">#{{ currentAccountNumber }}</span>
            <span class="icon">▼</span>
        </div>

        <KasperAccountList 
            v-if="isOpen"
            :accountsList="accountsList"
            :currentAccountId="currentAccountId"
            @select="selectAccount"
            @askDelete="askDelete"
            @openAdd="openAddModal"
        />

        <KasperAccountAddModal 
            :show="showAddModal" 
            @close="showAddModal = false"
            @confirm="confirmAddAccount"
        />

        <KasperAccountDeleteModal
            :show="showDeleteModal"
            :account="accountToDelete"
            @close="showDeleteModal = false"
            @confirm="confirmDeleteAccount"
        />

    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useKasperState } from '../../composables/useKasperState.js';
import KasperAccountList from './KasperAccountList.vue';
import KasperAccountAddModal from './KasperAccountAddModal.vue';
import KasperAccountDeleteModal from './KasperAccountDeleteModal.vue';

const { accountsList, currentAccountId, switchAccount, addAccount, deleteAccount } = useKasperState();

const isOpen = ref(false);
const showAddModal = ref(false);
const showDeleteModal = ref(false);
const accountToDelete = ref(null);

const currentAccountName = computed(() => {
    const acc = accountsList.value.find(a => a.id === currentAccountId.value);
    return acc ? acc.name : 'Sélectionner...';
});

const currentAccountNumber = computed(() => {
    const acc = accountsList.value.find(a => a.id === currentAccountId.value);
    return acc ? acc.account_number : '';
});

function toggleDropdown() {
    isOpen.value = !isOpen.value;
}

// Close dropdown when clicking outside
if (typeof window !== 'undefined') {
    window.addEventListener('click', () => {
        isOpen.value = false;
    });
}

function selectAccount(id) {
    if (id !== currentAccountId.value) {
        switchAccount(id);
    }
    isOpen.value = false;
}

function openAddModal() {
    isOpen.value = false;
    showAddModal.value = true;
}

async function confirmAddAccount(payload) {
    await addAccount(payload.name, payload.capital, payload.currency, payload.accountNumber);
    
    // Auto-select the new one (it's the last one)
    const newId = accountsList.value[accountsList.value.length - 1].id;
    if (newId) switchAccount(newId);
    
    showAddModal.value = false;
}

function askDelete(acc) {
    isOpen.value = false; // Close dropdown
    accountToDelete.value = acc;
    showDeleteModal.value = true;
}

async function confirmDeleteAccount() {
    if (accountToDelete.value) {
        await deleteAccount(accountToDelete.value.id);
        showDeleteModal.value = false;
        accountToDelete.value = null;
    }
}
</script>

<style scoped>
.account-switcher-container {
    position: relative;
    display: inline-block;
    z-index: 100;
}

.switcher-trigger {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    transition: all 0.2s;
    user-select: none;
}

.switcher-trigger:hover {
    border-color: var(--primary-color);
    background: rgba(255,255,255,0.05);
}

.label {
    color: var(--text-muted);
    font-size: 0.85rem;
}

.current-name {
    font-weight: 600;
    color: var(--text-color);
}

.current-num {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-family: monospace;
    background: rgba(255,255,255,0.05);
    padding: 2px 6px;
    border-radius: 4px;
}

.icon {
    font-size: 0.7rem;
    color: var(--text-muted);
}
</style>

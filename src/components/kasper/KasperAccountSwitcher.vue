<template>
    <div class="account-switcher-container">
        
        <div class="switcher-trigger" @click.stop="toggleDropdown">
            <span class="label">Compte actif :</span>
            <span class="current-name">{{ currentAccountName }}</span>
            <span v-if="currentAccountNumber" class="current-num">#{{ currentAccountNumber }}</span>
            <span class="icon">▼</span>
        </div>

        <div v-if="isOpen" class="dropdown-menu" @click.stop>
            <div class="menu-header">Mes Portefeuilles</div>
            
            <div 
                v-for="acc in accountsList" 
                :key="acc.id" 
                class="menu-item"
                :class="{ active: acc.id === currentAccountId }"
                @click="selectAccount(acc.id)"
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
                        @click.stop="askDelete(acc)"
                        title="Supprimer ce portefeuille"
                    >🗑</button>
                </div>
            </div>

            <div class="divider"></div>
            
            <div class="menu-item add-action" @click="openAddModal">
                <span>+ Nouveau Portefeuille</span>
            </div>
        </div>

        <!-- MODAL AJOUT COMPTE -->
        <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
            <div class="modal-content">
                <h3>Nouveau Portefeuille</h3>
                
                <div class="form-group">
                    <label>Nom du compte/broker</label>
                    <input v-model="newAccountName" placeholder="ex: Interactive Brokers" ref="nameInput">
                </div>

                <div class="form-group">
                    <label>N° du compte (Optionnel)</label>
                    <input v-model="newAccountNumber" placeholder="ex: U12345678">
                </div>
                
                <div class="form-group">
                    <label>Capital de départ</label>
                    <input v-model.number="newAccountCapital" type="number" placeholder="ex: 5000">
                </div>

                <div class="form-group">
                    <label>Devise</label>
                    <select v-model="newAccountCurrency">
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                    </select>
                </div>

                <div class="modal-actions">
                    <button class="btn cancel" @click="showAddModal = false">Annuler</button>
                    <button class="btn confirm" @click="confirmAddAccount" :disabled="!newAccountName">Créer</button>
                </div>
            </div>
        </div>

        <!-- MODAL CONFIRMATION SUPPRESSION -->
        <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
            <div class="modal-content danger-zone">
                <h3 class="danger-title">Supprimer le portefeuille ?</h3>
                <p>
                    Vous êtes sur le point de supprimer définitivement le compte 
                    <strong>{{ accountToDelete?.name }}</strong>.
                </p>
                <p>
                    Cette action effacera également <strong>tout l'historique de trading</strong> associé à ce compte.<br>
                    Cette action est irréversible.
                </p>
                <div class="modal-actions">
                    <button class="btn cancel" @click="showDeleteModal = false">Annuler</button>
                    <button class="btn delete-confirm" @click="confirmDeleteAccount">Supprimer Définitivement</button>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useKasperState } from '../../composables/useKasperState.js';

const { accountsList, currentAccountId, switchAccount, addAccount, deleteAccount } = useKasperState();

const isOpen = ref(false);
const showAddModal = ref(false);
const showDeleteModal = ref(false);
const accountToDelete = ref(null);

const newAccountName = ref('');
const newAccountNumber = ref('');
const newAccountCapital = ref(1000);
const newAccountCurrency = ref('USD');
const nameInput = ref(null);

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
    newAccountName.value = '';
    newAccountNumber.value = '';
    newAccountCapital.value = 5000;
    
    // Focus input
    nextTick(() => {
        if(nameInput.value) nameInput.value.focus();
    });
}

async function confirmAddAccount() {
    if(!newAccountName.value) return;
    
    await addAccount(newAccountName.value, newAccountCapital.value, newAccountCurrency.value, newAccountNumber.value);
    
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

/* DROPDOWN */
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

/* MODAL */
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

.modal-content h3 {
    margin: 0;
    font-size: 1.4rem;
    color: var(--text-color);
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-group label {
    font-size: 0.9rem;
    color: var(--text-muted);
}

.form-group input, .form-group select {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    padding: 0.8rem;
    border-radius: 8px;
    color: var(--text-color);
    font-size: 1rem;
}

.form-group select {
    color: #000; /* Force black text for dropdown */
    background-color: #fff; /* Force white background for consistency with OS dropdowns */
}

.form-group input:focus {
    border-color: var(--primary-color);
    outline: none;
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
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border-color);
}

.btn.confirm {
    background: #90CAF9; /* Bleu pastel */
    color: #121212;
}

.btn.confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Danger Modal Styles */
.modal-content.danger-zone {
    border-color: #f44336;
    box-shadow: 0 10px 40px rgba(244, 67, 54, 0.2);
}
.danger-title {
    color: #f44336;
}
.btn.delete-confirm {
    background: #f44336;
    color: white;
}
.btn.delete-confirm:hover {
    background: #d32f2f;
}

</style>

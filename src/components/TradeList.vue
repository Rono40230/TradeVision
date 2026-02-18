<template>
  <div class="trade-list">
    <h3>Historique des trades</h3>
    <table v-if="trades.length > 0">
      <thead>
        <tr>
          <th>Date</th>
          <th>Symbole</th>
          <th>Type</th>
          <th>Prix</th>
          <th>Quantité</th>
          <th>Stratégie</th>
          <th>Statut</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="trade in paginatedTrades" :key="trade.id">
          <td>{{ trade.date }}</td>
          <td>{{ trade.symbol }}</td>
          <td>{{ trade.type }}</td>
          <td>{{ trade.price }}</td>
          <td>{{ trade.quantity }}</td>
          <td>{{ trade.strategy }}</td>
          <td>{{ trade.status }}</td>
          <td>
            <div class="btn-group">
              <button v-if="trade.status === 'open'" @click="closeTrade(trade)" class="close-btn">Fermer</button>
              <button @click="confirmDelete(trade)" class="delete-btn">Supprimer</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Pagination Controls -->
    <div class="pagination" v-if="trades.length > pageSize">
      <button 
        :disabled="currentPage === 1" 
        @click="currentPage--"
        class="page-btn"
      >
        Précédent
      </button>
      <span class="page-info">
        Page {{ currentPage }} sur {{ totalPages }} ({{ trades.length }} trades)
      </span>
      <button 
        :disabled="currentPage === totalPages" 
        @click="currentPage++"
        class="page-btn"
      >
        Suivant
      </button>
    </div>
    
    <p v-else-if="trades.length === 0">Aucun trade enregistré.</p>

    <!-- Confirmation Modal -->
    <ConfirmationModal
      :show="showDeleteModal"
      title="Supprimer le trade"
      :message="`Voulez-vous vraiment supprimer le trade sur ${tradeToDelete?.symbol} ?`"
      confirmText="Supprimer"
      type="danger"
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, defineEmits, defineProps, watch, computed } from 'vue';
import Database from '@tauri-apps/plugin-sql';
import ConfirmationModal from './common/ConfirmationModal.vue';

const emit = defineEmits(['statsUpdated']);
const props = defineProps(['filter']);

const trades = ref([]);
const showDeleteModal = ref(false);
const tradeToDelete = ref(null);

// Pagination
const currentPage = ref(1);
const pageSize = ref(15);

const totalPages = computed(() => Math.ceil(trades.value.length / pageSize.value));

const paginatedTrades = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return trades.value.slice(start, end);
});

// Reset page when filter or trades change
watch(() => props.filter, () => {
  currentPage.value = 1;
  loadTrades();
});

onMounted(async () => {
  await loadTrades();
});

async function loadTrades() {
  const db = await Database.load('sqlite:trading.db');
  let result;
  if (props.filter && props.filter !== 'all') {
      result = await db.select('SELECT * FROM trades WHERE asset_type = ? AND status = "closed" AND is_deleted = 0 ORDER BY date DESC', [props.filter]);
  } else {
      result = await db.select('SELECT * FROM trades WHERE status = "closed" AND is_deleted = 0 ORDER BY date DESC');
  }
  trades.value = result;
}

async function closeTrade(trade) {
  // Simple close: assume current price is entered
  const closePrice = prompt('Prix de clôture:');
  if (closePrice) {
    const db = await Database.load('sqlite:trading.db');
    const profitLoss = (trade.type === 'buy') ? (parseFloat(closePrice) - trade.price) * trade.quantity : (trade.price - parseFloat(closePrice)) * trade.quantity;
    
    // Log before update
    await db.execute(
      'INSERT INTO audit_logs (table_name, record_id, action, old_value, new_value) VALUES (?, ?, ?, ?, ?)',
      ['trades', trade.id.toString(), 'CLOSE', JSON.stringify(trade), JSON.stringify({ ...trade, status: 'closed', close_price: parseFloat(closePrice), profit_loss: profitLoss })]
    );

    await db.execute('UPDATE trades SET status = "closed", close_price = ?, profit_loss = ? WHERE id = ?', [parseFloat(closePrice), profitLoss, trade.id]);
    await loadTrades();
    emit('statsUpdated');
  }
}

function confirmDelete(trade) {
  tradeToDelete.value = trade;
  showDeleteModal.value = true;
}

async function handleDelete() {
  if (!tradeToDelete.value) return;
  
  try {
    const db = await Database.load('sqlite:trading.db');
    
    // Audit Log
    await db.execute(
      'INSERT INTO audit_logs (table_name, record_id, action, old_value) VALUES (?, ?, ?, ?)',
      ['trades', tradeToDelete.value.id.toString(), 'DELETE', JSON.stringify(tradeToDelete.value)]
    );

    // Soft delete
    await db.execute('UPDATE trades SET is_deleted = 1 WHERE id = ?', [tradeToDelete.value.id]);
    
    showDeleteModal.value = false;
    tradeToDelete.value = null;
    await loadTrades();
    emit('statsUpdated');
  } catch (error) {
    console.error('Failed to delete trade:', error);
  }
}
</script>

<style scoped>
.trade-list {
  margin-top: 2rem;
  background: var(--bg-color, #1a1a1a);
  border-radius: 8px;
}

h3 {
  color: var(--text-color, #e0e0e0);
  margin-bottom: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th, td {
  border-bottom: 1px solid var(--border-color, #333);
  padding: 1rem;
  text-align: left;
  color: var(--text-color, #e0e0e0);
}

th {
  background: var(--surface-color, #2c2c2c);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.5px;
  color: var(--text-muted, #a0a0a0);
}

tr:hover {
  background-color: rgba(255, 255, 255, 0.02);
}

p {
  color: var(--text-muted, #777);
  font-style: italic;
}

button {
  background: transparent;
  color: var(--accent-color, #396cd8);
  border: 1px solid var(--accent-color, #396cd8);
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

button:hover {
  background: var(--accent-color, #396cd8);
  color: white;
}

.btn-group {
  display: flex;
  gap: 0.5rem;
}

.close-btn {
  color: var(--success-color, #27ae60);
  border-color: var(--success-color, #27ae60);
}

.close-btn:hover {
  background: var(--success-color, #27ae60);
}

.delete-btn {
  color: var(--danger-color, #e74c3c);
  border-color: var(--danger-color, #e74c3c);
}

.delete-btn:hover {
  background: var(--danger-color, #e74c3c);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  margin-top: 1rem;
  border-top: 1px solid var(--border-color, #333);
}

.page-btn {
  padding: 0.4rem 0.8rem;
  background: var(--surface-light, #333);
  border: 1px solid var(--border-color, #444);
  border-radius: 4px;
  color: var(--text-color, #e0e0e0);
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.85rem;
  color: var(--text-muted, #a0a0a0);
}
</style>

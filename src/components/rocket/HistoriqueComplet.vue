<template>
  <div class="historique-container">
    <!-- Header -->
    <div class="historique-header">
      <h2>Historique des Trades</h2>
      <div class="header-actions">
        <button class="export-btn" @click="handleExport" :disabled="isSyncing || trades.length === 0">
          📥 Exporter CSV
        </button>
        <button class="repair-btn" @click="handleRepair" :disabled="isSyncing" title="Recalcule les stratégies de tout l'historique">
          🔧 Réparer les stratégies
        </button>
        <button class="sync-btn" @click="handleSync" :disabled="isSyncing">
          <span v-if="!isSyncing">🔄 Synchroniser avec IB</span>
          <span v-else>Synchronisation...</span>
        </button>
      </div>
    </div>

    <!-- Errors -->
    <div v-if="syncError" class="sync-error">
      ❌ Erreur de synchronisation : {{ syncError }}
    </div>
    <div v-if="localError" class="sync-error">
      ❌ Erreur : {{ localError }}
    </div>

    <!-- Filters -->
    <div class="filters">
      <select v-model="filterStrategy" class="filter-select">
        <option value="">Toutes les stratégies</option>
        <option value="Rockets">Rockets</option>
        <option value="Wheel">Wheel</option>
        <option value="pcs standard">PCS Standard</option>
        <option value="pcs iron condor">Iron Condor</option>
      </select>

      <input
        v-model="filterSymbol"
        type="text"
        placeholder="Rechercher un symbole..."
        class="filter-input"
      />

      <select v-model="sortBy" class="filter-select">
        <option value="-open_date">Plus récent d'abord</option>
        <option value="open_date">Plus ancien d'abord</option>
        <option value="-realized_pnl">Meilleur P/L</option>
        <option value="realized_pnl">Moins bon P/L</option>
      </select>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Nombre de trades</div>
        <div class="stat-value">{{ filteredTrades.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total P/L</div>
        <div class="stat-value" :class="totalPnL >= 0 ? 'positive' : 'negative'">
          {{ formatCurrency(totalPnL) }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Taux de réussite</div>
        <div class="stat-value">{{ winRate }}%</div>
      </div>
    </div>

    <!-- Table -->
    <div v-if="filteredTrades.length > 0" class="trades-table">
      <table>
        <thead>
          <tr>
            <th>Symbole</th>
            <th>Stratégie</th>
            <th>Sens</th>
            <th>Qté</th>
            <th>Prix</th>
            <th>Commission</th>
            <th>P/L</th>
            <th>Date d'ouverture</th>
            <th>Date de clôture</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="trade in paginatedTrades" :key="trade.ib_trade_id" class="trade-row">
            <td class="symbol-cell">{{ trade.symbol }}</td>
            <td>
              <span class="strategy-badge" :class="`strategy-${trade.strategy}`">
                {{ trade.strategy }}
              </span>
            </td>
            <td :class="`side-${trade.side.toLowerCase()}`">{{ trade.side }}</td>
            <td>{{ trade.quantity }}</td>
            <td>${{ trade.price_avg.toFixed(2) }}</td>
            <td>${{ trade.commission.toFixed(2) }}</td>
            <td :class="trade.realized_pnl >= 0 ? 'positive' : 'negative'">
              {{ formatCurrency(trade.realized_pnl) }}
            </td>
            <td>{{ formatDate(trade.open_date) }}</td>
            <td>{{ trade.close_date ? formatDate(trade.close_date) : '—' }}</td>
            <td>
              <button @click="openDeleteModal(trade)" class="action-btn delete" title="Supprimer de la vue">
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="filteredTrades.length > pageSize" class="pagination-controls">
      <button 
        class="pagination-btn" 
        :disabled="currentPage === 1" 
        @click="currentPage--"
      >
        ◀ Précédent
      </button>
      
      <span class="pagination-info">
        Page <strong>{{ currentPage }}</strong> sur {{ totalPages }}
      </span>

      <button 
        class="pagination-btn" 
        :disabled="currentPage === totalPages" 
        @click="currentPage++"
      >
        Suivant ▶
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredTrades.length === 0" class="empty-state">
      <p>No trades found. Sync from IB to get started!</p>
    </div>

    <!-- Confirmation Modal -->
    <ConfirmationModal
      :show="showDeleteModal"
      title="Supprimer de l'historique"
      :message="`Voulez-vous vraiment masquer ce trade (${tradeToDelete?.symbol}) ? Il ne sera plus visible même après synchronisation.`"
      confirmText="Masquer"
      type="danger"
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useIBSync } from '../../composables/useIBSync'
import { initDB } from '../../utils/db'
import ConfirmationModal from '../common/ConfirmationModal.vue'
import { exportToCSV } from '../../utils/exporters.js'

// State
const filterStrategy = ref('')
const filterSymbol = ref('')
const sortBy = ref('-open_date')
const trades = ref([])
const currentPage = ref(1)
const pageSize = ref(50)
const localError = ref('')
const showDeleteModal = ref(false)
const tradeToDelete = ref(null)

// Sync composable
const { isSyncing, lastSyncTime, syncError, tradesCount, syncFromIB, recalculateAllStrategies } = useIBSync()

// DB reference
let db = null

// Load trades from DB
const loadTrades = async () => {
  try {
    if (!db) {
      db = await initDB()
    }
    const result = await db.select('SELECT * FROM rocket_trades_history WHERE is_deleted = 0 ORDER BY open_date DESC')
    trades.value = result
    localError.value = ''
  } catch (error) {
    console.error('Error loading trades:', error)
    localError.value = error.message
  }
}

// Filtered and sorted trades
const filteredTrades = computed(() => {
  let filtered = trades.value.filter((trade) => {
    const matchStrategy =
      !filterStrategy.value || trade.strategy === filterStrategy.value
    const matchSymbol =
      !filterSymbol.value || trade.symbol.toLowerCase().includes(filterSymbol.value.toLowerCase())
    return matchStrategy && matchSymbol
  })

  // Sort
  filtered.sort((a, b) => {
    const field = sortBy.value.replace(/^-/, '')
    const isDesc = sortBy.value.startsWith('-')
    const aVal = a[field]
    const bVal = b[field]

    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return isDesc ? -comparison : comparison
  })

  return filtered
})

// Computed stats
const totalPnL = computed(() =>
  filteredTrades.value.reduce((sum, t) => sum + (t.realized_pnl || 0), 0)
)

const winRate = computed(() => {
  if (filteredTrades.value.length === 0) return 0
  const wins = filteredTrades.value.filter((t) => (t.realized_pnl || 0) > 0).length
  return Math.round((wins / filteredTrades.value.length) * 100)
})

const totalPages = computed(() => Math.ceil(filteredTrades.value.length / pageSize.value))

const paginatedTrades = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredTrades.value.slice(start, end)
})

// Reset pagination when filters change
watch([filterStrategy, filterSymbol, sortBy], () => {
  currentPage.value = 1
})

// Methods
const handleExport = () => {
  if (filteredTrades.value.length === 0) return

  // Maps to a clean format: {Date, Symbol, Strategy, Side, Qty, Price, Comm, PnL}
  const exportData = filteredTrades.value.map(t => ({
    Date: t.open_date ? formatDate(t.open_date) : 'N/A',
    Symbol: t.symbol,
    Strategy: t.strategy,
    Side: t.side,
    Qty: t.quantity,
    Price: t.price_avg.toFixed(2),
    Comm: t.commission.toFixed(2),
    PnL: t.realized_pnl.toFixed(2)
  }))

  const headers = {
    Date: 'Date',
    Symbol: 'Symbol',
    Strategy: 'Strategy',
    Side: 'Side',
    Qty: 'Qty',
    Price: 'Price',
    Comm: 'Comm',
    PnL: 'PnL'
  }

  const today = new Date().toISOString().split('T')[0]
  exportToCSV(exportData, headers, `Trades_Export_${today}.csv`)
}

const handleSync = async () => {
  try {
    if (!db) {
      db = await initDB()
    }
    // Call sync via composable (which internally handles Rust invocation)
    await syncFromIB(db, 'IBKR')
    // Reload trades from DB after sync
    await loadTrades()
  } catch (error) {
    console.error('Sync failed:', error)
    localError.value = error.message
  }
}

const handleRepair = async () => {
  try {
    if (!db) db = await initDB()
    const result = await recalculateAllStrategies(db)
    if (result.success) {
      alert(`Successfully recalculated ${result.count} trades!`)
      await loadTrades()
    } else {
      localError.value = result.error
    }
  } catch (error) {
    localError.value = error.message
  }
}

const openDeleteModal = (trade) => {
  tradeToDelete.value = trade
  showDeleteModal.value = true
}

const handleDelete = async () => {
  if (!tradeToDelete.value) return

  try {
    if (!db) db = await initDB()
    
    // Audit Log
    await db.execute(
      'INSERT INTO audit_logs (table_name, record_id, action, old_value) VALUES (?, ?, ?, ?)',
      ['rocket_trades_history', tradeToDelete.value.ib_trade_id, 'HIDE', JSON.stringify(tradeToDelete.value)]
    )

    // Soft delete
    await db.execute('UPDATE rocket_trades_history SET is_deleted = 1 WHERE ib_trade_id = ?', [tradeToDelete.value.ib_trade_id])
    
    showDeleteModal.value = false
    tradeToDelete.value = null
    await loadTrades()
  } catch (error) {
    console.error('Failed to hide trade:', error)
    localError.value = error.message
  }
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Lifecycle
onMounted(async () => {
  await loadTrades()
})
</script>

<style scoped>
.historique-container {
  padding: 1.5rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 8px;
  min-height: 100vh;
}

.historique-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.historique-header h2 {
  font-size: 2rem;
  font-weight: bold;
  color: #2c3e50;
  margin: 0;
}

.sync-btn {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #00d4ff 0%, #0066cc 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.sync-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.sync-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.repair-btn, .export-btn {
  padding: 0.75rem 1rem;
  background: white;
  color: #2c3e50;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  margin-right: 0.5rem;
  transition: all 0.2s;
}

.repair-btn:hover:not(:disabled), .export-btn:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #ccc;
  transform: translateY(-1px);
}

.repair-btn:disabled, .export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sync-status {
  padding: 0.75rem 1rem;
  background: #d4edda;
  color: #155724;
  border-left: 4px solid #28a745;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.sync-error {
  padding: 0.75rem 1rem;
  background: #f8d7da;
  color: #721c24;
  border-left: 4px solid #dc3545;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.filter-select,
.filter-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 4px rgba(0, 102, 204, 0.2);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-label {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #2c3e50;
}

.stat-value.positive {
  color: #28a745;
}

.stat-value.negative {
  color: #dc3545;
}

.trades-table {
  background: white;
  border-radius: 6px;
  overflow-x: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

thead tr {
  background: #f8f9fa;
  border-bottom: 2px solid #ddd;
}

th {
  padding: 1rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
}

tbody tr {
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s;
}

tbody tr:hover {
  background-color: #f8f9fa;
}

td {
  padding: 0.75rem;
}

.symbol-cell {
  font-weight: 600;
  color: #0066cc;
}

.strategy-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.strategy-ROCKETS {
  background: rgba(76, 175, 80, 0.2);
  color: #2e7d32;
}

.strategy-WHEEL {
  background: rgba(33, 150, 243, 0.2);
  color: #1565c0;
}

.strategy-PCS {
  background: rgba(156, 39, 176, 0.2);
  color: #6a1b9a;
}

.side-buy {
  color: #28a745;
  font-weight: 600;
}

.side-sell {
  color: #dc3545;
  font-weight: 600;
}

.positive {
  color: #28a745;
  font-weight: 600;
}

.negative {
  color: #dc3545;
  font-weight: 600;
}

.action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  transition: transform 0.2s;
  padding: 4px;
}

.action-btn:hover {
  transform: scale(1.2);
}

.action-btn.delete {
  filter: grayscale(1);
}

.action-btn.delete:hover {
  filter: grayscale(0);
}

.empty-state {
  background: white;
  padding: 3rem;
  text-align: center;
  border-radius: 6px;
  color: #666;
}

/* Pagination Styles (Dark Theme) */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-top: 2rem;
  padding: 1rem;
  background: var(--surface-color, #2c2c2c);
  border-radius: 8px;
  border: 1px solid var(--border-color, #333);
}

.pagination-info {
  color: var(--text-color, #e0e0e0);
  font-size: 0.95rem;
}

.pagination-btn {
  padding: 0.5rem 1rem;
  background: var(--accent-color, #396cd8);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--accent-hover, #4a7ce8);
  transform: translateY(-1px);
}

.pagination-btn:disabled {
  background: #444;
  color: #888;
  cursor: not-allowed;
  opacity: 0.5;
  border: 1px solid #555;
}
</style>

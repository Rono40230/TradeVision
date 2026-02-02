<template>
  <div class="historique-container">
    <!-- Header -->
    <div class="historique-header">
      <h2>Historique des Trades</h2>
      <button class="sync-btn" @click="handleSync" :disabled="isSyncing">
        <span v-if="!isSyncing">🔄 Sync from IB</span>
        <span v-else>Syncing...</span>
      </button>
    </div>

    <!-- Sync Status -->
    <div v-if="lastSyncTime" class="sync-status">
      ✅ Last sync: {{ formatDate(lastSyncTime) }} ({{ tradesCount }} trades)
    </div>
    <div v-if="syncError" class="sync-error">
      ❌ Sync Error: {{ syncError }}
    </div>
    <div v-if="localError" class="sync-error">
      ❌ Error: {{ localError }}
    </div>

    <!-- Filters -->
    <div class="filters">
      <select v-model="filterStrategy" class="filter-select">
        <option value="">All Strategies</option>
        <option value="ROCKETS">Rockets</option>
        <option value="WHEEL">Wheel</option>
        <option value="PCS">PCS</option>
      </select>

      <input
        v-model="filterSymbol"
        type="text"
        placeholder="Search symbol..."
        class="filter-input"
      />

      <select v-model="sortBy" class="filter-select">
        <option value="-open_date">Newest First</option>
        <option value="open_date">Oldest First</option>
        <option value="-realized_pnl">Best P/L</option>
        <option value="realized_pnl">Worst P/L</option>
      </select>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Total Trades</div>
        <div class="stat-value">{{ filteredTrades.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total P/L</div>
        <div class="stat-value" :class="totalPnL >= 0 ? 'positive' : 'negative'">
          {{ formatCurrency(totalPnL) }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Win Rate</div>
        <div class="stat-value">{{ winRate }}%</div>
      </div>
    </div>

    <!-- Table -->
    <div v-if="filteredTrades.length > 0" class="trades-table">
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Strategy</th>
            <th>Side</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Commission</th>
            <th>P/L</th>
            <th>Open Date</th>
            <th>Close Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="trade in filteredTrades" :key="trade.ib_trade_id" class="trade-row">
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
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <p>No trades found. Sync from IB to get started!</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useIBSync } from '../../composables/useIBSync'
import { initDB } from '../../utils/db'

// State
const filterStrategy = ref('')
const filterSymbol = ref('')
const sortBy = ref('-open_date')
const trades = ref([])
const localError = ref('')

// Sync composable
const { isSyncing, lastSyncTime, syncError, tradesCount, syncFromIB } = useIBSync()

// DB reference
let db = null

// Load trades from DB
const loadTrades = async () => {
  try {
    if (!db) {
      db = await initDB()
    }
    const result = await db.select('SELECT * FROM rocket_trades_history ORDER BY open_date DESC')
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

// Methods
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

.empty-state {
  background: white;
  padding: 3rem;
  text-align: center;
  border-radius: 6px;
  color: #666;
}
</style>

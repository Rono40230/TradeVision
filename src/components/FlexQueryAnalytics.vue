<template>
  <div class="flex-analytics-container">
    <div class="header">
      <h2>📊 Flex Query Analytics</h2>
      <button @click="toggleCredentials" class="btn-toggle">
        {{ showCredentials ? '🔒 Hide' : '🔓 Show' }} Credentials
      </button>
    </div>

    <!-- Credentials Section -->
    <div v-if="showCredentials" class="credentials-section">
      <div class="form-group">
        <label>Flex Token:</label>
        <input 
          v-model="flexToken" 
          type="password" 
          placeholder="Paste your Flex Query token"
          class="input-field"
        />
      </div>

      <div class="form-group">
        <label>Query ID:</label>
        <input 
          v-model.number="queryId" 
          type="number" 
          placeholder="e.g., 123456"
          class="input-field"
        />
      </div>

      <button 
        @click="fetchTrades" 
        :disabled="loading || !flexToken || !queryId"
        class="btn btn-primary"
      >
        {{ loading ? '⏳ Loading...' : '🔄 Fetch Trades' }}
      </button>
    </div>

    <!-- Error/Loading Message -->
    <div v-if="loading" class="loading-message">
      <div class="spinner"></div>
      <p>⏳ <strong>Fetching trades...</strong></p>
      <p class="subtitle">If report was recently configured, IBKR may need a few seconds to generate it.</p>
    </div>
    
    <div v-if="error" class="error-message">
      ❌ {{ error }}
      <p v-if="error.includes('Max retries')" class="retry-hint">
        Try again in 30 seconds after IBKR finishes generating the report.
      </p>
    </div>

    <!-- Statistics -->
    <div v-if="trades.length > 0" class="stats-grid">
      <div class="stat-card">
        <h3>Total Trades</h3>
        <p class="stat-value">{{ trades.length }}</p>
      </div>
      <div class="stat-card">
        <h3>Total P&L</h3>
        <p class="stat-value" :class="{ positive: totalPnL >= 0, negative: totalPnL < 0 }">
          ${{ totalPnL.toFixed(2) }}
        </p>
      </div>
      <div class="stat-card">
        <h3>Win Rate</h3>
        <p class="stat-value">{{ winRate }}%</p>
      </div>
    </div>

    <!-- Trades Table -->
    <div v-if="trades.length > 0" class="trades-section">
      <table class="trades-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Symbol</th>
            <th>Side</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Commission</th>
            <th>P&L</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="trade in trades" :key="trade.trade_id" class="trade-row">
            <td>{{ trade.date }}</td>
            <td class="symbol">{{ trade.symbol }}</td>
            <td :class="trade.side">{{ trade.side }}</td>
            <td>{{ trade.quantity }}</td>
            <td>${{ trade.price.toFixed(2) }}</td>
            <td>${{ trade.commission.toFixed(2) }}</td>
            <td :class="trade.realized_pnl > 0 ? 'profit' : 'loss'">
              ${{ trade.realized_pnl.toFixed(2) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="empty-state">
      Enter credentials and click "Fetch Trades"
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useFlexQueries } from '../composables/useFlexQueries.js'

const {
  trades,
  loading,
  error: fetchError,
  totalPnL,
  winRate,
  fetchFlexTrades: fetchFlexTradesApi
} = useFlexQueries()

const flexToken = ref('')
const queryId = ref(null)
const error = computed(() => fetchError.value)
const showCredentials = ref(true)

// Load credentials from localStorage on mount
onMounted(() => {
  const savedToken = localStorage.getItem('flex_token')
  const savedQueryId = localStorage.getItem('flex_query_id')
  
  if (savedToken) flexToken.value = savedToken
  if (savedQueryId) queryId.value = parseInt(savedQueryId)
})

// Save credentials to localStorage when they change
watch(flexToken, (newValue) => {
  if (newValue) localStorage.setItem('flex_token', newValue)
})

watch(queryId, (newValue) => {
  if (newValue) localStorage.setItem('flex_query_id', newValue.toString())
})

const fetchTrades = async () => {
  if (!flexToken.value || !queryId.value) {
    // Erreur sera gérée par useFlexQueries
    return
  }
  await fetchFlexTradesApi(flexToken.value, queryId.value)
}

const toggleCredentials = () => {
  showCredentials.value = !showCredentials.value
}
</script>

<style scoped>
.flex-analytics-container {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 2px solid #ddd;
  padding-bottom: 10px;
}

.header h2 {
  margin: 0;
  color: #333;
}

.credentials-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 15px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.form-group label {
  font-weight: bold;
  min-width: 100px;
}

.input-field {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #007bff;
  color: white;
  width: 100%;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-toggle {
  padding: 8px 12px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.btn-toggle:hover {
  background: #e0e0e0;
}

.error-message {
  color: #d32f2f;
  background: #ffebee;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 15px;
  border-left: 4px solid #d32f2f;
}

.error-message p {
  margin: 8px 0 0 0;
  font-size: 0.9em;
}

.retry-hint {
  color: #666;
  font-style: italic;
}

.loading-message {
  text-align: center;
  padding: 30px 20px;
  background: #e3f2fd;
  border-radius: 4px;
  margin-bottom: 15px;
  border-left: 4px solid #2196f3;
}

.loading-message p {
  margin: 10px 0;
  font-size: 1.1em;
  color: #1976d2;
}

.subtitle {
  font-size: 0.9em !important;
  color: #666 !important;
}

.spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-card h3 {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 0.9em;
}

.stat-value {
  margin: 0;
  font-size: 1.8em;
  font-weight: bold;
  color: #333;
}

.stat-value.positive {
  color: #28a745;
}

.stat-value.negative {
  color: #dc3545;
}

.trades-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.trades-table {
  width: 100%;
  border-collapse: collapse;
}

.trades-table th {
  background: #f0f0f0;
  padding: 12px;
  text-align: left;
  font-weight: bold;
  border-bottom: 2px solid #ddd;
}

.trades-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
}

.trades-table tr:hover {
  background: #f9f9f9;
}

.symbol {
  font-weight: bold;
  color: #007bff;
}

.BUY {
  color: #28a745;
  font-weight: bold;
}

.SELL {
  color: #dc3545;
  font-weight: bold;
}

.profit {
  color: #28a745;
  font-weight: bold;
}

.loss {
  color: #dc3545;
  font-weight: bold;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}
</style>

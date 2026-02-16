<template>
  <div class="flex-query-container">
    <h2>📊 Flex Query Configuration</h2>
    
    <div class="config-section">
      <label>Flex Token:</label>
      <input 
        v-model="flexToken" 
        type="password" 
        placeholder="Paste your Flex Query token here"
        class="input-field"
      />
      
      <label>Query ID:</label>
      <input 
        v-model.number="queryId" 
        type="number" 
        placeholder="e.g., 123456"
        class="input-field"
      />
      
      <button 
        @click="fetchFlexTrades" 
        :disabled="loading || !flexToken || !queryId"
        class="btn btn-primary"
      >
        {{ loading ? '⏳ Loading...' : '🔄 Fetch Trades from Flex Query' }}
      </button>
    </div>

    <div v-if="error" class="error-message">
      ❌ Error: {{ error }}
    </div>

    <div v-if="trades.length > 0" class="trades-section">
      <h3>Trades ({{ trades.length }})</h3>
      <table class="trades-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Side</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Commission</th>
            <th>P&L</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="trade in trades" :key="trade.trade_id">
            <td>{{ trade.symbol }}</td>
            <td :class="{ buy: trade.side === 'BUY', sell: trade.side === 'SELL' }">
              {{ trade.side }}
            </td>
            <td>{{ trade.quantity }}</td>
            <td>${{ trade.price.toFixed(2) }}</td>
            <td>${{ trade.commission.toFixed(2) }}</td>
            <td :class="{ profit: trade.realized_pnl > 0, loss: trade.realized_pnl < 0 }">
              ${{ trade.realized_pnl.toFixed(2) }}
            </td>
            <td>{{ trade.date }} {{ trade.time }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

const flexToken = ref('')
const queryId = ref(null)
const trades = ref([])
const loading = ref(false)
const error = ref('')

const fetchFlexTrades = async () => {
  if (!flexToken.value || !queryId.value) {
    error.value = 'Please fill in both Token and Query ID'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await invoke('fetch_flex_trades', {
      flexToken: flexToken.value,
      queryId: queryId.value
    })
    trades.value = result
    console.log(`✅ Fetched ${result.length} trades from Flex Query`)
  } catch (err) {
    error.value = err.toString()
    console.error('[FlexQuery] Error:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.flex-query-container {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 20px;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

label {
  font-weight: bold;
  color: #333;
}

.input-field {
  padding: 8px;
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
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  color: #d32f2f;
  background: #ffebee;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.trades-section {
  margin-top: 20px;
}

.trades-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  margin-top: 10px;
}

.trades-table th,
.trades-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.trades-table th {
  background: #f0f0f0;
  font-weight: bold;
}

.trades-table tr:hover {
  background: #f9f9f9;
}

.buy {
  color: #28a745;
  font-weight: bold;
}

.sell {
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
</style>

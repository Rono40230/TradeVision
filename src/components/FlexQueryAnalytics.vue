<template>
  <div class="flex-analytics-container">
    <!-- HEADER + CREDENTIALS SUR UNE LIGNE -->
    <div class="top-bar">
      <h2>📊 Flex Query Analytics</h2>

      <div class="credentials-inline" v-if="showCredentials">
        <input
          v-model="flexToken"
          type="password"
          placeholder="Jeton Flex Query"
          class="input-field"
        />
        <input
          v-model.number="queryId"
          type="number"
          placeholder="ID requête"
          class="input-field input-short"
        />
        <button
          @click="fetchTrades"
          :disabled="loading || !flexToken || !queryId"
          class="btn btn-primary"
        >
          {{ loading ? '⏳' : '🔄' }} {{ loading ? 'Chargement...' : 'Récupérer' }}
        </button>
      </div>

      <button @click="toggleCredentials" class="btn-toggle">
        {{ showCredentials ? '🔒' : '🔓' }}
      </button>
    </div>

    <!-- Error/Loading Message -->
    <div v-if="loading" class="loading-message">
      <div class="spinner"></div>
      <p>⏳ <strong>Récupération des trades...</strong></p>
      <p class="subtitle">Si le rapport a été récemment configuré, IBKR peut nécessiter quelques secondes pour le générer.</p>
    </div>
    
    <div v-if="error" class="error-message">
      ❌ {{ error }}
      <p v-if="error.includes('Max retries')" class="retry-hint">
        Réessayez dans 30 secondes, le temps qu'IBKR génère le rapport.
      </p>
    </div>

    <!-- Stats -->
    <div v-if="advancedStats" class="analytics-dashboard">
      <div class="stats-row">
        <div class="stat-card">
          <h3>Trades</h3>
          <p class="stat-value">{{ advancedStats.totalTrades }}</p>
        </div>
        <div class="stat-card">
          <h3>P/L Net</h3>
          <p class="stat-value" :class="{ positive: advancedStats.totalNetPnl >= 0, negative: advancedStats.totalNetPnl < 0 }">
            ${{ advancedStats.totalNetPnl }}
          </p>
        </div>
        <div class="stat-card">
          <h3>Taux réussite</h3>
          <p class="stat-value">{{ advancedStats.winRate }}%</p>
        </div>
        <div class="stat-card">
          <h3>ROI</h3>
          <p class="stat-value" :class="{ positive: advancedStats.totalROI >= 0, negative: advancedStats.totalROI < 0 }">
            {{ advancedStats.totalROI }}%
          </p>
        </div>
        <div class="stat-card">
          <h3>Profit Factor</h3>
          <p class="stat-value">{{ advancedStats.profitFactor }}</p>
        </div>
        <div class="stat-card">
          <h3>R/R Ratio</h3>
          <p class="stat-value">{{ advancedStats.rewardRiskRatio }}</p>
        </div>
        <div class="stat-card">
          <h3>Drawdown Max</h3>
          <p class="stat-value negative">${{ advancedStats.maxDrawdown }}</p>
        </div>
        <div class="stat-card">
          <h3>Série gains</h3>
          <p class="stat-value">{{ advancedStats.maxWinStreak }} <small class="text-muted">/ {{ advancedStats.maxLossStreak }}</small></p>
        </div>
        <div class="stat-card">
          <h3>Gain / Perte moy.</h3>
          <p class="stat-value">
            <span class="positive">${{ advancedStats.avgWin }}</span> / <span class="negative">${{ advancedStats.avgLoss }}</span>
          </p>
        </div>
        <div class="stat-card">
          <h3>Durée moy.</h3>
          <p class="stat-value">{{ advancedStats.avgHoldingTime }} j</p>
        </div>
      </div>

      <!-- Stratégie + Mensuel côte à côte -->
      <div class="bottom-row">
        <div v-if="byStrategy && byStrategy.length > 0" class="strategy-analysis">
          <h3>Par stratégie</h3>
          <div class="strategy-grid">
            <div v-for="strat in byStrategy" :key="strat.name" class="strategy-card">
              <h4>{{ strat.name }}</h4>
              <div class="strat-metrics">
                <div class="strat-pnl" :class="{ positive: strat.pnl >= 0, negative: strat.pnl < 0 }">
                  ${{ strat.pnl }}
                </div>
                <div class="strat-sub">
                  <span>{{ strat.tradesCount }} trades</span>
                  <span>WR: {{ strat.winRate }}%</span>
                  <span>ROI: {{ strat.roi }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="monthlyPL && monthlyPL.length > 0" class="monthly-breakdown">
          <h3>Par mois</h3>
          <div class="monthly-list">
            <div v-for="m in monthlyPL" :key="m.month" class="month-row">
              <span class="month-name">{{ m.month }}</span>
              <span class="month-count">{{ m.tradesCount }} trades</span>
              <span class="month-pnl" :class="{ positive: m.pnl >= 0, negative: m.pnl < 0 }">
                ${{ m.pnl }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="!loading" class="empty-state">
      <div class="empty-icon">📊</div>
      <p>Configurez vos identifiants IBKR et cliquez sur "Récupérer les trades" pour voir vos analyses.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useFlexQueries } from '../composables/useFlexQueries.js'
import { useAnalytics } from '../composables/useAnalytics.js'

const {
  trades,
  loading,
  error: fetchError,
  fetchFlexTrades: fetchFlexTradesApi
} = useFlexQueries()

// Advanced Analytics
const { stats: advancedStats, monthlyPL, byStrategy } = useAnalytics(trades)

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
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 20px;
}

/* TOP BAR : titre + credentials + toggle sur une ligne */
.top-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.top-bar h2 {
  margin: 0;
  font-size: 1rem;
  color: #333;
  white-space: nowrap;
}

.credentials-inline {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.credentials-inline .input-field {
  flex: 2;
  min-width: 120px;
}

.input-short {
  flex: 1 !important;
  min-width: 90px;
  max-width: 140px;
}

.btn-toggle {
  padding: 6px 10px;
  background: #e0e0e0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-toggle:hover {
  background: #d0d0d0;
}

/* STATS EN GRILLE SUR UNE OU DEUX LIGNES */
.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.stats-row .stat-card {
  flex: 1 1 80px;
  min-width: 80px;
  padding: 8px 10px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  text-align: center;
}

.stats-row .stat-card h3 {
  margin: 0 0 4px 0;
  color: #777;
  font-size: 0.68rem;
  text-transform: uppercase;
  white-space: nowrap;
}

.stats-row .stat-value {
  margin: 0;
  font-size: 1.1rem;
  font-weight: bold;
  color: #333;
}

/* BOTTOM : stratégie + mensuel côte à côte */
.bottom-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.header {
  display: none;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding: 15px;
  background: white;
  border-radius: 4px;
}

.page-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.9rem;
  color: #666;
}

.credentials-section {
  display: none;
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
  white-space: nowrap;
  flex-shrink: 0;
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
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-card h3 {
  margin: 0 0 6px 0;
  color: #666;
  font-size: 0.78em;
}

.stat-value {
  margin: 0;
  font-size: 1.4em;
  font-weight: bold;
  color: #333;
}

.stat-value.mb-0 {
  margin-bottom: 0;
}

.text-muted {
  font-size: 0.8rem;
  color: #888;
}

.stat-value.positive {
  color: #28a745;
}

.stat-value.negative {
  color: #dc3545;
}

/* New Analysis Sections */
.strategy-analysis, .monthly-breakdown {
  flex: 1 1 200px;
  min-width: 180px;
  margin-top: 0;
  background: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

.strategy-analysis h3, .monthly-breakdown h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 0.85rem;
  color: #444;
  border-bottom: 1px solid #eee;
  padding-bottom: 6px;
}

.strategy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.strategy-card {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #007bff;
}

.strategy-card h4 {
  margin: 0 0 10px 0;
  font-size: 1rem;
  color: #333;
}

.strat-metrics {
  display: flex;
  flex-direction: column;
}

.strat-pnl {
  font-size: 1.4rem;
  font-weight: bold;
  margin-bottom: 8px;
}

.strat-sub {
  display: flex;
  gap: 10px;
  font-size: 0.8rem;
  color: #666;
}

.monthly-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.month-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 10px 15px;
  background: #f8f9fa;
  border-radius: 4px;
  align-items: center;
}

.month-name {
  font-weight: bold;
  color: #333;
}

.month-count {
  color: #666;
  text-align: center;
}

.month-pnl {
  text-align: right;
  font-weight: bold;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.3;
}

/* Removed styles for Table and Pagination */
</style>

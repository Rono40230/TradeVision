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
        <button @click="triggerCsvImport" class="btn btn-secondary" title="Importer un CSV exporté manuellement depuis IBKR">
          📂 Importer CSV
        </button>
        <input ref="csvFileInput" type="file" accept=".csv" style="display:none" @change="onCsvFileSelected" />
        <button
          v-if="trades && trades.length > 0"
          @click="saveToDb"
          :disabled="saving"
          class="btn btn-save"
          title="Sauvegarder les trades importés en base de données"
        >
          {{ saving ? '⏳ Sauvegarde...' : saveSuccess ? saveMsg : `💾 Sauvegarder en DB (${trades.length} trades)` }}
        </button>
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

      <!-- Table des trades avec stratégie manuelle -->
      <FlexTradesTable :trades="trades" :overrides="strategyOverrides" />
    </div>
    <div v-else-if="!loading" class="empty-state">
      <p>Configurez vos identifiants IBKR et cliquez sur "Récupérer les trades" pour voir vos analyses.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useFlexQueries } from '../composables/useFlexQueries.js'
import { useAnalytics } from '../composables/useAnalytics.js'
import { useIBSync } from '../composables/useIBSync.js'
import { initDB } from '../utils/db.js'
import { invoke } from '@tauri-apps/api/core'
import FlexTradesTable from './FlexTradesTable.vue'
import { histRefreshToken } from '../composables/useHistoriqueRefresh.js'

const {
  trades,
  loading,
  error: fetchError,
  fetchFlexTrades: fetchFlexTradesApi,
  strategyOverrides
} = useFlexQueries()

const { syncFromTrades, isSyncing } = useIBSync()
const saving = ref(false)
const saveSuccess = ref(false)
const saveMsg = ref('')
let db = null

const saveToDb = async () => {
  if (!trades.value || trades.value.length === 0) return
  saving.value = true
  saveSuccess.value = false
  saveMsg.value = ''
  try {
    if (!db) db = await initDB()
    const result = await syncFromTrades(db, trades.value, strategyOverrides.value)
    if (result.success) {
      const already = trades.value.length - result.count
      saveMsg.value = result.count === 0
        ? `Déjà à jour (${already} trades en DB)`
        : `✅ ${result.count} nouveaux trades sauvés${already > 0 ? ` (${already} déjà présents)` : ''}`
      saveSuccess.value = true
      // Notifier HistoriqueComplet de se rafraîchir
      if (result.count > 0) histRefreshToken.value++
      setTimeout(() => { saveSuccess.value = false; saveMsg.value = '' }, 5000)
    }
  } catch (err) {
    fetchError.value = err.toString()
  } finally {
    saving.value = false
  }
}

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

// Import CSV local
const csvFileInput = ref(null)

const triggerCsvImport = () => {
  csvFileInput.value?.click()
}

const onCsvFileSelected = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const rawTrades = await invoke('parse_flex_trades_csv', { csvContent: text })
    trades.value = (rawTrades || []).map(t => {
      const isOption = t.asset_class === 'OPT' || /\d{6}[CP]\d+/.test(t.symbol)
      const isCall   = /\d{6}C\d+/.test(t.symbol) || t.put_call === 'C'
      let strategy = 'Rockets'
      if (isOption) {
        const sell = t.side === 'SELL'
        strategy = isCall ? (sell ? 'Naked Call' : 'Long Call') : (sell ? 'Naked Put' : 'Long Put')
      }
      return {
        trade_id:     t.trade_id,
        symbol:       t.symbol,
        asset_class:  t.asset_class || '',
        side:         t.side,
        quantity:     t.quantity,
        multiplier:   t.multiplier || 1,
        price:        t.price,
        commission:   t.commission,
        realized_pnl: t.realized_pnl || 0,
        date:         t.date,
        expiry:       t.expiry || '',
        strike:       t.strike || 0,
        put_call:     t.put_call || '',
        open_close:   t.open_close || '',
        exchange:     t.exchange || '',
        proceeds:     t.proceeds || 0,
        cost_basis:   t.cost_basis || 0,
        notes:        t.notes || '',
        strategy,
      }
    })
    // Reset file input pour pouvoir re-sélectionner le même fichier
    event.target.value = ''
  } catch (err) {
    fetchError.value = err.toString()
  }
}
</script>

<style scoped src="./flex-query-analytics.css"></style>

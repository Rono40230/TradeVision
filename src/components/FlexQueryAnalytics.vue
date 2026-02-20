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
    <div v-if="trades && trades.length > 0" class="analytics-dashboard">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">Trades</div>
          <div class="stat-value">{{ trades.length }} <small class="text-muted">({{ importGroups.length }} positions)</small></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total P/L</div>
          <div class="stat-value" :class="importTotalPnL >= 0 ? 'positive' : 'negative'">
            {{ formatCurrency(importTotalPnL) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Positions gagnantes</div>
          <div class="stat-value">{{ importWinRate }}%</div>
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
import { useIBSync } from '../composables/useIBSync.js'
import { buildGroups } from '../composables/useTradeGrouping.js'
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

// ── Stats identiques à HistoriqueComplet ─────────────────────────────────────
const importGroups = computed(() => buildGroups(trades.value || []))
const importTotalPnL = computed(() =>
  (trades.value || []).reduce((sum, t) => sum + (t.realized_pnl || 0), 0)
)
const importWinRate = computed(() => {
  if (importGroups.value.length === 0) return 0
  const wins = importGroups.value.filter(g => g.totalPnl > 0).length
  return Math.round((wins / importGroups.value.length) * 100)
})
const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value)

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
    console.log(`[saveToDb] trades.value.length=${trades.value.length}`)
    const ocGroups = {}
    for (const t of trades.value) {
      const oc = (t.open_close || '(vide)').toUpperCase()
      ocGroups[oc] = (ocGroups[oc] || 0) + 1
    }
    console.log('[saveToDb] open_close répartition avant syncFromTrades:', ocGroups)
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
    trades.value = (rawTrades || [])
      // Exclure trades ouverts : cohérence avec DB (flex_trades = clos uniquement)
      .filter(t => (t.open_close || '').toUpperCase() !== 'O')
      .map(t => {
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

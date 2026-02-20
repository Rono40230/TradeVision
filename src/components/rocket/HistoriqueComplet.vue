<template>
  <div class="historique-container">
    <!-- Header -->
    <div class="historique-header">
      <h2>Historique des Trades</h2>
      <div class="header-actions">
        <button class="sync-btn" @click="handleSync" :disabled="isSyncing">
          <span v-if="!isSyncing">🔄 Re-sync IBKR</span>
          <span v-else>⏳ Synchronisation...</span>
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
    <div v-if="syncMsg" class="sync-success">
      {{ syncMsg }}
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Trades</div>
        <div class="stat-value">{{ trades.length }} <small class="text-muted">({{ groups.length }} positions)</small></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total P/L</div>
        <div class="stat-value" :class="totalPnL >= 0 ? 'positive' : 'negative'">
          {{ formatCurrency(totalPnL) }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Positions gagnantes</div>
        <div class="stat-value">{{ winRate }}%</div>
      </div>
    </div>

    <!-- Table — même composant et même groupage que l'import CSV -->
    <FlexTradesTable
      v-if="trades.length > 0"
      :trades="trades"
      :overrides="strategyOverrides"
    />

    <!-- Empty state -->
    <div v-else-if="!loading" class="empty-state">
      <p>Aucun trade en base. Importez un CSV ou cliquez sur 🔄 Re-sync IBKR.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useIBSync } from '../../composables/useIBSync'
import { useFlexQueries } from '../../composables/useFlexQueries.js'
import { buildGroups } from '../../composables/useTradeGrouping.js'
import { initDB } from '../../utils/db'
import FlexTradesTable from '../FlexTradesTable.vue'
import { histRefreshToken } from '../../composables/useHistoriqueRefresh.js'

// State
const trades = ref([])
const loading = ref(false)
const localError = ref('')
const syncMsg = ref('')

// Composables
const { isSyncing, syncError, syncFromIB } = useIBSync()
const { strategyOverrides } = useFlexQueries()

// DB reference
let db = null

// ── Chargement depuis DB ─────────────────────────────────────────────────────
const loadTrades = async () => {
  loading.value = true
  try {
    if (!db) db = await initDB()
    trades.value = await db.select(
      'SELECT * FROM flex_trades WHERE is_deleted = 0 ORDER BY date DESC'
    )
    localError.value = ''
  } catch (error) {
    localError.value = error.message
  } finally {
    loading.value = false
  }
}

// ── Re-sync IBKR ─────────────────────────────────────────────────────────────
const handleSync = async () => {
  syncMsg.value = ''
  localError.value = ''
  try {
    if (!db) db = await initDB()
    const flexToken = localStorage.getItem('flex_token')
    const flexQueryId = parseInt(localStorage.getItem('flex_query_id') || '0')
    if (!flexToken || !flexQueryId) {
      localError.value = 'Flex Token et Query ID non configurés. Renseignez-les dans la page HISTORIQUE IB.'
      return
    }
    const result = await syncFromIB(db, flexToken, flexQueryId, strategyOverrides.value)
    if (result.success) {
      syncMsg.value = result.count === 0
        ? 'Déjà à jour — aucun nouveau trade.'
        : `✅ ${result.count} nouveaux trades ajoutés.`
      setTimeout(() => { syncMsg.value = '' }, 5000)
      await loadTrades()
    }
  } catch (error) {
    localError.value = error.message
  }
}

// ── Stats calculées depuis les groupes ───────────────────────────────────────
const groups = computed(() => buildGroups(trades.value))

const totalPnL = computed(() =>
  trades.value.reduce((sum, t) => sum + (t.realized_pnl || 0), 0)
)

const winRate = computed(() => {
  if (groups.value.length === 0) return 0
  const wins = groups.value.filter(g => g.totalPnl > 0).length
  return Math.round((wins / groups.value.length) * 100)
})

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)

// ── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  await loadTrades()
})

// Rechargement automatique quand FlexQueryAnalytics sauvegarde de nouveaux trades
watch(histRefreshToken, async () => {
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

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
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

.sync-error {
  padding: 0.75rem 1rem;
  background: #f8d7da;
  color: #721c24;
  border-left: 4px solid #dc3545;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.sync-success {
  padding: 0.75rem 1rem;
  background: #d4edda;
  color: #155724;
  border-left: 4px solid #28a745;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
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

.stat-value.positive { color: #28a745; }
.stat-value.negative { color: #dc3545; }

.empty-state {
  background: white;
  padding: 3rem;
  text-align: center;
  border-radius: 6px;
  color: #666;
  font-size: 1rem;
}
</style>

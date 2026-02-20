<template>
  <div class="flex-trades-table-wrapper">
    <div class="table-header-bar">
      <span class="trade-count">{{ trades.length }} trades · {{ sortedGroups.length }} positions</span>
      <input
        v-model="search"
        placeholder="🔍 Filtrer symbole…"
        class="search-input"
      />
    </div>

    <div class="table-scroll">
      <table class="trades-table">
        <thead>
          <tr>
            <th class="expand-col"></th>
            <th class="sortable" @click="setSort('assetClass')">
              AssetClass <span class="sort-icon">{{ sortIcon('assetClass') }}</span>
            </th>
            <th class="sortable" @click="setSort('underlying')">
              Symbole <span class="sort-icon">{{ sortIcon('underlying') }}</span>
            </th>
            <th>Multiplier</th>
            <th>Strike(s)</th>
            <th class="sortable" @click="setSort('expiry')">
              Expiry <span class="sort-icon">{{ sortIcon('expiry') }}</span>
            </th>
            <th class="sortable" @click="setSort('date')">
              DateTime <span class="sort-icon">{{ sortIcon('date') }}</span>
            </th>
            <th>Put/Call</th>
            <th>Exchange</th>
            <th>Qty</th>
            <th>TradePrice</th>
            <th>Proceeds</th>
            <th>IBCommission</th>
            <th>O/C</th>
            <th>Notes/Codes</th>
            <th>CostBasis</th>
            <th>Realized P/L</th>
            <th>Buy/Sell</th>
            <th class="sortable" @click="setSort('strategy')">
              Stratégie <span class="sort-icon">{{ sortIcon('strategy') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in sortedGroups" :key="group.key">
            <!-- Ligne résumée de la position -->
            <tr
              class="group-row"
              :class="{
                'row-win': group.totalPnl > 0,
                'row-loss': group.totalPnl < 0,
                'is-expanded': expandedGroups.has(group.key)
              }"
              @click="toggleGroup(group.key)"
            >
              <td class="expand-col">{{ expandedGroups.has(group.key) ? '▼' : '▶' }}</td>
              <td>{{ group.assetClass }}</td>
              <td class="symbol-cell">{{ group.underlying }}</td>
              <td>{{ group.multiplier }}</td>
              <td>{{ group.strikes || '—' }}</td>
              <td>{{ group.expiry || '—' }}</td>
              <td>{{ group.date }}</td>
              <td>{{ group.putCall || '—' }}</td>
              <td>{{ group.exchange }}</td>
              <td>{{ group.totalQty }}</td>
              <td>{{ group.legs > 1 ? '~' : '' }}${{ group.avgPrice.toFixed(4) }}</td>
              <td :class="group.totalProceeds >= 0 ? 'pnl-pos' : 'pnl-neg'">${{ group.totalProceeds.toFixed(2) }}</td>
              <td class="commission">-${{ Math.abs(group.totalCommission).toFixed(2) }}</td>
              <td>{{ group.openClose }}</td>
              <td class="notes">{{ group.notes }}</td>
              <td>${{ group.totalCostBasis.toFixed(2) }}</td>
              <td :class="group.totalPnl >= 0 ? 'pnl-pos' : 'pnl-neg'">
                <strong>${{ group.totalPnl.toFixed(2) }}</strong>
                <span v-if="group.totalPnl === 0 && group.isAssigned" class="badge-asgn" title="P/L reporté sur la position STK (assignment IBKR)">ASGN→STK</span>
              </td>
              <td :class="group.side === 'BUY' ? 'side-buy' : group.side === 'SELL' ? 'side-sell' : 'side-mixed'">
                {{ group.side }}
              </td>
              <td @click.stop>
                <select
                  :value="groupStrategy(group)"
                  @change="e => onGroupStrategyChange(group, e.target.value)"
                  class="strategy-select"
                >
                  <option v-for="s in STRATEGIES" :key="s" :value="s">{{ s }}</option>
                </select>
              </td>
            </tr>

            <!-- Sous-lignes (legs individuels) -->
            <template v-if="expandedGroups.has(group.key)">
              <tr
                v-for="trade in group.trades"
                :key="trade.trade_id"
                class="leg-row"
                :class="{ 'row-option': trade.asset_class === 'OPT' }"
              >
                <td class="expand-col leg-indent">└</td>
                <td>{{ trade.asset_class || '—' }}</td>
                <td class="symbol-cell leg-symbol">{{ trade.symbol }}</td>
                <td>{{ trade.multiplier }}</td>
                <td>{{ trade.strike > 0 ? trade.strike : '—' }}</td>
                <td>{{ trade.expiry || '—' }}</td>
                <td>{{ trade.date }}{{ trade.time ? ' ' + trade.time : '' }}</td>
                <td>{{ trade.put_call || '—' }}</td>
                <td>{{ trade.exchange || '—' }}</td>
                <td>{{ trade.quantity }}</td>
                <td>${{ trade.price.toFixed(4) }}</td>
                <td :class="trade.proceeds >= 0 ? 'pnl-pos' : 'pnl-neg'">${{ trade.proceeds.toFixed(2) }}</td>
                <td class="commission">-${{ Math.abs(trade.commission).toFixed(2) }}</td>
                <td>{{ trade.open_close || '—' }}</td>
                <td class="notes">{{ trade.notes || '—' }}</td>
                <td>${{ trade.cost_basis.toFixed(2) }}</td>
                <td :class="trade.realized_pnl >= 0 ? 'pnl-pos' : 'pnl-neg'">
                  ${{ trade.realized_pnl.toFixed(2) }}
                </td>
                <td :class="trade.side === 'BUY' ? 'side-buy' : 'side-sell'">{{ trade.side }}</td>
                <td><!-- stratégie gérée au niveau du groupe --></td>
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watchEffect } from 'vue'
import { setStrategyOverride } from '../composables/useFlexQueries.js'

const props = defineProps({
  trades: {
    type: Array,
    default: () => []
  },
  overrides: {
    type: Object,
    default: () => ({})
  }
})

const STRATEGIES = [
  'Wheel',
  'Rockets',
  'Put Credit Spread',
  'Covered Call',
  'Naked Put',
  'Naked Call',
  'Long Call',
  'Long Put',
  'Iron Condor',
  'Autre',
]

const search = ref('')
const expandedGroups = ref(new Set())
const sortKey = ref('')
const sortDir = ref('asc')

function setSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function sortIcon(key) {
  if (sortKey.value !== key) return '⇅'
  return sortDir.value === 'asc' ? '▲' : '▼'
}

/** Extrait le sous-jacent depuis un symbole OCC (ex. "AAPL  250919P00195000" → "AAPL") */
function extractUnderlying(symbol, assetClass) {
  if (assetClass === 'OPT') {
    return symbol.trim().split(/\s+/)[0]
  }
  return symbol
}

function toggleGroup(key) {
  const s = new Set(expandedGroups.value)
  if (s.has(key)) s.delete(key)
  else s.add(key)
  expandedGroups.value = s
}

const filteredTrades = computed(() => {
  if (!search.value) return props.trades
  const q = search.value.toLowerCase()
  return props.trades.filter(t => {
    const underlying = extractUnderlying(t.symbol, t.asset_class)
    return underlying.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q)
  })
})

/** Construit le résumé agrégé d'un groupe brut {key, underlying, assetClass, expiry, date, trades} */
function buildGroupSummary(g) {
  const ts = g.trades
  const strikes = [...new Set(ts.map(t => t.strike).filter(s => s > 0))].sort((a, b) => a - b)
  const putCalls = [...new Set(ts.map(t => t.put_call).filter(Boolean))]
  const sides = [...new Set(ts.map(t => t.side))]
  const totalQty = ts.reduce((sum, t) => sum + t.quantity, 0)
  const totalProceeds = ts.reduce((sum, t) => sum + t.proceeds, 0)
  const totalCommission = ts.reduce((sum, t) => sum + t.commission, 0)
  const totalCostBasis = ts.reduce((sum, t) => sum + t.cost_basis, 0)
  const totalPnl = ts.reduce((sum, t) => sum + t.realized_pnl, 0)
  const avgPrice = ts.length > 0 ? ts.reduce((sum, t) => sum + t.price, 0) / ts.length : 0
  const exchanges = [...new Set(ts.map(t => t.exchange).filter(Boolean))]
  const openCloseVals = [...new Set(ts.map(t => t.open_close).filter(Boolean))]
  const notesVals = [...new Set(ts.map(t => t.notes).filter(Boolean))]
  const ASGN_CODES = new Set(['A', 'EX', 'ASGN'])
  const isAssigned = ts.some(t => {
    if (!t.notes) return false
    return t.notes.split(/[,;/\s]+/).some(c => ASGN_CODES.has(c.trim().toUpperCase()))
  })
  return {
    ...g,
    legs: ts.length,
    strikes: strikes.length > 0 ? strikes.join(' / ') : '',
    multiplier: ts[0]?.multiplier ?? 1,
    putCall: putCalls.join('/'),
    exchange: exchanges.join('/') || '—',
    openClose: openCloseVals.join('/') || '—',
    notes: notesVals.slice(0, 2).join(', ') || '—',
    side: sides.length === 1 ? sides[0] : 'MIXED',
    totalQty,
    totalProceeds,
    totalCommission,
    totalCostBasis,
    totalPnl,
    avgPrice,
    isAssigned,
  }
}

/** Construit les groupes à partir d'un tableau de trades (fonction pure, sans réactivité) */
function buildGroups(trades) {
  const sorted = [...trades].sort((a, b) => {
    const da = `${a.date} ${a.time || '00:00:00'}`
    const db = `${b.date} ${b.time || '00:00:00'}`
    return da < db ? -1 : da > db ? 1 : 0
  })
  const nonStkMap = new Map()
  const stkOpen = new Map()
  const stkGroups = []
  const keyCount = new Map()  // compteur pour dédupliquer les clés identiques (même symbole acheté 2× le même jour)

  const uniqueKey = (base) => {
    const n = (keyCount.get(base) ?? 0) + 1
    keyCount.set(base, n)
    return n === 1 ? base : `${base}|${n}`
  }

  for (const trade of sorted) {
    if (trade.asset_class === 'STK') {
      const sym = trade.symbol.trim()
      const isBuy = trade.side === 'BUY'
      const qty = Math.abs(trade.quantity)
      if (isBuy) {
        const existing = stkOpen.get(sym)
        if (existing) {
          // Groupe déjà ouvert (balance > 0) → merger ce BUY dedans
          // - même jour : fill partiel IBKR (ordre fractionné)
          // - autre jour : nouvelle assignation Wheel (2ème put assigné sur la même position)
          existing.rawGroup.trades.push(trade)
          existing.balance += qty
        } else {
          const key = uniqueKey(`STK|${sym}|${trade.date}`)
          const rawGroup = { key, underlying: sym, assetClass: 'STK', expiry: '', date: trade.date, trades: [trade] }
          stkOpen.set(sym, { rawGroup, balance: qty })
        }
      } else {
        const open = stkOpen.get(sym)
        if (open) {
          open.rawGroup.trades.push(trade)
          open.balance -= qty
          if (open.balance <= 0) { stkGroups.push(open.rawGroup); stkOpen.delete(sym) }
        } else {
          const key = uniqueKey(`STK|${sym}|orphan|${trade.date}`)
          stkGroups.push({ key, underlying: sym, assetClass: 'STK', expiry: '', date: trade.date, trades: [trade] })
        }
      }
    } else {
      const underlying = extractUnderlying(trade.symbol, trade.asset_class)
      // OPT : clé par contrat (underlying + strike + expiry) → regroupe open et close du même contrat
      // CASH/FUT/autres : clé par (assetClass + underlying + expiry + date) comme avant
      const key = trade.asset_class === 'OPT'
        ? `OPT|${underlying}|${trade.strike}|${trade.expiry || ''}`
        : `${trade.asset_class}|${underlying}|${trade.expiry || ''}|${trade.date}`
      if (!nonStkMap.has(key)) {
        nonStkMap.set(key, { key, underlying, assetClass: trade.asset_class, expiry: trade.expiry, date: trade.date, trades: [] })
      }
      nonStkMap.get(key).trades.push(trade)
    }
  }
  for (const open of stkOpen.values()) stkGroups.push(open.rawGroup)
  return [...stkGroups, ...Array.from(nonStkMap.values())].map(buildGroupSummary)
}

const sortedGroups = shallowRef([])

watchEffect(() => {
  // watchEffect traque automatiquement TOUTES les .value lues ci-dessous
  const sk = sortKey.value
  const sd = sortDir.value
  const groups = buildGroups(filteredTrades.value)
  if (!sk) {
    sortedGroups.value = groups
    return
  }
  sortedGroups.value = groups.slice().sort((a, b) => {
    const va = sk === 'strategy' ? groupStrategy(a).toLowerCase() : (a[sk] ?? '').toString().toLowerCase()
    const vb = sk === 'strategy' ? groupStrategy(b).toLowerCase() : (b[sk] ?? '').toString().toLowerCase()
    if (va < vb) return sd === 'asc' ? -1 : 1
    if (va > vb) return sd === 'asc' ? 1 : -1
    return 0
  })
})

/** Détecte la stratégie par défaut selon le nombre de strikes et les codes IBKR */
function detectDefaultStrategy(group) {
  // CASH (forex, transferts) → toujours Autre
  if (group.assetClass === 'CASH') return 'Autre'

  const strikeCount = group.strikes ? group.strikes.split('/').filter(s => s.trim() !== '').length : 0

  // OPT : 2 strikes = spread (PCS), 1 strike = Wheel (put nu ou CC)
  if (group.assetClass === 'OPT') {
    if (strikeCount >= 2) return 'Put Credit Spread'
    if (strikeCount === 1) return 'Wheel'
    return 'Autre'
  }

  // STK : cherche si au moins un leg a le code "A" (Assignment) ou "Ex" (Exercise) dans les notes IBKR
  const hasAssignment = group.trades.some(t => {
    const n = (t.notes || '').toUpperCase().trim()
    if (!n) return false
    // Codes IBKR séparés par ; ou , ou espace — on teste chaque token
    const tokens = n.split(/[;,\s]+/).filter(Boolean)
    return tokens.some(code => code === 'A' || code === 'EX' || code === 'ASGN')
      || /\bA\b/.test(n)   // fallback: regex word-boundary si séparateur inhabituel
  })
  if (hasAssignment) return 'Wheel'   // Assignation → position Wheel (on a été assigné sur un put)

  // Achat STK sans code d'assignation → Rockets (achat volontaire d'actions)
  return 'Rockets'
}

/** Retourne la stratégie du groupe (override utilisateur prioritaire, sinon auto-détectée) */
function groupStrategy(group) {
  const firstTrade = group.trades[0]
  if (!firstTrade) return 'Autre'
  if (props.overrides[firstTrade.trade_id] != null) return props.overrides[firstTrade.trade_id]
  return detectDefaultStrategy(group)
}

/** Applique la stratégie à tous les trades du groupe */
function onGroupStrategyChange(group, strategy) {
  for (const trade of group.trades) {
    setStrategyOverride(trade.trade_id, strategy)
  }
}
</script>

<style scoped>
.flex-trades-table-wrapper {
  margin-top: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.table-header-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f0f4f8;
  border-bottom: 1px solid #e0e0e0;
}

.trade-count {
  font-size: 0.82rem;
  color: #555;
  white-space: nowrap;
}

.search-input {
  flex: 1;
  max-width: 220px;
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.82rem;
}

.table-scroll {
  overflow-x: auto;
  max-height: 560px;
  overflow-y: auto;
}

.trades-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.trades-table th {
  position: sticky;
  top: 0;
  background: #1e2a38;
  color: #e8eaf0;
  padding: 6px 8px;
  text-align: left;
  white-space: nowrap;
  z-index: 1;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.trades-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.trades-table th.sortable:hover {
  background: #2c3e54;
}

.sort-icon {
  font-size: 0.65rem;
  opacity: 0.7;
  margin-left: 3px;
}

.trades-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
  color: #111;
}

/* Ligne groupe (résumé position) */
.group-row {
  cursor: pointer;
  background: #f4f8fd;
  border-top: 2px solid #d0dce8;
}

.group-row:hover {
  background: #e8f1fb;
}

.group-row.is-expanded {
  background: #e2edf8;
}

/* Ligne sous-leg */
.leg-row {
  background: #fafafa;
}

.leg-row:hover {
  background: #f0f5ff;
}

.leg-row td {
  font-size: 0.75rem;
  color: #444;
  border-bottom: 1px solid #ebebeb;
}

.row-option {
  background: #fffff5;
}

.row-win { border-left: 3px solid #1a7f4b; }
.row-loss { border-left: 3px solid #c0392b; }

.expand-col {
  width: 20px;
  text-align: center;
  color: #777;
  font-size: 0.7rem;
  padding: 4px 4px;
}

.leg-indent {
  color: #aaa;
  font-size: 0.8rem;
}

.symbol-cell {
  font-weight: 600;
  font-family: monospace;
}

.leg-symbol {
  font-weight: 400;
  font-family: monospace;
  font-size: 0.72rem;
}

.side-buy   { color: #1a7f4b; font-weight: 600; }
.side-sell  { color: #c0392b; font-weight: 600; }
.side-mixed { color: #7a5c00; font-weight: 600; }

.pnl-pos { color: #1a7f4b; font-weight: 600; }
.pnl-neg { color: #c0392b; font-weight: 600; }

.badge-asgn {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 5px;
  font-size: 0.65rem;
  font-weight: 700;
  color: #7a5c00;
  background: #fff3cd;
  border: 1px solid #e6c75a;
  border-radius: 4px;
  letter-spacing: 0.03em;
  vertical-align: middle;
  cursor: help;
}

.commission { color: #888; }
.notes { color: #888; font-size: 0.72rem; max-width: 120px; overflow: hidden; text-overflow: ellipsis; }

.strategy-select {
  padding: 2px 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.76rem;
  background: #fff;
  cursor: pointer;
  min-width: 120px;
}

.strategy-select:focus {
  outline: 2px solid #4a90d9;
  border-color: transparent;
}
</style>

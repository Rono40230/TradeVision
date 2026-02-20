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
            <th class="sortable" @click="setSort('date')">
              DateTime <span class="sort-icon">{{ sortIcon('date') }}</span>
            </th>
            <th class="sortable" @click="setSort('expiry')">
              Expiry <span class="sort-icon">{{ sortIcon('expiry') }}</span>
            </th>
            <th>Put/Call</th>
            <th>Qty</th>
            <th>TradePrice</th>
            <th>Proceeds</th>
            <th>IBCommission</th>
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
              <td>{{ group.date }}</td>
              <td>{{ group.expiry || '—' }}</td>
              <td>{{ group.putCall || '—' }}</td>
              <td>{{ group.totalQty }}</td>
              <td>{{ group.legs > 1 ? '~' : '' }}${{ group.avgPrice.toFixed(4) }}</td>
              <td :class="group.totalProceeds >= 0 ? 'pnl-pos' : 'pnl-neg'">${{ group.totalProceeds.toFixed(2) }}</td>
              <td class="commission">-${{ Math.abs(group.totalCommission).toFixed(2) }}</td>
              <td :class="group.totalPnl >= 0 ? 'pnl-pos' : 'pnl-neg'">
                <strong>${{ group.totalPnl.toFixed(2) }}</strong>
                <span
                  v-if="group.totalPnl === 0 && group.isAssigned"
                  class="badge-asgn"
                  title="P/L reporté sur la position STK (assignment IBKR)"
                >ASGN→STK</span>
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
                <td>{{ trade.date }}{{ trade.time ? ' ' + trade.time : '' }}</td>
                <td>{{ trade.expiry || '—' }}</td>
                <td>{{ trade.put_call || '—' }}</td>
                <td>{{ trade.quantity }}</td>
                <td>${{ trade.price.toFixed(4) }}</td>
                <td :class="trade.proceeds >= 0 ? 'pnl-pos' : 'pnl-neg'">${{ trade.proceeds.toFixed(2) }}</td>
                <td class="commission">-${{ Math.abs(trade.commission).toFixed(2) }}</td>
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
import {
  STRATEGIES,
  extractUnderlying,
  buildGroups,
  groupStrategy as computeGroupStrategy,
} from '../composables/useTradeGrouping.js'

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

/** Retourne la stratégie du groupe (override utilisateur prioritaire, sinon auto-détectée) */
function groupStrategy(group) {
  return computeGroupStrategy(group, props.overrides)
}

/** Applique la stratégie à tous les trades du groupe */
function onGroupStrategyChange(group, strategy) {
  for (const trade of group.trades) {
    setStrategyOverride(trade.trade_id, strategy)
  }
}
</script>

<style scoped src="./flex-trades-table.css"></style>

import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'

// Overrides manuels de stratégie — module-level (partagé entre instances)
// Remis à zéro à chaque nouveau fetchFlexTrades
const strategyOverrides = ref({})

export function setStrategyOverride(tradeId, strategy) {
  strategyOverrides.value[tradeId] = strategy
}

export function useFlexQueries() {
  const trades = ref([])
  const loading = ref(false)
  const error = ref('')
  const lastFetch = ref(null)

  const totalPnL = computed(() => {
    return trades.value.reduce((sum, trade) => sum + trade.realized_pnl, 0)
  })

  const winRate = computed(() => {
    if (trades.value.length === 0) return 0
    const winners = trades.value.filter(t => t.realized_pnl > 0).length
    return (winners / trades.value.length * 100).toFixed(1)
  })

  const fetchFlexTrades = async (flexToken, queryId) => {
    if (!flexToken || !queryId) {
      throw new Error('Flex Token and Query ID are required')
    }

    loading.value = true
    error.value = ''
    // Reset des overrides manuels à chaque nouveau fetch
    strategyOverrides.value = {}

    try {
      const payload = {
        flexToken: flexToken,
        queryId: queryId
      }
      const rawTrades = await invoke('fetch_flex_trades', payload)

      // Mapper les trades bruts Rust → format analytics
      trades.value = (rawTrades || []).map(t => {
        const isOption = /\d{6}[CP]\d+/.test(t.symbol)
        const isCall   = /\d{6}C\d+/.test(t.symbol)
        let strategy = 'Rockets' // STK par défaut
        if (isOption) {
          const sell = t.side === 'SELL'
          strategy = isCall
            ? (sell ? 'Naked Call' : 'Long Call')
            : (sell ? 'Naked Put'  : 'Long Put')
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

      lastFetch.value = new Date()
      return trades.value
    } catch (err) {
      error.value = err.toString()
      throw err
    } finally {
      loading.value = false
    }
  }

  const clearTrades = () => {
    trades.value = []
    lastFetch.value = null
    error.value = ''
  }

  const getTradesBySymbol = (symbol) => {
    return trades.value.filter(t => t.symbol === symbol)
  }

  const getTradesBySide = (side) => {
    return trades.value.filter(t => t.side === side)
  }

  const getWinners = () => {
    return trades.value.filter(t => t.realized_pnl > 0)
  }

  const getLosers = () => {
    return trades.value.filter(t => t.realized_pnl < 0)
  }

  return {
    // State
    trades,
    loading,
    error,
    lastFetch,
    strategyOverrides,

    // Computed
    totalPnL,
    winRate,

    // Methods
    fetchFlexTrades,
    clearTrades,
    getTradesBySymbol,
    getTradesBySide,
    getWinners,
    getLosers
  }
}

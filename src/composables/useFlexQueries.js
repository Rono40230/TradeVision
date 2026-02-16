import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'

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

    try {
      const payload = {
        flexToken: flexToken,
        queryId: queryId
      }
      console.log('[FlexQuery] Sending payload:', payload)
      const result = await invoke('fetch_flex_trades', payload)
      trades.value = result || []
      lastFetch.value = new Date()
      console.log(`✅ Fetched ${trades.value.length} trades from Flex Query`)
      return result
    } catch (err) {
      error.value = err.toString()
      console.error('[FlexQuery] Full error:', err)
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

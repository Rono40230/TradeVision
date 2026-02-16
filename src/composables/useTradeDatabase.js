import { ref, computed } from 'vue'
import { Database } from '@tauri-apps/plugin-sql'
import { useFlexQueries } from './useFlexQueries.js'

let db = null

// Initialize database
export async function initializeTradeDatabase() {
  try {
    db = await Database.load('sqlite:trading_db.db')
    
    // Create trades table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS flex_trades (
        trade_id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        quantity REAL NOT NULL,
        price REAL NOT NULL,
        commission REAL NOT NULL,
        realized_pnl REAL NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(trade_id)
      )
    `)

    // Create index for faster queries
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_symbol ON flex_trades(symbol)
    `)
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_date ON flex_trades(date)
    `)

    console.log('✅ Trade database initialized')
    return true
  } catch (err) {
    console.error('❌ Database initialization failed:', err)
    return false
  }
}

// Use this composable in components
export function useTradeDatabase() {
  const { trades } = useFlexQueries()
  const dbTrades = ref([])
  const syncing = ref(false)

  const saveFlexTrades = async (newTrades) => {
    if (!db || !newTrades.length) return

    syncing.value = true
    let saved = 0
    let skipped = 0

    try {
      for (const trade of newTrades) {
        try {
          await db.execute(
            `INSERT INTO flex_trades 
             (trade_id, symbol, side, quantity, price, commission, realized_pnl, date, time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              trade.trade_id,
              trade.symbol,
              trade.side,
              trade.quantity,
              trade.price,
              trade.commission,
              trade.realized_pnl,
              trade.date,
              trade.time
            ]
          )
          saved++
        } catch (err) {
          // Trade already exists, skip it
          skipped++
        }
      }

      console.log(`✅ Saved ${saved} trades, ${skipped} already in database`)
      await loadAllTrades()
      return { saved, skipped }
    } catch (err) {
      console.error('❌ Error saving trades:', err)
      throw err
    } finally {
      syncing.value = false
    }
  }

  const loadAllTrades = async () => {
    if (!db) return []

    try {
      const result = await db.select('SELECT * FROM flex_trades ORDER BY date DESC')
      dbTrades.value = result || []
      console.log(`✅ Loaded ${dbTrades.value.length} trades from database`)
      return dbTrades.value
    } catch (err) {
      console.error('❌ Error loading trades:', err)
      return []
    }
  }

  const getTradesBySymbol = async (symbol) => {
    if (!db) return []

    try {
      const result = await db.select(
        'SELECT * FROM flex_trades WHERE symbol = ? ORDER BY date DESC',
        [symbol]
      )
      return result || []
    } catch (err) {
      console.error('❌ Error fetching trades by symbol:', err)
      return []
    }
  }

  const getTradesByDateRange = async (startDate, endDate) => {
    if (!db) return []

    try {
      const result = await db.select(
        `SELECT * FROM flex_trades 
         WHERE date BETWEEN ? AND ? 
         ORDER BY date DESC`,
        [startDate, endDate]
      )
      return result || []
    } catch (err) {
      console.error('❌ Error fetching trades by date range:', err)
      return []
    }
  }

  const getStatsFromDatabase = async () => {
    if (!db) return null

    try {
      const result = await db.select(`
        SELECT 
          COUNT(*) as total_trades,
          SUM(realized_pnl) as total_pnl,
          COUNT(CASE WHEN realized_pnl > 0 THEN 1 END) as winning_trades,
          COUNT(CASE WHEN realized_pnl < 0 THEN 1 END) as losing_trades,
          AVG(realized_pnl) as avg_pnl,
          MAX(realized_pnl) as best_trade,
          MIN(realized_pnl) as worst_trade,
          SUM(CASE WHEN side = 'BUY' THEN 1 ELSE 0 END) as total_buys,
          SUM(CASE WHEN side = 'SELL' THEN 1 ELSE 0 END) as total_sells,
          COUNT(DISTINCT symbol) as unique_symbols
        FROM flex_trades
      `)

      if (result && result.length > 0) {
        const stats = result[0]
        return {
          totalTrades: stats.total_trades || 0,
          totalPnL: stats.total_pnl || 0,
          winningTrades: stats.winning_trades || 0,
          losingTrades: stats.losing_trades || 0,
          avgPnL: stats.avg_pnl || 0,
          bestTrade: stats.best_trade || 0,
          worstTrade: stats.worst_trade || 0,
          totalBuys: stats.total_buys || 0,
          totalSells: stats.total_sells || 0,
          uniqueSymbols: stats.unique_symbols || 0,
          winRate: stats.total_trades > 0 
            ? ((stats.winning_trades / stats.total_trades) * 100).toFixed(1)
            : 0
        }
      }
      return null
    } catch (err) {
      console.error('❌ Error fetching stats:', err)
      return null
    }
  }

  const clearDatabase = async () => {
    if (!db) return false

    try {
      await db.execute('DELETE FROM flex_trades')
      dbTrades.value = []
      console.log('✅ Database cleared')
      return true
    } catch (err) {
      console.error('❌ Error clearing database:', err)
      return false
    }
  }

  const exportTradesToCSV = async () => {
    if (dbTrades.value.length === 0) {
      console.warn('⚠️ No trades to export')
      return null
    }

    try {
      // Create CSV header
      const headers = ['Trade ID', 'Symbol', 'Side', 'Quantity', 'Price', 'Commission', 'P&L', 'Date', 'Time']
      
      // Create CSV rows
      const rows = dbTrades.value.map(t => [
        t.trade_id,
        t.symbol,
        t.side,
        t.quantity,
        t.price.toFixed(2),
        t.commission.toFixed(2),
        t.realized_pnl.toFixed(2),
        t.date,
        t.time
      ])

      // Combine and format
      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      // Save to file (via Tauri write_file or download)
      console.log('✅ CSV export ready (implement file saving)')
      return csv
    } catch (err) {
      console.error('❌ Error exporting CSV:', err)
      return null
    }
  }

  return {
    // State
    dbTrades,
    syncing,

    // Methods
    saveFlexTrades,
    loadAllTrades,
    getTradesBySymbol,
    getTradesByDateRange,
    getStatsFromDatabase,
    clearDatabase,
    exportTradesToCSV
  }
}

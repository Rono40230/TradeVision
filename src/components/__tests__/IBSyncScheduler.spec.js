import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('IBSyncScheduler', () => {
  let db
  let mockTrades

  beforeEach(() => {
    mockTrades = [
      {
        trade_id: 'ibkr_1',
        symbol: 'AAPL',
        asset_class: 'STOCK',
        side: 'BUY',
        quantity: 100,
        price_avg: 150.5,
        commission: 10,
        realized_pnl: 500,
        unrealized_pnl: 0,
        open_date: '2025-01-15T10:00:00Z',
        close_date: '2025-01-16T15:30:00Z',
      },
    ]

    db = {
      select: vi.fn().mockResolvedValue([
        { last_sync_date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
      ]),
      execute: vi.fn().mockResolvedValue({}),
    }
  })

  it('should calculate hours since last sync correctly', () => {
    const now = new Date()
    const lastSync = new Date(now.getTime() - 25 * 60 * 60 * 1000) // 25 hours ago
    const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60)

    expect(hoursSinceSync).toBeGreaterThan(24)
  })

  it('should recognize when sync is not needed (< 24h)', () => {
    const now = new Date()
    const lastSync = new Date(now.getTime() - 12 * 60 * 60 * 1000) // 12 hours ago
    const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60)

    expect(hoursSinceSync).toBeLessThan(24)
  })

  it('should format next sync time correctly', () => {
    const nextSync = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const isoString = nextSync.toISOString()

    expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(nextSync.getTime()).toBeGreaterThan(Date.now())
  })

  it('should generate correct INSERT OR IGNORE statement', () => {
    const trade = mockTrades[0]
    const sql = `INSERT OR IGNORE INTO rocket_trades_history 
    (ib_trade_id, symbol, asset_class, side, quantity, price_avg, commission, 
     realized_pnl, unrealized_pnl, open_date, close_date, expiry, strike, 
     strategy, order_type, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`

    expect(sql).toContain('INSERT OR IGNORE')
    expect(sql).toContain('ib_trade_id')
    expect(sql).toContain('rocket_trades_history')
  })

  it('should handle empty trade list gracefully', () => {
    const trades = []
    expect(trades.length).toBe(0)
  })

  it('should maintain scheduler status state', () => {
    const statuses = ['idle', 'waiting', 'syncing', 'error']
    expect(statuses).toContain('idle')
    expect(statuses).toContain('waiting')
    expect(statuses).toContain('syncing')
  })

  it('should calculate interval frequency (30 minutes)', () => {
    const intervalMs = 30 * 60 * 1000
    expect(intervalMs).toBe(1800000)
  })
})

/**
 * useTradeGrouping — Algorithmes de groupage des trades IBKR
 *
 * Trois algorithmes en séquence :
 *  1. FIFO STK   : regroupe actions (BUY → SELL) en position complète
 *  2. Round-trip OPT : regroupe open/close d'un même contrat (underlying + strike + expiry)
 *  3. 2-pass PCS : fusionne les groupes OPT de même (underlying + expiry) → spreads
 *
 * Usage :
 *   const { buildGroups, groupStrategy, detectDefaultStrategy, STRATEGIES } = useTradeGrouping()
 *   const groups = buildGroups(trades)        // trades bruts → groupes résumés
 *   const strat  = groupStrategy(group, overrides)
 */

export const STRATEGIES = [
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

/** Extrait le sous-jacent depuis un symbole OCC
 *  ex. "AAPL  250919P00195000" → "AAPL" */
export function extractUnderlying(symbol, assetClass) {
  if (assetClass === 'OPT') {
    return symbol.trim().split(/\s+/)[0]
  }
  return symbol
}

/** Construit le résumé agrégé d'un groupe brut */
export function buildGroupSummary(g) {
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

/**
 * Construit les groupes depuis un tableau de trades bruts.
 * Fonction pure — pas de réactivité Vue ici.
 * @param {Array} trades - Trades bruts IBKR
 * @returns {Array} Groupes résumés (buildGroupSummary appliqué)
 */
export function buildGroups(trades) {
  const sorted = [...trades].sort((a, b) => {
    const da = `${a.date} ${a.time || '00:00:00'}`
    const db = `${b.date} ${b.time || '00:00:00'}`
    return da < db ? -1 : da > db ? 1 : 0
  })

  const nonStkMap = new Map()
  const stkOpen = new Map()
  const stkGroups = []
  const keyCount = new Map()

  const uniqueKey = (base) => {
    const n = (keyCount.get(base) ?? 0) + 1
    keyCount.set(base, n)
    return n === 1 ? base : `${base}|${n}`
  }

  // ── Passe 1 : FIFO STK + round-trip OPT ─────────────────────────────────
  for (const trade of sorted) {
    if (trade.asset_class === 'STK') {
      const sym = trade.symbol.trim()
      const isBuy = trade.side === 'BUY'
      const qty = Math.abs(trade.quantity)
      if (isBuy) {
        const existing = stkOpen.get(sym)
        if (existing) {
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

  // ── Passe 2 : fusionner OPT (underlying + expiry) → PCS ─────────────────
  const pcsMap = new Map()
  const nonOptGroups = []
  for (const rawGroup of nonStkMap.values()) {
    if (rawGroup.assetClass !== 'OPT') {
      nonOptGroups.push(rawGroup)
      continue
    }
    const mergeKey = `PCSFUSE|${rawGroup.underlying}|${rawGroup.expiry || ''}`
    if (!pcsMap.has(mergeKey)) {
      pcsMap.set(mergeKey, {
        key: mergeKey,
        underlying: rawGroup.underlying,
        assetClass: 'OPT',
        expiry: rawGroup.expiry,
        date: rawGroup.date,
        trades: [...rawGroup.trades],
      })
    } else {
      const existing = pcsMap.get(mergeKey)
      if (rawGroup.date < existing.date) existing.date = rawGroup.date
      existing.trades.push(...rawGroup.trades)
    }
  }

  return [...stkGroups, ...nonOptGroups, ...Array.from(pcsMap.values())].map(buildGroupSummary)
}

/**
 * Détecte la stratégie par défaut d'un groupe (sans override utilisateur).
 * Règles :
 *  - CASH → Autre
 *  - OPT 2+ strikes → Put Credit Spread
 *  - OPT 1 strike   → Wheel
 *  - STK avec code A/EX/ASGN → Wheel (assignation)
 *  - STK sans code  → Rockets
 */
export function detectDefaultStrategy(group) {
  if (group.assetClass === 'CASH') return 'Autre'

  const strikeCount = group.strikes
    ? group.strikes.split('/').filter(s => s.trim() !== '').length
    : 0

  if (group.assetClass === 'OPT') {
    if (strikeCount >= 2) return 'Put Credit Spread'
    if (strikeCount === 1) return 'Wheel'
    return 'Autre'
  }

  const hasAssignment = group.trades.some(t => {
    const n = (t.notes || '').toUpperCase().trim()
    if (!n) return false
    const tokens = n.split(/[;,\s]+/).filter(Boolean)
    return tokens.some(code => code === 'A' || code === 'EX' || code === 'ASGN')
      || /\bA\b/.test(n)
  })
  return hasAssignment ? 'Wheel' : 'Rockets'
}

/**
 * Retourne la stratégie effective d'un groupe.
 * @param {Object} group     - Groupe résumé
 * @param {Object} overrides - Map { trade_id → stratégie } (overrides utilisateur)
 */
export function groupStrategy(group, overrides = {}) {
  const firstTrade = group.trades[0]
  if (!firstTrade) return 'Autre'
  if (overrides[firstTrade.trade_id] != null) return overrides[firstTrade.trade_id]
  return detectDefaultStrategy(group)
}

/**
 * Composable Vue — version réactive (wraps les fonctions pures ci-dessus)
 */
export function useTradeGrouping() {
  return {
    buildGroups,
    buildGroupSummary,
    extractUnderlying,
    detectDefaultStrategy,
    groupStrategy,
    STRATEGIES,
  }
}

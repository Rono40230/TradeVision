import { ref, computed } from 'vue'

// ── État module-level : partagé entre toutes les instances ───────────────────
const positions = ref([])

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Génère un UUID v4 côté client pour l'identifiant de position.
 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/**
 * Timestamp ISO pour created_at / updated_at.
 */
function now() {
  return new Date().toISOString()
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useOpenPositions() {
  const loading = ref(false)
  const error = ref('')

  // ── Lecture ─────────────────────────────────────────────────────────────────

  /**
   * Charge toutes les positions ouvertes depuis la DB.
   * @param {object} db  — Instance tauri-plugin-sql
   * @param {string} [strategy]  — Filtre optionnel (ex: 'wheel', 'pcs', 'rockets')
   */
  const loadOpenPositions = async (db, strategy = null) => {
    loading.value = true
    error.value = ''
    try {
      const sql = strategy
        ? 'SELECT * FROM open_positions WHERE strategy = ? ORDER BY open_date DESC'
        : 'SELECT * FROM open_positions ORDER BY open_date DESC'
      const rows = strategy ? await db.select(sql, [strategy]) : await db.select(sql)
      positions.value = rows
    } catch (err) {
      error.value = err.message ?? String(err)
    } finally {
      loading.value = false
    }
  }

  // ── Création ─────────────────────────────────────────────────────────────────

  /**
   * Ajoute une nouvelle position ouverte manuelle.
   * @param {object} db
   * @param {object} position — Champs : strategy, symbol, asset_class, side,
   *                           quantity, price, commission?, open_date,
   *                           expiry?, strike?, put_call?, notes?
   * @returns {string} L'id du nouveau record
   */
  const addOpenPosition = async (db, position) => {
    const id = generateId()
    const ts = now()
    await db.execute(
      `INSERT INTO open_positions
         (id, strategy, symbol, asset_class, side, quantity, price, commission,
          open_date, expiry, strike, put_call, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        position.strategy,
        position.symbol,
        position.asset_class ?? 'OPT',
        position.side,
        position.quantity,
        position.price,
        position.commission ?? 0,
        position.open_date,
        position.expiry ?? null,
        position.strike ?? null,
        position.put_call ?? null,
        position.notes ?? null,
        ts,
        ts,
      ]
    )
    positions.value = [{ ...position, id, created_at: ts, updated_at: ts }, ...positions.value]
    return id
  }

  // ── Suppression (clôture) ────────────────────────────────────────────────────

  /**
   * Supprime une position (trade clôturé ou expiré).
   * @param {object} db
   * @param {string} id
   */
  const removeOpenPosition = async (db, id) => {
    await db.execute('DELETE FROM open_positions WHERE id = ?', [id])
    positions.value = positions.value.filter(p => p.id !== id)
  }

  // ── Mise à jour ──────────────────────────────────────────────────────────────

  /**
   * Met à jour des champs d'une position existante.
   * @param {object} db
   * @param {string} id
   * @param {object} changes — Clés à mettre à jour (subset des colonnes)
   */
  const updateOpenPosition = async (db, id, changes) => {
    if (!Object.keys(changes).length) return
    const cols = Object.keys(changes)
    const sets = cols.map(c => `${c} = ?`).join(', ')
    const vals = Object.values(changes)
    const ts = now()
    await db.execute(
      `UPDATE open_positions SET ${sets}, updated_at = ? WHERE id = ?`,
      [...vals, ts, id]
    )
    positions.value = positions.value.map(p =>
      p.id === id ? { ...p, ...changes, updated_at: ts } : p
    )
  }

  // ── Computed regroupé par stratégie ─────────────────────────────────────────

  /**
   * Retourne un Map { strategy → position[] } pour les RocketStrategyCard.
   * Aussi exposé à la racine : openPositionsByStrategy
   */
  const openPositionsByStrategy = computed(() => {
    const map = { wheel: [], pcs: [], rockets: [] }
    for (const p of positions.value) {
      const key = (p.strategy || '').toLowerCase()
      if (map[key] !== undefined) map[key].push(p)
    }
    return map
  })

  /**
   * Capital utilisé par stratégie (= sum(|quantity| * price * multiplier))
   * Multiplier : 100 pour OPT, 1 pour STK.
   */
  const capitalUsedByStrategy = computed(() => {
    const out = { wheel: 0, pcs: 0, rockets: 0 }
    for (const p of positions.value) {
      const key = (p.strategy || '').toLowerCase()
      if (out[key] === undefined) continue
      const mult = (p.asset_class ?? 'OPT') === 'STK' ? 1 : 100
      out[key] += Math.abs(p.quantity) * (p.price || 0) * mult
    }
    return out
  })

  return {
    // State
    positions,
    loading,
    error,
    // Computed
    openPositionsByStrategy,
    capitalUsedByStrategy,
    // Actions
    loadOpenPositions,
    addOpenPosition,
    removeOpenPosition,
    updateOpenPosition,
  }
}

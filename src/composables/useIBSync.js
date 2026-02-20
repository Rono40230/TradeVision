import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useRocketStore } from './rocketStore.js';

const positionTimer = ref(null);

export function useIBSync() {
  const { livePositions, lastPositionUpdate, lastSyncTime, isSyncing } = useRocketStore();
  const syncError = ref(null);
  const tradesCount = ref(0);

  /**
   * Synchronise les positions en temps réel via TWS Socket
   */
  async function syncPositions() {
    try {
      const positions = await invoke('fetch_positions');
      livePositions.value = positions;
      lastPositionUpdate.value = new Date().toISOString();
      return positions;
    } catch (error) {
      console.error('[TWS Socket] Error fetching positions:', error);
      return [];
    }
  }

  /**
   * Démarre la surveillance automatique des positions
   */
  function startPositionWatch(intervalMs = 300000) { // 5 min par défaut
    if (positionTimer.value) return;
    syncPositions();
    positionTimer.value = setInterval(syncPositions, intervalMs);
  }

  /**
   * Arrête la surveillance
   */
  function stopPositionWatch() {
    if (positionTimer.value) {
      clearInterval(positionTimer.value);
      positionTimer.value = null;
    }
  }

  /**
   * Synchronise les trades depuis IB Gateway Flex Query
   * @param {Object} db - Instance Tauri Database
   * @param {string} flexToken - Flex Query API Token
   * @param {number} queryId - Flex Query ID
   * @returns {Promise<{success: boolean, count: number, error?: string}>}
   */
  /**
   * Détection automatique de la stratégie d'un trade individuel (fallback)
   * NB: PCS nécessite une analyse de groupe — non détectable ici sur un seul trade.
   */
  function detectStrategy(t) {
    if (t.asset_class === 'CASH') return 'Autre'
    const isOpt = t.asset_class === 'OPT' || /\d{6}[CP]\d+/.test(t.symbol || '')
    if (isOpt) {
      const isCall = t.put_call === 'C' || (t.put_call !== 'P' && /\d{6}C\d+/.test(t.symbol || ''))
      const isSell = (t.side || '').toUpperCase() === 'SELL'
      if (isCall) return isSell ? 'Naked Call' : 'Long Call'
      return isSell ? 'Naked Put' : 'Long Put'
    }
    // STK : assignation → Wheel, sinon Rockets
    const notes = (t.notes || '').toUpperCase()
    const tokens = notes.split(/[;,\s]+/).filter(Boolean)
    const isAssigned = tokens.some(c => c === 'A' || c === 'EX' || c === 'ASGN')
    return isAssigned ? 'Wheel' : 'Rockets'
  }

  async function syncFromIB(db, flexToken, queryId, strategyOverrides = {}) {
    if (isSyncing.value) {
      return { success: false, error: 'Sync already in progress' };
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
      // 1. Récupère les FlexTrade complets (20 champs) depuis Rust
      const rawTrades = await invoke('fetch_flex_trades', {
        flexToken: flexToken,
        queryId: queryId
      });

      if (!rawTrades || rawTrades.length === 0) {
        throw new Error('No trades returned from Flex Query');
      }

      // 2. Charger les stratégies déjà en base pour ne pas les écraser
      let existingStrategies = {};
      try {
        const rows = await db.select('SELECT trade_id, strategy FROM flex_trades WHERE strategy IS NOT NULL');
        for (const r of rows) existingStrategies[r.trade_id] = r.strategy;
      } catch(e) { /* table inexistante au premier lancement */ }

      // 3. Sauvegarder uniquement les trades CLOTURÉS dans flex_trades
      let savedCount = 0;
      let skippedCount = 0;
      for (const t of rawTrades) {
        // Ignorer les trades ouverts — ils sont suivis dans open_positions
        const oc = (t.open_close || '').toUpperCase();
        if (oc === 'O') { skippedCount++; continue; }

        // Priorité override : paramètre > déjà en DB > auto-détection
        const strategy = strategyOverrides[t.trade_id] ?? existingStrategies[t.trade_id] ?? detectStrategy(t);
        try {
          const res = await db.execute(
            `INSERT OR IGNORE INTO flex_trades
             (trade_id, account_id, symbol, asset_class, side, quantity, multiplier,
              price, commission, realized_pnl, date, time, expiry, strike, put_call,
              open_close, exchange, proceeds, cost_basis, notes, strategy, synced_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
            [
              t.trade_id, t.account_id, t.symbol, t.asset_class, t.side,
              t.quantity, t.multiplier, t.price, t.commission, t.realized_pnl,
              t.date, t.time, t.expiry, t.strike, t.put_call,
              t.open_close, t.exchange, t.proceeds, t.cost_basis, t.notes,
              strategy
            ]
          );
          // rowsAffected = 0 si INSERT OR IGNORE a ignoré un doublon
          if (res.rowsAffected > 0) savedCount++;
          else skippedCount++;
        } catch (e) {
          console.warn(`[FlexSync] Could not save trade ${t.trade_id}:`, e.message);
        }
      }

      tradesCount.value = savedCount;
      lastSyncTime.value = new Date().toISOString();
      await updateSyncMetadata(db, savedCount);

      try {
        await invoke('create_backup');
      } catch (e) {
        console.warn('[Backup] Failed auto-backup:', e);
      }

      return { success: true, count: savedCount, skipped: skippedCount };
    } catch (error) {
      const errorMsg = error.message || error.toString() || 'Unknown sync error';
      syncError.value = errorMsg;
      return { success: false, error: errorMsg };
    } finally {
      isSyncing.value = false;
    }
  }

  /**
   * Sauvegarde un tableau de trades déjà chargés (CSV import) directement en DB.
   * N'insère que les trades CLOTURÉS (open_close = 'C' ou vide).
   * INSERT OR IGNORE : ne jamais écraser un trade existant (IBKR = source immuable).
   */
  async function syncFromTrades(db, rawTrades, strategyOverrides = {}) {
    if (isSyncing.value) {
      return { success: false, error: 'Sync already in progress' };
    }
    if (!rawTrades || rawTrades.length === 0) {
      return { success: false, error: 'No trades to save' };
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
      // Charger les stratégies déjà en base pour ne pas les écraser
      let existingStrategies = {};
      try {
        const rows = await db.select('SELECT trade_id, strategy FROM flex_trades WHERE strategy IS NOT NULL');
        for (const r of rows) existingStrategies[r.trade_id] = r.strategy;
      } catch(e) { /* table inexistante au premier lancement */ }

      let savedCount = 0;
      let skippedCount = 0;
      for (const t of rawTrades) {
        // Ignorer les trades ouverts — ils sont suivis dans open_positions
        const oc = (t.open_close || '').toUpperCase();
        if (oc === 'O') { skippedCount++; continue; }

        const strategy = strategyOverrides[t.trade_id] ?? existingStrategies[t.trade_id] ?? detectStrategy(t);
        try {
          const res = await db.execute(
            `INSERT OR IGNORE INTO flex_trades
             (trade_id, account_id, symbol, asset_class, side, quantity, multiplier,
              price, commission, realized_pnl, date, time, expiry, strike, put_call,
              open_close, exchange, proceeds, cost_basis, notes, strategy, synced_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
            [
              t.trade_id, t.account_id ?? null, t.symbol, t.asset_class, t.side,
              t.quantity, t.multiplier ?? 1, t.price, t.commission, t.realized_pnl,
              t.date, t.time ?? null, t.expiry ?? null, t.strike ?? null, t.put_call ?? null,
              t.open_close ?? null, t.exchange ?? null, t.proceeds ?? null, t.cost_basis ?? null,
              t.notes ?? null, strategy
            ]
          );
          // rowsAffected = 0 si INSERT OR IGNORE a ignoré un doublon
          if (res.rowsAffected > 0) savedCount++;
          else skippedCount++;
        } catch (e) {
          console.warn(`[CSVSync] Could not save trade ${t.trade_id}:`, e.message);
        }
      }

      tradesCount.value = savedCount;
      lastSyncTime.value = new Date().toISOString();
      await updateSyncMetadata(db, savedCount);

      return { success: true, count: savedCount, skipped: skippedCount };
    } catch (error) {
      const errorMsg = error.message || error.toString() || 'Unknown sync error';
      syncError.value = errorMsg;
      return { success: false, error: errorMsg };
    } finally {
      isSyncing.value = false;
    }
  }

  /**
   * Mise à jour du dernier sync timestamp
   */
  async function updateSyncMetadata(db, count) {
    try {
      const now = new Date().toISOString();
      await db.execute(
        `INSERT OR REPLACE INTO sync_metadata (account_id, last_sync_date, trades_synced) 
         VALUES ('FLEX', ?, ?)`,
        [now, count]
      );
    } catch (error) {
      console.warn('[FlexQuery] Could not update sync metadata:', error.message);
    }
  }

  async function getLastSyncInfo(db) {
      try {
          const res = await db.select("SELECT * FROM sync_metadata WHERE account_id = 'FLEX'");
          return res[0] || null;
      } catch (e) {
          return null;
      }
  }

  return {
    isSyncing,
    lastSyncTime,
    syncError,
    tradesCount,
    livePositions,
    lastPositionUpdate,
    syncFromIB,
    syncFromTrades,
    syncPositions,
    startPositionWatch,
    stopPositionWatch,
    getLastSyncInfo,
  };
}

import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { reconcileTrades, detectStrategy } from '../utils/ibReconciliation.js';

export function useIBSync() {
  const isSyncing = ref(false);
  const lastSyncTime = ref(null);
  const syncError = ref(null);
  const tradesCount = ref(0);

  /**
   * Synchronise les trades depuis IB Gateway et sauvegarde en SQLite
   * @param {Object} db - Instance Tauri Database
   * @param {string} accountId - Account IB (ex: U123456)
   * @returns {Promise<{success: boolean, count: number, error?: string}>}
   */
  async function syncFromIB(db, accountId) {
    if (isSyncing.value) {
      return { success: false, error: 'Sync already in progress' };
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
      // 1. Récupère trades depuis Rust backend (Phase 1.1)
      const trades = await invoke('fetch_ib_trades', { account_id: accountId });
      if (!trades || trades.length === 0) {
        throw new Error('No trades returned from IB Gateway');
      }

      // 2. Réconcilie (déduplique + détecte stratégies)
      const reconciled = reconcileTrades(trades, db);
      if (reconciled.length === 0) {
        throw new Error('No trades to reconcile after deduplication');
      }

      // 3. Sauvegarde en SQLite
      await saveTradesToDB(db, reconciled);

      // 4. Mise à jour métadonnées sync
      await updateSyncMetadata(db, accountId, reconciled.length);

      tradesCount.value = reconciled.length;
      lastSyncTime.value = new Date().toISOString();

      return { success: true, count: reconciled.length };
    } catch (error) {
      syncError.value = error.message || 'Unknown sync error';
      return { success: false, error: syncError.value };
    } finally {
      isSyncing.value = false;
    }
  }

  /**
   * Sauvegarde les trades IB en base de données (insert or ignore sur ib_trade_id unique)
   */
  async function saveTradesToDB(db, trades) {
    for (const trade of trades) {
      try {
        await db.execute(
          `INSERT OR IGNORE INTO rocket_trades_history 
           (ib_trade_id, symbol, asset_class, side, quantity, price_avg, commission, 
            realized_pnl, unrealized_pnl, open_date, close_date, expiry, strike, strategy, order_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            trade.trade_id,
            trade.symbol,
            trade.asset_class || null,
            trade.side,
            trade.quantity,
            trade.price,
            trade.commission || 0,
            trade.realized_pnl || null,
            trade.unrealized_pnl || null,
            trade.open_date,
            trade.close_date || null,
            trade.expiry || null,
            trade.strike || null,
            trade.strategy || 'UNKNOWN',
            trade.order_type || null
          ]
        );
      } catch (error) {
        // Log mais continue (INSERT OR IGNORE gère les doublons)
      }
    }
  }

  /**
   * Mise à jour du dernier sync timestamp
   */
  async function updateSyncMetadata(db, accountId, count) {
    const now = new Date().toISOString();
    const nextSync = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    try {
      await db.execute(
        `INSERT INTO sync_metadata (account_id, last_sync_date, trades_synced, next_sync_date)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(account_id) DO UPDATE SET 
           last_sync_date=excluded.last_sync_date,
           trades_synced=excluded.trades_synced,
           next_sync_date=excluded.next_sync_date`,
        [accountId, now, count, nextSync]
      );
    } catch (error) {
      // Métadonnées non-critiques
    }
  }

  /**
   * Récupère l'état du dernier sync
   */
  async function getLastSyncInfo(db, accountId) {
    try {
      const result = await db.select(
        'SELECT last_sync_date, trades_synced FROM sync_metadata WHERE account_id = ? LIMIT 1',
        [accountId]
      );
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      return null;
    }
  }

  return {
    isSyncing,
    lastSyncTime,
    syncError,
    tradesCount,
    syncFromIB,
    getLastSyncInfo
  };
}

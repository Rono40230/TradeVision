import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { reconcileTrades, detectStrategy } from '../utils/ibReconciliation.js';

export function useIBSync() {
  const isSyncing = ref(false);
  const lastSyncTime = ref(null);
  const syncError = ref(null);
  const tradesCount = ref(0);

  /**
   * Synchronise les trades depuis IB Gateway Flex Query
   * @param {Object} db - Instance Tauri Database
   * @param {string} flexToken - Flex Query API Token
   * @param {number} queryId - Flex Query ID
   * @returns {Promise<{success: boolean, count: number, error?: string}>}
   */
  async function syncFromIB(db, flexToken, queryId) {
    if (isSyncing.value) {
      return { success: false, error: 'Sync already in progress' };
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
      // 1. Récupère trades depuis Flex Query via Rust backend
      const trades = await invoke('fetch_flex_trades', { 
        flexToken: flexToken,
        queryId: queryId
      });
      
      if (!trades || trades.length === 0) {
        throw new Error('No trades returned from Flex Query');
      }
      // 2. Sauvegarde directement les trades (Flex Query est canonique)
      await saveTradesToDB(db, trades);

      tradesCount.value = trades.length;
      lastSyncTime.value = new Date().toISOString();

      return { success: true, count: trades.length };
    } catch (error) {
      const errorMsg = error.message || error.toString() || 'Unknown sync error';
      console.error('[FlexQuery] Full error:', error);
      console.error('[FlexQuery] Error message:', errorMsg);
      syncError.value = errorMsg;
      return { success: false, error: syncError.value };
    } finally {
      isSyncing.value = false;
    }
  }

  /**
   * Sauvegarde les trades Flex Query en BD (structure simplifiée)
   */
  async function saveTradesToDB(db, trades) {
    for (const trade of trades) {
      try {
        await db.execute(
          `INSERT OR IGNORE INTO rocket_trades_history 
           (ib_trade_id, symbol, side, quantity, price_avg, commission, realized_pnl, open_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            trade.trade_id,
            trade.symbol,
            trade.side,
            trade.quantity,
            trade.price,
            trade.commission,
            trade.realized_pnl,
            trade.date
          ]
        );
      } catch (error) {
        // Log mais continue
        console.warn(`[FlexQuery] Could not save trade ${trade.trade_id}:`, error.message);
      }
    }
  }

  /**
   * Mise à jour du dernier sync timestamp
   */
  async function updateSyncMetadata(db) {
    try {
      const now = new Date().toISOString();
      await db.execute(
        `INSERT OR REPLACE INTO sync_metadata (account_id, last_sync_date) 
         VALUES ('FLEX', ?)`,
        [now]
      );
    } catch (error) {
      console.warn('[FlexQuery] Could not update sync metadata:', error.message);
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

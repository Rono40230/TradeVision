import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { detectStrategies, extractAssignments } from '../utils/ibkr/strategyDetector.js';
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
  async function syncFromIB(db, flexToken, queryId, strategyOverrides = {}) {
    if (isSyncing.value) {
      return { success: false, error: 'Sync already in progress' };
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
      // 1. Récupère trades depuis Flex Query via Rust backend
      const rawTrades = await invoke('fetch_flex_trades', { 
        flexToken: flexToken,
        queryId: queryId
      });
      
      if (!rawTrades || rawTrades.length === 0) {
        throw new Error('No trades returned from Flex Query');
      }

      // 2. Mapper au format attendu par le détecteur de stratégies
      // Note: le backend Rust retourne les champs en snake_case (trade_id, realized_pnl, etc.)
      // Heuristique asset type: le format OCC option est "SYMBOL YYMMDD[CP]STRIKE" (>10 chars avec chiffres)
      const mappedExecutions = rawTrades.map(t => {
        const isOption = /\d{6}[CP]\d+/.test(t.symbol)
        const isCall = /\d{6}C\d+/.test(t.symbol)
        const multiplier = isOption ? 100 : 1
        return {
          id: t.trade_id,
          date: t.date,
          symbol: t.symbol,
          assetType: isOption ? 'OPT' : 'STK',
          side: t.side,
          quantity: t.quantity,
          price: t.price,
          commission: t.commission,
          realizedPnl: t.realized_pnl || 0,
          unrealizedPnl: 0,
          strike: null,
          expiry: null,
          type: isOption ? (isCall ? 'C' : 'P') : null,
          description: t.symbol,
          proceeds: (t.price * t.quantity * multiplier) * -1
        }
      });

      // 3. Détecter les stratégies (regroupement par date/symbol)
      const strategies = detectStrategies(mappedExecutions);
      
      // 3b. Détecter et sauver les assignations (Phase 4.1)
      const assignments = extractAssignments(mappedExecutions);
      for (const assig of assignments) {
          await saveAssignment(db, assig);
      }

      // 4. Sauvegarde les résultats (dépliage des stratégies complexes si nécessaire)
      let savedCount = 0;
      for (const strat of strategies) {
        if (strat.legs && strat.legs.length > 0) {
          // C'est une stratégie complexe (Spread, IC, etc.)
          for (const leg of strat.legs) {
            const overriddenStrategy = strategyOverrides[leg.id] ?? strat.detectedStrategy;
            const success = await saveSingleTrade(db, leg, overriddenStrategy);
            if (success) savedCount++;
          }
        } else {
          // C'est un trade simple
          const overriddenStrategy = strategyOverrides[strat.id] ?? strat.detectedStrategy;
          const success = await saveSingleTrade(db, strat, overriddenStrategy);
          if (success) savedCount++;
        }
      }

      tradesCount.value = savedCount;
      lastSyncTime.value = new Date().toISOString();
      await updateSyncMetadata(db, savedCount);
      
      // Phase 4.3 : Backup automatique après sync réussie
      try {
          await invoke('create_backup');
      } catch (e) {
          console.warn('[Backup] Failed auto-backup:', e);
      }

      return { success: true, count: savedCount };
    } catch (error) {
      const errorMsg = error.message || error.toString() || 'Unknown sync error';
      console.error('[FlexQuery] Full error:', error);
      syncError.value = errorMsg;
      return { success: false, error: syncError.value };
    } finally {
      isSyncing.value = false;
    }
  }

  /**
   * Sauvegarde un trade individuel avec sa stratégie détectée
   */
  async function saveSingleTrade(db, trade, strategyName) {
    try {
      await db.execute(
        `INSERT OR IGNORE INTO rocket_trades_history 
         (ib_trade_id, symbol, side, quantity, price_avg, commission, realized_pnl, open_date, strategy, asset_class)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trade.id || trade.tradeId,
          trade.symbol,
          trade.side,
          trade.quantity,
          trade.price,
          trade.commission,
          trade.realizedPnl,
          trade.date,
          strategyName || 'Inconnu',
          trade.assetType === 'STK' ? 'STOCK' : (trade.assetType === 'OPT' ? 'OPTION' : trade.assetType)
        ]
      );
      return true;
    } catch (error) {
      console.warn(`[FlexQuery] Could not save trade ${trade.id}:`, error.message);
      return false;
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

  /**
   * Sauvegarde un événement d'assignation/exercice (Phase 4.1)
   */
  async function saveAssignment(db, assig) {
    try {
      // On cherche si un Wheel trade manuel existe pour ce symbole le même jour ou avant
      // pour essayer de lier automatiquement (optionnel mais utile)
      await db.execute(
        `INSERT OR IGNORE INTO assignments 
         (symbol, assignment_date, quantity, price, type)
         VALUES (?, ?, ?, ?, ?)`,
        [assig.symbol, assig.date, assig.quantity, assig.price, assig.type]
      );
      return true;
    } catch (error) {
      console.warn(`[FlexQuery] Could not save assignment for ${assig.symbol}:`, error.message);
      return false;
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

  /**
   * Recalcule les stratégies pour tout l'historique (Migration Phase 1.2)
   */
  async function recalculateAllStrategies(db) {
    try {
      // 1. Charger tous les trades
      const trades = await db.select('SELECT * FROM rocket_trades_history');
      if (!trades || trades.length === 0) return { success: true, count: 0 };

      // 2. Mapper au format détecteur
      const mapped = trades.map(t => ({
        id: t.ib_trade_id,
        date: t.open_date,
        symbol: t.symbol,
        assetType: t.asset_class === 'STOCK' ? 'STK' : 'OPT',
        side: t.side,
        quantity: t.quantity,
        price: t.price_avg,
        commission: t.commission,
        realizedPnl: t.realized_pnl || 0,
        strike: t.strike,
        expiry: t.expiry,
        type: t.symbol.includes('C') ? 'C' : (t.symbol.includes('P') ? 'P' : null),
        description: t.symbol
      }));

      // 3. Détecter
      const strategies = detectStrategies(mapped);

      // 4. Mettre à jour la DB
      let updatedCount = 0;
      for (const strat of strategies) {
        const ids = strat.legs ? strat.legs.map(l => l.id) : [strat.id];
        for (const id of ids) {
          await db.execute(
            'UPDATE rocket_trades_history SET strategy = ? WHERE ib_trade_id = ?',
            [strat.detectedStrategy, id]
          );
          updatedCount++;
        }
      }

      return { success: true, count: updatedCount };
    } catch (error) {
      console.error('[Recalculate] Error:', error);
      return { success: false, error: error.message };
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
    syncPositions,
    startPositionWatch,
    stopPositionWatch,
    getLastSyncInfo,
    recalculateAllStrategies
  };
}

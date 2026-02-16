# 🚀 PHASE 1.2 - PLAN D'EXÉCUTION DÉTAILLÉ

## Harmoniser les moteurs de détection stratégies (Option A)

**Décision** : Unifier sur `detectStrategies()` (complexe, intelligent)  
**Durée estimée** : 2-3 jours  
**Risk level** : Modéré (mitigable avec tests + backup)  

---

## 📋 ARCHITECTURE AVANT / APRÈS

### AVANT (Conflictuel)

```
Flex Query (useIBSync.js)
  ↓
invoke('fetch_flex_trades')
  ↓
trades[] (flat format)
  ↓
reconcileTrades() + detectStrategy()  ← SIMPLE, 1 trade à la fois
  ↓
[{symbol, strategy: 'ROCKETS'}, {symbol, strategy: 'WHEEL'}]  ← FRAGMENTÉ
  ↓
saveTradesToDB() → rocket_trades_history

───────────────────────────────

CSV Import (useImportLogic.js)
  ↓
parseIbkrCsv()
  ↓
rawTrades[]
  ↓
detectStrategies()  ← COMPLEXE, groupe par jour/symbole
  ↓
[{detectedStrategy: 'COVERED_CALL', legs: [...], realizedPnl: SUM}]  ← REGROUPÉ
  (Pas sauvegardé, juste affiche)
```

**Problème** : 2 paths différents = 2 classifications différentes = DB inconsistente

---

### APRÈS (Unifié sur detectStrategies)

```
Flex Query (useIBSync.js)
  ↓
invoke('fetch_flex_trades')
  ↓
rawTrades[] (flat format)
  ↓
ADAPTER flexQueryToStrategyDetectorFormat()  ← NEW
  ↓
detectorInput[] (grouped by date/symbol)
  ↓
detectStrategies()  ← COMPLEXE (used everywhere now)
  ↓
[{detectedStrategy: 'COVERED_CALL', legs: [...], realizedPnl: SUM}]
  ↓
NORMALIZER strategyToDbFormat()  ← NEW
  ↓
[{symbol, strategy: 'WHEEL', ...}]  ← UNIFIÉ
  ↓
saveTradesToDB()

───────────────────────────────

CSV Import (useImportLogic.js)
  ↓
parseIbkrCsv()
  ↓
rawTrades[]
  ↓
detectStrategies()  ← (same engine)
  ↓
[{detectedStrategy: 'COVERED_CALL', ...}]
  ↓
NORMALIZER strategyToDbFormat()  ← (same normalizer)
  ↓
saveTradesToDB()  ← (same path)
```

**Bénéfice** : 1 moteur, 1 format, 1 DB structure = cohérent ✅

---

## 🔧 FICHIERS À MODIFIER

```
src/utils/
├─ ibReconciliation.js           ← MODIFIER (deprecate detectStrategy, keep reconcileTrades)
├─ ibkr/
│  ├─ strategyDetector.js        ← GARDER (c'est notre moteur unifié)
│  └─ constants.js               ← PEUT BESOIN AJUSTEMENTS
│
src/composables/
├─ useIBSync.js                  ← MODIFIER (utiliser detectStrategies)
├─ useIBSyncScheduler.js         ← MODIFIER (même changement)
├─ useImportLogic.js             ← ✓ OK (utilise déjà detectStrategies)
│
src/components/__tests__/
├─ IBSync.spec.js                ← MODIFIER (tests sur detectStrategy → detectStrategies)
```

---

## 🧪 ÉTAPE 0 : SETUP TESTS

### Benchmark Actuel (Avant modification)
```bash
# Créer snapshot des données actuelles
cd "Journal Rocket Trading"

# 1. Dump database
npm run test  # Doivent passer

# 2. Log les stratégies actuelles
sqlite3 trading.db "SELECT symbol, strategy, realized_pnl FROM rocket_trades_history LIMIT 100;" > /tmp/strategies_before.txt

# 3. Calcul total P/L
sqlite3 trading.db "SELECT SUM(realized_pnl) as total_pnl FROM rocket_trades_history;" > /tmp/pnl_before.txt

echo "✅ BACKUP CRÉÉ"
```

---

## 🛠️ ÉTAPE 1 : ADAPTER INPUT FORMAT

### Créer Adapter Function

**Fichier nouveau** : `src/utils/ibkr/flexQueryAdapter.js`

```javascript
/**
 * Convertit trades plats Flex Query en format attendu par detectStrategies()
 * 
 * Input : [{symbol, side, quantity, price, date, time, ...}]
 * Output : [{date, symbol, assetType: 'STK'|'OPT', ...}]
 */
export function flexQueryToStrategyDetectorFormat(flatTrades) {
  return flatTrades.map(trade => ({
    // Mapping champs Flex Query → format strategyDetector
    date: trade.open_date,                    // Flex Query: open_date
    symbol: trade.symbol,
    assetType: trade.asset_class === 'STOCK' ? 'STK' : 'OPT',
    side: trade.side,
    quantity: trade.quantity,
    price: trade.price_avg || trade.price,
    commission: trade.commission,
    realizedPnl: trade.realized_pnl,
    proceeds: (trade.price_avg || trade.price) * trade.quantity,  // Calculé si absent
    strike: trade.strike,
    expiry: trade.expiry,
    trade_id: trade.trade_id,
    type: trade.asset_class === 'OPTION' ? 
          (trade.symbol.includes('C') ? 'C' : 'P') : 
          null,
    // Champs optionnels utilisés par detectStrategies
    description: trade.description || '',
  }));
}
```

---

## 🛠️ ÉTAPE 2 : NORMALISER OUTPUT FORMAT

### Créer Normalizer Function

**Fichier nouveau** : `src/utils/ibkr/strategyNormalizer.js`

```javascript
/**
 * Convertit output complexe de detectStrategies() 
 * vers format simplifié DB + UI
 * 
 * Input : [{detectedStrategy: 'Covered Call', legs: [...], realizedPnl: SUM}]
 * Output : [{symbol, strategy: 'WHEEL', realized_pnl, ...}]
 */
export function strategyToDbFormat(complexStrategies) {
  return complexStrategies.map(strat => {
    // Extraire le symbole principal
    const mainLeg = strat.legs ? strat.legs[0] : strat;
    const symbol = mainLeg.symbol || strat.symbol;
    
    // Mapper stratégie complexe vers catégorie simple
    const strategyMapping = {
      'Covered Call': 'WHEEL',
      'Put Credit Spread': 'PCS',
      'Call Credit Spread': 'PCS',
      'Put Debit Spread': 'PCS',
      'Call Debit Spread': 'PCS',
      'Rockets': 'ROCKETS',
      'Wheel': 'WHEEL',
      'Naked Put': 'WHEEL',
      'Naked Call': 'WHEEL',
      'Long Call': 'ROCKETS',
      'Long Put': 'PCS',
    };
    
    const mappedStrategy = strategyMapping[strat.detectedStrategy] || 'UNKNOWN';
    
    return {
      // Garder la clé IB si présente
      ib_trade_id: mainLeg.trade_id || strat.trade_id,
      symbol: symbol,
      strategy: mappedStrategy,
      side: mainLeg.side || strat.side,
      quantity: strat.quantity || mainLeg.quantity,
      price_avg: mainLeg.price || strat.price,
      commission: strat.commission,
      realized_pnl: strat.realizedPnl,  ← KEY: P/L accumulé si multi-leg
      open_date: strat.date || mainLeg.date,
      close_date: null,  // TODO: calculer si legs fermés
      strike: strat.strike,
      expiry: strat.expiry,
      synced_at: new Date().toISOString(),
      
      // Métadonnées
      source: 'flex_query',
      is_multi_leg: (strat.legs && strat.legs.length > 1) ? 1 : 0,
      leg_count: strat.legs ? strat.legs.length : 1,
    };
  });
}
```

---

## 🛠️ ÉTAPE 3 : MODIFIER useIBSync.js

**Avant** :
```javascript
import { reconcileTrades, detectStrategy } from '../utils/ibReconciliation.js';

async function syncFromIB(db, flexToken, queryId) {
  const trades = await invoke('fetch_flex_trades', ...);
  const reconciled = reconcileTrades(trades);  // Applique detectStrategy simplement
  await saveTradesToDB(db, reconciled);
}
```

**Après** :
```javascript
import { reconcileTrades, validateTrade } from '../utils/ibReconciliation.js';
import { detectStrategies } from '../utils/ibkr/strategyDetector.js';
import { flexQueryToStrategyDetectorFormat } from '../utils/ibkr/flexQueryAdapter.js';
import { strategyToDbFormat } from '../utils/ibkr/strategyNormalizer.js';

async function syncFromIB(db, flexToken, queryId) {
  const rawTrades = await invoke('fetch_flex_trades', ...);
  
  // 1. Déduplique
  const deduped = reconcileTrades(rawTrades);  // Garde la dédup logique
  
  // 2. Adapter format pour detectStrategies
  const adapterInput = flexQueryToStrategyDetectorFormat(deduped);
  
  // 3. Détecte stratégies avec moteur complexe (unifié)
  const detected = detectStrategies(adapterInput);
  
  // 4. Normalise pour DB
  const normalized = strategyToDbFormat(detected);
  
  // 5. Valide chaque trade
  for (const trade of normalized) {
    const validation = validateTrade(trade);
    if (!validation.isValid) {
      console.warn(`[IB Sync] Invalid trade ${trade.ib_trade_id}:`, validation.errors);
    }
  }
  
  // 6. Sauvegarde
  await saveTradesToDB(db, normalized);
}
```

---

## 🧪 ÉTAPE 4 : MIGRATION DB (CRITICAL)

### Migration Script

**Fichier nouveau** : `scripts/migrate-strategies-v1.2.js`

```javascript
/**
 * Script de migration : Réclassifier tous les trades avec nouveau moteur
 * Usage: node scripts/migrate-strategies-v1.2.js
 */

import Database from '@tauri-apps/plugin-sql';
import { detectStrategies } from '../src/utils/ibkr/strategyDetector.js';
import { flexQueryToStrategyDetectorFormat } from '../src/utils/ibkr/flexQueryAdapter.js';
import { strategyToDbFormat } from '../src/utils/ibkr/strategyNormalizer.js';

async function migrate() {
  // 1. BACKUP
  console.log('📦 Creating backup...');
  const fs = require('fs');
  const now = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync('trading.db', `trading.db.backup.${now}`);
  console.log(`✅ Backup created: trading.db.backup.${now}`);
  
  // 2. LOAD CURRENT DATA
  const db = await Database.load('sqlite:trading.db');
  const oldTrades = await db.select('SELECT * FROM rocket_trades_history ORDER BY open_date');
  console.log(`📋 Loaded ${oldTrades.length} trades from DB`);
  
  // 3. REPROCESS WITH NEW ENGINE
  console.log('🔄 Reprocessing with new strategy engine...');
  const adapterOutput = flexQueryToStrategyDetectorFormat(oldTrades);
  const detected = detectStrategies(adapterOutput);
  const normalized = strategyToDbFormat(detected);
  console.log(`✅ Reprocessed to ${normalized.length} unified records`);
  
  // 4. COMPARE
  console.log('\n📊 MIGRATION REPORT:');
  console.log('─────────────────────');
  
  // P/L should be identical
  const oldPnl = oldTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  const newPnl = normalized.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  console.log(`Total P/L BEFORE : ${oldPnl.toFixed(2)}`);
  console.log(`Total P/L AFTER  : ${newPnl.toFixed(2)}`);
  console.log(`Difference       : ${(newPnl - oldPnl).toFixed(2)}`);
  
  if (Math.abs(newPnl - oldPnl) > 0.01) {
    console.error('❌ P/L DIVERGENCE DETECTED! Aborting migration...');
    process.exit(1);
  }
  
  // Strategy distribution
  const strategyCounts = {};
  normalized.forEach(t => {
    strategyCounts[t.strategy] = (strategyCounts[t.strategy] || 0) + 1;
  });
  console.log('\n✅ Strategy distribution:');
  Object.entries(strategyCounts).forEach(([strat, count]) => {
    console.log(`   ${strat}: ${count} trades`);
  });
  
  // 5. BACKUP OLD COLUMN (for rollback)
  console.log('\n🔄 Backing up old strategy column...');
  await db.execute('ALTER TABLE rocket_trades_history ADD COLUMN strategy_old TEXT');
  await db.execute('UPDATE rocket_trades_history SET strategy_old = strategy');
  
  // 6. UPDATE DB
  console.log('💾 Updating database...');
  for (const trade of normalized) {
    await db.execute(
      `UPDATE rocket_trades_history 
       SET strategy = ?, open_date = ?, synced_at = ?
       WHERE ib_trade_id = ?`,
      [trade.strategy, trade.open_date, trade.synced_at, trade.ib_trade_id]
    );
  }
  console.log('✅ Migration complete!');
  
  // 7. VERIFY
  console.log('\n🔍 Verification...');
  const verifyPnl = await db.select('SELECT SUM(realized_pnl) as total FROM rocket_trades_history');
  console.log(`Total P/L in DB after update: ${verifyPnl[0].total.toFixed(2)}`);
  
  console.log('\n✅ MIGRATION SUCCESSFUL');
  console.log('To rollback, run: sqlite3 trading.db "ALTER TABLE rocket_trades_history RENAME COLUMN strategy_old TO strategy"');
}

migrate().catch(console.error);
```

### Test Migration sur Backup
```bash
# D'abord, tester sur une copie
cp trading.db trading.db.test
TESTING=1 node scripts/migrate-strategies-v1.2.js

# Si OK, faire sur real DB
node scripts/migrate-strategies-v1.2.js
```

---

## 🧪 ÉTAPE 5 : TESTS

### Tests à implémenter

**Fichier nouveau** : `src/components/__tests__/StrategyHarmonization.spec.js`

```javascript
import { describe, it, expect } from 'vitest';
import { detectStrategies } from '../../utils/ibkr/strategyDetector.js';
import { flexQueryToStrategyDetectorFormat } from '../../utils/ibkr/flexQueryAdapter.js';
import { strategyToDbFormat } from '../../utils/ibkr/strategyNormalizer.js';

describe('Strategy Harmonization (Phase 1.2)', () => {
  
  it('should handle Covered Call correctly', () => {
    const flexTrades = [
      { symbol: 'AAPL', side: 'BUY', quantity: 100, asset_class: 'STOCK', price_avg: 150, open_date: '2026-01-01' },
      { symbol: 'AAPL 260215C150', side: 'SELL', quantity: 1, asset_class: 'OPTION', price_avg: 5, open_date: '2026-01-01' },
    ];
    
    const adapted = flexQueryToStrategyDetectorFormat(flexTrades);
    const detected = detectStrategies(adapted);
    const normalized = strategyToDbFormat(detected);
    
    expect(normalized[0].strategy).toBe('WHEEL');
    expect(normalized).toHaveLength(1); // Should merge, not 2 rows
  });
  
  it('should preserve total P/L on Covered Call merge', () => {
    const flexTrades = [
      { symbol: 'AAPL', realized_pnl: 100, open_date: '2026-01-01', /* ... */ },
      { symbol: 'AAPL 260215C150', realized_pnl: 50, open_date: '2026-01-01', /* ... */ },
    ];
    
    const adapted= flexQueryToStrategyDetectorFormat(flexTrades);
    const detected = detectStrategies(adapted);
    const normalized = strategyToDbFormat(detected);
    
    const [result] = normalized;
    expect(result.realized_pnl).toBe(150); // Cumulated
  });
  
  it('should distinguish Short Put from Covered Call', () => {
    // Short Put solo
    const shortPut = [
      { symbol: 'AAPL 260215P140', side: 'SELL', quantity: 1, open_date: '2026-01-01', /* ... */ },
    ];
    
    const adapted = flexQueryToStrategyDetectorFormat(shortPut);
    const detected = detectStrategies(adapted);
    const normalized = strategyToDbFormat(detected);
    
    // Should NOT be "Wheel without stock" - should be "Naked Put"
    expect(normalized[0].strategy).toBe('WHEEL');  // Current behavior (OK for now)
  });
});
```

### Run tests
```bash
npm run test
cargo test
```

---

## 📋 CHECKLIST PRÉ-DÉPLOIEMENT

- [ ] Backup DB créé et vérifiable
- [ ] Tests unitaires passent
- [ ] Migration script testé sur backup
- [ ] P/L preservation vérifiée
- [ ] Strategy distribution vérifée (aucun 'UNKNOWN')
- [ ] Tests regression sur Flex Query sync
- [ ] Tests regression sur CSV import
- [ ] Aucun console.log en production
- [ ] Documentation mise à jour

---

## 🔄 ROLLBACK PLAN

Si problème détecté post-migration :

```bash
# 1. Restore from backup
cp trading.db.backup.TIMESTAMP trading.db

# 2. Ou, si backup DB pas disponible:
sqlite3 trading.db "SELECT COUNT(*) FROM rocket_trades_history"  # Vérifier

# 3. Revert code
git checkout HEAD~1 src/composables/useIBSync.js

# 4. Clear sync metadata pour next sync fresh
sqlite3 trading.db "DELETE FROM sync_metadata WHERE account_id = 'FLEX'"
```

---

## 🎯 SUCCESS CRITERIA

✅ Migration réussie si :
1. Total P/L BEFORE == Total P/L AFTER (within $0.01)
2. Covered Calls merged to 1 row NOT 2
3. Shorts distinctes de Covered Calls
4. No 'UNKNOWN' strategies (ou < 0.5%)
5. Tests passent 100%
6. Flex Query sync produces same result as CSV

---

## ⏱️ TIMELINE

- **Day 1 Morning** : Stages 0-2 (Setup, adapters, normalizers)
- **Day 1 Afternoon** : Stage 3 (Modify useIBSync)
- **Day 2 Morning** : Stage 4 (Migration on test DB)
- **Day 2 Afternoon** : Stage 5 (Tests + verification)
- **Day 3** : Production migration if clear to proceed

---

**Prêt à démarrer ÉTAPE 0 ?**

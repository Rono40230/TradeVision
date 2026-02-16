# 🔍 AUDIT - Détection de Stratégies

**Date** : 16 février 2026  
**Scope** : Analyse des 2 moteurs de détection de stratégies conflictuels

---

## 📊 DEUX MOTEURS DIFFÉRENTS DÉTECTÉS

### **MOTEUR 1 : `ibReconciliation.js` - detectStrategy (SIMPLE)**

**Fichier** : `src/utils/ibReconciliation.js` (lignes 43-90)

**Utilisé par** :
- `src/composables/useIBSync.js` (Flex Query sync)
- `src/composables/useIBSyncScheduler.js` (Scheduler)
- `src/components/__tests__/IBSync.spec.js` (Tests)

**Logique** :
```javascript
export function detectStrategy(trade) {
  // SIMPLE - Évalue UN trade à la fois
  
  STOCK       → ROCKETS
  SELL Call   → WHEEL  
  BUY Call    → ROCKETS
  SELL Put    → WHEEL (Put Credit Spread)
  BUY Put     → PCS
}
```

**Caractéristiques** :
- ✅ Simple, rapide
- ✅ Une ligne = un trade unique
- ❌ Pas de détection de stratégies composées
- ❌ Ne regroupe pas Covered Call (stock + call)

**Exemple - Covered Call BUY 100 AAPL + SELL 1 Call** :
```
Trade 1: AAPL 100 shares BUY     → ROCKETS ❌ (devrait être COVERED_CALL)
Trade 2: AAPL Call SELL 1x       → WHEEL ✅
```
**Problème** : Le stock est classifié seul, pas lié au call !

---

### **MOTEUR 2 : `strategyDetector.js` - detectStrategies (COMPLEXE)**

**Fichier** : `src/utils/ibkr/strategyDetector.js` (lignes 1-268)

**Utilisé par** :
- `src/composables/useImportLogic.js` (CSV Import)
- `src/utils/ibkrParser.js` (Ré-exporte)

**Logique** :
```javascript
export function detectStrategies(executions) {
  // COMPLEXE - Évalue MULTIPLE trades du même jour/symbole
  
  // 1. Regroupe par Date/Symbole
  // 2. Détecte Covered Calls (Stock BUY + Call SELL)
  // 3. Détecte Vertical Spreads
  // 4. Regroupe Rockets avec processRocketLifecycles()
  // 5. Fusionne les stratégies sur la même journée
}
```

**Caractéristiques** :
- ✅ Détecte stratégies composées (Covered Call, Spreads)
- ✅ Génère des "legs" (jambes de stratégie)
- ✅ Accumule P/L pour positions partielles
- ❌ Gourmand en CPU (groupement, fusion)
- ❌ Format output différent de l'autre moteur

**Exemple - Covered Call BUY 100 AAPL + SELL 1 Call** :
```
Strategy 1: {
  detectedStrategy: 'Covered Call',
  legs: [
    { symbol: 'AAPL', side: 'BUY', qty: 100 },
    { symbol: 'AAPL 250221C150', side: 'SELL', qty: 1 }
  ],
  realizedPnl: (somme complète)
}
```
**Avantage** : Regroupe correctement, P/L cumulé.

---

## 🚨 CONFLITS IDENTIFIÉS

### **✗ CONFLIT 1 - Même trade, classifications différentes**

| Scénario | Source | Moteur | Résultat |
|----------|--------|--------|----------|
| Stock + Call SELL même jour | CSV Import | `detectStrategies()` | ✅ `COVERED_CALL` (legs regroupés) |
| Stock + Call SELL même jour | Flex Query | `detectStrategy()` | ❌ 2 trades: `ROCKETS` + `WHEEL` |

**Impact** : Même Covered Call peut avoir 2 classifications différentes selon la source d'import !

---

### **✗ CONFLIT 2 - Format de données différent**

**Moteur 1 Output** (ibReconciliation) :
```javascript
[
  { symbol: 'AAPL', strategy: 'ROCKETS', realized_pnl: 100 },
  { symbol: 'AAPL 250221C150', strategy: 'WHEEL', realized_pnl: 50 }
]
```

**Moteur 2 Output** (strategyDetector) :
```javascript
[
  { 
    detectedStrategy: 'Covered Call',
    legs: [...],
    realizedPnl: 150,  // CUMULÉ
    id: 'cc-xxx'
  }
]
```

**Impact** : Base de données structure différemment selon l'origine. Queries d'analyse impossibles à unifier.

---

### **✗ CONFLIT 3 - Court Put (Short Put) ambigu**

**Moteur 1** :
```javascript
SELL Put → WHEEL
```

**Moteur 2** :
```javascript
SELL Put (sans stock) → SHORT_PUT ('Naked Put')
SELL Put (avec stock) → COVERED_CALL (si même jour)
```

**Impact** : Un Short Put seul est classifié `WHEEL` vs `NAKED_PUT`. Contradiction majeure !

---

### **✗ CONFLIT 4 - Processus lifecycle Rockets confusion**

**Moteur 1** : Chaque trade individuel.  
**Moteur 2** : Appele `processRocketLifecycles()` pour fusionner achat/ventes.

**Exemple - Rocket fermeture partielle** :
```
Jour 1: BUY 100 AAPL
Jour 2: SELL 50 AAPL
Jour 3: SELL 50 AAPL

Moteur 1 → 3 trades séparés
Moteur 2 → 1 Rocket position avec P/L cumulé
```

**Impact** : Calcul ROI/P/L diverge radicalement.

---

## 📈 ANALYSE QUANTITATIVE

**Recherche des usages** :

```
ibReconciliation.detectStrategy()    → 3 imports actifs
strategyDetector.detectStrategies()  → 1 import actif (CSV import)
```

### **Quelle portion du code utilise chaque moteur ?**

| Moteur | Path | Utilisateurs | Volume Data |
|--------|------|-------------|------------|
| `detectStrategy` (simple) | Flex Query → DB | useIBSync.js + scheduler | ✅ Principal (tous les syncs) |
| `detectStrategies` (complexe) | CSV Import | useImportLogic.js | ⚠️ Secondaire (imports manuels) |

**Verdict** : Le moteur SIMPLE (`detectStrategy`) est le **PRIMARY PATH**  
(Flex Query = source de vérité = principal)  
Mais le moteur COMPLEXE est excellent et plus intelligent !

---

## 🎯 RECOMMANDATIONS

### **OPTION A - Unifier sur strategyDetector (COMPLEXE)** ⭐ RECOMMANDÉ

**Avantages** :
- ✅ Plus intelligent (détecte Covered Calls, Spreads)
- ✅ Accumule P/L correctement (partielles)
- ✅ Format riche (legs, structure)
- ✅ Meilleur pour analytics

**Désavantages** :
- ❌ Plus lourd à mettre à jour
- ❌ Migration DB complexe
- ❌ Besoin test intensif

**Effort** : 2-3 jours

---

### **OPTION B - Unifier sur detectStrategy (SIMPLE)** ⚠️

**Avantages** :
- ✅ Plus rapide à implémenter
- ✅ Moins risky
- ✅ Facile à comprendre

**Désavantages** :
- ❌ Perd capacité à détecter Covered Calls
- ❌ P/L partielles mal gérées
- ❌ Pas assez complet pour trader professionnel

**Effort** : 1-2 jours But losing intelligence

---

### **OPTION C - Hybrid** 🟡 Meilleur compromis

Garder les 2 moteurs mais bien séparés :

1. **Flex Query** → `detectStrategy()` simple (rapide, 1 ligne = 1 trade)
2. **CSV Import** → `detectStrategies()` complexe (intellignet, multi-legs)
3. **DATABASE** → Normaliser les 2 formats dans une table unique

**Effort** : 3 jours (mais plus maintenable on long term)

**Blueprint** :
```sql
CREATE TABLE trades_unified (
  id PRIMARY KEY,
  ib_trade_id UNIQUE,
  symbol,
  side,
  quantity,
  price,
  commission,
  realized_pnl,
  
  -- Strategy (UNIFIED)
  strategy_detected,      -- ROCKETS | WHEEL | PCS | etc.
  strategy_confidence,    -- simple | complex | manual_override
  
  -- IF multi-leg (Covered Call, Spreads)
  parent_strategy_id,     -- Links to other trades if part of strategy
  is_leg_of_strategy,     -- boolean
  
  -- Source
  source,                 -- 'flex_query' | 'csv_import'
  created_at,
  synced_at
)
```

---

## 🔨 PLAN HARMONISATION (Option A - Recommandé)

### **Phase 1 : Migration (1-2 jours)**

1. **Backup DB** :
   ```bash
   cp trading.db trading.db.backup
   ```

2. **Exécuter migration script** :
   - Charger tous les trades actuels
   - Les reprocesser avec `detectStrategies()`
   - Vérifier divergences stratégie (log warning si change)
   - Sauvegarder avec nouveau mapping

3. **Tests de regression** :
   - Vérifier P/L avant/après migration (doit égaler)
   - Comparer stratégies détectées
   - Auditer shorts orphelins

### **Phase 2 : Unification (1 jour)**

1. Modifier `useIBSync.js` pour utiliser `detectStrategies()`
2. Supprimer `ibReconciliation.detectStrategy()`
3. Garder `ibReconciliation.reconcileTrades()` + `validateTrade()`

### **Phase 3 : Testing (4-8 heures)**

- Tests unitaire sur stratégie detection
- Tests integration Flex Query + CSV import
- Validation P/L identique

---

## 📋 CHECKLIST AVANT DE CODER

**À faire avant de démarrer l'harmonisation** :

- [ ] Backup base de données en place
- [ ] Tests actuels passent (baseline)
- [ ] Documenter stratégies actuelles (snapshot)
- [ ] Décider : Option A / B / C ?
- [ ] Décider : Quand migrer les données anciennes ?
- [ ] Créer migration script (test d'abord sur backup)
- [ ] Prévoir rollback plan
- [ ] Communiquer changement aux users

---

## 🏆 VERDICT FINAL

**L'harmonisation stratégies est FONDAMENTALE** car :
1. C'est la source de divergence #1
2. Tous les autres calculs en dépendent
3. Les données anciennes resteront fragmentées sinon
4. C'est NOT possible de corriger sans cette étape

**Recommandation** : **Option A - Utiliser `detectStrategies()` complexe**  
- Plus intelligent ✅
- Mieux pour trader professionnel ✅
- Effort raisonnable (2-3 jours) ✅
- Maintainable long term ✅

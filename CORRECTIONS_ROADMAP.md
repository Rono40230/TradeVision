# 🔧 ROADMAP CORRECTIONS - TradeVision

> **Note** : Ce document classe les corrections par ordre de criticité. Un trader ne peut pas faire confiance à l'app tel quel.

**Score actuel : 4/10** 🔴  
**Objectif après corrections Phase 1 : 7/10** 🟡

---

## 📊 PHASES DE CORRECTION

### **PHASE 1 : CORRECTIONS CRITIQUES** 🔴 (URGENT)
*Ces problèmes rendent l'app dangereuse pour utilisation*

---

#### **1.1 - Implémenter les positions temps réel (Socket TCP IBKR)**
- **Criticité** : 🔴 CRITIQUE
- **Impact** : Les tableaux Wheel/PCS/Rockets affichent des P/L irrealized **STALE**
- **Durée estimée** : 2-3 jours
- **Fichiers impactés** :
  - `src-tauri/src/modules/tws_socket.rs` (lignes 134-149)
  - `src/composables/useIBSync.js` (ajouter positionsSync)
  - `src/components/rocket/tables/WheelTradesTable.vue` (utiliser positions live)
  - `src/components/rocket/tables/PcsTradesTable.vue` (utiliser positions live)
  - `src/components/rocket/tables/RocketTradesTable.vue` (utiliser positions live)

**Tasks :**
- [ ] Implémenter `get_positions()` via ibapi crate (parser socket TCP IBKR)
- [ ] Cacher `realizedPnl` vs `unrealizedPnl` correctement
- [ ] Ajouter un scheduler pour rafraîchir les positions toutes les 5-10min
- [ ] Afficher timestamp "dernière maj" dans l'UI
- [ ] Tests : Vérifier que P/L unrealized = (prix courant - prix ouverture) × qty

**Dépendance** : Dépend de `ibapi` crate (déjà dans `Cargo.toml`)

---

#### **1.2 - Harmoniser la détection de stratégies**
- **Criticité** : 🔴 CRITIQUE
- **Impact** : Même trade catégorisé différemment = statistiques invalides
- **Durée estimée** : 1-2 jours
- **Fichiers conflictuels** :
  - `src/utils/ibReconciliation.js` (détection basique)
  - `src/utils/ibkr/strategyDetector.js` (détection complexe)

**Tasks :**
- [ ] **DÉCISION** : Choisir UN seul moteur de détection (recommandé : `strategyDetector.js` car plus complet)
- [ ] Supprimer l'autre fichier ou le rendre utilitaire seulement
- [ ] Valider que TOUS les trades utilisent le même moteur
- [ ] Tests : 100 trades mixtes, vérifier cohérence catégorisation
- [ ] **IMPORTANT** : Migration des données anciennes (recalculer stratégie de l'historique)

**Validation** :
```
- Stock BUY → ROCKETS ✓
- Covered Call (Stock + Call SELL) → WHEEL ✓
- Put SELL → WHEEL ✓
- Vertical Spread Put → PUT_CREDIT_SPREAD ✓
- Vertical Spread Call → CALL_CREDIT_SPREAD ✓
- Short Put → WHEEL (ou SHORT_PUT, à clarifier)
- Short Call → COVERED_CALL obligatoire
```

---

#### **1.3 - Fixer erreur P/L sur Rockets partielles**
- **Criticité** : 🔴 CRITIQUE
- **Impact** : Position Rocket fermée en 2 fois = P/L incomplet
- **Durée estimée** : 4 heures
- **Fichier** : `src/utils/ibkr/rocketProcessor.js` (lignes 60-75)

**Problème actuellement** :
```javascript
position.realizedPnl = position.totalRealizedPnl;  // ← Met à jour le total
// MAIS subTrades peuvent avoir chacun un realized_pnl différent
// Et l'interface peut afficher le old realized_pnl en cache
```

**Tasks** :
- [ ] Renommer `totalRealizedPnl` → `cumulativeRealizedPnl` (plus clair)
- [ ] Toujours recalculer `position.realizedPnl = SUM(subTrades[].realizedPnl)`
- [ ] Tests : 1 position 100 shares, fermer 50 + 50 = P/L correct pour both fermetures
- [ ] Valider que l'interface affiche `position.realizedPnl` et non `subTrades[0].realizedPnl`

---

#### **1.4 - Traiter les trades orphelins correctement**
- **Criticité** : 🔴 CRITIQUE
- **Impact** : Shorts classification peut être fausse
- **Durée estimée** : 8 heures
- **Fichier** : `src/utils/ibkr/rocketProcessor.js` (lignes 80-100)

**Problème actuellement** :
```javascript
// Si vente sans position initiale → classifiée automatiquement CLOSED
// MAIS c'est peut-être un SHORT qui reste OPEN
```

**Tasks** :
- [ ] Détecter les shorts : `side === 'SELL' && quantity < 0 && !activePositions.has(symbol)`
- [ ] Classer comme STATUS: 'SHORT_OPEN' et non 'CLOSED'
- [ ] Ajouter une colonne "open_short_quantity" à la DB
- [ ] Tests : Short 100 AAPL, puis buy close 50 = SHORT_OPEN avec 50 shares
- [ ] UI : Afficher les shorts distingués des positions normales

---

#### **1.5 - Corriger bug Win Rate au frontend**
- **Criticité** : 🟠 HAUTE
- **Impact** : Win Rate string au lieu de number, comparaisons échouent
- **Durée estimée** : 15 minutes
- **Fichier** : `src/composables/useTradeDatabase.js` (ligne 170)

**Correction** :
```javascript
// AVANT :
winRate: stats.total_trades > 0 ? ((stats.winning_trades / stats.total_trades) * 100).toFixed(1) : 0

// APRÈS :
winRate: stats.total_trades > 0 ? Math.round((stats.winning_trades / stats.total_trades) * 100 * 10) / 10 : 0
```

**Tasks** :
- [ ] Remplacer `.toFixed(1)` par `Math.round(...* 10) / 10`
- [ ] Tests : Vérifier que winRate est un NUMBER, pas string
- [ ] Valider affichage formaté : "65.2%" (via composant template)

---

### **PHASE 2 : CORRECTIFS IMPORTANTS** 🟠 (1-2 semaines)

---

#### **2.1 - Ajouter validations de calcul**
- **Criticité** : 🟠 HAUTE
- **Impact** : Calculer P/L incorrect non détecté
- **Durée estimée** : 1-2 jours

**Tasks** :
- [ ] Validation `realized_pnl = (close_price - open_price) × qty - commission` (logs warnings si divergence)
- [ ] Validation `close_date >= open_date`
- [ ] Validation `qty > 0`, `price > 0`, `commission >= 0`
- [ ] Tests : Créer 100 trades synthétiques avec errorrs intentionnels, vérifier warnings

**Fichiers** :
- `src/utils/ibReconciliation.js` → améliorer `validateTrade()`
- `src-tauri/src/modules/ib_gateway/parser.rs` → ajouter validations Rust

---

#### **2.2 - Implémenter analyses manquantes**
- **Criticité** : 🟠 HAUTE
- **Impact** : Trader ne peut pas évaluer ROI/performance
- **Durée estimée** : 2-3 jours

**Analyses à ajouter** :
- [ ] **ROI** : P/L / Capital engagé
- [ ] **Profit Factor** : Somme(gains) / |Somme(pertes)|
- [ ] **Avg Win / Avg Loss** : Moyenne profitables / Moyenne déficitaires
- [ ] **Holding Time** : (close_date - open_date) moyenne par stratégie
- [ ] **P/L Monthly breakdown** : Distribution temporelle
- [ ] **Largest consecutive losses** : Drawdown maximum
- [ ] **Win streak** : Plus grande suite de gains consécutifs

**Fichiers** :
- Créer `src/composables/useAnalytics.js` (nouveau composable)
- Implémenter dans `src/components/FlexQueryAnalytics.vue`

---

#### **2.3 - Implémenter pagination des tableaux**
- **Criticité** : 🟠 HAUTE
- **Impact** : 1000+ trades = UI lag et crash possible
- **Durée estimée** : 1 jour

**Tasks** :
- [ ] Ajouter pagination 50 trades/page
- [ ] Composant réutilisable `PaginationControls.vue`
- [ ] Implémenter dans `HistoriqueComplet.vue`, `WheelTradesTable.vue`, etc.
- [ ] Tests : Load 10k trades, vérifier smoothness

**Fichiers** :
- Créer `src/components/common/PaginationControls.vue`
- Modifier toutes les tables

---

#### **2.4 - Fixer incohérence sync (hardcoded 'IBKR')**
- **Criticité** : 🟡 MOYENNE
- **Impact** : Multi-accounts futur impossible, race conditions possibles
- **Durée estimée** : 0.5 jour

**Tasks** :
- [ ] Remplacer hardcoded 'IBKR' par variable account_id
- [ ] Implémenter queue pour retries de sync
- [ ] Tests : 2 syncs simultanés ≠ race condition

**Fichiers** :
- `src/components/rocket/HistoriqueComplet.vue` (ligne 146-150)
- `src/composables/useIBSync.js`

---

### **PHASE 3 : AMÉLIORATIONS UI/UX** 🟡 (1 semaine)

---

#### **3.1 - Ajouter confirmation avant suppression**
- **Criticité** : 🔴 CRITIQUE (user experience)
- **Impact** : Éviter delete accidentel
- **Durée estimée** : 4 heures

**Tasks** :
- [ ] Modale confirmation avant suppression
- [ ] Soft-delete option (restore possible)
- [ ] Log des suppressions

---

#### **3.2 - Ajouter export CSV/Excel**
- **Criticité** : 🟠 HAUTE
- **Impact** : Permettre audit externe, vérification
- **Durée estimée** : 1.5 jours

**Tasks** :
- [ ] Exporter `HistoriqueComplet` en CSV
- [ ] Inclure métadonnées (date export, count, total P/L)
- [ ] Tests : Réimporter dans Excel, vérifier intégrité

**Fichiers** :
- Créer `src/utils/exporters.js`

---

#### **3.3 - Ajouter equity curve chart**
- **Criticité** : 🟠 HAUTE
- **Impact** : Trader veut voir progression P&L temporelle
- **Durée estimée** : 1-2 jours

**Tasks** :
- [ ] Calculer cumsum(realized_pnl) par date
- [ ] Chart.js ou Vue3-Chart component
- [ ] Afficher dans HistoriqueView

---

#### **3.4 - Ajouter "Last sync" timestamp visible**
- **Criticité** : 🟡 MOYENNE
- **Impact** : Trader sait si données sont stale
- **Durée estimée** : 2 heures

**Tasks** :
- [ ] Afficher "🔄 Last sync: 2 hours ago" dans header
- [ ] Couleurs : Verde si < 1h, orange si 1-6h, rouge si > 6h

---

### **PHASE 4 : DONNÉES & PERSISTANCE** 🟡 (2 semaines)

---

#### **4.1 - Ajouter table d'assignations (Wheel)**
- **Criticité** : 🟠 HAUTE (pour stratégie Wheel)
- **Impact** : Impossible de tracker "quand fut assigné?"
- **Durée estimée** : 2-3 jours

**Tasks** :
- [ ] Schema DB :
  ```sql
  CREATE TABLE assignments (
    id PRIMARY KEY,
    wheel_trade_id FOREIGN KEY,
    assignment_date,
    actual_shares_assigned,
    assignment_price
  )
  ```
- [ ] Parser assignments depuis IBKR Flex Query
- [ ] Tests : Wheel mit assignment, vérifier log

---

#### **4.2 - Implémenter audit trail (corrections IBKR)**
- **Criticité** : 🟡 MOYENNE
- **Impact** : Tracer corrections P/L IBKR
- **Durée estimée** : 1-2 jours

**Tasks** :
- [ ] Table `modifications_log`
- [ ] Tracker changements P/L (before/after)
- [ ] UI pour voir historique modifications

---

#### **4.3 - Backup automatique**
- **Criticité** : 🟠 HAUTE
- **Impact** : Prévenir perte de données
- **Durée estimée** : 1 jour

**Tasks** :
- [ ] Daily backup de `trading.db` vers dossier `./backups/`
- [ ] Compression (zip)
- [ ] Retention policy (30 jours)
- [ ] Restore option dans l'app

---

### **PHASE 5 : TESTS & DOCUMENTATION** 📚 (1 semaine)

---

#### **5.1 - Ajouter tests d'intégration**
- **Criticité** : 🟡 MOYENNE
- **Impact** : Prévention regressions
- **Durée estimée** : 2-3 jours

**Tests à implémenter** :
- [ ] Test Flex Query complet (mock IBKR response)
- [ ] Test stratégie detection (100 trades synthétiques)
- [ ] Test calculations (P/L, ROI, WinRate)
- [ ] Test persistence (save→load→verify)

**Fichiers** :
- `src/components/__tests__/Calculations.spec.js` (nouveau)
- `src/components/__tests__/StrategyDetection.spec.js` (nouveau)
- `src-tauri/src/modules/tests/flex_query.rs` (nouveau)

---

#### **5.2 - Documentation technique**
- **Criticité** : 🟡 MOYENNE
- **Durée estimée** : 1-2 jours

**Tasks** :
- [ ] Documenter flux Flex Query complet (avec diagramme)
- [ ] Documenter stratégie detection logic
- [ ] Documenter schema DB + migration guide
- [ ] API documentation (Tauri commands)

---

### **PHASE 6 : FEATURES AVANCÉES** (Futur - Post v1.0)

---

#### **6.1 - Greeks Tracking**
- **Criticité** : 🔵 BASSE (pour traders avancés)
- **Duration** : 3-5 jours
- **Note** : Requiert données en temps réel IBKR (greeks)

#### **6.2 - Multi-Account Support**
- **Criticité** : 🔵 BASSE
- **Duration** : 2-3 jours
- **Note** : Refactor architecture de compte

#### **6.3 - Tax Lot Tracking**
- **Criticité** : 🔵 BASSE (surtout pour Q4)
- **Duration** : 3-4 jours
- **Note** : FIFO/LIFO/Average cost methods

#### **6.4 - Multi-Devise Support**
- **Criticité** : 🔵 BASSE
- **Duration** : 2 jours
- **Note** : Si trader a positions forex

---

## 📈 RISQUES & DÉPENDANCES

### Risques identifiés :

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Socket TCP IBKR instable | P/L temps réel inexact | Fallback mode (manuel sync) |
| Migration stratégies | Données historiques invalides | Backup avant migration |
| Performance (10k trades) | UI lag | Tests de charge |
| Conflicts sync concurrent | Race conditions | Queue system |

### Dépendances externes :

- **ibapi crate** : Pour socket TCP (déjà dans Cargo.toml)
- **IBKR API availability** : Dépend de stabilité IBKR
- **Chart.js** : Pour equity curve (optional, déjà utilisé)

---

## 🎯 CHECKPOINTS QUALITÉ

Avant chaque phase, valider :

- [ ] Tests unitaires passent (100%)
- [ ] Tests d'intégration passent
- [ ] Pas de regressions UI
- [ ] Logs détaillés pour debugging
- [ ] Backward compatibility maintenue
- [ ] Documentation mise à jour

---

## 📋 TEMPLATE TÂCHE

Utiliser ce template pour chaque issue GitHub/Jira :

```markdown
## [PHASE X.Y] - Description courte

**Criticité** : 🔴 / 🟠 / 🟡 / 🔵

**Fichiers impactés** :
- src/components/XXX.vue
- src-tauri/src/modules/YYY.rs

**Acceptance criteria** :
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests passent

**Tests** :
- Unit test pour XXX
- Integration test pour YYY

**Dépendances** :
- [PHASE X.Y] autre issue
```

---

## 📊 ESTIMATION TOTALE

| Phase | Durée | Criticité |
|-------|-------|-----------|
| Phase 1 (Critical) | 5-7 jours | 🔴🔴🔴🔴 |
| Phase 2 (Important) | 7-10 jours | 🟠🟠🟠 |
| Phase 3 (UX) | 6-8 jours | 🟡🟡 |
| Phase 4 (Data) | 8-10 jours | 🟡🟡 |
| Phase 5 (QA) | 5-7 jours | 🟡 |
| **TOTAL** | **31-42 jours** | v1.0 stable |
| Phase 6 (Advanced) | 10-15 jours | v1.1+ |

**Recommandation** : Prioriser Phase 1 d'abord (2-3 sprints), puis Phase 2+3 en parallèle.

---

## 🚀 VERSION MILESTONES

- **v0.1** (actuel) : Historique IBKR + stats basiques
- **v0.5** (après Phase 1) : Positions temps réel, stratégies cohérentes
- **v1.0** (après Phase 1-5) : Production-ready
- **v1.1** (après Phase 6) : Features avancées

# 📋 TASK.MD - Intégration IB Gateway pour Journal Précis des Trades

**Date** : 2 février 2026  
**Statut** : 🔴 EN ATTENTE D'APPROBATION UTILISATEUR  
**Priorité** : 🔥 CRITIQUE - Fondation pour tout le système  

---

## 🎯 Objectif Principal

Transformer TradeVision en **journal de trading précis** alimenté par **IB Gateway en lecture seule**, garantissant :
- ✅ **P/L exact** (réalisé + frais)
- ✅ **Historique complet** de tous les trades
- ✅ **Zéro divergence** manuel vs réalité
- ✅ **Base fiable** pour analyse et correction de stratégies

**Cas d'usage** : Analyser vos Wheel, PCS et Rockets avec données réelles, pas estimées.

---

## 🏗️ Architecture Technique

### Flux de données

```
IB Gateway (TWS/IBGateway)
    ↓ (Lecture seule)
    ↓ API HTTP (REST ou Socket)
    ↓
TradeVision (Tauri)
    ├─ Sync Module (Récupération)
    ├─ Parser Module (Extraction P/L, symboles, etc.)
    ├─ Storage Module (SQLite local)
    └─ Analytics Engine (Calculs, filtres)
    ↓
UI Dashboard (Historique précis)
```

### Stack technique maintenu

- **Frontend** : Vue.js 3 (Composition API)
- **Backend** : Rust (Tauri)
- **Base de données** : SQLite (existant)
- **Connexion IB** : API REST IB Gateway (localhost:7496 ou 4002)
- **Sécurité** : Tauri Secure Storage (credentials en OS keychain)

---

## 📊 Spécifications des Données IB

### Données à récupérer

```json
{
  "trade_id": "string (clé unique IB)",
  "symbol": "string (ex: AAPL, TSLA 250221C150)",
  "asset_class": "STOCK|OPTION|FUTURE",
  "side": "BUY|SELL",
  "quantity": "number",
  "price_avg": "number (prix moyen exécution)",
  "commission": "number (frais exécution)",
  "realized_pnl": "number (P/L exact réalisé)",
  "unrealized_pnl": "number (si position ouverte)",
  "open_date": "ISO8601 (date ouverture)",
  "close_date": "ISO8601 (date clôture, null si ouvert)",
  "expiry": "string|null (ex: 250221 pour options)",
  "strike": "number|null (prix strike pour options)",
  "order_type": "MKT|LMT|STOP|etc"
}
```

### Réponses aux questions critiques ✅

| Question | Réponse | Impact |
|----------|---------|--------|
| **Opening/Closing séparés ?** | ✅ OUI | Parser doit détecter BUY+SELL comme paire |
| **Besoin Expiry/Strike ?** | ✅ OUI | Stockage + affichage dans historique |
| **Fréquence sync ?** | ✅ 1x/jour | Batch sync quotidienne suffisante |
| **Notes manuelles ?** | ❌ NON | Zéro annotation manuelle ajoutée |

---

## 🔄 Phases d'Implémentation

### **PHASE 1 : Intégration IB Gateway (Semaine 1-2)**

#### 1.1 Connector IB Gateway
**Fichiers à créer** :
- `src-tauri/src/modules/ib_gateway/mod.rs` - Module principal
- `src-tauri/src/modules/ib_gateway/client.rs` - Client HTTP
- `src-tauri/src/modules/ib_gateway/parser.rs` - Parser réponses IB
- `src-tauri/src/modules/ib_gateway/auth.rs` - Gestion credentials (Tauri secure storage)

**Tasks** :
- [ ] Setup HTTP client (reqwest)
- [ ] Implémentation endpoints IB Gateway (portfolio, trade history)
- [ ] Parser JSON → struct Rust
- [ ] Gestion credentials sécurisée (Tauri keychain)
- [ ] Tests unitaires parser

**Dépendances à ajouter** :
```toml
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1", features = ["full"] }
serde_json = "1.0"
tauri-plugin-keychain = "0.1"
```

#### 1.2 Synchronisation historique
**Fichiers à créer** :
- `src-tauri/src/modules/sync/mod.rs` - Orchestration sync
- `src-tauri/src/modules/sync/reconciler.rs` - Réconciliation doublons

**Tasks** :
- [ ] Récupération historique complet IB
- [ ] Dédoublonnage (clé unique = `ib_trade_id`)
- [ ] Mapping stratégies (Wheel/PCS/Rockets via symbole)
- [ ] Gestion incremental sync (dernier trade connu)
- [ ] Logs détaillés chaque sync

#### 1.3 Stockage SQLite
**Fichiers à modifier** :
- `src/utils/db.js` - Ajouter tables rocket

**Tables à créer** :
```sql
CREATE TABLE rocket_trades_history (
  id INTEGER PRIMARY KEY,
  ib_trade_id TEXT UNIQUE,
  symbol TEXT,
  asset_class TEXT,
  side TEXT,
  quantity REAL,
  price_avg REAL,
  commission REAL,
  realized_pnl REAL,
  unrealized_pnl REAL,
  open_date TEXT,
  close_date TEXT,
  expiry TEXT,
  strike REAL,
  strategy TEXT,
  order_type TEXT,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(strategy) REFERENCES strategies(name)
);

CREATE TABLE sync_metadata (
  id INTEGER PRIMARY KEY,
  last_sync_date TIMESTAMP,
  trades_synced INTEGER,
  next_sync_date TIMESTAMP
);
```

**Tasks** :
- [ ] Migration SQLite (ajouter tables)
- [ ] Seed initial (test data)
- [ ] Index sur `ib_trade_id`, `symbol`, `strategy`

---

### **PHASE 2 : Réconciliation P/L (Semaine 2-3)**

#### 2.1 Calcul P/L exact
**Fichiers à créer** :
- `src/utils/pnl-calculator.js` - Moteur calcul P/L

**Logic** :
- **Realized P/L** : Utiliser `realized_pnl` d'IB (source de vérité)
- **Par stratégie** : Agrégation par `strategy` + `close_date`
- **Mensuel** : Filtre `close_date` dans mois en cours
- **YTD** : Filtre par année

**Tasks** :
- [ ] Implémentation calculator.js
- [ ] Tests: validation P/L vs IB
- [ ] Gestion cas limite (positions ouvertes)

#### 2.2 Détection stratégies
**Logic** :
```javascript
function detectStrategy(symbol, side, assetClass, strike) {
  if (assetClass === 'STOCK') return 'ROCKETS';
  if (assetClass === 'OPTION' && isCallOption(symbol)) {
    if (side === 'SELL') return 'WHEEL';
    if (side === 'BUY') return 'ROCKETS';
  }
  if (assetClass === 'OPTION' && isPutOption(symbol)) {
    return 'PCS'; // Put Credit Spread
  }
  return 'UNKNOWN';
}
```

**Tasks** :
- [ ] Parser symbole option (format IB)
- [ ] Classification automatique
- [ ] Fallback manuel si ambiguïté

---

### **PHASE 3 : Dashboard & Analytics (Semaine 3-4)**

#### 3.1 Historique complet
**Fichiers à modifier** :
- `src/components/dashboard/rocket/RocketHistoryTable.vue` - Nouveau composant
- `src/views/RocketAcademy.vue` - Intégration

**Affichage** :
```
┌─ Historique complet (filtrable)
├─ Symbole | Stratégie | Qty | P/L | Date ouv | Date close | Durée
├─ Filtres : Date range, Stratégie, P/L >, Symbole
├─ Tri : Date, P/L, Durée
└─ Détail au clic : Expiry, Strike, Commission, Notes
```

**Tasks** :
- [ ] Composant table historique
- [ ] Filtres temps réel
- [ ] Tri multi-colonnes
- [ ] Pagination (50 trades/page)
- [ ] Export CSV

#### 3.2 Statistiques & Analytics
**Fichiers à créer** :
- `src/composables/useRocketAnalytics.js` - Calculs analytics

**Métriques par stratégie** :
- Total trades (lifetime)
- Total P/L réalisé (lifetime)
- P/L mensuel
- Win rate (% positifs)
- Avg win / avg loss
- Ratio profit/loss
- Largest win / loss
- Jours holding moyen
- ROI (P/L / capital engagé)

**Tasks** :
- [ ] Implémentation analytics engine
- [ ] Cache résultats (perfs)
- [ ] Tests validation calculs

#### 3.3 Modales détail trade
**Fichiers à modifier** :
- `src/components/dashboard/rocket/RocketTradeDetailModal.vue` - Nouveau

**Affichage détail** :
```
┌─ Trade Detail
├─ Symbole | Stratégie | Type actif
├─ Ouverture: Prix, Qty, Commission, Date
├─ Clôture: Prix, Qty, Commission, Date
├─ P/L = (Close price - Open price) × Qty - Commission
├─ Durée holding
└─ Expiry/Strike (si option)
```

**Tasks** :
- [ ] Modal détail trade
- [ ] Affichage P/L exact (source IB)

---

## 🔐 Points Sécurité

### Credentials IB Gateway

**Stockage** :
```rust
// Tauri Secure Storage
tauri::api::keychain::set_entry("ib_gateway", "username", username)?;
tauri::api::keychain::set_entry("ib_gateway", "password", password)?;
```

**Récupération** :
```rust
// Au startup seulement, jamais en logs
let username = tauri::api::keychain::get_entry("ib_gateway", "username")?;
let password = tauri::api::keychain::get_entry("ib_gateway", "password")?;
```

### Communication IB

- ✅ Connexion **localhost seulement** (TWS local)
- ✅ **Lecture seule** - Zéro commandes d'ordre
- ✅ **Rate limiting** : IB max 30 req/min
- ✅ **Timeout** : 30s par requête
- ✅ **Retry logic** : 3 tentatives avec backoff

### Stockage P/L

- ✅ **SQLite local** (pas de cloud)
- ✅ **Pas de logs sensibles** (pas de passwords, P/L minimaux en logs)
- ✅ **Audit trail** : `synced_at` timestamp

---

## 📱 UI/UX Changements

### Nouveau menu "Historique"
```
Dashboard
├─ Rocket Academy (existant)
├─ Kasper Academy (existant)
└─ **Historique Complet** ← NOUVEAU
    ├─ Vue tableau (tous trades + P/L)
    ├─ Statistiques (win rate, ROI, durée avg)
    ├─ Filtres (date, stratégie, symbole)
    └─ Détail au clic
```

### Modifications Dashboard existant
- Utiliser P/L d'IB au lieu d'estimé
- Ajouter badge "Synced à [date/heure]"
- Ajouter bouton "Sync IB Gateway"

---

## 🧪 Testing & Validation

### Unit Tests (Rust)
```
src-tauri/tests/
├─ ib_parser_tests.rs
├─ pnl_calculator_tests.rs
├─ strategy_detection_tests.rs
└─ sync_reconciler_tests.rs
```

### Tests d'intégration
- [ ] Mock IB Gateway responses
- [ ] Validation P/L réel vs calculé
- [ ] Test doublonnage (same `ib_trade_id`)
- [ ] Test stratégie detection

### Validation produit
- [ ] Vérifier P/L vs compte IB réel
- [ ] Historique complet = IB complet
- [ ] Pas de perte données après sync
- [ ] Performance : sync < 30s pour 1000 trades

---

## ⚠️ Points d'Attention Critiques

| Point | Action |
|-------|--------|
| **IB Down** | Retry x3 avec backoff, afficher warning UI |
| **Credentials expirés** | Notification pour re-login |
| **Sync incomplet** | Ne pas valider tant que complet |
| **Doublonnage** | Clé unique `ib_trade_id` obligatoire |
| **Performance** | Indice SQLite sur symbole/date/strategy |
| **Perfs UI** | Pagination + virtualisation table >1000 trades |

---

## 📅 Timeline

| Phase | Durée | Dépend de |
|-------|-------|----------|
| **1.1-1.3** (IB + Storage) | 5-7 jours | Aucun |
| **2.1-2.2** (P/L + Stratégies) | 3-4 jours | Phase 1 |
| **3.1-3.3** (UI + Analytics) | 4-5 jours | Phase 2 |
| **Testing + Bugs** | 2-3 jours | Phase 3 |
| **TOTAL** | **2-3 semaines** | |

---

## ✅ Checklist Pré-Implementation

Avant de démarrer, confirmer :

- [ ] **IB Gateway accessible** : TWS/IBGateway tournent localement
- [ ] **Demo account prêt** : Accès en place
- [ ] **Format données IB confirmé** : Endpoints testés
- [ ] **Credentials sécurisés** : Plan de stockage approuvé
- [ ] **Architecture reviewée** : Pas de régression Kasper/Rocket
- [ ] **Dépendances listées** : `Cargo.toml` + `package.json` prêts

---

## 📝 Notes de Product

**Vision** : TradeVision = **Source Unique de Vérité** pour votre journal de trading
- P/L exact depuis IB (pas estimé)
- Historique complet + queryable
- Base fiable pour backtesting futur
- Foundation pour IA/ML analysis future

**Post-implémentation** : Une fois P/L validé, vous pouvez :
- Analyser vos stratégies en confiance
- Identifier patterns perdants
- A/B test règles sur historique complet
- Exporter rapports pour suivi annuel

---

## 🚀 Prochaines Étapes

**JE SUIS EN ATTENTE DE** :
1. ✅ **Approbation de cette architecture**
2. ✅ **Réponses aux questions** (ici dans le doc)
3. ⏳ **Autres questions de votre part** (avant Phase 1)
4. ⏳ **Feu vert pour implémenter**

**Questions restantes à adresser** :
- Détails IB API (endpoints exacts)
- Gestion des credentials pour account réel
- Performance sync sur 2 ans d'historique
- Autres ?

---

**Statut** : 🔴 **EN ATTENTE D'APPROBATION**  
**Dernier update** : 2 février 2026  
**Prochaine étape** : Feu vert utilisateur + réponses questions


# 🧪 Testing IB Gateway Integration

## Prerequisites

1. **IB Gateway ou TWS** en mode **lecture seule** sur `localhost:7496`
2. **Compte de démonstration** ou **Paper Trading** (recommandé)
3. **Credentials IBG** : username + password

## Setup Steps

### 1. Lancer IB Gateway en lecture seule

```bash
# Sur votre machine Windows/Mac/Linux
# Démarrez IBGateway ou TWS

# Configuration requise :
# - Settings → API → Enable ActiveX and Socket Clients
# - Allow connections from localhost
# - Port: 7496 (default for IB Gateway)
# - Mode: Read-only (pas de trading autorisé)
```

### 2. Lancer TradeVision avec credentials

```bash
cd "/home/rono/PROJET - Journal Rocket Trading/Journal Rocket Trading"

# Option A: Via script helper (simplest)
./launch-dev.sh

# Option B: Via CLI (manual control)
IBKR_USERNAME="your_username" \
IBKR_PASSWORD="your_password" \
RUST_MIN_STACK=16777216 \
WEBKIT_DISABLE_DMABUF_RENDERER=1 \
npm run tauri dev
```

**Important** : Remplacez `your_username` et `your_password` par vos credentials IB réels.

### 3. Test Manual Sync

1. Ouvrez l'app TradeVision (Tauri window)
2. Naviguez vers **Dashboard** → **📊 IB HISTORY** (bouton orange)
3. Cliquez sur **🔄 Sync from IB**
4. Attendez 2-5 secondes
5. Vérifiez les logs console (F12 → Console)
6. Les trades doivent apparaître dans le tableau

### 4. Vérifier les Logs

```javascript
// Console browser (F12)
[IBSync] Starting sync from IB Gateway
[IBSync] Fetched N trades from IB
[IBSync] Reconciled trades with strategy detection
[IBSync] Saved to SQLite: X trades synced
[IBSync] Last sync: 2025-02-02 18:25:00
```

### 5. Test Scheduler (Auto Sync)

L'app lance automatiquement le scheduler au démarrage :
- ✅ Vérifie besoin de sync toutes les 30 minutes
- ✅ Sync si 24h+ écoulées depuis dernière sync
- ✅ Logs dans console browser

Pour forcer une sync manuelle, cliquez sur le bouton **🔄 Sync from IB** dans HistoriqueView.

## Troubleshooting

### ❌ "Connection refused: 127.0.0.1:7496"
→ IB Gateway n'est pas lancé ou pas accessible
→ Vérifiez : port 7496, mode Read-only activé

### ❌ "Authentication failed"
→ Username/password incorrect
→ Vérifiez credentials dans env vars
→ Assurez-vous d'utiliser les credentials IBG (pas TWS)

### ❌ "No trades returned"
→ Compte n'a pas d'historique (normal pour compte neuf)
→ Créez quelques trades manuellement dans IB
→ Attendez quelques minutes avant de sync

### ⚠️ Wayland rendering issues (Fedora)
→ Le fix `WEBKIT_DISABLE_DMABUF_RENDERER=1` devrait résoudre
→ Si toujours problems: `export QT_QPA_PLATFORM=wayland`

## Expected Data Flow

```
IB Gateway (live account)
    ↓ HTTP POST /portfolio/trades (read-only API)
    ↓ (retry logic: 3 attempts, exponential backoff)
Rust parser validates:
    ↓ - Checks trade_id unique
    ↓ - Validates price, quantity, commission
    ↓ - Extracts expiry/strike for options
Reconciliation logic:
    ↓ - Deduplicates trades by trade_id
    ↓ - Detects strategy (ROCKETS/WHEEL/PCS)
    ↓ - Validates all required fields
SQLite rocket_trades_history:
    ↓ - INSERT OR IGNORE (no duplicates)
    ↓ - Updates sync_metadata
Vue Dashboard:
    ↓ - HistoriqueComplet displays live data
    ↓ - Filters, sorts, calculates P/L
User sees:
    ✅ All trades with exact P/L from IB
    ✅ Strategy auto-detected
    ✅ Stats: total P/L, win rate, trade count
```

## API Endpoints Used

Only **read-only** endpoints from IB Gateway REST API:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/iserver/account/ACCOUNT_ID/portfolio` | GET | Fetch positions |
| `/iserver/account/ACCOUNT_ID/trades` | GET | Fetch trade history |
| `/iserver/account/ACCOUNT_ID/ledger` | GET | Fetch P&L (future) |

**No write operations** - all read-only for safety.

## Next Steps After Testing

If sync works perfectly:
1. ✅ Validate P/L accuracy vs IB statement
2. ✅ Check strategy detection correctness
3. ✅ Identify any edge cases
4. ✅ Plan Phase 3: Advanced Analytics

If issues found:
1. 🐛 Create test case
2. 🐛 Add to IBSync.spec.js
3. 🐛 Fix parser/reconciliation logic
4. 🐛 Re-test

## Files Ready for Testing

- ✅ `src-tauri/src/modules/ib_gateway/` (Rust client)
- ✅ `src/composables/useIBSync.js` (Sync orchestration)
- ✅ `src/components/rocket/HistoriqueComplet.vue` (UI)
- ✅ `src/composables/useIBSyncScheduler.js` (Auto scheduler)
- ✅ SQLite schema ready (rocket_trades_history)

## Safety Notes

⚠️ **IMPORTANT**:
- Never use real trading account credentials in env vars
- Use **Paper Trading** or **Demo Account** only
- IB Gateway runs in **read-only mode** (no trading possible)
- Database is local SQLite (no external uploads)
- All processing happens on-device (no cloud sync)

---

**Ready to sync?** Launch with your IB credentials and watch the magic happen! 🚀

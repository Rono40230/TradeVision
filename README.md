# 📊 TradeVision - Trading Journal Powered by IB Gateway

> Precise trade history tracking and P/L analysis using Interactive Brokers as the source of truth.

![Status](https://img.shields.io/badge/status-beta-blue) ![Tests](https://img.shields.io/badge/tests-22%2F22-green) ![Phase](https://img.shields.io/badge/phase-1.3%2F3-brightgreen)

## 🎯 Mission

Transform trading journals from manual estimation to **exact P/L tracking** by syncing all trades directly from IB Gateway.

### Key Features

✅ **Exact P/L** - Read directly from IB Gateway, not estimates  
✅ **Automatic Sync** - Daily sync scheduler (24h intervals)  
✅ **Strategy Detection** - Auto-categorize trades (Wheels, PCS, Rockets)  
✅ **Live Dashboard** - Filter, sort, analyze all trades  
✅ **Zero Manual Input** - No notes, no manual corrections needed  
✅ **Tauri Desktop App** - Cross-platform (Windows, Mac, Linux)  

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Rust 1.70+ (for Tauri)
- IB Gateway in read-only mode on localhost:7496
- Paper Trading or Demo Account (recommended for testing)

### Installation

```bash
# Clone and setup
git clone https://github.com/Rono40230/TradeVision.git
cd TradeVision/"Journal Rocket Trading"
npm install

# Launch (with IB credentials)
IBKR_USERNAME=your_username \
IBKR_PASSWORD=your_password \
./launch-dev.sh
```

### First Sync

1. Open **Dashboard** → **📊 IB HISTORY**
2. Click **🔄 Sync from IB**
3. Wait for trades to load
4. View filtered history with exact P/L

**[Full Testing Guide →](./TESTING_IB_INTEGRATION.md)**

## 📁 Project Structure

```
src/
├── components/
│   ├── rocket/
│   │   └── HistoriqueComplet.vue      # Trade history UI
│   └── dashboard/
│       └── DashboardCockpit.vue       # Main navigation
├── composables/
│   ├── useIBSync.js                   # Manual sync orchestration
│   └── useIBSyncScheduler.js          # Auto scheduler (24h)
├── utils/
│   ├── db.js                          # SQLite schema
│   ├── ibReconciliation.js            # Strategy detection
│   └── ibSyncSchedulerSetup.js        # Lifecycle management
└── views/
    └── HistoriqueView.vue             # Dedicated history page

src-tauri/src/
├── modules/
│   └── ib_gateway/
│       ├── auth.rs                    # Credentials management
│       ├── client.rs                  # HTTP client + retry logic
│       ├── parser.rs                  # JSON parsing & validation
│       └── mod.rs                     # Public API
└── lib.rs                             # Tauri command registration
```

## 🏗️ Architecture

```
IB Gateway (Read-Only API)
    ↓
Tauri Backend (Rust)
  └─ ib_gateway module
    └─ HTTP client with retry logic (3x exponential backoff)
      └─ JSON parser + validation
        └─ Deduplication by trade_id
          ↓
Vue Frontend (JavaScript)
  └─ useIBSync composable
    └─ reconcileTrades() → strategy detection
      └─ validateTrade() → data integrity
        └─ SQLite persistence
          ↓
Local SQLite Database
  └─ rocket_trades_history (exact P/L from IB)
    └─ sync_metadata (timestamp, count)
      ↓
HistoriqueComplet.vue
  └─ Filter by strategy, symbol
    └─ Sort by date, P/L
      └─ Live stats (total P/L, win rate, trade count)
```

## 📊 Implementation Status

### Phase 1: IB Gateway Integration
- [x] **1.1 Rust Connector** (Commit 1f0b28f)
  - HTTP client with retry logic
  - JSON parsing + validation
  - Error handling
  
- [x] **1.2 SQLite Sync Layer** (Commit 1f2516a)
  - Trade reconciliation
  - Strategy auto-detection
  - Full test coverage (14 tests)
  
- [x] **1.3 Auto Scheduler** (Commit ab8f2e4)
  - 30min check interval
  - 24h sync threshold
  - Background lifecycle management

### Phase 2: Trade History UI ✅ (Commit 3ebd1a1)
- [x] HistoriqueComplet component
- [x] Filtering & sorting
- [x] Live statistics
- [x] Manual sync button

### Phase 3: Advanced Analytics (Planned)
- [ ] Win/loss breakdown by strategy
- [ ] Entry/exit analysis
- [ ] Greeks tracking (options)
- [ ] Performance metrics
- [ ] Export to CSV/Excel

## 🧪 Testing

### Unit Tests
```bash
npm run test
# 22/22 tests passing ✅
```

### Build
```bash
npm run build
# 495.69 KB JS gzip ✅
```

### Development
```bash
./launch-dev.sh
# or
RUST_MIN_STACK=16777216 WEBKIT_DISABLE_DMABUF_RENDERER=1 npm run tauri dev
```

## 📝 Data Structures

### Trade (from IB Gateway)
```javascript
{
  trade_id: "ibkr_12345",           // Unique key
  symbol: "AAPL",                   // Stock symbol
  asset_class: "STOCK|OPTION",      // Asset type
  side: "BUY|SELL",                 // Direction
  quantity: 100,                    // # contracts
  price_avg: 150.50,                // Average execution price
  commission: 10.00,                // Trade fees
  realized_pnl: 500.00,             // P/L exact from IB
  unrealized_pnl: 0,                // Current P/L (if open)
  open_date: "2025-01-15T10:00Z",   // Opening timestamp
  close_date: "2025-01-16T15:30Z",  // Closing timestamp (null if open)
  expiry: "250221",                 // Option expiration (e.g., Feb 21, 2025)
  strike: 150.00,                   // Option strike price
  order_type: "MKT|LMT",            // Order type
  strategy: "ROCKETS|WHEEL|PCS"     // Auto-detected
}
```

### Strategy Detection Logic
```
ROCKETS: Stock BUY or Option BUY
WHEEL:   Call SELL or Put SELL
PCS:     Put BUY (Put Credit Spread)
```

## 🔐 Security

- **Read-Only** - IB Gateway configured for read-only access
- **Local Storage** - All data stored in local SQLite (no cloud)
- **Credentials** - Environment variables (Tauri Keychain in future)
- **No Trading** - Impossible to execute trades from app
- **Encrypted** - Future: Tauri secure storage for credentials

## 🐛 Known Issues / TODO

- [ ] Tauri Keychain integration for secure credential storage
- [ ] Support for multiple IB accounts
- [ ] Options Greeks tracking
- [ ] Tax lot tracking
- [ ] Export functionality (CSV, Excel)
- [ ] Mobile support (Tauri iOS/Android)

## 📚 Documentation

- [TESTING_IB_INTEGRATION.md](./TESTING_IB_INTEGRATION.md) - Setup & test guide
- [task.md](./task.md) - Implementation roadmap
- [.env.example](./.env.example) - Configuration template

## 🤝 Contributing

This is a personal project. Fork and adapt as needed!

## 📄 License

See LICENSE file

---

**Status**: Ready for IB Gateway integration testing  
**Last Updated**: February 2, 2026  
**Test Coverage**: 22/22 passing ✅

use serde::{Deserialize, Serialize};

/// Struct Rust représentant un trade IB Gateway (type-safe)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct IBTrade {
    pub symbol: String,
    pub side: String,                    // "BUY" | "SELL"
    pub quantity: f64,
    pub price: f64,
    pub commission: f64,
    pub realized_pnl: Option<f64>,
    pub unrealized_pnl: Option<f64>,
    pub open_date: String,              // ISO 8601
    pub close_date: Option<String>,     // ISO 8601 ou null
    pub trade_id: String,               // Clé unique IB
    pub order_type: Option<String>,     // "MKT", "LMT", etc
    pub asset_class: Option<String>,    // "STOCK", "OPTION", "FUTURE"
    pub expiry: Option<String>,         // "250221" pour options
    pub strike: Option<f64>,            // Prix strike pour options
}

/// Parser brut JSON d'IB → Vec<IBTrade>
pub fn parse_ib_trades(json_data: &str) -> Result<Vec<IBTrade>, String> {
    let trades: Vec<IBTrade> = serde_json::from_str(json_data)
        .map_err(|e| format!("JSON parse error: {}", e))?;

    // Validation basique: pas de trades avec symbol vide
    for trade in &trades {
        if trade.symbol.is_empty() {
            return Err("Trade has empty symbol".to_string());
        }
        if trade.trade_id.is_empty() {
            return Err("Trade has empty trade_id".to_string());
        }
    }

    Ok(trades)
}

/// Déduplique les trades par trade_id (clé unique IB)
pub fn deduplicate_trades(trades: &[IBTrade]) -> Vec<IBTrade> {
    let mut seen = std::collections::HashSet::new();
    let mut result = Vec::new();

    for trade in trades {
        if seen.insert(&trade.trade_id) {
            result.push(trade.clone());
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_single_trade() {
        let json = r#"[{
            "symbol": "AAPL",
            "side": "BUY",
            "quantity": 100,
            "price": 150.5,
            "commission": 1.0,
            "realizedPnl": 50.0,
            "unrealizedPnl": null,
            "openDate": "2026-01-15",
            "closeDate": "2026-01-20",
            "tradeId": "123456",
            "orderType": "MKT",
            "assetClass": "STOCK",
            "expiry": null,
            "strike": null
        }]"#;

        let trades = parse_ib_trades(json).expect("Parse failed");
        assert_eq!(trades.len(), 1);
        assert_eq!(trades[0].symbol, "AAPL");
        assert_eq!(trades[0].quantity, 100.0);
        assert_eq!(trades[0].realized_pnl, Some(50.0));
    }

    #[test]
    fn test_parse_option_trade() {
        let json = r#"[{
            "symbol": "AAPL 250221C150",
            "side": "SELL",
            "quantity": 10,
            "price": 2.5,
            "commission": 0.5,
            "realizedPnl": 25.0,
            "unrealizedPnl": null,
            "openDate": "2026-01-10",
            "closeDate": null,
            "tradeId": "opt-001",
            "orderType": "LMT",
            "assetClass": "OPTION",
            "expiry": "250221",
            "strike": 150.0
        }]"#;

        let trades = parse_ib_trades(json).expect("Parse failed");
        assert_eq!(trades.len(), 1);
        assert_eq!(trades[0].asset_class, Some("OPTION".to_string()));
        assert_eq!(trades[0].expiry, Some("250221".to_string()));
    }

    #[test]
    fn test_deduplicate() {
        let trade1 = IBTrade {
            symbol: "AAPL".to_string(),
            side: "BUY".to_string(),
            quantity: 100.0,
            price: 150.0,
            commission: 1.0,
            realized_pnl: None,
            unrealized_pnl: None,
            open_date: "2026-01-15".to_string(),
            close_date: None,
            trade_id: "123".to_string(),
            order_type: None,
            asset_class: None,
            expiry: None,
            strike: None,
        };

        let trade2 = trade1.clone();
        let trades = vec![trade1, trade2];
        let dedup = deduplicate_trades(&trades);
        assert_eq!(dedup.len(), 1);
    }

    #[test]
    fn test_parse_empty_symbol_fails() {
        let json = r#"[{
            "symbol": "",
            "side": "BUY",
            "quantity": 100,
            "price": 150.0,
            "commission": 1.0,
            "realizedPnl": null,
            "unrealizedPnl": null,
            "openDate": "2026-01-15",
            "closeDate": null,
            "tradeId": "123",
            "orderType": null,
            "assetClass": null,
            "expiry": null,
            "strike": null
        }]"#;

        let result = parse_ib_trades(json);
        assert!(result.is_err());
    }
}

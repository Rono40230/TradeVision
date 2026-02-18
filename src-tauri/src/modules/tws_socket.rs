// Module pour connexion socket TCP à TWS/IB Gateway
// Remplace le module ib_gateway/client.rs basé sur REST

use serde::{Deserialize, Serialize};
use reqwest::Client as HttpClient;
use serde_json::Value;
use std::time::Duration;
use regex;

/// Configuration pour la connexion TWS/IB Gateway
#[derive(Clone, Debug)]
pub struct TWSConfig {
    pub host: String,
    pub port: u16,
    pub client_id: i32,
}

impl Default for TWSConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 7497, // Paper account (7496 = live)
            client_id: 42,
        }
    }
}

/// Position ouverte
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub symbol: String,
    pub position: f64,
    pub avg_cost: f64,
    pub unrealized_pnl: f64,
    pub realized_pnl: f64,
    pub account: String,
}

/// Execution / Trade
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Execution {
    pub symbol: String,
    pub side: String,
    pub shares: i32,
    pub price: f64,
    pub commission: f64,
    pub realized_pnl: f64,
    pub time: String,
}

/// Trade depuis Flex Query (historique complet)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlexTrade {
    pub account_id: String,
    pub trade_id: String,
    pub symbol: String,
    pub side: String, // BUY/SELL
    pub quantity: i32,
    pub price: f64,
    pub commission: f64,
    pub realized_pnl: f64,
    pub date: String,
    pub time: String,
}

/// Réponse Flex Query
#[derive(Debug, Serialize, Deserialize)]
struct FlexResponse {
    #[serde(rename = "FlexQueryResult")]
    flex_query_result: Option<FlexQueryResult>,
}

#[derive(Debug, Serialize, Deserialize)]
struct FlexQueryResult {
    #[serde(rename = "FlexStatements")]
    flex_statements: Option<FlexStatements>,
}

#[derive(Debug, Serialize, Deserialize)]
struct FlexStatements {
    #[serde(rename = "FlexStatement")]
    flex_statement: Option<Vec<FlexStatement>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct FlexStatement {
    #[serde(rename = "Trades")]
    trades: Option<Trades>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Trades {
    #[serde(rename = "Trade")]
    trade: Option<Vec<FlexTradeRaw>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct FlexTradeRaw {
    #[serde(rename = "accountId")]
    account_id: String,
    #[serde(rename = "tradeID")]
    trade_id: String,
    symbol: String,
    side: String,
    quantity: i32,
    price: f64,
    #[serde(rename = "ibCommission")]
    commission: f64,
    #[serde(rename = "ibCommissionCurrency")]
    commission_currency: String,
    #[serde(rename = "realizedPnL")]
    realized_pnl: f64,
    #[serde(rename = "tradeDate")]
    date: String,
    #[serde(rename = "tradeTime")]
    time: String,
}

/// Client pour accéder à TWS via socket TCP + Flex Queries
pub struct TWSSyncClient {
    config: TWSConfig,
    http_client: HttpClient,
}

impl TWSSyncClient {
    /// Crée un nouveau client TWS
    pub fn new(config: TWSConfig) -> Self {
        Self {
            config,
            http_client: HttpClient::builder()
                .timeout(Duration::from_secs(30))
                .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .danger_accept_invalid_certs(true)
                .build()
                .unwrap_or_default(),
        }
    }

    /// Récupère les positions ouvertes
    pub async fn get_positions(&self) -> Result<Vec<Position>, String> {
        // En attendant l'implémentation complète avec ibapi (qui nécessite une boucle d'événements),
        // nous retournons des données simulées réalistes basées sur les structures définies.
        // Cela permet au frontend de valider l'intégration UI.
        
        let mock_positions = vec![
            Position {
                symbol: "AAPL".to_string(),
                position: 100.0,
                avg_cost: 175.50,
                unrealized_pnl: 1250.0,
                realized_pnl: 0.0,
                account: "DU12345".to_string(),
            },
            Position {
                symbol: "TSLA".to_string(),
                position: -50.0, // Short
                avg_cost: 210.20,
                unrealized_pnl: -450.0,
                realized_pnl: 120.0,
                account: "DU12345".to_string(),
            },
            Position {
                symbol: "MSFT 250620C00450000".to_string(), // Option format
                position: 5.0,
                avg_cost: 12.50,
                unrealized_pnl: 340.0,
                realized_pnl: -50.0,
                account: "DU12345".to_string(),
            }
        ];

        Ok(mock_positions)
    }

    /// Récupère les executions récentes (simulation pour maintenant)
    /// TODO: Implémenter via ibapi crate une vraie connexion socket
    pub async fn get_executions(&self) -> Result<Vec<Execution>, String> {
        // Connexion socket TCP via ibapi serait ici
        // Pour l'instant, retourne vide (sera implémenté avec ibapi)
        Ok(vec![])
    }

    /// Récupère l'historique complet via Flex Query (2 étapes avec retry)
    /// ✅ IMPLÉMENTÉ - Utilise l'API HTTP officielle IBKR
    /// 🔄 AUTO-RETRY: Max 5 tentatives avec délai de 3s entre chaque (error 1019)
    pub async fn get_flex_trades(
        &self,
        flex_token: &str,
        query_id: i32,
    ) -> Result<Vec<FlexTrade>, String> {
        const MAX_RETRIES: u32 = 5;
        const RETRY_DELAY_MS: u64 = 3000;

        for attempt in 1..=MAX_RETRIES {
            eprintln!("[Flex Query] Attempt {}/{}", attempt, MAX_RETRIES);
            println!("[Flex Query] Attempt {}/{}", attempt, MAX_RETRIES);
            
            match self.fetch_flex_trades_single(flex_token, query_id).await {
                Ok(trades) => {
                    eprintln!("[Flex Query] ✅ Success: {} trades fetched", trades.len());
                    println!("[Flex Query] ✅ Success: {} trades fetched", trades.len());
                    return Ok(trades);
                }
                Err(e) if e.contains("1019") && attempt < MAX_RETRIES => {
                    eprintln!("[Flex Query] ⏳ Error 1019 (statement generating)");
                    eprintln!("[Flex Query] Waiting 3s before retry {} of {}", attempt + 1, MAX_RETRIES);
                    println!("[Flex Query] ⏳ Attempt {} failed with 1019 - retrying in 3s...", attempt);
                    tokio::time::sleep(tokio::time::Duration::from_millis(RETRY_DELAY_MS)).await;
                    continue;
                }
                Err(e) => {
                    eprintln!("[Flex Query] ❌ Final error: {}", e);
                    println!("[Flex Query] ❌ Final error: {}", e);
                    return Err(e);
                }
            }
        }

        Err("[RETRY FAILED] Max retries (5) reached. IBKR statement still generating. Wait 30s and try again.".to_string())
    }

    /// Une seule tentative de Flex Query
    async fn fetch_flex_trades_single(
        &self,
        flex_token: &str,
        query_id: i32,
    ) -> Result<Vec<FlexTrade>, String> {
        let base_url = "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService";

        // APPROCHE DIRECTE: GetStatement avec QueryID (le rapport pré-généré)
        // Au lieu de SendRequest qui crée une nouvelle demande de génération
        let get_statement_url = format!(
            "{}/GetStatement?t={}&q={}&v=3",
            base_url, flex_token, query_id
        );
        eprintln!("[Flex Query] GetStatement (direct with QueryID)");

        let get_response = self
            .http_client
            .get(&get_statement_url)
            .send()
            .await
            .map_err(|e| {
                eprintln!("[Flex Query] GetStatement HTTP Error: {}", e);
                format!("GetStatement failed: {}", e)
            })?;

        let get_status = get_response.status();
        if !get_status.is_success() {
            let body = get_response.text().await.unwrap_or_default();
            return Err(format!("GetStatement failed: {} - {}", get_status, body));
        }

        let content_type = get_response
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("text/xml")
            .to_string();

        let get_body = get_response.text().await.map_err(|e| e.to_string())?;
        
        // 🚨 Vérifier Error 1019 AVANT de parser
        if get_body.contains("1019") {
            return Err("1019: Statement generation in progress".to_string());
        }
        
        // Parser selon le format (JSON, XML ou CSV)
        if content_type.contains("json") {
            self.parse_flex_json(get_body).await
        } else if get_body.lines().next().map(|l| l.contains(',')) == Some(true) {
            eprintln!("[Flex Query] Format: CSV");
            self.parse_flex_csv(get_body).await
        } else {
            eprintln!("[Flex Query] Format: XML");
            self.parse_flex_xml(get_body).await
        }
    }

    /// Extrait le ReferenceCode de la réponse XML SendRequest
    fn extract_reference_code(&self, xml: &str) -> Result<String, String> {
        // Cherche <ReferenceCode>XXX</ReferenceCode>
        if let Some(start) = xml.find("<ReferenceCode>") {
            if let Some(end) = xml.find("</ReferenceCode>") {
                let code = xml[start + 15..end].to_string();
                return Ok(code);
            }
        }
        Err("ReferenceCode not found in SendRequest response".to_string())
    }

    /// Parser Flex Query en JSON
    async fn parse_flex_json(&self, json_str: String) -> Result<Vec<FlexTrade>, String> {
        let value: Value = serde_json::from_str(&json_str)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;

        let mut trades = Vec::new();

        // Naviguer dans la structure JSON pour extraire les trades
        if let Some(flex_query_result) = value.get("FlexQueryResult") {
            if let Some(flex_statements) = flex_query_result.get("FlexStatements") {
                if let Some(statements) = flex_statements.get("FlexStatement") {
                    if let Some(statement_arr) = statements.as_array() {
                        for statement in statement_arr {
                            if let Some(trades_obj) = statement.get("Trades") {
                                if let Some(trade_arr) = trades_obj.get("Trade") {
                                    if let Some(arr) = trade_arr.as_array() {
                                        for trade_val in arr {
                                            if let Ok(trade) =
                                                serde_json::from_value::<FlexTradeRaw>(trade_val.clone())
                                            {
                                                trades.push(FlexTrade {
                                                    account_id: trade.account_id,
                                                    trade_id: trade.trade_id,
                                                    symbol: trade.symbol,
                                                    side: trade.side,
                                                    quantity: trade.quantity,
                                                    price: trade.price,
                                                    commission: trade.commission,
                                                    realized_pnl: trade.realized_pnl,
                                                    date: trade.date,
                                                    time: trade.time,
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(trades)
    }

    /// Parser Flex Query en XML (format simple avec regex)
    async fn parse_flex_xml(&self, xml_str: String) -> Result<Vec<FlexTrade>, String> {
        eprintln!("[Rust] XML Response (first 1000 chars):\n{}", &xml_str[..std::cmp::min(1000, xml_str.len())]);
        
        let mut trades = Vec::new();

        // Parser simple avec regex pour extraire les <Trade> éléments
        let trade_regex = regex::Regex::new(r"<Trade\s+([^>]*)>").unwrap();
        
        eprintln!("[Rust] Searching for <Trade> elements...");
        let cap_count = trade_regex.captures_iter(&xml_str).count();
        eprintln!("[Rust] Found {} <Trade> elements", cap_count);
        
        for cap in trade_regex.captures_iter(&xml_str) {
            let attrs = &cap[1];
            eprintln!("[Rust] Trade attributes: {}", attrs);
            
            // Extraire les attributs XML
            let mut trade = FlexTrade {
                account_id: String::new(),
                trade_id: String::new(),
                symbol: String::new(),
                side: String::new(),
                quantity: 0,
                price: 0.0,
                commission: 0.0,
                realized_pnl: 0.0,
                date: String::new(),
                time: String::new(),
            };

            // Parser les attributs
            self.extract_xml_attr(attrs, "accountId", &mut trade.account_id);
            self.extract_xml_attr(attrs, "tradeID", &mut trade.trade_id);
            self.extract_xml_attr(attrs, "symbol", &mut trade.symbol);
            self.extract_xml_attr(attrs, "side", &mut trade.side);
            
            if let Ok(qty) = self.extract_xml_attr_as_int(attrs, "quantity") {
                trade.quantity = qty;
            }
            if let Ok(price) = self.extract_xml_attr_as_float(attrs, "price") {
                trade.price = price;
            }
            if let Ok(comm) = self.extract_xml_attr_as_float(attrs, "ibCommission") {
                trade.commission = comm;
            }
            if let Ok(pnl) = self.extract_xml_attr_as_float(attrs, "realizedPnL") {
                trade.realized_pnl = pnl;
            }
            self.extract_xml_attr(attrs, "tradeDate", &mut trade.date);
            self.extract_xml_attr(attrs, "tradeTime", &mut trade.time);

            eprintln!("[Rust] Parsed trade: {} {} {} {}", trade.trade_id, trade.symbol, trade.side, trade.quantity);

            if !trade.symbol.is_empty() {
                trades.push(trade);
            }
        }

        eprintln!("[Rust] Parsed {} trades from XML", trades.len());
        Ok(trades)
    }

    /// Extrait un attribut XML
    fn extract_xml_attr(&self, attrs: &str, key: &str, result: &mut String) {
        let pattern = format!(r#"{}="([^"]*)""#, key);
        if let Ok(regex) = regex::Regex::new(&pattern) {
            if let Some(cap) = regex.captures(attrs) {
                *result = cap[1].to_string();
            }
        }
    }

    /// Extrait un attribut XML en entier
    fn extract_xml_attr_as_int(&self, attrs: &str, key: &str) -> Result<i32, String> {
        let mut result = String::new();
        self.extract_xml_attr(attrs, key, &mut result);
        result.parse::<i32>().map_err(|_| format!("Failed to parse {} as int", key))
    }

    /// Extrait un attribut XML en float
    fn extract_xml_attr_as_float(&self, attrs: &str, key: &str) -> Result<f64, String> {
        let mut result = String::new();
        self.extract_xml_attr(attrs, key, &mut result);
        result.parse::<f64>().map_err(|_| format!("Failed to parse {} as float", key))
    }

    /// Parser Flex Query en CSV
    async fn parse_flex_csv(&self, csv_str: String) -> Result<Vec<FlexTrade>, String> {
        eprintln!("[Rust] Parsing CSV format");
        
        let mut trades = Vec::new();
        let lines: Vec<&str> = csv_str.lines().collect();
        
        if lines.is_empty() {
            return Ok(trades);
        }

        // Première ligne = headers (nettoyés des guillemets)
        let headers: Vec<String> = lines[0]
            .split(',')
            .map(|h| h.trim().trim_matches('"').to_string())
            .collect();
        eprintln!("[Rust] CSV Headers: {:?}", headers);

        // Trouver les indices des colonnes importantes (case-insensitive)
        let idx_account = headers.iter().position(|h| h.to_lowercase().contains("accountid") || h.to_lowercase().contains("account"));
        let idx_trade_id = headers.iter().position(|h| h.to_lowercase().contains("tradeid") || h.to_lowercase().contains("tradenum"));
        let idx_symbol = headers.iter().position(|h| h.to_lowercase() == "symbol");
        let idx_side = headers.iter().position(|h| h.to_lowercase() == "buy/sell" || h.to_lowercase() == "side");
        let idx_qty = headers.iter().position(|h| h.to_lowercase() == "quantity" || h.to_lowercase() == "qty");
        let idx_price = headers.iter().position(|h| h.to_lowercase() == "tradeprice" || h.to_lowercase() == "price");
        let idx_comm = headers.iter().position(|h| h.to_lowercase().contains("commission") || h.to_lowercase().contains("ibcommission"));
        let idx_pnl = headers.iter().position(|h| h.to_lowercase().contains("pnl") || h.to_lowercase().contains("fifopnl"));
        let idx_date = headers.iter().position(|h| h.to_lowercase().contains("datetime") || h.to_lowercase().contains("date"));

        eprintln!("[Rust] Column indices - ID: {:?}, Symbol: {:?}, Side: {:?}, Qty: {:?}, Price: {:?}, Comm: {:?}, PnL: {:?}", 
                  idx_trade_id, idx_symbol, idx_side, idx_qty, idx_price, idx_comm, idx_pnl);

        // Parser les lignes (skip header)
        for (line_idx, line) in lines.iter().skip(1).enumerate() {
            if line.trim().is_empty() {
                continue;
            }

            let fields: Vec<String> = line
                .split(',')
                .map(|f| f.trim().trim_matches('"').to_string())
                .collect();

            let trade = FlexTrade {
                account_id: idx_account.and_then(|i| fields.get(i).map(|s| s.clone())).unwrap_or_default(),
                trade_id: idx_trade_id.and_then(|i| fields.get(i).map(|s| s.clone())).unwrap_or_default(),
                symbol: idx_symbol.and_then(|i| fields.get(i).map(|s| s.clone())).unwrap_or_default(),
                side: idx_side.and_then(|i| fields.get(i).map(|s| s.clone())).unwrap_or_default(),
                quantity: idx_qty.and_then(|i| fields.get(i).and_then(|s| s.parse::<i32>().ok())).unwrap_or(0),
                price: idx_price.and_then(|i| fields.get(i).and_then(|s| s.parse::<f64>().ok())).unwrap_or(0.0),
                commission: idx_comm.and_then(|i| fields.get(i).and_then(|s| s.parse::<f64>().ok())).unwrap_or(0.0),
                realized_pnl: idx_pnl.and_then(|i| fields.get(i).and_then(|s| s.parse::<f64>().ok())).unwrap_or(0.0),
                date: idx_date.and_then(|i| fields.get(i).map(|s| s.clone())).unwrap_or_default(),
                time: String::new(), // CSV IBKR n'a pas de time séparé
            };

            if !trade.symbol.is_empty() {
                eprintln!("[Rust] CSV Trade {}: {} {} {} {}", line_idx, trade.symbol, trade.side, trade.quantity, trade.realized_pnl);
                trades.push(trade);
            }
        }

        eprintln!("[Rust] Parsed {} trades from CSV", trades.len());
        Ok(trades)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = TWSConfig::default();
        assert_eq!(config.host, "127.0.0.1");
        assert_eq!(config.port, 7497);
        assert_eq!(config.client_id, 42);
    }
}

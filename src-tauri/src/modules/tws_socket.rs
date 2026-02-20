// Module pour connexion socket TCP à TWS/IB Gateway
// Remplace le module ib_gateway/client.rs basé sur REST

use serde::{Deserialize, Serialize};
use reqwest::Client as HttpClient;
use serde_json::Value;
use std::time::Duration;
use std::collections::HashMap;
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
    pub asset_class: String,  // STK | OPT | FUT | CASH
    pub side: String,          // BUY/SELL
    pub quantity: i32,
    pub multiplier: i32,
    pub price: f64,
    pub commission: f64,
    pub realized_pnl: f64,
    pub date: String,
    pub time: String,
    pub expiry: String,        // YYYY-MM-DD ou "" pour stocks
    pub strike: f64,           // 0.0 pour stocks
    pub put_call: String,      // "P", "C" ou ""
    pub open_close: String,    // "O" ou "C"
    pub exchange: String,
    pub proceeds: f64,
    pub cost_basis: f64,
    pub notes: String,
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

#[derive(Debug, Serialize, Deserialize, Default)]
struct FlexTradeRaw {
    #[serde(rename = "accountId", default)]
    account_id: String,
    #[serde(rename = "tradeID", default)]
    trade_id: String,
    #[serde(default)]
    symbol: String,
    #[serde(rename = "buySell", default)]
    side: String,
    #[serde(default)]
    quantity: i32,
    #[serde(rename = "tradePrice", default)]
    price: f64,
    #[serde(rename = "ibCommission", default)]
    commission: f64,
    #[serde(rename = "fifoPnlRealized", default)]
    realized_pnl: f64,
    #[serde(rename = "dateTime", default)]
    date_time: String,
    #[serde(rename = "assetCategory", default)]
    asset_class: String,
    #[serde(rename = "putCall", default)]
    put_call: String,
    #[serde(rename = "multiplier", default)]
    multiplier: i32,
    #[serde(default)]
    expiry: String,
    #[serde(default)]
    strike: f64,
    #[serde(rename = "openCloseIndicator", default)]
    open_close: String,
    #[serde(default)]
    exchange: String,
    #[serde(default)]
    proceeds: f64,
    #[serde(rename = "costBasis", default)]
    cost_basis: f64,
    #[serde(rename = "notes", default)]
    notes: String,
}

/// Client pour accéder à TWS via socket TCP + Flex Queries
pub struct TWSSyncClient {
    _config: TWSConfig,
    http_client: HttpClient,
}

impl TWSSyncClient {
    /// Crée un nouveau client TWS
    pub fn new(config: TWSConfig) -> Self {
        Self {
            _config: config,
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
    /// API publique: parse un CSV fourni en string (import fichier local)
    /// Filtre : seuls les trades cl\u00f4tur\u00e9s (open_close = "C" ou vide pour compatibilit\u00e9)
    pub async fn parse_csv_public(&self, csv_content: String) -> Result<Vec<FlexTrade>, String> {
        let trades = self.parse_flex_csv(csv_content).await?;
        let closed: Vec<FlexTrade> = trades.into_iter()
            .filter(|t| t.open_close.is_empty() || t.open_close.to_uppercase() == "C")
            .collect();
        eprintln!("[Flex CSV] Filtre open_close=C : {} trades clotures retenus", closed.len());
        Ok(closed)
    }

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
                    // Filtre : uniquement les trades clotures (open_close = "C" ou vide)
                    let closed: Vec<FlexTrade> = trades.into_iter()
                        .filter(|t| t.open_close.is_empty() || t.open_close.to_uppercase() == "C")
                        .collect();
                    eprintln!("[Flex Query] OK: {} closed trades (open_close=C filter applied)", closed.len());
                    println!("[Flex Query] OK: {} closed trades", closed.len());
                    return Ok(closed);
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

    /// Flux officiel IBKR Flex Web Service (2 étapes)
    /// Étape 1: SendRequest → ReferenceCode
    /// Étape 2: GetStatement avec ReferenceCode → données
    async fn fetch_flex_trades_single(
        &self,
        flex_token: &str,
        query_id: i32,
    ) -> Result<Vec<FlexTrade>, String> {
        let base_url = "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService";

        // ── Étape 1 : SendRequest → obtenir le ReferenceCode ──────────────
        let send_url = format!(
            "{}/SendRequest?t={}&q={}&v=3",
            base_url, flex_token, query_id
        );
        eprintln!("[Flex Query] Étape 1: SendRequest pour queryId={}", query_id);

        let send_response = self
            .http_client
            .get(&send_url)
            .header("User-Agent", "TradeVision/1.0")
            .send()
            .await
            .map_err(|e| format!("SendRequest HTTP error: {}", e))?;

        if !send_response.status().is_success() {
            let status = send_response.status();
            let body = send_response.text().await.unwrap_or_default();
            return Err(format!("SendRequest failed: {} - {}", status, body));
        }

        let send_body = send_response.text().await.map_err(|e| e.to_string())?;
        eprintln!("[Flex Query] SendRequest response: {}", &send_body[..send_body.len().min(500)]);

        // Vérifier que SendRequest a réussi
        if send_body.contains("<Status>Fail</Status>") || send_body.contains("ErrorCode") {
            return Err(format!("SendRequest rejected: {}", send_body));
        }

        // Extraire le ReferenceCode
        let reference_code = self.extract_reference_code(&send_body)?;
        eprintln!("[Flex Query] ReferenceCode obtenu: {}", reference_code);

        // ── Pause : laisser IBKR générer le rapport (recommandé 10s) ──────
        eprintln!("[Flex Query] Attente 10s pour la génération du rapport...");
        tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;

        // ── Étape 2 : GetStatement avec ReferenceCode ─────────────────────
        let get_url = format!(
            "{}/GetStatement?t={}&q={}&v=3",
            base_url, flex_token, reference_code
        );
        eprintln!("[Flex Query] Étape 2: GetStatement avec ReferenceCode={}", reference_code);

        let get_response = self
            .http_client
            .get(&get_url)
            .header("User-Agent", "TradeVision/1.0")
            .send()
            .await
            .map_err(|e| format!("GetStatement HTTP error: {}", e))?;

        let content_type = get_response
            .headers()
            .get("content-type")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("text/xml")
            .to_string();

        if !get_response.status().is_success() {
            let status = get_response.status();
            let body = get_response.text().await.unwrap_or_default();
            return Err(format!("GetStatement failed: {} - {}", status, body));
        }

        let get_body = get_response.text().await.map_err(|e| e.to_string())?;

        // Vérifier error 1019 (rapport encore en cours de génération)
        if get_body.contains("1019") {
            return Err("1019: Statement generation in progress".to_string());
        }

        eprintln!("[Flex Query] GetStatement response ({} chars, type: {})", get_body.len(), content_type);

        // Parser selon le format retourné
        if content_type.contains("json") {
            self.parse_flex_json(get_body).await
        } else if get_body.trim_start().starts_with('{') {
            eprintln!("[Flex Query] Format: JSON (détecté par contenu)");
            self.parse_flex_json(get_body).await
        } else if get_body.lines().next().map(|l| l.contains(',')) == Some(true)
            && !get_body.trim_start().starts_with('<')
        {
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
                                                // Parser dateTime "YYYYMMDD;HHmmss" → date + time
                                                let (date, time) = if trade.date_time.contains(';') {
                                                    let mut p = trade.date_time.splitn(2, ';');
                                                    (p.next().unwrap_or("").to_string(), p.next().unwrap_or("").to_string())
                                                } else {
                                                    (trade.date_time.clone(), String::new())
                                                };
                                                // Normaliser expiry YYYYMMDD → YYYY-MM-DD
                                                let expiry = if trade.expiry.len() == 8 && trade.expiry.chars().all(|c| c.is_ascii_digit()) {
                                                    format!("{}-{}-{}", &trade.expiry[..4], &trade.expiry[4..6], &trade.expiry[6..8])
                                                } else { trade.expiry.clone() };
                                                let mult = if trade.multiplier == 0 { 1 } else { trade.multiplier };
                                                trades.push(FlexTrade {
                                                    account_id:   trade.account_id,
                                                    trade_id:     trade.trade_id,
                                                    symbol:       trade.symbol,
                                                    asset_class:  trade.asset_class,
                                                    side:         trade.side,
                                                    quantity:     trade.quantity.abs(),
                                                    multiplier:   mult,
                                                    price:        trade.price,
                                                    commission:   trade.commission.abs(),
                                                    realized_pnl: trade.realized_pnl,
                                                    date,
                                                    time,
                                                    expiry,
                                                    strike:       trade.strike,
                                                    put_call:     trade.put_call,
                                                    open_close:   trade.open_close,
                                                    exchange:     trade.exchange,
                                                    proceeds:     trade.proceeds,
                                                    cost_basis:   trade.cost_basis,
                                                    notes:        trade.notes,
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

    /// Parser Flex Query en XML (format IBKR Activity ou Trade Confirmation)
    async fn parse_flex_xml(&self, xml_str: String) -> Result<Vec<FlexTrade>, String> {
        // Log des 2000 premiers chars pour debug
        println!("[Flex XML] Réponse brute ({} chars): {}", xml_str.len(), &xml_str[..xml_str.len().min(2000)]);
        
        let mut trades = Vec::new();

        // IBKR Activity Flex Query  : <Trade .../>
        // IBKR Trade Confirmation   : <TradeConfirm .../>
        // Les deux formats sont supportés
        let trade_regex = regex::Regex::new(r"(?s)<(?:Trade|TradeConfirm)\s+([^/]*/?)>").unwrap();
        
        let all_matches: Vec<_> = trade_regex.captures_iter(&xml_str).collect();
        println!("[Flex XML] Éléments <Trade>/<TradeConfirm> trouvés: {}", all_matches.len());

        for cap in all_matches {
            let attrs = &cap[1];
            
            let mut trade = FlexTrade {
                account_id: String::new(),
                trade_id: String::new(),
                symbol: String::new(),
                asset_class: String::new(),
                side: String::new(),
                quantity: 0,
                multiplier: 1,
                price: 0.0,
                commission: 0.0,
                realized_pnl: 0.0,
                date: String::new(),
                time: String::new(),
                expiry: String::new(),
                strike: 0.0,
                put_call: String::new(),
                open_close: String::new(),
                exchange: String::new(),
                proceeds: 0.0,
                cost_basis: 0.0,
                notes: String::new(),
            };

            // Attributs IBKR officiels (Activity Flex Query)
            self.extract_xml_attr(attrs, "accountId", &mut trade.account_id);
            
            // tradeID (Activity) ou tradeId
            if trade.trade_id.is_empty() { self.extract_xml_attr(attrs, "tradeID", &mut trade.trade_id); }
            if trade.trade_id.is_empty() { self.extract_xml_attr(attrs, "tradeId", &mut trade.trade_id); }
            
            self.extract_xml_attr(attrs, "symbol", &mut trade.symbol);
            
            // buySell (Activity) ou side
            if trade.side.is_empty() { self.extract_xml_attr(attrs, "buySell", &mut trade.side); }
            if trade.side.is_empty() { self.extract_xml_attr(attrs, "side", &mut trade.side); }
            if trade.side.is_empty() { self.extract_xml_attr(attrs, "buy/sell", &mut trade.side); }

            if let Ok(qty) = self.extract_xml_attr_as_int(attrs, "quantity") {
                trade.quantity = qty;
            }
            
            // tradePrice (Activity) ou price
            if trade.price == 0.0 {
                if let Ok(p) = self.extract_xml_attr_as_float(attrs, "tradePrice") { trade.price = p; }
            }
            if trade.price == 0.0 {
                if let Ok(p) = self.extract_xml_attr_as_float(attrs, "price") { trade.price = p; }
            }

            // ibCommission
            if let Ok(c) = self.extract_xml_attr_as_float(attrs, "ibCommission") { trade.commission = c; }

            // fifoPnlRealized (Activity) ou realizedPnL ou mtmPnlRealized
            if let Ok(pnl) = self.extract_xml_attr_as_float(attrs, "fifoPnlRealized") { trade.realized_pnl = pnl; }
            if trade.realized_pnl == 0.0 {
                if let Ok(pnl) = self.extract_xml_attr_as_float(attrs, "realizedPnL") { trade.realized_pnl = pnl; }
            }

            // dateTime (Activity: "YYYYMMDD;HHmmss") ou tradeDate
            let mut datetime = String::new();
            self.extract_xml_attr(attrs, "dateTime", &mut datetime);
            if !datetime.is_empty() {
                // Format IBKR: "20240115;143022" → date="20240115", time="143022"
                if let Some((d, t)) = datetime.split_once(';') {
                    trade.date = d.to_string();
                    trade.time = t.to_string();
                } else {
                    trade.date = datetime;
                }
            } else {
                self.extract_xml_attr(attrs, "tradeDate", &mut trade.date);
                self.extract_xml_attr(attrs, "tradeTime", &mut trade.time);
            }

            // ── Champs manquants — harmonisation avec parse_flex_csv ──────────

            // assetCategory → asset_class
            if trade.asset_class.is_empty() {
                self.extract_xml_attr(attrs, "assetCategory", &mut trade.asset_class);
            }

            // putCall → put_call
            self.extract_xml_attr(attrs, "putCall", &mut trade.put_call);

            // multiplier
            if trade.multiplier == 1 {
                if let Ok(m) = self.extract_xml_attr_as_int(attrs, "multiplier") {
                    if m > 0 { trade.multiplier = m; }
                }
            }

            // expiry (format YYYYMMDD → YYYY-MM-DD)
            if trade.expiry.is_empty() {
                let mut expiry_raw = String::new();
                self.extract_xml_attr(attrs, "expiry", &mut expiry_raw);
                trade.expiry = if expiry_raw.len() == 8 && expiry_raw.chars().all(|c| c.is_ascii_digit()) {
                    format!("{}-{}-{}", &expiry_raw[..4], &expiry_raw[4..6], &expiry_raw[6..8])
                } else { expiry_raw };
            }

            // strike
            if trade.strike == 0.0 {
                if let Ok(s) = self.extract_xml_attr_as_float(attrs, "strike") { trade.strike = s; }
            }

            // proceeds
            if let Ok(p) = self.extract_xml_attr_as_float(attrs, "proceeds") { trade.proceeds = p; }

            // costBasis → cost_basis
            if let Ok(cb) = self.extract_xml_attr_as_float(attrs, "costBasis") { trade.cost_basis = cb; }

            // notes / description
            if trade.notes.is_empty() {
                self.extract_xml_attr(attrs, "notes", &mut trade.notes);
            }
            if trade.notes.is_empty() {
                self.extract_xml_attr(attrs, "description", &mut trade.notes);
            }

            // openCloseIndicator → open_close
            if trade.open_close.is_empty() {
                self.extract_xml_attr(attrs, "openCloseIndicator", &mut trade.open_close);
            }
            if trade.open_close.is_empty() {
                self.extract_xml_attr(attrs, "openClose", &mut trade.open_close);
            }

            // exchange
            if trade.exchange.is_empty() {
                self.extract_xml_attr(attrs, "exchange", &mut trade.exchange);
            }

            println!("[Flex XML] Trade parsé: id={} sym={} side={} qty={} price={} pnl={} date={} oc={}",
                trade.trade_id, trade.symbol, trade.side, trade.quantity, trade.price, trade.realized_pnl, trade.date, trade.open_close);

            if !trade.symbol.is_empty() {
                trades.push(trade);
            }
        }

        println!("[Flex XML] Total trades parsés: {}", trades.len());
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

    /// Parser le CSV Activity Statement IBKR
    /// Supporte deux formats :
    ///   - Format web service : multi-sections, chaque section a son "HEADER","TRNT" suivi de "DATA","TRNT"
    ///   - Format plain CSV   : Col1,Col2,... / val1,val2,...  (export manuel)
    async fn parse_flex_csv(&self, csv_str: String) -> Result<Vec<FlexTrade>, String> {
        println!("[Flex CSV] Parsing Activity Statement CSV IBKR ({} chars)", csv_str.len());

        let mut trades = Vec::new();
        let lines: Vec<&str> = csv_str.lines().collect();

        // Détecter si format HEADER/TRNT ou plain CSV
        let is_multi_section = lines.iter().any(|l| {
            let f = Self::parse_csv_line(l);
            f.first().map(|s| s.to_uppercase() == "HEADER").unwrap_or(false)
            && f.get(1).map(|s| s.to_uppercase() == "TRNT").unwrap_or(false)
        });

        if !is_multi_section {
            // Format plain CSV : première ligne = headers, toutes les lignes suivantes = données
            let first = match lines.first() {
                Some(l) => l,
                None => return Ok(trades),
            };
            let cols = Self::parse_csv_line(first);
            if cols.is_empty() { return Ok(trades); }
            println!("[Flex CSV] Format détecté: plain CSV (export manuel)");
            let headers: Vec<String> = cols.iter().map(|s| s.to_lowercase()).collect();
            println!("[Flex CSV] Colonnes ({}): {:?}", headers.len(), headers);
            let col_offset = 0usize;
            let find = |names: &[&str]| -> Option<usize> {
                for name in names {
                    if let Some(p) = headers.iter().position(|h| h.contains(name)) {
                        return Some(p + col_offset);
                    }
                }
                None
            };
            let mut data_count = 0usize;
            // Déduplication des fingerprints SYN (partial fills identiques)
            let mut syn_counter: HashMap<String, u32> = HashMap::new();
            for line in lines.iter().skip(1) {
                let fields = Self::parse_csv_line(line);
                if fields.is_empty() { continue; }
                data_count += 1;
                if let Some(mut t) = Self::parse_csv_row(&fields, &find, data_count) {
                    if t.trade_id.starts_with("SYN|") {
                        let n = syn_counter.entry(t.trade_id.clone()).or_insert(0);
                        if *n > 0 { t.trade_id = format!("{}|{}", t.trade_id, n); }
                        *n += 1;
                    }
                    trades.push(t);
                }
            }
            println!("[Flex CSV] plain CSV: {} trades", trades.len());
            return Ok(trades);
        }

        // Format multi-sections HEADER/TRNT
        // On maintient un mapping courant de colonnes et on le met à jour à chaque HEADER,TRNT
        println!("[Flex CSV] Format détecté: multi-sections HEADER/TRNT (web service)");
        
        let mut current_headers: Vec<String> = Vec::new();
        let mut data_count = 0usize;
        // Déduplication des fingerprints SYN (partial fills identiques)
        let mut syn_counter: HashMap<String, u32> = HashMap::new();

        for line in &lines {
            let fields = Self::parse_csv_line(line);
            if fields.is_empty() { continue; }

            let tag0 = fields.first().map(|s| s.to_uppercase()).unwrap_or_default();
            let tag1 = fields.get(1).map(|s| s.to_uppercase()).unwrap_or_default();

            if tag0 == "HEADER" && tag1 == "TRNT" {
                // Nouvelle section : met à jour le mapping de colonnes (offset 2)
                current_headers = fields.iter().skip(2).map(|s| s.to_lowercase()).collect();
                println!("[Flex CSV] Section headers ({}): {:?}", current_headers.len(), &current_headers[..current_headers.len().min(8)]);
                continue;
            }

            if tag0 == "DATA" && tag1 == "TRNT" {
                if current_headers.is_empty() { continue; }
                data_count += 1;
                let headers = &current_headers;
                let col_offset = 2usize;
                let find = |names: &[&str]| -> Option<usize> {
                    for name in names {
                        if let Some(p) = headers.iter().position(|h| h.contains(name)) {
                            return Some(p + col_offset);
                        }
                    }
                    None
                };
                if let Some(mut t) = Self::parse_csv_row(&fields, &find, data_count) {
                    if t.trade_id.starts_with("SYN|") {
                        let n = syn_counter.entry(t.trade_id.clone()).or_insert(0);
                        if *n > 0 { t.trade_id = format!("{}|{}", t.trade_id, n); }
                        *n += 1;
                    }
                    trades.push(t);
                }
            }
        }

        println!("[Flex CSV] multi-section: data_count={}, trades retenus={}", data_count, trades.len());
        Ok(trades)
    }

    /// Parse une seule ligne DATA en FlexTrade en utilisant la fonction find fournie
    fn parse_csv_row(fields: &[String], find: &dyn Fn(&[&str]) -> Option<usize>, row_num: usize) -> Option<FlexTrade> {
        let idx_symbol     = find(&["symbol"]);
        let idx_qty        = find(&["quantity"]);
        let idx_price      = find(&["tradeprice", "t. price"]);
        let idx_comm       = find(&["ibcommission", "comm/fee"]);
        let idx_pnl        = find(&["fifopnlrealized", "realized p/l", "realized p&l"]);
        let idx_datetime   = find(&["datetime", "date/time"]);
        let idx_side       = find(&["buy/sell"]);
        let idx_asset      = find(&["assetclass"]);
        let idx_code       = find(&["notes/codes", "notes", "code"]);
        let idx_strike     = find(&["strike"]);
        let idx_expiry     = find(&["expiry"]);
        let idx_putcall    = find(&["put/call"]);
        let idx_openclose  = find(&["open/closeindicator", "open/close"]);
        let idx_multiplier = find(&["multiplier"]);
        let idx_tradeid    = find(&["tradeid", "trade id"]);
        let idx_exchange   = find(&["exchange"]);
        let idx_proceeds   = find(&["proceeds"]);
        let idx_costbasis  = find(&["costbasis", "cost basis"]);

        let symbol = idx_symbol.and_then(|i| fields.get(i)).map(|s| s.trim().to_string()).unwrap_or_default();
        if symbol.is_empty() { return None; }

        // Ignorer ordres annulés (code contient "Ca")
        if let Some(ci) = idx_code {
            if fields.get(ci).map(|c| c.contains("Ca")).unwrap_or(false) { return None; }
        }

        let get_f = |idx: Option<usize>| -> f64 {
            idx.and_then(|i| fields.get(i))
                .map(|s| s.trim().replace(',', "").parse::<f64>().unwrap_or(0.0))
                .unwrap_or(0.0)
        };

        let side = idx_side
            .and_then(|i| fields.get(i))
            .map(|s| s.trim().to_uppercase())
            .filter(|s| s == "BUY" || s == "SELL")
            .unwrap_or_else(|| if get_f(idx_qty) < 0.0 { "SELL".to_string() } else { "BUY".to_string() });

        let quantity = get_f(idx_qty).abs() as i32;

        let raw_dt = idx_datetime.and_then(|i| fields.get(i)).map(|s| s.trim().to_string()).unwrap_or_default();
        let (date, time) = match raw_dt.find(',') {
            Some(p) => (raw_dt[..p].trim().to_string(), raw_dt[p+1..].trim().to_string()),
            None => match raw_dt.find(' ') {
                Some(p) => (raw_dt[..p].trim().to_string(), raw_dt[p+1..].trim().to_string()),
                None => (raw_dt, String::new()),
            },
        };

        let expiry_raw = idx_expiry.and_then(|i| fields.get(i)).map(|s| s.trim().to_string()).unwrap_or_default();
        let expiry = if expiry_raw.len() == 8 && expiry_raw.chars().all(|c| c.is_ascii_digit()) {
            format!("{}-{}-{}", &expiry_raw[..4], &expiry_raw[4..6], &expiry_raw[6..8])
        } else {
            expiry_raw
        };

        let asset_class_str = idx_asset.and_then(|i| fields.get(i)).map(|s| s.trim().to_string()).unwrap_or_default();
        let multiplier = idx_multiplier.and_then(|i| fields.get(i))
            .and_then(|s| s.trim().parse::<i32>().ok()).unwrap_or(1);

        Some(FlexTrade {
            account_id:   String::new(),
            trade_id:     idx_tradeid
                .and_then(|i| fields.get(i))
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| {
                    // Empreinte stable : indépendante de la position dans le CSV.
                    // On exclut le `time` : il peut être absent selon le format d'export.
                    // Strike + put_call inclus pour éviter les collisions sur options
                    // de même symbole/date/side/qty/price (ex: options expirées à 0$).
                    let price_i  = (get_f(idx_price) * 10000.0).round() as i64;
                    let qty_val  = get_f(idx_qty).abs() as i32;
                    let strike_i = (get_f(idx_strike) * 100.0).round() as i64;
                    let pc       = idx_putcall.and_then(|i| fields.get(i)).map(|s| s.trim()).unwrap_or("");
                    let exp      = idx_expiry.and_then(|i| fields.get(i)).map(|s| s.trim()).unwrap_or("");
                    format!("SYN|{}|{}|{}|{}|{}|{}|{}|{}", symbol, date, side, qty_val, price_i, strike_i, pc, exp)
                }),
            symbol:       symbol.clone(),
            asset_class:  asset_class_str,
            side,
            quantity,
            multiplier,
            price:        get_f(idx_price),
            commission:   get_f(idx_comm).abs(),
            realized_pnl: get_f(idx_pnl),
            date,
            time,
            expiry,
            strike:       get_f(idx_strike),
            put_call:     idx_putcall.and_then(|i| fields.get(i)).map(|s| s.trim().to_string()).unwrap_or_default(),
            open_close:   idx_openclose.and_then(|i| fields.get(i)).map(|s| s.trim().to_string()).unwrap_or_default(),
            exchange:     idx_exchange.and_then(|i| fields.get(i)).map(|s| s.trim().to_string()).unwrap_or_default(),
            proceeds:     get_f(idx_proceeds),
            cost_basis:   get_f(idx_costbasis),
            notes:        idx_code.and_then(|i| fields.get(i)).map(|s| s.trim().to_string()).unwrap_or_default(),
        })
    }


    /// Parse une ligne CSV en respectant les guillemets (champs avec virgules)
    fn parse_csv_line(line: &str) -> Vec<String> {
        let mut fields = Vec::new();
        let mut current = String::new();
        let mut in_quotes = false;

        for ch in line.chars() {
            match ch {
                '"' => in_quotes = !in_quotes,
                ',' if !in_quotes => {
                    fields.push(current.trim().to_string());
                    current = String::new();
                }
                _ => current.push(ch),
            }
        }
        fields.push(current.trim().to_string());
        fields
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

use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;

#[derive(Serialize)]
struct MarketQuote {
    price: f64,
    change_percent: f64,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn fetch_market_quotes(symbols: Vec<String>) -> Result<HashMap<String, MarketQuote>, String> {
    if symbols.is_empty() {
        return Ok(HashMap::new());
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .cookie_store(true)
        .build()
        .map_err(|e| e.to_string())?;

    // 1. Initialiser la session pour obtenir les cookies (Yahoo exige un cookie valide pour donner un crumb)
    // On ignore le resultat, on veut juste les cookies
    let _ = client.get("https://fc.yahoo.com").send().await;

    // 2. Récupérer le "crumb" (jeton d'authentification)
    let crumb_resp = client
        .get("https://query1.finance.yahoo.com/v1/test/getcrumb")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let crumb = if crumb_resp.status().is_success() {
        crumb_resp.text().await.map_err(|e| e.to_string())?
    } else {
        // Fallback si pas de crumb (ex: session echouée), on tente sans
        String::new()
    };

    // 3. Appel de l'API avec le crumb (Utilisation de .query pour l'encodage correct des URL)
    let joined_symbols = symbols.join(",");
    let resp = client
        .get("https://query1.finance.yahoo.com/v7/finance/quote")
        .query(&[
            ("symbols", joined_symbols.as_str()),
            ("crumb", crumb.as_str()),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!(
            "Yahoo API Error: {}. Crumb used: {}",
            resp.status(),
            crumb
        ));
    }

    let json: Value = resp.json().await.map_err(|e| e.to_string())?;

    let mut map = HashMap::new();

    if let Some(results) = json["quoteResponse"]["result"].as_array() {
        for item in results {
            if let Some(symbol) = item["symbol"].as_str() {
                let price = item["regularMarketPrice"]
                    .as_f64()
                    .or_else(|| item["postMarketPrice"].as_f64());

                let change_percent = match item["regularMarketChangePercent"].as_f64() {
                    Some(v) => v,
                    None => 0.0,
                };

                if let Some(p) = price {
                    map.insert(
                        symbol.to_string(),
                        MarketQuote {
                            price: p,
                            change_percent,
                        },
                    );
                }
            }
        }
    }

    Ok(map)
}

/// Point d'entrée principal de l'application Tauri
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![greet, fetch_market_quotes])
        .run(tauri::generate_context!())
        .map_err(|e| eprintln!("error while running tauri application: {}", e))
        .ok();
}

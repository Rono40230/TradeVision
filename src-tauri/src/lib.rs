use serde_json::Value;
use std::collections::HashMap;

/// Greets the user.
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(serde::Serialize)]
struct MarketQuote {
    price: f64,
    change_percent: f64,
}

/// Fetches market quotes from Yahoo Finance.
#[tauri::command]
async fn fetch_market_quotes(symbols: Vec<String>) -> Result<HashMap<String, MarketQuote>, String> {
    if symbols.is_empty() {
        return Ok(HashMap::new());
    }

    let joined_symbols = symbols.join(",");
    let url = format!(
        "https://query1.finance.yahoo.com/v7/finance/quote?symbols={}",
        joined_symbols
    );

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .cookie_store(true)
        .build()
        .map_err(|e| e.to_string())?;

    let _ = client.get("https://fc.yahoo.com").send().await;

    let crumb_resp = client
        .get("https://query1.finance.yahoo.com/v1/test/getcrumb")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let crumb = if crumb_resp.status().is_success() {
        crumb_resp.text().await.map_err(|e| e.to_string())?
    } else {
        "".to_string()
    };

    let resp = client
        .get(&url)
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

                let change_percent = item["regularMarketChangePercent"].as_f64().unwrap_or(0.0);

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

/// Runs the Tauri application.
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

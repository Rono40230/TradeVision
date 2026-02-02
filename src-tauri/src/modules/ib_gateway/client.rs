use reqwest::Client;
use std::time::Duration;
use crate::modules::ib_gateway::auth::IBCredentials;
use crate::modules::ib_gateway::parser::IBTrade;

const IB_GATEWAY_URL: &str = "http://localhost:7496";
const REQUEST_TIMEOUT: u64 = 30;  // secondes
const MAX_RETRIES: u32 = 3;
const RETRY_DELAY_MS: u64 = 1000;

/// Client HTTP sécurisé pour IB Gateway
pub struct IBGatewayClient {
    client: Client,
    credentials: IBCredentials,
}

impl IBGatewayClient {
    /// Crée un nouveau client IB Gateway
    pub fn new() -> Result<Self, String> {
        let credentials = IBCredentials::load()?;
        let client = Client::builder()
            .timeout(Duration::from_secs(REQUEST_TIMEOUT))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        Ok(IBGatewayClient { client, credentials })
    }

    /// Récupère l'historique des trades d'un account IB
    /// Inclut retry logic avec backoff exponentiel
    pub async fn fetch_trades(&self, account_id: &str) -> Result<String, String> {
        let url = format!("{}/api/iserver/account/{}/trades", IB_GATEWAY_URL, account_id);
        let auth_header = self.credentials.to_basic_auth_header();

        for attempt in 0..=MAX_RETRIES {
            match self.attempt_fetch(&url, &auth_header).await {
                Ok(result) => return Ok(result),
                Err(_e) if attempt < MAX_RETRIES => {
                    let delay = RETRY_DELAY_MS * 2_u64.pow(attempt);
                    tokio::time::sleep(Duration::from_millis(delay)).await;
                }
                Err(e) => return Err(e),
            }
        }

        Err("Max retries exceeded".to_string())
    }

    /// Une seule tentative de fetch
    async fn attempt_fetch(&self, url: &str, auth_header: &str) -> Result<String, String> {
        let response = self
            .client
            .post(url)
            .header("Authorization", auth_header)
            .header("Content-Type", "application/json")
            .send()
            .await;

        match response {
            Ok(resp) => {
                if resp.status().is_success() {
                    resp.text()
                        .await
                        .map_err(|e| format!("Failed to read response body: {}", e))
                } else {
                    Err(format!("IB Gateway error: {}", resp.status()))
                }
            }
            Err(e) if e.is_timeout() => Err(format!("Timeout: {}", e)),
            Err(e) => Err(format!("Network error: {}", e)),
        }
    }

    /// Helper: fetch + parse + deduplicate (tout en un)
    pub async fn fetch_and_parse_trades(&self, account_id: &str) -> Result<Vec<IBTrade>, String> {
        let json = self.fetch_trades(account_id).await?;
        let trades = crate::modules::ib_gateway::parser::parse_ib_trades(&json)?;
        let deduped = crate::modules::ib_gateway::parser::deduplicate_trades(&trades);
        Ok(deduped)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_url_construction() {
        let expected = "http://localhost:7496/api/iserver/account/U123456/trades";
        let actual = format!("{}/api/iserver/account/{}/trades", IB_GATEWAY_URL, "U123456");
        assert_eq!(actual, expected);
    }

    #[test]
    fn test_retry_logic_constants() {
        assert!(MAX_RETRIES > 0);
        assert!(RETRY_DELAY_MS > 0);
    }
}

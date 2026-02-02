mod auth;
mod client;
pub mod parser;

pub use auth::IBCredentials;
pub use client::IBGatewayClient;
pub use parser::{IBTrade, parse_ib_trades, deduplicate_trades};

/// Fonction publique principale: Récupère les trades depuis IB Gateway
/// 
/// Flux:
/// 1. Crée client (auth + HTTP)
/// 2. Fetch JSON brut depuis IB
/// 3. Parse + déduplique
/// 4. Retourne Vec<IBTrade>
/// 
/// Usage depuis Vue:
///   const trades = await invoke('fetch_ib_trades', { account_id: 'U123456' })
pub async fn fetch_ib_trades(account_id: String) -> Result<Vec<IBTrade>, String> {
    // Valide le format account_id
    if account_id.is_empty() {
        return Err("account_id is empty".to_string());
    }

    // Crée le client (charge credentials)
    let client = IBGatewayClient::new()?;

    // Fetch, parse, déduplique
    client.fetch_and_parse_trades(&account_id).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fetch_ib_trades_validates_account_id() {
        let result = futures::executor::block_on(fetch_ib_trades("".to_string()));
        assert!(result.is_err());
    }
}

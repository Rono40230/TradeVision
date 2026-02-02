use base64::{engine::general_purpose, Engine as _};

/// Récupère les credentials IB Gateway depuis le système
/// 
/// Pour tester: 
/// - username: "demo_user" (ou depuis env si développement)
/// - password: "demo_pass"
/// 
/// Production: Tauri Secure Storage (Keychain/Credential Manager)
pub struct IBCredentials {
    pub username: String,
    pub password: String,
}

impl IBCredentials {
    /// Charge les credentials (pour Phase 1: hardcodé demo, Phase 2: Tauri Keychain)
    pub fn load() -> Result<Self, String> {
        // TODO Phase 2: Intégrer tauri-plugin-keychain pour production
        // Pour maintenant, on simule avec env vars pour les tests
        
        let username = std::env::var("IB_USERNAME")
            .unwrap_or_else(|_| "demo".to_string());
        let password = std::env::var("IB_PASSWORD")
            .unwrap_or_else(|_| "demo".to_string());

        if username.is_empty() || password.is_empty() {
            return Err("IB credentials empty. Set IB_USERNAME and IB_PASSWORD env vars".to_string());
        }

        Ok(IBCredentials { username, password })
    }

    /// Encode en Basic Auth (base64 de "username:password")
    pub fn to_basic_auth_header(&self) -> String {
        let credentials = format!("{}:{}", self.username, self.password);
        let encoded = general_purpose::STANDARD.encode(credentials);
        format!("Basic {}", encoded)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_auth_encoding() {
        let creds = IBCredentials {
            username: "user".to_string(),
            password: "pass".to_string(),
        };
        let header = creds.to_basic_auth_header();
        assert!(header.starts_with("Basic "));
        // dXNlcjpwYXNz = base64("user:pass")
        assert_eq!(header, "Basic dXNlcjpwYXNz");
    }

    #[test]
    fn test_auth_load_handles_missing_vars() {
        // Simule: pas de env vars, donc defaults
        // (test peut échouer si IB_USERNAME/PASSWORD sont définis, c'est ok)
        let result = IBCredentials::load();
        assert!(result.is_ok());
    }
}

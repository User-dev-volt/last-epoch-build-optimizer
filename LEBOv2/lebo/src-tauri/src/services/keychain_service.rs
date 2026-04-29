use argon2::{Argon2, Params};
use tauri::Manager;
use tauri_plugin_stronghold::stronghold::Stronghold as SHVault;

const VAULT_PASSWORD: &[u8] = b"lebo-vault-password";
const CLIENT_NAME: &[u8] = b"lebo";
const VAULT_KEY: &[u8] = b"anthropic_api_key";
const LLM_PROVIDER_KEY: &[u8] = b"llm_provider";
const OPENROUTER_API_KEY: &[u8] = b"openrouter_api_key";
const MODEL_PREFERENCE_KEY: &[u8] = b"openrouter_model_preference";

pub fn hash_vault_password() -> Vec<u8> {
    let params = Params::new(65536, 2, 1, Some(32)).expect("invalid argon2 params");
    let mut output = vec![0u8; 32];
    Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params)
        .hash_password_into(VAULT_PASSWORD, b"lebo-stronghold-salt", &mut output)
        .expect("argon2 hash failed");
    output
}

fn get_vault_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to get app data dir")
        .join("lebo.stronghold")
}

fn open_vault(vault_path: &std::path::Path) -> Result<SHVault, String> {
    let password = hash_vault_password();
    SHVault::new(vault_path, password).map_err(|e| format!("STORAGE_ERROR: failed to open vault: {e}"))
}

pub async fn set_api_key(app: &tauri::AppHandle, key: &str) -> Result<(), String> {
    let vault_path = get_vault_path(app);
    let sh = open_vault(&vault_path)?;

    // Try to load the existing client; create one only when none exists yet.
    // Using or_else with a targeted create avoids silently discarding a client
    // that failed to load for reasons other than "not found" (e.g. corruption).
    let client = match sh.load_client(CLIENT_NAME) {
        Ok(c) => c,
        Err(_) => sh
            .create_client(CLIENT_NAME)
            .map_err(|e| format!("STORAGE_ERROR: failed to create client: {e}"))?,
    };

    client
        .store()
        .insert(VAULT_KEY.to_vec(), key.as_bytes().to_vec(), None)
        .map_err(|e| format!("STORAGE_ERROR: failed to store key: {e}"))?;

    sh.save()
        .map_err(|e| format!("STORAGE_ERROR: failed to save vault: {e}"))?;
    Ok(())
}

pub async fn get_api_key(app: &tauri::AppHandle) -> Result<String, String> {
    let vault_path = get_vault_path(app);
    if !vault_path.exists() {
        return Err(
            "AUTH_ERROR: No API key configured. Add your Claude API key in Settings.".to_string(),
        );
    }
    let sh = open_vault(&vault_path).map_err(|e| e)?; // STORAGE_ERROR already prefixed by open_vault
    let client = sh
        .load_client(CLIENT_NAME)
        .map_err(|e| format!("STORAGE_ERROR: failed to load vault client: {e}"))?;
    let data = client
        .store()
        .get(VAULT_KEY)
        .map_err(|e| format!("STORAGE_ERROR: failed to read from vault: {e}"))?
        .ok_or_else(|| "AUTH_ERROR: No API key configured. Add your Claude API key in Settings.".to_string())?;
    String::from_utf8(data).map_err(|_| "AUTH_ERROR: API key corrupted in vault".to_string())
}

pub async fn is_api_key_configured(app: &tauri::AppHandle) -> Result<bool, String> {
    let vault_path = get_vault_path(app);
    if !vault_path.exists() {
        return Ok(false);
    }
    let sh = open_vault(&vault_path).map_err(|e| format!("STORAGE_ERROR: {e}"))?;
    let client = match sh.load_client(CLIENT_NAME) {
        Ok(c) => c,
        Err(_) => return Ok(false),
    };
    let exists = client
        .store()
        .get(VAULT_KEY)
        .map(|v| v.is_some())
        .unwrap_or(false);
    Ok(exists)
}

// ── Generic vault helpers ────────────────────────────────────────────────────

fn vault_write(app: &tauri::AppHandle, key: &[u8], value: &str) -> Result<(), String> {
    let vault_path = get_vault_path(app);
    let sh = open_vault(&vault_path)?;
    let client = match sh.load_client(CLIENT_NAME) {
        Ok(c) => c,
        Err(_) => sh
            .create_client(CLIENT_NAME)
            .map_err(|e| format!("STORAGE_ERROR: failed to create client: {e}"))?,
    };
    client
        .store()
        .insert(key.to_vec(), value.as_bytes().to_vec(), None)
        .map_err(|e| format!("STORAGE_ERROR: failed to store value: {e}"))?;
    sh.save()
        .map_err(|e| format!("STORAGE_ERROR: failed to save vault: {e}"))
}

fn vault_read(app: &tauri::AppHandle, key: &[u8], default: Option<&str>, absent_err: Option<&str>) -> Result<String, String> {
    let vault_path = get_vault_path(app);
    if !vault_path.exists() {
        if let Some(d) = default { return Ok(d.to_string()); }
        return Err(absent_err.unwrap_or("AUTH_ERROR: key not found").to_string());
    }
    let sh = open_vault(&vault_path)?;
    let client = match sh.load_client(CLIENT_NAME) {
        Ok(c) => c,
        Err(_) => {
            if let Some(d) = default { return Ok(d.to_string()); }
            return Err(absent_err.unwrap_or("AUTH_ERROR: key not found").to_string());
        }
    };
    match client.store().get(key) {
        Ok(Some(data)) => String::from_utf8(data).map_err(|_| "AUTH_ERROR: value corrupted in vault".to_string()),
        Ok(None) => {
            if let Some(d) = default { Ok(d.to_string()) }
            else { Err(absent_err.unwrap_or("AUTH_ERROR: key not found").to_string()) }
        }
        Err(e) => Err(format!("STORAGE_ERROR: failed to read from vault: {e}")),
    }
}

fn vault_key_exists(app: &tauri::AppHandle, key: &[u8]) -> Result<bool, String> {
    let vault_path = get_vault_path(app);
    if !vault_path.exists() { return Ok(false); }
    let sh = open_vault(&vault_path).map_err(|e| format!("STORAGE_ERROR: {e}"))?;
    let client = match sh.load_client(CLIENT_NAME) {
        Ok(c) => c,
        Err(_) => return Ok(false),
    };
    Ok(client.store().get(key).map(|v| v.is_some()).unwrap_or(false))
}

// ── LLM provider ─────────────────────────────────────────────────────────────

fn validate_provider(provider: &str) -> Result<(), String> {
    match provider {
        "claude" | "openrouter" => Ok(()),
        other => Err(format!("VALIDATION_ERROR: unknown provider '{}'. Must be 'claude' or 'openrouter'.", other)),
    }
}

pub async fn set_llm_provider(app: &tauri::AppHandle, provider: &str) -> Result<(), String> {
    validate_provider(provider)?;
    vault_write(app, LLM_PROVIDER_KEY, provider)
}

pub async fn get_llm_provider(app: &tauri::AppHandle) -> Result<String, String> {
    vault_read(app, LLM_PROVIDER_KEY, Some("claude"), None)
}

// ── OpenRouter API key ────────────────────────────────────────────────────────

pub async fn set_openrouter_api_key(app: &tauri::AppHandle, key: &str) -> Result<(), String> {
    vault_write(app, OPENROUTER_API_KEY, key)
}

pub async fn get_openrouter_api_key(app: &tauri::AppHandle) -> Result<String, String> {
    vault_read(
        app,
        OPENROUTER_API_KEY,
        None,
        Some("AUTH_ERROR: No OpenRouter API key configured. Add your key in Settings."),
    )
}

pub async fn is_openrouter_configured(app: &tauri::AppHandle) -> Result<bool, String> {
    vault_key_exists(app, OPENROUTER_API_KEY)
}

// ── Model preference ──────────────────────────────────────────────────────────

fn validate_model_preference(preference: &str) -> Result<(), String> {
    if preference.is_empty() {
        return Err("VALIDATION_ERROR: model preference cannot be empty".to_string());
    }
    if preference.len() > 128 {
        return Err(format!(
            "VALIDATION_ERROR: model preference too long ({} chars, max 128)",
            preference.len()
        ));
    }
    // Allow "free-first" sentinel and model IDs like "google/gemini-2.0-flash-exp:free".
    // Permitted chars: alphanumeric, /, -, :, ., _
    if !preference.chars().all(|c| c.is_alphanumeric() || matches!(c, '/' | '-' | ':' | '.' | '_')) {
        return Err("VALIDATION_ERROR: model preference contains invalid characters".to_string());
    }
    Ok(())
}

pub async fn set_model_preference(app: &tauri::AppHandle, preference: &str) -> Result<(), String> {
    validate_model_preference(preference)?;
    vault_write(app, MODEL_PREFERENCE_KEY, preference)
}

pub async fn get_model_preference(app: &tauri::AppHandle) -> Result<String, String> {
    vault_read(app, MODEL_PREFERENCE_KEY, Some("free-first"), None)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid_providers() {
        assert!(validate_provider("claude").is_ok());
        assert!(validate_provider("openrouter").is_ok());
    }

    #[test]
    fn rejects_unknown_provider() {
        let err = validate_provider("groq").unwrap_err();
        assert!(err.starts_with("VALIDATION_ERROR:"));
    }

    #[test]
    fn accepts_valid_model_preferences() {
        assert!(validate_model_preference("free-first").is_ok());
        assert!(validate_model_preference("google/gemini-2.0-flash-exp:free").is_ok());
        assert!(validate_model_preference("meta-llama/llama-3.3-70b-instruct:free").is_ok());
    }

    #[test]
    fn rejects_empty_model_preference() {
        let err = validate_model_preference("").unwrap_err();
        assert!(err.starts_with("VALIDATION_ERROR:"));
    }

    #[test]
    fn rejects_model_preference_with_invalid_chars() {
        let err = validate_model_preference("model; DROP TABLE users;").unwrap_err();
        assert!(err.starts_with("VALIDATION_ERROR:"));
    }

    #[test]
    fn rejects_model_preference_over_128_chars() {
        let long = "a".repeat(129);
        let err = validate_model_preference(&long).unwrap_err();
        assert!(err.starts_with("VALIDATION_ERROR:"));
    }
}

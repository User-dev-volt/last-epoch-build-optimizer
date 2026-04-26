use argon2::{Argon2, Params};
use tauri::Manager;
use tauri_plugin_stronghold::stronghold::Stronghold as SHVault;

const VAULT_PASSWORD: &[u8] = b"lebo-vault-password";
const CLIENT_NAME: &[u8] = b"lebo";
const VAULT_KEY: &[u8] = b"anthropic_api_key";

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

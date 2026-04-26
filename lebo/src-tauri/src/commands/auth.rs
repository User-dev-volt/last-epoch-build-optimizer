/// Retrieve the stored Anthropic API key from the OS keychain.
#[tauri::command]
pub async fn get_api_key() -> Result<Option<String>, String> {
    // TODO (Story 4.1): Retrieve from OS keychain via tauri-plugin-keychain
    Ok(None)
}

/// Store the Anthropic API key in the OS keychain.
#[tauri::command]
pub async fn set_api_key(key: String) -> Result<(), String> {
    // TODO (Story 4.1): Store in OS keychain — never write to plain text
    let _ = key;
    Ok(())
}

use crate::services::keychain_service;
use crate::services::connectivity_service;

#[tauri::command]
pub async fn set_api_key(app_handle: tauri::AppHandle, key: String) -> Result<(), String> {
    keychain_service::set_api_key(&app_handle, &key).await
}

#[tauri::command]
pub async fn check_api_key_configured(app_handle: tauri::AppHandle) -> Result<bool, String> {
    keychain_service::is_api_key_configured(&app_handle).await
}

#[tauri::command]
pub async fn check_connectivity(app_handle: tauri::AppHandle) -> Result<bool, String> {
    let is_online = connectivity_service::check_once().await;
    app_handle
        .emit("app:connectivity-changed", serde_json::json!({ "is_online": is_online }))
        .map_err(|e| format!("UNKNOWN: emit failed: {e}"))?;
    Ok(is_online)
}

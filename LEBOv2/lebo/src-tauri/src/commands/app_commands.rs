use crate::services::connectivity_service;
use crate::services::keychain_service;

#[tauri::command]
pub async fn set_api_key(app_handle: tauri::AppHandle, key: String) -> Result<(), String> {
    keychain_service::set_api_key(&app_handle, &key).await
}

#[tauri::command]
pub async fn check_api_key_configured(app_handle: tauri::AppHandle) -> Result<bool, String> {
    keychain_service::is_api_key_configured(&app_handle).await
}

#[tauri::command]
pub async fn check_connectivity() -> bool {
    connectivity_service::check_once().await
}

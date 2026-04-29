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

#[tauri::command]
pub async fn restart_app(app_handle: tauri::AppHandle) {
    app_handle.restart();
}

#[tauri::command]
pub async fn set_llm_provider(app_handle: tauri::AppHandle, provider: String) -> Result<(), String> {
    keychain_service::set_llm_provider(&app_handle, &provider).await
}

#[tauri::command]
pub async fn get_llm_provider(app_handle: tauri::AppHandle) -> Result<String, String> {
    keychain_service::get_llm_provider(&app_handle).await
}

#[tauri::command]
pub async fn set_openrouter_api_key(app_handle: tauri::AppHandle, key: String) -> Result<(), String> {
    keychain_service::set_openrouter_api_key(&app_handle, &key).await
}

#[tauri::command]
pub async fn check_openrouter_configured(app_handle: tauri::AppHandle) -> Result<bool, String> {
    keychain_service::is_openrouter_configured(&app_handle).await
}

#[tauri::command]
pub async fn set_model_preference(app_handle: tauri::AppHandle, preference: String) -> Result<(), String> {
    keychain_service::set_model_preference(&app_handle, &preference).await
}

#[tauri::command]
pub async fn get_model_preference(app_handle: tauri::AppHandle) -> Result<String, String> {
    keychain_service::get_model_preference(&app_handle).await
}

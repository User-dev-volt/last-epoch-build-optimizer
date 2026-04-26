use crate::services::game_data_service::REMOTE_DATA_BASE_URL;
use tauri::Emitter;
use tauri_plugin_http::reqwest;

pub async fn check_once() -> bool {
    let url = format!("{}/manifest.json", REMOTE_DATA_BASE_URL);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build();
    match client {
        Err(_) => false,
        Ok(c) => c.head(&url).send().await.is_ok(),
    }
}

pub async fn start_watcher(app_handle: tauri::AppHandle) {
    let mut prev_state: Option<bool> = None;
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
    loop {
        interval.tick().await;
        let is_online = check_once().await;
        if prev_state != Some(is_online) {
            prev_state = Some(is_online);
            let _ = app_handle.emit(
                "app:connectivity-changed",
                serde_json::json!({ "is_online": is_online }),
            );
        }
    }
}

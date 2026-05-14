use crate::models::item_data::ItemDatabase;
use crate::services::item_data_service;

#[tauri::command]
pub async fn load_item_database(app_handle: tauri::AppHandle) -> Result<ItemDatabase, String> {
    item_data_service::copy_bundled_item_resources(&app_handle)?;
    let data_dir = item_data_service::ensure_item_data_dir(&app_handle)?;
    item_data_service::load_item_database_from_dir(&data_dir)
}

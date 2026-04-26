use std::path::{Path, PathBuf};
use tauri::Manager;
use tauri_plugin_http::reqwest;

use crate::models::game_data::{GameDataManifest, RawClassData};

pub const REMOTE_DATA_BASE_URL: &str =
    "https://raw.githubusercontent.com/alec-vautherot/lebo-data/main";

pub fn ensure_game_data_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir error: {}", e))?;
    let data_dir = base.join("lebo").join("game-data");
    std::fs::create_dir_all(&data_dir).map_err(|e| format!("mkdir error: {}", e))?;
    Ok(data_dir)
}

pub fn copy_bundled_resources(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let data_dir = ensure_game_data_dir(app_handle)?;
    let manifest_path = data_dir.join("manifest.json");
    if manifest_path.exists() {
        return Ok(());
    }

    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("resource_dir error: {}", e))?;
    let bundled_data = resource_dir.join("resources").join("game-data");

    copy_dir_recursive(&bundled_data, &data_dir)
        .map_err(|e| format!("copy resources error: {}", e))?;

    Ok(())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

pub fn load_manifest(data_dir: &Path) -> Result<GameDataManifest, String> {
    let path = data_dir.join("manifest.json");
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("STORAGE_ERROR: read manifest: {}", e))?;
    serde_json::from_str::<GameDataManifest>(&raw)
        .map_err(|e| format!("STORAGE_ERROR: parse manifest: {}", e))
}

pub fn load_class_data(data_dir: &Path, class_id: &str) -> Result<RawClassData, String> {
    let path = data_dir.join("classes").join(format!("{}.json", class_id));
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("STORAGE_ERROR: read class {}: {}", class_id, e))?;
    serde_json::from_str::<RawClassData>(&raw)
        .map_err(|e| format!("STORAGE_ERROR: parse class {}: {}", class_id, e))
}

pub async fn fetch_remote_manifest(base_url: &str) -> Result<GameDataManifest, String> {
    let url = format!("{}/manifest.json", base_url);
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("NETWORK_ERROR: fetch remote manifest: {}", e))?;
    if !response.status().is_success() {
        return Err(format!("NETWORK_ERROR: fetch remote manifest: HTTP {}", response.status()));
    }
    let text = response
        .text()
        .await
        .map_err(|e| format!("NETWORK_ERROR: read remote manifest body: {}", e))?;
    serde_json::from_str::<GameDataManifest>(&text)
        .map_err(|e| format!("STORAGE_ERROR: parse remote manifest: {}", e))
}

pub async fn download_class_files(
    base_url: &str,
    data_dir: &Path,
    classes: &[String],
) -> Result<(), String> {
    let classes_dir = data_dir.join("classes");
    std::fs::create_dir_all(&classes_dir)
        .map_err(|e| format!("STORAGE_ERROR: create classes dir: {}", e))?;

    for class_id in classes {
        let url = format!("{}/classes/{}.json", base_url, class_id);
        let response = reqwest::get(&url)
            .await
            .map_err(|e| format!("NETWORK_ERROR: fetch class {}: {}", class_id, e))?;
        if !response.status().is_success() {
            return Err(format!("NETWORK_ERROR: fetch class {}: HTTP {}", class_id, response.status()));
        }
        let text = response
            .text()
            .await
            .map_err(|e| format!("NETWORK_ERROR: read class {} body: {}", class_id, e))?;
        // Validate JSON before writing to disk
        serde_json::from_str::<RawClassData>(&text)
            .map_err(|e| format!("STORAGE_ERROR: validate class {}: {}", class_id, e))?;
        let dest = classes_dir.join(format!("{}.json", class_id));
        std::fs::write(&dest, &text)
            .map_err(|e| format!("STORAGE_ERROR: write class {}: {}", class_id, e))?;
    }
    Ok(())
}

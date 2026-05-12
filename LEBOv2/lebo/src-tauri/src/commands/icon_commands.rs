use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tauri::{Emitter, Manager};

fn ensure_icon_cache_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("ICON_ERROR: app_data_dir: {}", e))?;
    let icon_dir = base.join("lebo").join("icons");
    std::fs::create_dir_all(&icon_dir)
        .map_err(|e| format!("ICON_ERROR: create icon cache dir: {}", e))?;
    Ok(icon_dir)
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dst)
        .map_err(|e| format!("ICON_ERROR: create dir {}: {}", dst.display(), e))?;
    for entry in std::fs::read_dir(src)
        .map_err(|e| format!("ICON_ERROR: read dir {}: {}", src.display(), e))?
    {
        let entry = entry.map_err(|e| format!("ICON_ERROR: read entry: {}", e))?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("ICON_ERROR: copy {}: {}", src_path.display(), e))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn initialize_icon_pipeline(app_handle: tauri::AppHandle) -> Result<(), String> {
    let icon_dir = ensure_icon_cache_dir(&app_handle)?;

    // Idempotent — if map already exists, cache is populated
    if icon_dir.join("skill-icon-map.json").exists() {
        app_handle
            .emit("icon-pipeline:initialized", serde_json::json!({ "iconSource": "game-files" }))
            .map_err(|e| format!("ICON_ERROR: emit icon-pipeline:initialized: {}", e))?;
        return Ok(());
    }

    let resource_dir = app_handle
        .path()
        .resource_dir()
        .map_err(|e| format!("ICON_ERROR: resource_dir: {}", e))?;
    let src_icons = resource_dir.join("resources").join("icons");

    // Copy skills/ subdirectory
    let src_skills = src_icons.join("skills");
    let dst_skills = icon_dir.join("skills");
    copy_dir_recursive(&src_skills, &dst_skills)?;

    // Copy skill-icon-map.json
    let src_map = src_icons.join("skill-icon-map.json");
    let dst_map = icon_dir.join("skill-icon-map.json");
    std::fs::copy(&src_map, &dst_map)
        .map_err(|e| format!("ICON_ERROR: copy skill-icon-map.json: {}", e))?;

    app_handle
        .emit("icon-pipeline:initialized", serde_json::json!({ "iconSource": "game-files" }))
        .map_err(|e| format!("ICON_ERROR: emit icon-pipeline:initialized: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_icon_cache_path(
    app_handle: tauri::AppHandle,
    skill_id: String,
) -> Result<Option<String>, String> {
    let icon_dir = ensure_icon_cache_dir(&app_handle)?;
    let map_path = icon_dir.join("skill-icon-map.json");

    // Pipeline not yet initialized — return None, not an error
    if !map_path.exists() {
        return Ok(None);
    }

    let raw = std::fs::read_to_string(&map_path)
        .map_err(|e| format!("ICON_ERROR: read skill-icon-map: {}", e))?;
    let map: HashMap<String, String> = serde_json::from_str(&raw)
        .map_err(|e| format!("ICON_ERROR: parse skill-icon-map: {}", e))?;

    let Some(filename) = map.get(&skill_id) else {
        return Ok(None);
    };

    let file_path = icon_dir.join("skills").join(filename);
    if file_path.exists() {
        Ok(Some(file_path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

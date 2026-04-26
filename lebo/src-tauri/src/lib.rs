mod commands;
mod db;
mod state;

use commands::auth::{get_api_key, set_api_key};
use commands::builds::{delete_build, import_build_from_url, load_build, load_builds, save_build};
use commands::game_data::{fetch_game_data, get_all_game_data, get_db_status};
use commands::optimization::optimize_build;
use db::connection::{db_path, open_and_migrate};
use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Resolve app data directory and open/migrate the SQLite DB
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");

            let path = db_path(&data_dir);
            let conn = open_and_migrate(&path)
                .expect("Failed to open or migrate database");

            app.manage(AppState::new(conn));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fetch_game_data,
            get_db_status,
            get_all_game_data,
            save_build,
            load_builds,
            load_build,
            delete_build,
            import_build_from_url,
            get_api_key,
            set_api_key,
            optimize_build,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

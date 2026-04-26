pub mod commands;
pub mod db;
pub mod models;
pub mod services;

use commands::app_commands::{check_api_key_configured, set_api_key};
use commands::build_commands::{
    delete_build, load_build, load_builds_list, rename_build, save_build,
};
use commands::claude_commands::invoke_claude_api;
use commands::game_data_commands::{
    check_data_version, download_game_data_update, get_manifest, initialize_game_data,
    load_game_data,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(
            tauri_plugin_stronghold::Builder::new(|password| {
                use argon2::{Argon2, Params};
                let params = Params::new(65536, 2, 1, Some(32)).expect("invalid argon2 params");
                let mut output = vec![0u8; 32];
                Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params)
                    .hash_password_into(password.as_bytes(), b"lebo-stronghold-salt", &mut output)
                    .expect("argon2 hash failed");
                output
            })
            .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_manifest,
            load_game_data,
            initialize_game_data,
            check_data_version,
            download_game_data_update,
            save_build,
            load_builds_list,
            load_build,
            delete_build,
            rename_build,
            invoke_claude_api,
            set_api_key,
            check_api_key_configured,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

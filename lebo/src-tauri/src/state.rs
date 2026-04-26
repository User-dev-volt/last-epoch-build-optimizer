use rusqlite::Connection;
use std::sync::Mutex;

/// Shared application state managed by Tauri.
/// The Mutex ensures single-threaded SQLite access (rusqlite is not Send+Sync).
pub struct AppState {
    pub db: Mutex<Connection>,
}

impl AppState {
    pub fn new(conn: Connection) -> Self {
        Self {
            db: Mutex::new(conn),
        }
    }
}

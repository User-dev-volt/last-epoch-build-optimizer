use rusqlite::{Connection, Result as SqlResult};
use std::path::PathBuf;
use super::schema::{CREATE_TABLES, SCHEMA_VERSION};

/// Returns the path to the SQLite database file.
/// Stored in the app's local data directory.
pub fn db_path(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("lebo.db")
}

/// Opens a connection to the database and runs migrations.
/// Idempotent — safe to call on every app start.
pub fn open_and_migrate(path: &PathBuf) -> SqlResult<Connection> {
    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| rusqlite::Error::InvalidPath(e.to_string().into()))?;
    }

    let conn = Connection::open(path)?;

    // Enable WAL mode for better concurrent read performance
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;

    // Run schema creation (idempotent: all tables use IF NOT EXISTS)
    conn.execute_batch(CREATE_TABLES)?;

    // Set or verify schema version
    let stored_version: Option<String> = conn
        .query_row(
            "SELECT value FROM data_meta WHERE key = 'schema_version'",
            [],
            |row| row.get(0),
        )
        .ok();

    match stored_version {
        None => {
            // Fresh DB — insert version
            conn.execute(
                "INSERT INTO data_meta (key, value) VALUES ('schema_version', ?1)",
                [SCHEMA_VERSION],
            )?;
        }
        Some(v) if v != SCHEMA_VERSION => {
            // Future: run incremental migrations here
            // For now, schema is forward-compatible (all IF NOT EXISTS)
            conn.execute(
                "UPDATE data_meta SET value = ?1 WHERE key = 'schema_version'",
                [SCHEMA_VERSION],
            )?;
        }
        _ => {} // Already at current version
    }

    Ok(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_open_and_migrate_idempotent() {
        let dir = std::env::temp_dir().join("lebo_test");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("test.db");

        // First open
        let conn = open_and_migrate(&path).unwrap();
        let v: String = conn
            .query_row(
                "SELECT value FROM data_meta WHERE key = 'schema_version'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(v, SCHEMA_VERSION);
        drop(conn);

        // Second open (idempotent)
        let conn2 = open_and_migrate(&path).unwrap();
        let v2: String = conn2
            .query_row(
                "SELECT value FROM data_meta WHERE key = 'schema_version'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(v2, SCHEMA_VERSION);

        // Cleanup
        std::fs::remove_file(&path).ok();
    }
}

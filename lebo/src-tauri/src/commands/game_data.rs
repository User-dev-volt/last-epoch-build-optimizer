use chrono::Utc;
use rusqlite::params;
use serde_json::{json, Value};
use tauri::{Emitter, State};
use crate::state::AppState;

// Embed game data at compile time — always available regardless of resource path
static GAME_DATA_JSON: &str = include_str!("../../resources/game-data.json");

/// Seed or refresh game data from the bundled resource file.
/// `force` ignores the cache check and always re-seeds.
#[tauri::command]
pub async fn fetch_game_data(
    force: bool,
    state: State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // Check if data is already fresh (unless force=true)
    if !force {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let last_fetched: Option<String> = db
            .query_row(
                "SELECT value FROM data_meta WHERE key = 'last_fetched'",
                [],
                |row| row.get(0),
            )
            .ok()
            .flatten();

        if last_fetched.is_some() {
            // Data already loaded — skip
            return Ok(());
        }
        drop(db);
    }

    // Emit progress: starting
    let _ = app.emit("game-data-progress", json!({ "current": 0, "total": 15, "step": "Reading game data..." }));

    let game_data: Value = serde_json::from_str(GAME_DATA_JSON)
        .map_err(|e| format!("Failed to parse game-data.json: {}", e))?;

    let classes = game_data["classes"]
        .as_array()
        .ok_or("Invalid game data: missing 'classes'")?;

    let mut mastery_count = 0u32;
    let total_masteries = classes.iter()
        .filter_map(|c| c["masteries"].as_array())
        .map(|m| m.len())
        .sum::<usize>() as u32;

    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Clear existing game data before re-seeding (keep builds)
    if force {
        db.execute_batch("
            DELETE FROM passive_edges;
            DELETE FROM passive_nodes;
            DELETE FROM skill_nodes;
            DELETE FROM skill_edges;
            DELETE FROM skills;
            DELETE FROM masteries;
            DELETE FROM classes;
        ").map_err(|e| e.to_string())?;
    }

    for class in classes {
        let class_id = class["id"].as_str().unwrap_or("");
        let class_name = class["name"].as_str().unwrap_or("");
        let class_desc = class["description"].as_str().unwrap_or("");

        db.execute(
            "INSERT OR IGNORE INTO classes (id, name, description) VALUES (?1, ?2, ?3)",
            params![class_id, class_name, class_desc],
        ).map_err(|e| e.to_string())?;

        if let Some(masteries) = class["masteries"].as_array() {
            for mastery in masteries {
                let mastery_id = mastery["id"].as_str().unwrap_or("");
                let mastery_name = mastery["name"].as_str().unwrap_or("");
                let mastery_desc = mastery["description"].as_str().unwrap_or("");
                let playstyle = mastery["playstyle"].as_str().unwrap_or("");
                let tags_json = mastery["damageTypeTags"].to_string();

                mastery_count += 1;
                let _ = app.emit("game-data-progress", json!({
                    "current": mastery_count,
                    "total": total_masteries,
                    "step": format!("Loading {}...", mastery_name)
                }));

                db.execute(
                    "INSERT OR IGNORE INTO masteries \
                     (id, class_id, name, description, playstyle, damage_type_tags) \
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![mastery_id, class_id, mastery_name, mastery_desc, playstyle, tags_json],
                ).map_err(|e| e.to_string())?;

                // Insert skills
                if let Some(skills) = mastery["skills"].as_array() {
                    for skill in skills {
                        let skill_id = skill["id"].as_str().unwrap_or("");
                        let skill_name = skill["name"].as_str().unwrap_or("");
                        let skill_desc = skill["description"].as_str().unwrap_or("");
                        let damage_types = skill["damageTypes"].to_string();

                        db.execute(
                            "INSERT OR IGNORE INTO skills \
                             (id, mastery_id, name, description, damage_types) \
                             VALUES (?1, ?2, ?3, ?4, ?5)",
                            params![skill_id, mastery_id, skill_name, skill_desc, damage_types],
                        ).map_err(|e| e.to_string())?;
                    }
                }

                // Insert passive tree nodes
                if let Some(tree) = mastery["passiveTree"].as_object() {
                    if let Some(nodes) = tree["nodes"].as_array() {
                        for node in nodes {
                            let node_id = node["id"].as_str().unwrap_or("");
                            let node_name = node["name"].as_str().unwrap_or("");
                            let node_desc = node["description"].as_str().unwrap_or("");
                            let x: f64 = node["x"].as_f64().unwrap_or(0.0);
                            let y: f64 = node["y"].as_f64().unwrap_or(0.0);
                            let max_pts: i64 = node["maxPoints"].as_i64().unwrap_or(1);
                            let tags_json = node["tags"].to_string();
                            let effects_json = node["effects"].to_string();

                            db.execute(
                                "INSERT OR IGNORE INTO passive_nodes \
                                 (id, mastery_id, name, description, x, y, \
                                  max_points, tags, effects) \
                                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                                params![
                                    node_id, mastery_id, node_name, node_desc,
                                    x, y, max_pts, tags_json, effects_json
                                ],
                            ).map_err(|e| e.to_string())?;
                        }

                        // Insert edges after all nodes are inserted
                        for node in nodes {
                            let from_id = node["id"].as_str().unwrap_or("");
                            if let Some(connections) = node["connections"].as_array() {
                                for conn in connections {
                                    if let Some(to_id) = conn.as_str() {
                                        db.execute(
                                            "INSERT OR IGNORE INTO passive_edges \
                                             (from_node_id, to_node_id) VALUES (?1, ?2)",
                                            params![from_id, to_id],
                                        ).map_err(|e| e.to_string())?;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Update last_fetched timestamp
    let now = Utc::now().to_rfc3339();
    db.execute(
        "INSERT OR REPLACE INTO data_meta (key, value) VALUES ('last_fetched', ?1)",
        [&now],
    ).map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR REPLACE INTO data_meta (key, value) VALUES ('game_version', '1.0')",
        [],
    ).map_err(|e| e.to_string())?;

    let _ = app.emit("game-data-progress", json!({
        "current": total_masteries,
        "total": total_masteries,
        "step": "Done"
    }));

    Ok(())
}

/// Returns DB metadata: schema version and last data fetch time.
#[tauri::command]
pub async fn get_db_status(
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let schema_version: Option<String> = db
        .query_row(
            "SELECT value FROM data_meta WHERE key = 'schema_version'",
            [],
            |row| row.get(0),
        )
        .ok()
        .flatten();

    let last_fetched: Option<String> = db
        .query_row(
            "SELECT value FROM data_meta WHERE key = 'last_fetched'",
            [],
            |row| row.get(0),
        )
        .ok()
        .flatten();

    let game_version: Option<String> = db
        .query_row(
            "SELECT value FROM data_meta WHERE key = 'game_version'",
            [],
            |row| row.get(0),
        )
        .ok()
        .flatten();

    Ok(json!({
        "schemaVersion": schema_version.unwrap_or_default(),
        "lastFetched": last_fetched,
        "gameVersion": game_version
    }))
}

/// Returns all game data from SQLite including passive trees with edges.
#[tauri::command]
pub async fn get_all_game_data(
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Query all classes
    let mut stmt = db
        .prepare("SELECT id, name, description FROM classes ORDER BY name")
        .map_err(|e| e.to_string())?;

    let class_rows: Vec<(String, String, Option<String>)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut enriched_classes: Vec<Value> = Vec::new();

    for (class_id, class_name, class_desc) in class_rows {
        // Get masteries for this class
        let mut mstmt = db
            .prepare(
                "SELECT id, name, description, playstyle, damage_type_tags \
                 FROM masteries WHERE class_id = ?1 ORDER BY name",
            )
            .map_err(|e| e.to_string())?;

        let mastery_rows: Vec<(String, String, Option<String>, Option<String>, String)> = mstmt
            .query_map([&class_id], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        let mut masteries: Vec<Value> = Vec::new();

        for (mastery_id, mastery_name, mastery_desc, playstyle, tags_json) in mastery_rows {
            // Get skills
            let mut sstmt = db
                .prepare(
                    "SELECT id, name, description, damage_types FROM skills \
                     WHERE mastery_id = ?1 ORDER BY name",
                )
                .map_err(|e| e.to_string())?;

            let skills: Vec<Value> = sstmt
                .query_map([&mastery_id], |row| {
                    let dt: String = row.get(3)?;
                    Ok(json!({
                        "id": row.get::<_, String>(0)?,
                        "masteryId": mastery_id.clone(),
                        "name": row.get::<_, String>(1)?,
                        "description": row.get::<_, Option<String>>(2)?,
                        "damageTypes": serde_json::from_str::<Value>(&dt).unwrap_or(json!([]))
                    }))
                })
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();

            // Get passive nodes
            let mut nstmt = db
                .prepare(
                    "SELECT id, name, description, x, y, max_points, tags, effects \
                     FROM passive_nodes WHERE mastery_id = ?1",
                )
                .map_err(|e| e.to_string())?;

            let nodes: Vec<Value> = nstmt
                .query_map([&mastery_id], |row| {
                    let tags_s: String = row.get(6)?;
                    let effects_s: String = row.get(7)?;
                    Ok(json!({
                        "id": row.get::<_, String>(0)?,
                        "masteryId": mastery_id.clone(),
                        "name": row.get::<_, String>(1)?,
                        "description": row.get::<_, Option<String>>(2)?,
                        "x": row.get::<_, f64>(3)?,
                        "y": row.get::<_, f64>(4)?,
                        "maxPoints": row.get::<_, i64>(5)?,
                        "tags": serde_json::from_str::<Value>(&tags_s).unwrap_or(json!([])),
                        "effects": serde_json::from_str::<Value>(&effects_s).unwrap_or(json!([])),
                        "connections": []  // filled below
                    }))
                })
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();

            // Get edges and attach to nodes
            let mut estmt = db
                .prepare(
                    "SELECT e.from_node_id, e.to_node_id \
                     FROM passive_edges e \
                     INNER JOIN passive_nodes n ON n.id = e.from_node_id \
                     WHERE n.mastery_id = ?1",
                )
                .map_err(|e| e.to_string())?;

            let edges: Vec<(String, String)> = estmt
                .query_map([&mastery_id], |row| Ok((row.get(0)?, row.get(1)?)))
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();

            // Build node map with connections
            let mut node_map: std::collections::HashMap<String, Value> = nodes
                .into_iter()
                .map(|n| (n["id"].as_str().unwrap_or("").to_string(), n))
                .collect();

            for (from_id, to_id) in &edges {
                if let Some(node) = node_map.get_mut(from_id) {
                    if let Some(conns) = node["connections"].as_array_mut() {
                        if !conns.iter().any(|c| c.as_str() == Some(to_id)) {
                            conns.push(json!(to_id));
                        }
                    }
                }
            }

            // Get starting node IDs (nodes with no requirements / are origins)
            let starting_ids: Vec<String> = node_map
                .values()
                .filter(|n| {
                    let id = n["id"].as_str().unwrap_or("");
                    id.ends_with("-start")
                })
                .map(|n| n["id"].as_str().unwrap_or("").to_string())
                .collect();

            let nodes_vec: Vec<Value> = node_map.into_values().collect();

            let passive_tree = json!({
                "masteryId": mastery_id,
                "nodes": nodes_vec,
                "startingNodeIds": starting_ids
            });

            masteries.push(json!({
                "id": mastery_id,
                "classId": class_id,
                "name": mastery_name,
                "description": mastery_desc,
                "playstyle": playstyle,
                "damageTypeTags": serde_json::from_str::<Value>(&tags_json).unwrap_or(json!([])),
                "skills": skills,
                "passiveTree": passive_tree
            }));
        }

        enriched_classes.push(json!({
            "id": class_id,
            "name": class_name,
            "description": class_desc,
            "masteries": masteries
        }));
    }

    Ok(json!({ "classes": enriched_classes }))
}

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::State;
use uuid::Uuid;
use chrono::Utc;
use crate::state::AppState;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BuildData {
    pub id: Option<String>, // Some(id) = UPDATE existing; None = INSERT new
    pub name: String,
    pub class_id: String,
    pub mastery_id: String,
    pub passive_allocations: Value,
    pub skill_allocations: Value,
    pub equipped_skills: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BuildSummary {
    pub id: String,
    pub name: String,
    pub class_id: String,
    pub class_name: String,
    pub mastery_id: String,
    pub mastery_name: String,
    pub updated_at: String,
}

/// Save or update a build. Pass `id` to overwrite an existing build. Returns the build's ID.
#[tauri::command]
pub async fn save_build(
    build: BuildData,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    let passive_json = serde_json::to_string(&build.passive_allocations)
        .map_err(|e| e.to_string())?;
    let skill_json = serde_json::to_string(&build.skill_allocations)
        .map_err(|e| e.to_string())?;
    let skills_json = serde_json::to_string(&build.equipped_skills)
        .map_err(|e| e.to_string())?;

    if let Some(ref id) = build.id {
        // UPDATE existing build
        db.execute(
            "UPDATE builds SET name=?2, class_id=?3, mastery_id=?4, \
             passive_allocations=?5, skill_allocations=?6, equipped_skills=?7, \
             updated_at=?8 WHERE id=?1",
            rusqlite::params![
                id, build.name, build.class_id, build.mastery_id,
                passive_json, skill_json, skills_json, now
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(id.clone())
    } else {
        // INSERT new build
        let id = Uuid::new_v4().to_string();
        db.execute(
            "INSERT INTO builds (id, name, class_id, mastery_id, passive_allocations, \
             skill_allocations, equipped_skills, created_at, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
            rusqlite::params![
                id, build.name, build.class_id, build.mastery_id,
                passive_json, skill_json, skills_json, now
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(id)
    }
}

/// Load all saved builds as summaries (no allocation data).
#[tauri::command]
pub async fn load_builds(
    state: State<'_, AppState>,
) -> Result<Vec<BuildSummary>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare(
            "SELECT b.id, b.name, b.class_id, \
             COALESCE(c.name, b.class_id) as class_name, \
             b.mastery_id, \
             COALESCE(m.name, b.mastery_id) as mastery_name, \
             b.updated_at \
             FROM builds b \
             LEFT JOIN classes c ON c.id = b.class_id \
             LEFT JOIN masteries m ON m.id = b.mastery_id \
             ORDER BY b.updated_at DESC \
             LIMIT 50",
        )
        .map_err(|e| e.to_string())?;

    let builds = stmt
        .query_map([], |row| {
            Ok(BuildSummary {
                id: row.get(0)?,
                name: row.get(1)?,
                class_id: row.get(2)?,
                class_name: row.get(3)?,
                mastery_id: row.get(4)?,
                mastery_name: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(builds)
}

/// Load a single build by ID (full allocation data).
#[tauri::command]
pub async fn load_build(
    id: String,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let row: Result<Value, _> = db.query_row(
        "SELECT id, name, class_id, mastery_id, passive_allocations, \
         skill_allocations, equipped_skills, created_at, updated_at \
         FROM builds WHERE id = ?1",
        [&id],
        |row| {
            let passive_raw: String = row.get(4)?;
            let skill_raw: String = row.get(5)?;
            let skills_raw: String = row.get(6)?;
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "classId": row.get::<_, String>(2)?,
                "masteryId": row.get::<_, String>(3)?,
                "passiveAllocations": serde_json::from_str::<Value>(&passive_raw).unwrap_or(json!({})),
                "skillAllocations": serde_json::from_str::<Value>(&skill_raw).unwrap_or(json!({})),
                "equippedSkills": serde_json::from_str::<Value>(&skills_raw).unwrap_or(json!([])),
                "createdAt": row.get::<_, String>(7)?,
                "updatedAt": row.get::<_, String>(8)?
            }))
        },
    );

    row.map_err(|e| format!("Build not found: {}", e))
}

/// Delete a build by ID.
#[tauri::command]
pub async fn delete_build(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM builds WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Import a build from a lastepochtools.com URL.
#[tauri::command]
pub async fn import_build_from_url(
    url: String,
    _state: State<'_, AppState>,
) -> Result<Value, String> {
    // TODO (Story 3.4): Fetch from lastepochtools.com API and parse into BuildData
    let _ = url;
    Err("Build import not yet implemented (Story 3.4)".to_string())
}

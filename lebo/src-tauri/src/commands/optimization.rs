use serde::Deserialize;
use serde_json::Value;
use tauri::Emitter;

#[derive(Deserialize, Debug)]
pub struct OptimizationPayload {
    pub mastery_id: String,
    pub passive_allocations: Value,
    pub equipped_skills: Vec<String>,
    pub goal: String,
}

/// Runs AI optimization. Streams response chunks back via Tauri events:
///   - "optimization-chunk" { delta: string }
///   - "optimization-complete"
///   - "optimization-error" { message: string }
#[tauri::command]
pub async fn optimize_build(
    payload: OptimizationPayload,
    window: tauri::Window,
) -> Result<(), String> {
    // TODO (Story 4.2 + 4.3): Build prompt → call Claude API → stream chunks
    let _ = payload;

    // Emit a placeholder error so frontend shows a clear "not implemented" state
    let msg = serde_json::json!({ "message": "AI optimization not yet implemented (Story 4.2)" });
    window
        .emit("optimization-error", msg)
        .map_err(|e| e.to_string())?;

    Ok(())
}

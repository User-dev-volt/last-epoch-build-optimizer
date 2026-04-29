use crate::services::{claude_service, game_data_service, keychain_service, openrouter_service};
use serde_json::{json, Value};
use tauri::Emitter;

/// Invoke the Claude API with the current build state and optimization goal.
/// Streams suggestions via Tauri events:
///   optimization:suggestion-received — one per parsed suggestion
///   optimization:complete            — on stream completion
///   optimization:error               — on any failure
#[tauri::command]
pub async fn invoke_claude_api(
    app_handle: tauri::AppHandle,
    build_state: Value,
    goal: String,
) -> Result<(), String> {
    // API key is fetched per-branch below based on the active provider.

    // ── Extract class/mastery IDs from build state ────────────────────────────
    let class_id = build_state["classId"]
        .as_str()
        .ok_or("PARSE_ERROR: missing classId in build state")?
        .to_string();
    let mastery_id = build_state["masteryId"]
        .as_str()
        .ok_or("PARSE_ERROR: missing masteryId in build state")?
        .to_string();

    // ── Load game data for node context ──────────────────────────────────────
    let data_dir = game_data_service::ensure_game_data_dir(&app_handle)?;
    let class_data = game_data_service::load_class_data(&data_dir, &class_id)?;

    // Find the requested mastery
    let mastery_data = class_data
        .masteries
        .iter()
        .find(|m| m.id == mastery_id)
        .ok_or_else(|| format!("PARSE_ERROR: mastery '{}' not found in class '{}'", mastery_id, class_id))?;

    // ── Build node context map for the prompt ─────────────────────────────────
    // node_id → { name, tags, maxPoints, currentPoints }
    let node_allocations = build_state["nodeAllocations"].as_object().cloned().unwrap_or_default();

    let mut available_nodes = serde_json::Map::new();

    // Base class tree nodes
    for node in &class_data.base_tree.nodes {
        let current_points = node_allocations
            .get(&node.id)
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let all_tags: Vec<String> = node.effects.iter().flat_map(|e| e.tags.clone()).collect();
        available_nodes.insert(
            node.id.clone(),
            json!({
                "name": node.name,
                "tags": all_tags,
                "maxPoints": node.max_points,
                "currentPoints": current_points
            }),
        );
    }

    // Mastery tree nodes
    for node in &mastery_data.passive_tree.nodes {
        let current_points = node_allocations
            .get(&node.id)
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let all_tags: Vec<String> = node.effects.iter().flat_map(|e| e.tags.clone()).collect();
        available_nodes.insert(
            node.id.clone(),
            json!({
                "name": node.name,
                "tags": all_tags,
                "maxPoints": node.max_points,
                "currentPoints": current_points
            }),
        );
    }

    // ── Assemble user message ─────────────────────────────────────────────────
    let user_message = serde_json::to_string(&json!({
        "goal": goal,
        "build": build_state,
        "availableNodes": available_nodes
    }))
    .map_err(|e| format!("PARSE_ERROR: failed to serialize context: {}", e))?;

    // ── Route by provider ────────────────────────────────────────────────────
    let provider = match keychain_service::get_llm_provider(&app_handle).await {
        Ok(p) => p,
        Err(e) => {
            let err = format!("STORAGE_ERROR: failed to read provider setting: {e}");
            let _ = app_handle.emit(
                "optimization:error",
                &claude_service::OptimizationErrorPayload {
                    error_type: "STORAGE_ERROR".to_string(),
                    message: err.clone(),
                },
            );
            return Err(err);
        }
    };

    let stream_result = if provider == "openrouter" {
        let or_key = match keychain_service::get_openrouter_api_key(&app_handle).await {
            Ok(k) => k,
            Err(e) => {
                let err = format!("AUTH_ERROR: No OpenRouter API key configured. Add your key in Settings. ({})", e);
                let _ = app_handle.emit(
                    "optimization:error",
                    &claude_service::OptimizationErrorPayload {
                        error_type: "AUTH_ERROR".to_string(),
                        message: "No OpenRouter API key configured. Add your key in Settings.".to_string(),
                    },
                );
                return Err(err);
            }
        };
        let model_pref = keychain_service::get_model_preference(&app_handle).await.unwrap_or_else(|_| "free-first".to_string());
        openrouter_service::stream_optimization(&app_handle, &or_key, &model_pref, user_message).await
    } else {
        let api_key = keychain_service::get_api_key(&app_handle).await?;
        #[cfg(debug_assertions)]
        let api_key = std::env::var("ANTHROPIC_API_KEY").unwrap_or(api_key);
        claude_service::stream_optimization(&app_handle, &api_key, user_message).await
    };

    if let Err(err) = stream_result {
        let _ = app_handle.emit(
            "optimization:error",
            &claude_service::OptimizationErrorPayload {
                error_type: extract_error_type(&err),
                message: err.clone(),
            },
        );
        return Err(err);
    }

    Ok(())
}

fn extract_error_type(err: &str) -> String {
    for prefix in &["AUTH_ERROR", "API_ERROR", "NETWORK_ERROR", "TIMEOUT", "PARSE_ERROR"] {
        if err.starts_with(prefix) {
            return prefix.to_string();
        }
    }
    "UNKNOWN".to_string()
}

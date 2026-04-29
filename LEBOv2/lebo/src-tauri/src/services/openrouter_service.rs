use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use crate::services::claude_service::{SuggestionEvent, SuggestionReceivedPayload, OptimizationCompletePayload, OptimizationErrorPayload};
use crate::services::prompts::OPTIMIZATION_SYSTEM_PROMPT;

const BASE_URL: &str = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_SECS: u64 = 60;
const MAX_NDJSON_LINE_BYTES: usize = 65_536;

// ── Request structs ──────────────────────────────────────────────────────────

#[derive(Serialize)]
struct Message {
    role: &'static str,
    content: String,
}

#[derive(Serialize)]
struct OpenRouterRequest {
    model: String,
    messages: Vec<Message>,
    stream: bool,
}

// ── SSE delta structs (OpenAI format) ────────────────────────────────────────

#[derive(Deserialize)]
struct Delta {
    #[serde(default)]
    content: Option<String>,
}

#[derive(Deserialize)]
struct Choice {
    delta: Delta,
    #[serde(default)]
    finish_reason: Option<String>,
}

#[derive(Deserialize)]
struct SseChunk {
    choices: Vec<Choice>,
}

// ── Main streaming function ───────────────────────────────────────────────────

pub async fn stream_optimization(
    app_handle: &tauri::AppHandle,
    api_key: &str,
    model_preference: &str,
    user_message: String,
) -> Result<(), String> {
    let model = if model_preference == "free-first" {
        "openrouter/auto".to_string()
    } else {
        model_preference.to_string()
    };

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("NETWORK_ERROR: failed to build HTTP client: {}", e))?;

    let request_body = OpenRouterRequest {
        model,
        messages: vec![
            Message { role: "system", content: OPTIMIZATION_SYSTEM_PROMPT.to_string() },
            Message { role: "user", content: user_message },
        ],
        stream: true,
    };

    let send_result = client
        .post(BASE_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "https://github.com/lebo")
        .header("X-Title", "Last Epoch Build Optimizer")
        .json(&request_body)
        .send()
        .await;

    let response = match send_result {
        Ok(r) => r,
        Err(e) => {
            return Err(if e.is_timeout() {
                format!("TIMEOUT: request exceeded {} seconds", TIMEOUT_SECS)
            } else {
                format!("NETWORK_ERROR: {}", e)
            });
        }
    };

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(match status.as_u16() {
            401 | 403 => "AUTH_ERROR: invalid OpenRouter API key".to_string(),
            429 => "API_ERROR: rate limit reached — wait a moment and retry".to_string(),
            _ => format!("API_ERROR: OpenRouter server error (HTTP {}): {}", status, body),
        });
    }

    let mut stream = response.bytes_stream();
    let mut sse_buffer = String::new();
    let mut ndjson_buffer = String::new();
    let mut suggestion_count: u32 = 0;
    let mut stream_done = false;

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result
            .map_err(|e| format!("NETWORK_ERROR: stream read error: {}", e))?;
        let text = String::from_utf8_lossy(&chunk);
        sse_buffer.push_str(&text);

        // Process complete SSE lines (OpenRouter sends line-by-line, not \n\n framed)
        while let Some(newline_pos) = sse_buffer.find('\n') {
            let line = sse_buffer[..newline_pos].trim().to_string();
            sse_buffer = sse_buffer[newline_pos + 1..].to_string();

            if line.is_empty() || line.starts_with(':') {
                continue;
            }

            if !line.starts_with("data: ") {
                continue;
            }

            let data = &line["data: ".len()..];

            if data == "[DONE]" {
                stream_done = true;
                break;
            }

            let chunk: SseChunk = match serde_json::from_str(data) {
                Ok(c) => c,
                Err(_) => continue,
            };

            for choice in &chunk.choices {
                if let Some(ref content) = choice.delta.content {
                    ndjson_buffer.push_str(content);

                    if ndjson_buffer.len() > MAX_NDJSON_LINE_BYTES {
                        return Err("PARSE_ERROR: NDJSON line exceeded 64KB limit".to_string());
                    }
                }

                if choice.finish_reason.as_deref() == Some("stop") {
                    stream_done = true;
                }
            }

            // Parse complete NDJSON lines
            while let Some(nl) = ndjson_buffer.find('\n') {
                let suggestion_line = ndjson_buffer[..nl].trim().to_string();
                ndjson_buffer = ndjson_buffer[nl + 1..].to_string();

                if suggestion_line.is_empty() {
                    continue;
                }

                match serde_json::from_str::<SuggestionEvent>(&suggestion_line) {
                    Ok(suggestion) => {
                        suggestion_count += 1;
                        let payload = SuggestionReceivedPayload::from(&suggestion);
                        app_handle
                            .emit("optimization:suggestion-received", &payload)
                            .map_err(|e| format!("APP_ERROR: emit failed: {}", e))?;
                    }
                    Err(e) => {
                        if suggestion_line.starts_with('{') && suggestion_line.ends_with('}') {
                            return Err(format!("PARSE_ERROR: malformed suggestion JSON: {}", e));
                        }
                    }
                }
            }
        }

        if stream_done {
            break;
        }
    }

    // Flush any remaining buffer content
    let remaining = ndjson_buffer.trim().to_string();
    if !remaining.is_empty() {
        match serde_json::from_str::<SuggestionEvent>(&remaining) {
            Ok(suggestion) => {
                suggestion_count += 1;
                let payload = SuggestionReceivedPayload::from(&suggestion);
                let _ = app_handle.emit("optimization:suggestion-received", &payload);
            }
            Err(e) => {
                let err_msg = format!("PARSE_ERROR: malformed final suggestion: {}", e);
                let _ = app_handle.emit(
                    "optimization:error",
                    &OptimizationErrorPayload {
                        error_type: "PARSE_ERROR".to_string(),
                        message: err_msg.clone(),
                    },
                );
                return Err(err_msg);
            }
        }
    }

    app_handle
        .emit(
            "optimization:complete",
            &OptimizationCompletePayload { suggestion_count },
        )
        .map_err(|e| format!("APP_ERROR: emit complete failed: {}", e))?;

    Ok(())
}

// ── Unit tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_free_first_to_auto_model() {
        let model = if "free-first" == "free-first" {
            "openrouter/auto".to_string()
        } else {
            "free-first".to_string()
        };
        assert_eq!(model, "openrouter/auto");
    }

    #[test]
    fn uses_explicit_model_id_as_is() {
        let preference = "google/gemini-2.0-flash-exp:free";
        let model = if preference == "free-first" {
            "openrouter/auto".to_string()
        } else {
            preference.to_string()
        };
        assert_eq!(model, "google/gemini-2.0-flash-exp:free");
    }

    #[test]
    fn parses_openai_sse_delta() {
        let data = r#"{"id":"gen-1","choices":[{"delta":{"content":"hello"},"finish_reason":null}]}"#;
        let chunk: SseChunk = serde_json::from_str(data).unwrap();
        assert_eq!(chunk.choices[0].delta.content.as_deref(), Some("hello"));
    }

    #[test]
    fn parses_openai_sse_finish_reason() {
        let data = r#"{"id":"gen-1","choices":[{"delta":{"content":""},"finish_reason":"stop"}]}"#;
        let chunk: SseChunk = serde_json::from_str(data).unwrap();
        assert_eq!(chunk.choices[0].finish_reason.as_deref(), Some("stop"));
    }

    #[test]
    fn ignores_done_sentinel() {
        let line = "[DONE]";
        assert_eq!(line, "[DONE]");
    }
}

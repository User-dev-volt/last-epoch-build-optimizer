# Story 5.6: Multi-Provider LLM Settings — OpenRouter + Model Selection

Status: backlog

## Story

As an advanced Last Epoch player,
I want to choose between Claude and OpenRouter as my AI provider in Settings, pick a model preference (auto-free or a specific model), and have my selection persist securely,
so that I can use the optimization engine without paying for Claude API credits while I evaluate the tool.

## Acceptance Criteria

1. **Given** the user opens Settings
   **When** the Settings view renders
   **Then** an "AI Provider" section is visible above the existing "AI API Key" section
   **And** it contains a dropdown/segmented control with two options: "Claude (Anthropic)" and "OpenRouter"
   **And** the currently saved provider is pre-selected

2. **Given** the user selects "Claude (Anthropic)"
   **When** the provider section renders
   **Then** the existing Claude API key input (`ApiKeyInput`) is shown and functional
   **And** no OpenRouter controls are visible

3. **Given** the user selects "OpenRouter"
   **When** the provider section renders
   **Then** an "OpenRouter API Key" input is shown (masked, same pattern as Claude key)
   **And** a "Model Preference" control is shown with two options:
   - "Use free models first" (default) — routes requests to `openrouter/free`
   - "Always use this model" — reveals a model dropdown (see Dev Notes for model list)
   **And** a "Save" button persists both the key and model preference to the vault
   **And** the Claude key input is hidden

4. **Given** the user saves an OpenRouter key + model preference
   **When** the save command fires
   **Then** `set_openrouter_api_key` stores the key in the Stronghold vault under key `openrouter_api_key`
   **And** `set_llm_provider` stores `"openrouter"` in the vault under key `llm_provider`
   **And** `set_model_preference` stores the preference string in the vault under key `openrouter_model_preference`
   **And** the key NEVER appears in any log, Zustand store, or IPC response
   **And** a success toast confirms "OpenRouter settings saved"

5. **Given** the user opens Settings with a previously saved OpenRouter provider
   **When** the Settings view renders
   **Then** the provider dropdown shows "OpenRouter" selected
   **And** the OpenRouter API key input shows a masked placeholder "OpenRouter API key saved ✓"
   **And** the previously saved model preference is pre-selected

6. **Given** the user clicks "Optimize" with OpenRouter configured
   **When** the optimization request fires
   **Then** the Rust router reads `llm_provider` from the vault
   **And** dispatches to `openrouter_service::stream_optimization()` (not `claude_service`)
   **And** the streaming suggestion display is identical to the Claude path (same store events, same UI)

7. **Given** the user has OpenRouter selected but no API key saved
   **When** an optimization is triggered
   **Then** an `AUTH_ERROR` surfaces with message: "No OpenRouter API key configured. Add your key in Settings."
   **And** the "Go to Settings" link appears in the error banner (existing pattern from 5.1)

8. **Given** the user switches back from OpenRouter to Claude
   **When** they select "Claude (Anthropic)" and save
   **Then** `set_llm_provider` writes `"claude"` to the vault
   **And** future optimization requests use `claude_service` again
   **And** the previously stored OpenRouter key is retained in the vault (not deleted)

## Tasks / Subtasks

- [ ] Task 1: Extend vault with provider preference keys (AC: 1, 4, 5, 6, 8)
  - [ ] In `keychain_service.rs`, add three new vault key constants:
    - `LLM_PROVIDER_KEY = "llm_provider"` — value: `"claude"` | `"openrouter"`
    - `OPENROUTER_API_KEY = "openrouter_api_key"`
    - `MODEL_PREFERENCE_KEY = "openrouter_model_preference"` — value: `"free-first"` | specific model ID
  - [ ] Implement `pub async fn set_llm_provider(app: &AppHandle, provider: &str) -> Result<(), String>`
  - [ ] Implement `pub async fn get_llm_provider(app: &AppHandle) -> Result<String, String>` — returns `"claude"` as default when key absent (vault not yet written)
  - [ ] Implement `pub async fn set_openrouter_api_key(app: &AppHandle, key: &str) -> Result<(), String>`
  - [ ] Implement `pub async fn get_openrouter_api_key(app: &AppHandle) -> Result<String, String>` — returns `AUTH_ERROR` prefix when absent
  - [ ] Implement `pub async fn is_openrouter_configured(app: &AppHandle) -> Result<bool, String>`
  - [ ] Implement `pub async fn set_model_preference(app: &AppHandle, preference: &str) -> Result<(), String>`
  - [ ] Implement `pub async fn get_model_preference(app: &AppHandle) -> Result<String, String>` — returns `"free-first"` as default when absent

- [ ] Task 2: Create `openrouter_service.rs` (AC: 6, 7)
  - [ ] Create `lebo/src-tauri/src/services/openrouter_service.rs`
  - [ ] Implement `pub async fn stream_optimization(app_handle: &AppHandle, api_key: &str, model_preference: &str, user_message: String) -> Result<(), String>`
  - [ ] Base URL: `https://openrouter.ai/api/v1/chat/completions`
  - [ ] Auth header: `Authorization: Bearer {api_key}`
  - [ ] Required headers: `HTTP-Referer: https://github.com/lebo`, `X-Title: Last Epoch Build Optimizer`
  - [ ] Model resolution: `"free-first"` → use model `"openrouter/free"`; any other value → use as-is
  - [ ] Request body: same `messages` shape as Claude path (system prompt + user message), `"stream": true`
  - [ ] SSE parsing: OpenAI delta format — `data.choices[0].delta.content` (not Anthropic `content_block_delta`)
  - [ ] Emit events via same `optimization-stream-chunk` / `optimization-stream-end` / `optimization-stream-error` events as Claude path — frontend must see identical events
  - [ ] Export from `services/mod.rs`: add `pub mod openrouter_service;`
  - [ ] See Dev Notes for SSE parsing detail and system prompt reuse

- [ ] Task 3: Add new Tauri commands in `app_commands.rs` (AC: 4, 5, 6, 7, 8)
  - [ ] `#[tauri::command] pub async fn set_llm_provider(app_handle: AppHandle, provider: String) -> Result<(), String>`
  - [ ] `#[tauri::command] pub async fn get_llm_provider(app_handle: AppHandle) -> Result<String, String>`
  - [ ] `#[tauri::command] pub async fn set_openrouter_api_key(app_handle: AppHandle, key: String) -> Result<(), String>`
  - [ ] `#[tauri::command] pub async fn check_openrouter_configured(app_handle: AppHandle) -> Result<bool, String>`
  - [ ] `#[tauri::command] pub async fn set_model_preference(app_handle: AppHandle, preference: String) -> Result<(), String>`
  - [ ] `#[tauri::command] pub async fn get_model_preference(app_handle: AppHandle) -> Result<String, String>`
  - [ ] Register all six new commands in `invoke_handler![]` in `lib.rs`

- [ ] Task 4: Update `claude_commands.rs` to route by provider (AC: 6, 7, 8)
  - [ ] In `invoke_claude_api` (or extract a new `invoke_optimization` command that wraps both), read `get_llm_provider()` from vault first
  - [ ] If `"openrouter"`: call `get_openrouter_api_key()` + `get_model_preference()`, dispatch to `openrouter_service::stream_optimization()`
  - [ ] If `"claude"` (default): existing `get_api_key()` + `claude_service::stream_optimization()` path — no change to this branch
  - [ ] AUTH_ERROR message for missing OpenRouter key: `"AUTH_ERROR: No OpenRouter API key configured. Add your key in Settings."`

- [ ] Task 5: Update `appStore.ts` — provider state (AC: 1, 2, 3, 5)
  - [ ] Add `llmProvider: 'claude' | 'openrouter' | null` to `AppStore` interface (null = not yet loaded)
  - [ ] Add `setLlmProvider: (v: 'claude' | 'openrouter' | null) => void`
  - [ ] Initialize `llmProvider: null`

- [ ] Task 6: Create `ProviderSelector.tsx` (AC: 1, 2, 3, 5)
  - [ ] Create `lebo/src/features/settings/ProviderSelector.tsx`
  - [ ] On mount: call `invokeCommand<string>('get_llm_provider')` → `setLlmProvider(result)`; call `invokeCommand<bool>('check_openrouter_configured')` for placeholder state
  - [ ] Render a segmented control / radio group: "Claude (Anthropic)" | "OpenRouter"
  - [ ] When Claude selected: render `<ApiKeyInput />` (existing component, unchanged)
  - [ ] When OpenRouter selected: render `<OpenRouterInput />` (new, Task 7)
  - [ ] On provider change: call `invokeCommand('set_llm_provider', { provider })` + `setLlmProvider(provider)` + success toast
  - [ ] `data-testid="provider-selector"` on the control; `data-testid="provider-claude"` and `data-testid="provider-openrouter"` on each option

- [ ] Task 7: Create `OpenRouterInput.tsx` (AC: 3, 4, 5, 7)
  - [ ] Create `lebo/src/features/settings/OpenRouterInput.tsx`
  - [ ] API key input: masked, same pattern as `ApiKeyInput.tsx` — placeholder `"OpenRouter API key saved ✓"` when configured
  - [ ] Model preference control: two radio options
    - "Use free models first" (value: `"free-first"`)
    - "Always use this model" (value: specific model ID from dropdown)
  - [ ] When "Always use this model" selected: show model dropdown (see Dev Notes for model list)
  - [ ] On mount: `invokeCommand<string>('get_model_preference')` to pre-select saved preference
  - [ ] "Save" button: calls `set_openrouter_api_key` (if key input non-empty) then `set_model_preference` → success toast "OpenRouter settings saved"
  - [ ] Error: inline below key input, same style as `ApiKeyInput` errors
  - [ ] `data-testid="openrouter-key-input"`, `data-testid="save-openrouter-btn"`, `data-testid="model-preference-free-first"`, `data-testid="model-preference-always"`, `data-testid="model-picker"`

- [ ] Task 8: Update `Settings.tsx` to render `ProviderSelector` (AC: 1)
  - [ ] Replace `<ApiKeyInput />` with `<ProviderSelector />`  — `ProviderSelector` renders `ApiKeyInput` internally when Claude is selected, so no double-render
  - [ ] Add section heading "AI Provider" above the selector (same visual weight as existing "AI API Key" heading)

- [ ] Task 9: Tests (AC: 1–8)
  - [ ] `ProviderSelector.test.tsx` — get_llm_provider called on mount; Claude option shows ApiKeyInput; OpenRouter option shows OpenRouterInput; switching provider calls set_llm_provider
  - [ ] `OpenRouterInput.test.tsx` — get_model_preference called on mount; key input masked; Save disabled when key empty; Save calls set_openrouter_api_key + set_model_preference; success toast; error shown inline; "Always use model" reveals model picker
  - [ ] Update `Settings.test.tsx` — renders ProviderSelector instead of ApiKeyInput directly
  - [ ] `pnpm tsc --noEmit` — clean
  - [ ] `pnpm vitest run` — all tests pass

## Dev Notes

### OpenRouter API Reference

**Base URL:** `https://openrouter.ai/api/v1/chat/completions`

**Headers:**
```
Authorization: Bearer {api_key}
Content-Type: application/json
HTTP-Referer: https://github.com/lebo
X-Title: Last Epoch Build Optimizer
```

**Request body (streaming):**
```json
{
  "model": "openrouter/free",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "stream": true
}
```

**Model `"openrouter/free"`** — OpenRouter's free router; automatically selects the best available free model for each request. This is the "Use free models first" implementation — no curated list needed.

**SSE delta format (OpenAI-style, NOT Anthropic-style):**
```
data: {"id":"...","choices":[{"delta":{"content":"token"}}]}
data: {"choices":[{"delta":{"content":""}, "finish_reason":"stop"}]}
data: [DONE]
```
Parse `choices[0].delta.content` — empty string on final chunk, `[DONE]` signals stream end.

**Contrast with Anthropic SSE format:**
```
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"token"}}
data: {"type":"message_stop"}
```
These are incompatible — `openrouter_service.rs` needs its own SSE parser; do not share the Claude parser.

---

### System Prompt Reuse

The optimization system prompt lives in `claude_service.rs`. Extract it to a shared constant in a new `lebo/src-tauri/src/services/prompts.rs` module so both services use identical instructions:

```rust
// services/prompts.rs
pub const OPTIMIZATION_SYSTEM_PROMPT: &str = "..."; // move from claude_service.rs
```

Import in both `claude_service.rs` and `openrouter_service.rs`. Do not duplicate the string.

---

### Curated Model List (for "Always use this model" dropdown)

Verify model IDs are still valid on OpenRouter at implementation time — free model availability shifts. Suggested starting list:

| Display Name | Model ID |
|---|---|
| Auto (best free) | `openrouter/free` |
| Gemini 2.0 Flash (free) | `google/gemini-2.0-flash-exp:free` |
| Llama 3.3 70B (free) | `meta-llama/llama-3.3-70b-instruct:free` |
| Mistral 7B (free) | `mistralai/mistral-7b-instruct:free` |
| Gemma 2 27B (free) | `google/gemma-2-27b-it:free` |

The model ID is what gets stored in vault as the `openrouter_model_preference` value. When the user picks "Use free models first", store `"free-first"` — and in `openrouter_service`, map `"free-first"` → `"openrouter/free"`.

Do NOT hardcode these IDs in Rust — keep the list in the frontend `OpenRouterInput.tsx` only. The Rust service uses whatever string it reads from the vault, so new models can be added via frontend changes only.

---

### Vault Key Summary

| Vault Key | Type | Default (absent) | Description |
|---|---|---|---|
| `anthropic_api_key` | String | AUTH_ERROR | Existing — Claude key |
| `llm_provider` | String | `"claude"` | Active provider |
| `openrouter_api_key` | String | AUTH_ERROR | OpenRouter key |
| `openrouter_model_preference` | String | `"free-first"` | Model ID or `"free-first"` |

All keys share the same Stronghold vault file (`lebo.stronghold`) and CLIENT_NAME (`lebo`). No new vault file needed.

---

### Event Contract — Frontend Must Stay Identical

The frontend optimization flow (`optimizationStore`, `SuggestionsList`) listens to:
- `optimization-stream-chunk` — `{ content: string }`
- `optimization-stream-end` — no payload
- `optimization-stream-error` — `{ message: string, type: string }`

`openrouter_service` MUST emit these exact event names with the same payload shapes. The frontend must require zero changes to handle OpenRouter responses — the provider abstraction is entirely in Rust.

---

### Coding Patterns

Follow 5.1 patterns throughout:
- Tailwind v4 CSS-first: `className` for layout, `style={{ color: 'var(--color-...)' }}` for tokens
- No barrel `index.ts` — direct imports
- Tests co-located with source
- Mock `@tauri-apps/api/core` in tests
- `getState()` in event handlers
- Auth errors start with `AUTH_ERROR:` prefix for `extract_error_type()` compatibility

---

### File Locations

**New files:**
- `lebo/src/features/settings/ProviderSelector.tsx`
- `lebo/src/features/settings/ProviderSelector.test.tsx`
- `lebo/src/features/settings/OpenRouterInput.tsx`
- `lebo/src/features/settings/OpenRouterInput.test.tsx`
- `lebo/src-tauri/src/services/openrouter_service.rs`
- `lebo/src-tauri/src/services/prompts.rs`

**Modified files:**
- `lebo/src-tauri/src/services/keychain_service.rs` — six new vault functions
- `lebo/src-tauri/src/services/mod.rs` — add `pub mod openrouter_service; pub mod prompts;`
- `lebo/src-tauri/src/commands/app_commands.rs` — six new commands
- `lebo/src-tauri/src/lib.rs` — register new commands in invoke_handler
- `lebo/src-tauri/src/commands/claude_commands.rs` — provider routing logic
- `lebo/src/features/settings/Settings.tsx` — swap ApiKeyInput for ProviderSelector
- `lebo/src/features/settings/Settings.test.tsx` — update for ProviderSelector
- `lebo/src/shared/stores/appStore.ts` — add llmProvider state
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 5.6 → in-progress when started

---

### Extensibility Note

The `llm_provider` vault key is a plain string, not an enum constraint. Adding Groq or Gemini in a future story means:
1. Add the new provider string constant in Rust
2. Add a new service file
3. Add a new branch in the routing logic in `claude_commands.rs`
4. Add the option to `ProviderSelector.tsx`

No schema migration, no vault restructuring needed.

## Dev Agent Record

### Agent Model Used

_To be filled when implemented_

### Debug Log References

_To be filled when implemented_

### Completion Notes List

_To be filled when implemented_

### File List

_To be filled when implemented_

### Review Findings

_To be filled when implemented_

## Change Log

- 2026-04-28: Story 5.6 created — Multi-Provider LLM Settings (OpenRouter + Model Selection)

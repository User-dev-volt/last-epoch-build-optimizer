# Story 2.2: Rust Icon Pipeline Commands

Status: ready-for-dev

## Story

As a theory-crafter,
I want the app to make game-accurate skill icons available on first launch with no setup,
so that the icon rendering in Story 2.4 has icons ready to display.

## Acceptance Criteria

1. **Given** the app launches for the first time
   **When** `initialize_icon_pipeline()` Rust command is called at startup
   **Then** it copies all pre-bundled icon PNGs from `resources/icons/skills/` and `resources/icons/skill-icon-map.json` into the app data icon cache (`{app_data}/lebo/icons/`), then emits the `icon-pipeline:initialized` Tauri event with `{ "iconSource": "game-files" }`

2. **Given** `initialize_icon_pipeline()` has already run (icon cache populated)
   **When** it is called again on a subsequent launch
   **Then** it detects the cache is already populated (by checking for `skill-icon-map.json` in the cache dir), skips the copy, and emits `icon-pipeline:initialized` with no file writes

3. **Given** the icon cache has been initialized
   **When** `get_icon_cache_path(skillId: String)` is called with a skill ID that exists in the skill-icon-map (e.g., `"mage-fireball"`)
   **Then** it returns `Ok(Some("<absolute-path-to>/lebo/icons/skills/skillIcon-fireball.png"))`

4. **Given** `get_icon_cache_path(skillId)` is called with a skill ID not in the map (e.g., `"mage-lightning-blast"` — one of the 3 unmapped IDs)
   **When** the lookup finds no entry
   **Then** it returns `Ok(None)` without error; no ICON_ERROR is emitted for a mere cache miss

5. **Given** `get_icon_cache_path(skillId)` is called but the cached file does not exist on disk (map entry present but file missing)
   **When** the file existence check fails
   **Then** it returns `Ok(None)` — same behavior as a map miss; the caller (Story 2.3) treats None as "use placeholder"

6. **Given** the `initialize_icon_pipeline()` copy operation fails midway (e.g., disk full)
   **When** the error is caught
   **Then** the command returns `Err("ICON_ERROR: <detail>")`, the partial copy does NOT trigger a crash, and the app continues — Story 2.3's `useIconTextures` hook handles an empty/partial cache gracefully by mapping missing entries to placeholder fill

7. **And** both commands are registered in `lib.rs` via `invoke_handler!`
   **And** all error strings are prefixed with `"ICON_ERROR: "`
   **And** `ICON_ERROR` is added to `ErrorType` in `src/shared/types/errors.ts` and to `ERROR_TYPE_MAP` / `USER_MESSAGES` in `src/shared/utils/errorNormalizer.ts`
   **And** `tauri.conf.json` bundle resources are updated to include the icons directory so PNGs are bundled in the production build

## Tasks / Subtasks

- [ ] Task 1: Create `src-tauri/src/commands/icon_commands.rs` (AC: #1–#6)
  - [ ] Add `fn ensure_icon_cache_dir(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String>` — returns `{app_data}/lebo/icons/`, creates it if missing (same pattern as `ensure_game_data_dir` in game_data_service.rs)
  - [ ] Implement `initialize_icon_pipeline(app_handle: tauri::AppHandle) -> Result<(), String>`:
    - [ ] Call `ensure_icon_cache_dir` to get `icon_dir`
    - [ ] Check if `icon_dir.join("skill-icon-map.json")` exists → if yes, emit event and return `Ok(())` (idempotent skip)
    - [ ] Get bundled resources dir via `app_handle.path().resource_dir()`, then join `"resources/icons"`
    - [ ] Create `icon_dir.join("skills")` subdirectory
    - [ ] Use `copy_dir_recursive` (same helper as in game_data_service.rs — copy the pattern) to copy the `skills/` folder and `skill-icon-map.json`
    - [ ] Emit `icon-pipeline:initialized` event: `app_handle.emit("icon-pipeline:initialized", serde_json::json!({ "iconSource": "game-files" })).map_err(|e| format!("ICON_ERROR: emit event: {}", e))?`
    - [ ] Return `Ok(())`
  - [ ] Implement `get_icon_cache_path(app_handle: tauri::AppHandle, skill_id: String) -> Result<Option<String>, String>`:
    - [ ] Get `icon_dir` via `ensure_icon_cache_dir`
    - [ ] Read and parse `icon_dir.join("skill-icon-map.json")` into `HashMap<String, String>`; if file missing, return `Ok(None)` (pipeline not yet initialized)
    - [ ] Look up `skill_id` in the map → if not found, return `Ok(None)` (unmapped skill — 3 known: `mage-lightning-blast`, `primalist-storm-totem`, `sentinel-smite`)
    - [ ] Construct full path: `icon_dir.join("skills").join(&filename)`
    - [ ] If path exists on disk → return `Ok(Some(path.to_string_lossy().to_string()))`
    - [ ] If path does not exist → return `Ok(None)` (file missing despite map entry — AC #5)

- [ ] Task 2: Register the new commands (AC: #7)
  - [ ] In `src-tauri/src/commands/mod.rs`, add `pub mod icon_commands;`
  - [ ] In `src-tauri/src/lib.rs`, add to the use imports:
    ```rust
    use commands::icon_commands::{initialize_icon_pipeline, get_icon_cache_path};
    ```
  - [ ] Add both commands to `invoke_handler!` in `lib.rs`

- [ ] Task 3: Bundle icon resources in `tauri.conf.json` (AC: #7)
  - [ ] In `lebo/src-tauri/tauri.conf.json`, add to the `bundle.resources` array:
    - `"resources/icons/skill-icon-map.json"` (single file)
    - For the 1,027 PNG files: use `"resources/icons/skills/*"` glob — Tauri 2 supports glob patterns in the resources array. If glob is rejected at build time, fall back to listing `"resources/icons/skills/"` as a directory entry.
  - [ ] Verify the build succeeds with `pnpm build` (or `pnpm tauri build`) and that resource access does not 404 at runtime

- [ ] Task 4: Add `ICON_ERROR` to TypeScript error infrastructure (AC: #7)
  - [ ] In `lebo/src/shared/types/errors.ts`, add `'ICON_ERROR'` to the `ErrorType` union type
  - [ ] In `lebo/src/shared/utils/errorNormalizer.ts`:
    - Add `ICON_ERROR: 'ICON_ERROR'` to `ERROR_TYPE_MAP`
    - Add `ICON_ERROR: 'Could not load skill icons. Icons will show as placeholders.'` to `USER_MESSAGES`

- [ ] Task 5: Write a basic Vitest test for the TypeScript error registration (AC: #7)
  - [ ] In `lebo/src/shared/utils/errorNormalizer.test.ts` (create if it does not exist), add a test:
    ```ts
    it('maps ICON_ERROR prefix', () => {
      const err = normalizeAppError('ICON_ERROR: copy failed')
      expect(err.type).toBe('ICON_ERROR')
    })
    ```
  - [ ] Run `pnpm vitest` to confirm no regressions in the 502/508 existing tests

## Dev Notes

### Architecture Pivot from Original Epic 2 Spec

**Critical deviation:** The original Epic 2 architecture (Architecture Decision 1) planned a runtime 3-path pipeline:
- Path A: detect Steam path → extract from Unity bundle at runtime
- Path B: CDN fetch from `lastepochtools.com`
- Path C: placeholder

**Story 2.1 spike outcome changes this entirely:**
- Icons are already extracted to `lebo/src-tauri/resources/icons/skills/` (1,027 PNGs at 128×128 RGBA, ~10 MB total)
- `lebo/src-tauri/resources/icons/skill-icon-map.json` maps skillId → filename (9/12 auto-mapped, 3 unmapped)
- CDN NOT viable: `lastepochtools.com` uses CSS sprite sheets, not per-skill URLs
- `tunklab.com` has SSL error 526 (site down)
- Runtime Unity bundle parsing NOT needed: extraction is a dev-time operation; re-run `tools/extract-icons/` when the game patches (~15 seconds)

**What this means for Story 2.2:** Drastically simpler than the original spec. No Steam detection. No HTTP requests. No Unity parsing. Just copy bundled resources to cache and emit the initialized event.

**The `initialize_icon_pipeline` name and event contract are preserved** so Stories 2.3 and 2.4 (which depend on this story's output) work without modification.

### Exact File Locations

**Source resources (already committed):**
```
lebo/src-tauri/resources/icons/skills/          ← 1,027 PNG files (128×128 RGBA)
lebo/src-tauri/resources/icons/skill-icon-map.json ← skillId → filename mapping (9 entries)
```

**Runtime icon cache destination:**
```
{app_data}/lebo/icons/skills/*.png              ← populated by initialize_icon_pipeline
{app_data}/lebo/icons/skill-icon-map.json       ← copied by initialize_icon_pipeline
```

Where `{app_data}` is `app_handle.path().app_data_dir()` — on Windows this is `%APPDATA%\com.lebo.dev\` (resolves to `C:\Users\{user}\AppData\Roaming\com.lebo.dev\`).

**Note on app_data_dir vs resource_dir:** Resources are accessed via `app_handle.path().resource_dir().join("resources/icons/...")` at runtime. The `resource_dir()` resolves to different locations in dev (`src-tauri/`) vs production (inside the app bundle). Use `app_handle.path().resource_dir()` — not a hardcoded path.

### Existing Pattern to Follow: `game_data_service.rs`

The icon initialization mirrors the existing game data initialization pattern exactly. Study these functions in `lebo/src-tauri/src/services/game_data_service.rs`:

- `ensure_game_data_dir()` → mirror as `ensure_icon_cache_dir()`
- `copy_bundled_resources()` → mirror its logic for copying from resource_dir to app_data_dir
- `copy_dir_recursive()` → reuse this helper (it's private to the module — either replicate it in icon_commands.rs or extract to a shared utility)

The main difference: game data copies only on first launch (manifest.json absence check); icons copy when `skill-icon-map.json` is absent in the cache.

### Skill-Icon-Map Structure

```json
{
  "acolyte-harvest": "skillIcon-harvest.png",
  "acolyte-rip-blood": "skillIcon-rip blood.png",
  "mage-fireball": "skillIcon-fireball.png",
  "primalist-fury-leap": "skillIcon-fury leap.png",
  "rogue-dancing-strikes": "skillIcon-dancing-strikes.png",
  "rogue-puncture": "skillIcon-puncture.png",
  "sentinel-anomaly": "skillIcon-anomaly.png",
  "sentinel-forge-strike": "skillIcon-forge-strike.png",
  "sentinel-judgement": "skillIcon-judgement.png"
}
```

**3 unmapped skill IDs** (return `None` gracefully — no error):
- `mage-lightning-blast`
- `primalist-storm-totem`
- `sentinel-smite`

These 3 will render as placeholder hex fill in Story 2.4. Future story or manual curation can add them. Do NOT hard-code them — just let the map lookup return None.

### Tauri Event Emission

```rust
app_handle
    .emit("icon-pipeline:initialized", serde_json::json!({ "iconSource": "game-files" }))
    .map_err(|e| format!("ICON_ERROR: emit icon-pipeline:initialized: {}", e))?;
```

Tauri 2's `app_handle.emit()` broadcasts to all windows. The TypeScript side (Story 2.3's `useIconTextures` hook) will subscribe to this event via `listen("icon-pipeline:initialized", ...)`. The event name `"icon-pipeline:initialized"` must match exactly — it's part of the public contract for Story 2.3.

### `lib.rs` Registration Pattern

Following the existing pattern in `lebo/src-tauri/src/lib.rs`:

```rust
use commands::icon_commands::{initialize_icon_pipeline, get_icon_cache_path};

// Then in invoke_handler!:
initialize_icon_pipeline,
get_icon_cache_path,
```

And in `commands/mod.rs`:
```rust
pub mod icon_commands;
```

### `tauri.conf.json` Resource Bundling

Currently `bundle.resources` lists 6 specific game-data files. The icon resources must be added. Add to the resources array:

```json
"resources/icons/skill-icon-map.json",
"resources/icons/skills/*"
```

Tauri 2 supports glob patterns. If the build toolchain rejects the glob, list the `skills/` directory or add an explicit pattern. The key requirement: all 1,027 PNGs and `skill-icon-map.json` must be accessible via `app_handle.path().resource_dir()` at runtime. Without this, `initialize_icon_pipeline` will fail to find the source files in production builds.

**Important:** Only adding to `bundle.resources` is needed — the files are already committed to `lebo/src-tauri/resources/icons/` and accessible in dev mode without explicit listing.

### Serde Import for JSON Parsing

The `get_icon_cache_path` function reads `skill-icon-map.json` and parses it as `HashMap<String, String>`. Use:
```rust
use std::collections::HashMap;
let raw = std::fs::read_to_string(map_path)
    .map_err(|e| format!("ICON_ERROR: read skill-icon-map: {}", e))?;
let map: HashMap<String, String> = serde_json::from_str(&raw)
    .map_err(|e| format!("ICON_ERROR: parse skill-icon-map: {}", e))?;
```
`serde_json` is already a dependency (`serde_json = "1"` in `Cargo.toml`).

### What This Story Does NOT Implement

- `detect_steam_path()` — not needed (icons are pre-bundled)
- `extract_skill_icons()` (runtime Unity parsing) — not needed
- `fetch_cdn_icon()` — not needed (CDN not viable per spike)
- CDN fallback logic — replaced by placeholder fill in Story 2.4
- Any TypeScript hook or PixiJS rendering — those are Stories 2.3 and 2.4
- Manifest v2 `iconSource` field update — deferred to Story 6.3 (Manifest v2 & Atomic Data Update Pipeline)

The `icon-pipeline:initialized` event is the only runtime signal produced. Story 2.3 listens for it before loading textures. Story 2.4 uses the resolved textures as props.

### No Runtime Icon Freshness Check

Unlike game data, icons do not have a freshness check in Phase 2. When the game patches and new icons are needed, the developer runs `tools/extract-icons/ -- --extract` (~15 seconds) and commits the new PNGs. This is intentional — no in-app update mechanism for icons in Phase 2.

### Project Structure Notes

- New file: `lebo/src-tauri/src/commands/icon_commands.rs`
- Modified: `lebo/src-tauri/src/commands/mod.rs` (add `pub mod icon_commands;`)
- Modified: `lebo/src-tauri/src/lib.rs` (add use imports + invoke_handler! entries)
- Modified: `lebo/src-tauri/tauri.conf.json` (add icon resources to bundle)
- Modified: `lebo/src/shared/types/errors.ts` (add `'ICON_ERROR'` to ErrorType union)
- Modified: `lebo/src/shared/utils/errorNormalizer.ts` (add ICON_ERROR mapping + message)
- No barrel files — `icon_commands.rs` is imported directly via the `commands` module path
- No new Zustand stores — this story is Rust-only (plus 2 TypeScript file edits for error types)

### Project Context Rules

1. **All Tauri command names are snake_case** — use `initialize_icon_pipeline` and `get_icon_cache_path` (matching Rust function names exactly)
2. **Never call raw `invoke()` from TypeScript** — Story 2.3 will call these via `invokeCommand<T>()`. This story only defines the Rust side.
3. **All errors prefix with the error type** — `"ICON_ERROR: ..."` for all errors in `icon_commands.rs`
4. **`ErrorType` enum values must match Rust error string prefixes** — adding `ICON_ERROR` to TypeScript must match the `"ICON_ERROR: "` prefix in Rust
5. **No barrel files** — do not create `src-tauri/src/commands/index.rs` or any TypeScript index.ts
6. **Desktop-first Tauri** — all file I/O is in Rust; no Node.js sidecar patterns
7. **`app_handle.path().resource_dir()`** — the correct way to access bundled resources; never hardcode OS paths
8. **Atomic writes not required here** — copying resources to cache is idempotent (skip if already done); no temp-file-then-rename needed since this is a one-time copy, not an overwrite of existing user data
9. **TypeScript strict mode** — the `errors.ts` and `errorNormalizer.ts` changes must not introduce unused variables or parameters

### References

- [Source: `docs/icon-pipeline-spike.md` §5] — GO verdict, 1,027 PNGs confirmed extracted
- [Source: `docs/icon-pipeline-spike.md` §6] — Impact on Story 2.2: copy-from-resources approach
- [Source: `docs/icon-pipeline-spike.md` §2] — skill-icon-map.json naming pattern (kebab-case skillId → "skillIcon-{name}.png")
- [Source: `docs/icon-pipeline-spike.md` §4] — CDN not viable (sprite sheets, not per-icon URLs)
- [Source: `_bmad-output/planning-artifacts/architecture.md` §Decision 1] — Icon pipeline architecture, `initialize_icon_pipeline` command, `get_icon_cache_path` contract
- [Source: `_bmad-output/planning-artifacts/architecture.md` §Naming Patterns] — Error prefix `"ICON_ERROR: "`, command naming
- [Source: `_bmad-output/planning-artifacts/architecture.md` §Communication Patterns] — `icon-pipeline:initialized` event contract
- [Source: `_bmad-output/project-context.md` §Framework-Specific Rules: IPC (Tauri)] — `invoke_handler!` registration pattern
- [Source: `lebo/src-tauri/src/services/game_data_service.rs`] — `ensure_game_data_dir`, `copy_bundled_resources`, `copy_dir_recursive` patterns to mirror
- [Source: `lebo/src-tauri/src/lib.rs`] — existing command registration boilerplate
- [Source: `lebo/src/shared/types/errors.ts`] — current `ErrorType` union (add `'ICON_ERROR'`)
- [Source: `lebo/src/shared/utils/errorNormalizer.ts`] — `ERROR_TYPE_MAP` and `USER_MESSAGES` (add `ICON_ERROR` entry)
- [Source: `lebo/src-tauri/tauri.conf.json`] — existing `bundle.resources` format to extend
- [Source: Story 2.1 Dev Notes — Completion Notes] — 1,027 PNGs at `lebo/src-tauri/resources/icons/skills/`, map at `lebo/src-tauri/resources/icons/skill-icon-map.json`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

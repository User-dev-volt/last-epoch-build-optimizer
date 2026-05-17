# Story 5.6: Item Data Freshness Check and StalenessBar Extension

Status: ready-for-dev

## Story

As a theory-crafter,
I want to be notified when a newer item database version is available and be able to update it in one click, without being blocked from using the app while the update is pending,
so that my item database stays current with Last Epoch patches.

## Acceptance Criteria

**AC1 — Item data staleness banner:**
Given the app launches and `check_item_data_freshness()` Rust command runs in the background,
when the local `itemDataVersion` in the manifest is older than the remote version,
then a staleness banner appears: "Item database updated. Refresh?" with an "Update" CTA and "Dismiss" link (FR33, FR48).

**AC2 — Stacked banners when both stale:**
Given both game data AND item data are stale simultaneously,
when the staleness banners render,
then two separate banners appear stacked (one per data type); each has its own Update/Dismiss controls (UX-DR6).

**AC3 — Update flow with "Updated ✓" feedback:**
Given the player clicks "Update" on the item data banner,
when `update_item_data()` Rust command runs,
then the button shows a spinner (aria-busy="true"), item files are downloaded and atomically replaced (temp-file-then-rename), the banner shows "Updated ✓" for 2 seconds then disappears, and `useGameDataStore.itemDatabase` reloads with the new data (FR50).

**AC4 — Update failure leaves existing data intact:**
Given the update download fails mid-transfer,
when the error is caught,
then existing item data files are intact (no corruption, atomic pattern guarantees this), the banner returns to its pre-update state, and no error toast appears — the banner itself remains as the retry signal (NFR9).

**AC5 — Rust commands in the right files:**
`check_item_data_freshness()` and `update_item_data()` are implemented in `src-tauri/src/commands/item_commands.rs` and registered in `lib.rs`.

**AC6 — Additive, non-breaking DataStalenessBar extension:**
`DataStalenessBar.tsx` is extended to render an item data banner when `isItemDataStale && !itemDataStaleAcknowledged`; the existing game data banner is unchanged.

## Tasks / Subtasks

- [ ] Task 1: Extend `GameDataManifest` Rust struct and bundled manifest (AC1, AC5)
  - [ ] 1.1: Add `item_data_version: Option<String>` with `#[serde(default)]` to `GameDataManifest` in `src-tauri/src/models/game_data.rs`
  - [ ] 1.2: Add `"itemDataVersion": "1.0.0"` field to `src-tauri/resources/game-data/manifest.json` (bump `schemaVersion` to 2)

- [ ] Task 2: Add `check_item_data_freshness()` and `update_item_data()` to `item_commands.rs` (AC1, AC3, AC4, AC5)
  - [ ] 2.1: Implement `check_item_data_freshness()` — load local manifest, fetch remote manifest via `game_data_service::fetch_remote_manifest()`, compare `itemDataVersion`, return `DataVersionCheckResult`
  - [ ] 2.2: Make `game_data_service::http_client()` pub (or duplicate it in `item_data_service.rs`) so item commands can make HTTP requests
  - [ ] 2.3: Add `REMOTE_DATA_BASE_URL` re-export or import from `game_data_service` for use in item update downloads
  - [ ] 2.4: Implement `update_item_data()` — download items atomically from remote (temp→rename per file), then surgically update only `itemDataVersion` in local manifest

- [ ] Task 3: Register new commands in `lib.rs` (AC5)
  - [ ] 3.1: Add `check_item_data_freshness` and `update_item_data` to `use commands::item_commands::` imports
  - [ ] 3.2: Add both to `invoke_handler!` macro

- [ ] Task 4: Extend `gameDataStore.ts` with item data staleness slice (AC1, AC2, AC3)
  - [ ] 4.1: Add `isItemDataStale: boolean`, `itemDataStaleAcknowledged: boolean`, `isItemDataUpdating: boolean` fields and corresponding setters
  - [ ] 4.2: Initialize all three to `false` in the store

- [ ] Task 5: Add `checkItemDataFreshness()` and `triggerItemDataUpdate()` to `itemDatabaseLoader.ts` (AC1, AC3, AC4)
  - [ ] 5.1: Implement `checkItemDataFreshness()` — `invokeCommand<DataVersionCheckResult>('check_item_data_freshness')`, update store `isItemDataStale`
  - [ ] 5.2: Implement `triggerItemDataUpdate()` — `setIsItemDataUpdating(true)`, invoke `update_item_data`, call `loadItemDatabase()` to reload, clear `isItemDataStale` + `setIsItemDataUpdating(false)` in finally
  - [ ] 5.3: Call `checkItemDataFreshness().catch(() => {})` (non-blocking, fire-and-forget) from `initGameData()` in `gameDataLoader.ts` — mirror the existing `checkDataVersion` pattern

- [ ] Task 6: Extend `DataStalenessBar.tsx` with item data banner (AC2, AC3, AC4)
  - [ ] 6.1: Add item data staleness state selectors from `useGameDataStore`
  - [ ] 6.2: Add `showItemSuccess` local state (`boolean`, drives "Updated ✓" display)
  - [ ] 6.3: Implement `handleItemUpdate()` — call `triggerItemDataUpdate()`, on resolve set `showItemSuccess(true)` + `setTimeout(() => { setShowItemSuccess(false); acknowledgeItemStaleness() }, 2000)`, on reject reset to error state inside banner
  - [ ] 6.4: Render item data banner block **below** existing game data banner block when `isItemDataStale && !itemDataStaleAcknowledged`
  - [ ] 6.5: Button must have `aria-busy="true"` during update; banner must have `role="status"` and `aria-live="polite"` (distinct from game data banner's `role="alert"` + `aria-live="assertive"`)

- [ ] Task 7: Wire startup in `App.tsx` (AC1)
  - [ ] 7.1: Verify `checkItemDataFreshness` is called inside `initGameData()` (Task 5.3); no additional change needed in `App.tsx` if so. If wired differently, add non-blocking call alongside existing `checkDataVersion` in startup effect.

- [ ] Task 8: Tests
  - [ ] 8.1: Add `checkItemDataFreshness` tests to `itemDatabaseLoader.test.ts` — stale result sets `isItemDataStale=true`, fresh result leaves it false
  - [ ] 8.2: Add `triggerItemDataUpdate` tests to `itemDatabaseLoader.test.ts` — sets `isItemDataUpdating` true then false, calls `update_item_data` then `load_item_database`, clears `isItemDataStale` on success, clears `isItemDataUpdating` even on reject
  - [ ] 8.3: Add item banner tests to `DataStalenessBar.test.tsx` — banner hidden when `isItemDataStale=false`, renders with correct text when stale, "Update" disabled during `isItemDataUpdating`, "Dismiss" calls `acknowledgeItemStaleness`, both banners render simultaneously when both data types are stale

## Dev Notes

### File Path Correction — CRITICAL

The epics file (AC6) incorrectly references `src/components/StalenessBar.tsx`. **The actual file is `src/features/game-data/DataStalenessBar.tsx`.** Do NOT create a new file at the epics path. Extend `DataStalenessBar.tsx` in place.

### Rust Side — Pattern to Follow

The entire Rust pattern is established by the existing game data freshness check. Mirror it exactly:

**Existing game data check** (`game_data_commands.rs`):
```rust
pub async fn check_data_version(app_handle) -> Result<DataVersionCheckResult, String> {
    let data_dir = game_data_service::ensure_game_data_dir(&app_handle)?;
    let local = game_data_service::load_manifest(&data_dir)?;
    let remote = game_data_service::fetch_remote_manifest(REMOTE_DATA_BASE_URL).await?;
    let is_stale = local.game_version != remote.game_version;
    let versions_behind = if is_stale { 1 } else { 0 };
    Ok(DataVersionCheckResult { is_stale, local_version: local.game_version, remote_version: remote.game_version, versions_behind })
}
```

**New item check** (`item_commands.rs`) — follow the same shape but compare `item_data_version`:
- Local version: `local.item_data_version.unwrap_or_default()`
- Remote version: `remote.item_data_version.unwrap_or_default()`
- Stale if both are non-empty and they differ. If remote has no `itemDataVersion`, treat as not stale (graceful degradation).

**`update_item_data()` atomic write pattern** (already used in `game_data_commands.rs` and required by architecture):
```rust
let temp_path = dest_path.with_extension("tmp");
tokio::fs::write(&temp_path, &content).await?;
tokio::fs::rename(&temp_path, &dest_path).await?;
```
Apply this per-file for `base-items.json`, `uniques.json`, `affixes.json`.

**Remote item URL:** `{REMOTE_DATA_BASE_URL}/items/{filename}` — same base URL as game data (`https://raw.githubusercontent.com/alec-vautherot/lebo-data/main`). `REMOTE_DATA_BASE_URL` is `pub const` in `game_data_service.rs` — import it in `item_commands.rs` via `use crate::services::game_data_service::REMOTE_DATA_BASE_URL`.

**After downloading item files:** Surgically update only `itemDataVersion` in the local manifest — do NOT write the full remote manifest (that would overwrite game data's staleness state). Load local manifest, update its `item_data_version` field, serialize, write atomically.

**HTTP client:** `game_data_service::http_client()` is currently `fn` (private). Make it `pub fn` so `item_commands.rs` can import it. Alternatively, add an equivalent `pub fn` to `item_data_service.rs`. Changing `game_data_service::http_client` to `pub` is the DRY choice.

**Error prefix:** Use `ITEM_DATA_ERROR:` prefix for all errors in item commands (consistent with `item_data_service.rs` pattern). Network errors use `NETWORK_ERROR:` (consistent with `game_data_service.rs`).

**`GameDataManifest` struct change** — add with `#[serde(default)]` so existing v1 manifests (without `itemDataVersion`) deserialize without error:
```rust
#[serde(rename_all = "camelCase")]
pub struct GameDataManifest {
    pub schema_version: u32,
    pub game_version: String,
    pub data_version: String,
    pub generated_at: String,
    pub classes: Vec<String>,
    #[serde(default)]
    pub item_data_version: Option<String>,  // add this
}
```

### TypeScript Side — Store Extension

Extend `useGameDataStore` in `src/shared/stores/gameDataStore.ts`. Do NOT create a new store. The store currently has:
- `isStale`, `stalenessAcknowledged`, `isUpdating` (game data)
- `itemDatabase` (item data load)

Add three new fields mirroring the game data staleness shape:
```typescript
isItemDataStale: boolean
itemDataStaleAcknowledged: boolean
isItemDataUpdating: boolean
// setters:
setIsItemDataStale: (stale: boolean) => void
acknowledgeItemDataStaleness: () => void
setIsItemDataUpdating: (updating: boolean) => void
```

### TypeScript Side — `itemDatabaseLoader.ts`

Reuse the `DataVersionCheckResult` type — it's already in `src/shared/types/gameData.ts` and returned by the Rust command. Import it there.

`checkItemDataFreshness` structure mirrors `checkDataVersion` in `gameDataLoader.ts`:
```typescript
export async function checkItemDataFreshness(): Promise<void> {
  const result = await invokeCommand<DataVersionCheckResult>('check_item_data_freshness')
  useGameDataStore.getState().setIsItemDataStale(result.isStale)
}
```

`triggerItemDataUpdate` mirrors `triggerDataUpdate` in `gameDataLoader.ts`, plus reloads item database:
```typescript
export async function triggerItemDataUpdate(): Promise<void> {
  const { setIsItemDataUpdating, setIsItemDataStale } = useGameDataStore.getState()
  setIsItemDataUpdating(true)
  try {
    await invokeCommand('update_item_data')
    await loadItemDatabase()          // reload into store
    setIsItemDataStale(false)
  } finally {
    setIsItemDataUpdating(false)
  }
}
```

Call `checkItemDataFreshness().catch(() => {})` inside `initGameData()` in `gameDataLoader.ts`, immediately after the existing `checkDataVersion().catch(() => {})` line. This keeps all data freshness checks co-located at startup.

### TypeScript Side — `DataStalenessBar.tsx` Extension

The existing game data banner uses `role="alert"` + `aria-live="assertive"` (high urgency). The item data banner should use `role="status"` + `aria-live="polite"` (lower urgency) per architecture spec.

"Updated ✓" is a local state in the component (not in the store). After `handleItemUpdate()` resolves:
1. Set `showItemSuccess(true)` — banner switches to "Updated ✓" text
2. `setTimeout(() => { setShowItemSuccess(false); acknowledgeItemDataStaleness() }, 2000)` — 2s later, banner disappears
3. No success state needed in the store — the component handles it locally

If `handleItemUpdate()` rejects: catch the error, store it in local state (like `updateItemError`), show error inline in the banner. Do NOT call `toast()`. Do NOT call `acknowledgeItemDataStaleness()`.

During update: button text changes to "Downloading…", `disabled={true}`, `aria-busy="true"`.

Structure of the component after extension — render order:
1. Game data banner (existing — unchanged) — renders when `isStale && !stalenessAcknowledged`
2. Item data banner (new) — renders when `isItemDataStale && !itemDataStaleAcknowledged`

Both can be visible simultaneously (AC2). Keep each banner as a separate JSX block; do not merge them into one component with conditional text.

Item banner text (AC1): "Item database updated. Refresh?" with "Update" CTA and "Dismiss" link. On success (showItemSuccess): "Item database updated ✓".

### TypeScript Side — Types

`DataVersionCheckResult` is already defined in `src/shared/types/gameData.ts` and is the return type of `check_item_data_freshness()`. No new type file is needed.

### App.tsx — No Changes Expected

If `checkItemDataFreshness()` is called inside `initGameData()` (Task 5.3), App.tsx needs no changes — `initGameData()` is already called in the startup `useEffect`. Confirm before finishing Task 7.

### Bundled Manifest Update

The bundled `manifest.json` at `src-tauri/resources/game-data/manifest.json` must gain `"itemDataVersion": "1.0.0"` so that freshly installed apps have a baseline version to compare against. Also bump `"schemaVersion"` to `2`. This file is copied to app data on first launch via `copy_bundled_resources()`.

### Testing Patterns

Tests for `checkItemDataFreshness` and `triggerItemDataUpdate` in `itemDatabaseLoader.test.ts`:
- Mock `invokeCommand` via `vi.mock('../../shared/utils/invokeCommand', ...)`
- Reset store state in `beforeEach` via `useGameDataStore.setState(initialState, true)`
- `triggerItemDataUpdate` test must verify: `isItemDataUpdating` goes `true` then `false`, `update_item_data` invoked before `load_item_database`, `isItemDataStale` becomes `false` on success

Tests for `DataStalenessBar` item banner in `DataStalenessBar.test.tsx`:
- Mock `./gameDataLoader` (game data) AND `../../features/item-database/itemDatabaseLoader` (item data) — wait, check imports in the component to know which module to mock
- Pattern: `vi.mock('./itemDatabaseLoader', () => ({ triggerItemDataUpdate: vi.fn() }))`
- Test that both banners render simultaneously: set both `isStale=true` and `isItemDataStale=true`, confirm two distinct role elements appear

### Project Context Rules (Critical)

- **No barrel files** — `itemDatabaseLoader.ts` exports are already named exports; keep it that way
- **Always use `invokeCommand<T>()`** — never raw `invoke()` from `@tauri-apps/api/core`
- **Four stores only** — extend `useGameDataStore`; do NOT create a new store
- **TypeScript strict mode** — every new field must be typed; no implicit `any`
- **Error normalization** — `ITEM_DATA_ERROR:` prefix in Rust maps to `ErrorType.ITEM_DATA_ERROR` in TypeScript via `normalizeAppError`; no new error types needed for this story
- **No atomic-write bypass** — item file writes MUST use temp-file-then-rename; never `fs::write` directly to final path

### Previous Story Learnings (from 5-5)

- **Functional state updater pattern** matters when state reads happen inside closures — use `setIsItemDataUpdating(false)` in `finally` block directly (no closure issue since it's a setter, not a state read)
- **Deferred 5-5 items** (not this story's concern): no removal of custom affixes, `+` button when `itemDatabase` is null, AffixPicker re-open edge case
- **AffixPicker** was created at `src/features/item-database/AffixPicker.tsx` — this story does not touch item-database feature files except `itemDatabaseLoader.ts`
- **Test mock strategy**: the existing `DataStalenessBar.test.tsx` mocks `./gameDataLoader` — when adding item data mocks, also mock the item loader module

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.6] — ACs, user story, story key
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision 4] — Rust commands, StalenessBar extension, atomic write pattern, remote URL pattern
- [Source: _bmad-output/planning-artifacts/architecture.md#StalenessBar Component Extension] — two-banner stacking, `isItemDataStale` field
- [Source: _bmad-output/planning-artifacts/prd.md#FR33, FR48, FR50] — functional requirements driving this story
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component 6, Journey 4] — banner text, states, aria attributes
- [Source: lebo/src-tauri/src/commands/game_data_commands.rs] — mirror pattern for `check_item_data_freshness` and `update_item_data`
- [Source: lebo/src-tauri/src/services/game_data_service.rs] — `fetch_remote_manifest`, `http_client`, `REMOTE_DATA_BASE_URL`
- [Source: lebo/src-tauri/src/models/game_data.rs] — `GameDataManifest` struct to extend; `DataVersionCheckResult` to reuse
- [Source: lebo/src/shared/stores/gameDataStore.ts] — store to extend
- [Source: lebo/src/features/game-data/gameDataLoader.ts] — `checkDataVersion` + `triggerDataUpdate` patterns to mirror
- [Source: lebo/src/features/game-data/DataStalenessBar.tsx] — component to extend (NOT src/components/StalenessBar.tsx)
- [Source: lebo/src/features/game-data/DataStalenessBar.test.tsx] — test mock patterns to follow
- [Source: lebo/src/features/item-database/itemDatabaseLoader.ts] — file to extend with freshness + update functions
- [Source: lebo/src-tauri/resources/game-data/manifest.json] — bundled manifest to update

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

# Story 5.1: Item Database Load and TypeScript Types

Status: ready-for-dev

## Story

As a developer,
I want the item database (base items, uniques, affixes) to load from bundled JSON files at app startup and be accessible in the TypeScript layer via gameDataStore,
so that all gear input features in Epic 5 have a populated item database to query against.

## Acceptance Criteria

1. **Given** `base-items.json`, `uniques.json`, and `affixes.json` are bundled in `src-tauri/resources/items/`
   **When** the app starts
   **Then** the Rust command `load_item_database()` reads all three files, deserializes them via serde, and returns an `ItemDatabase` struct; the TypeScript side calls `invokeCommand<ItemDatabase>('load_item_database')` and stores the result in `useGameDataStore.itemDatabase`

2. **Given** `load_item_database()` succeeds
   **When** the corpus sizes are checked
   **Then** itemDatabase contains ≥674 base items, ≥445 unique items, and ≥1,112 affixes

3. **Given** `load_item_database()` fails (file missing or corrupt)
   **When** the error is caught in TypeScript
   **Then** `useGameDataStore.itemDatabase` is set to null; no error toast is shown; all GearSlot components (Stories 5.3–5.5) will detect null and render free-text mode with a "Database unavailable" muted label (NFR11)

4. **And** TypeScript types `ItemDatabase`, `BaseItem`, `UniqueItem`, `AffixEntry`, `AffixTier` are defined in `src/shared/types/itemDatabase.ts` with no barrel file

5. **And** `load_item_database` is registered in `lib.rs` with `AppResult<ItemDatabase>` return; error strings prefixed `"ITEM_DATA_ERROR: "`; `ITEM_DATA_ERROR` added to `ErrorType` enum in `errors.ts` and `errorNormalizer.ts`

6. **And** the item database load runs in parallel with game data load at startup (non-blocking) — added to the `useEffect` in `App.tsx` with no `await` dependency on other startup calls

## Tasks / Subtasks

- [ ] Task 0: Source and bundle item database JSON files (AC: #1, #2)
  - [ ] Source Last Epoch community item data (see Dev Notes: Data Sourcing section for target format and community sources)
  - [ ] Transform/validate data to produce three JSON files matching the TypeScript type schemas defined in Task 1:
    - `base-items.json` — array of `BaseItem` objects (≥674 entries)
    - `uniques.json` — array of `UniqueItem` objects (≥445 entries)
    - `affixes.json` — array of `AffixEntry` objects (≥1,112 entries; includes prefixes, suffixes, and implicits)
  - [ ] Place all three files in `src-tauri/resources/items/` (create this directory)
  - [ ] Add resources entries to `tauri.conf.json` `bundle.resources` array:
    ```json
    "resources/items/base-items.json",
    "resources/items/uniques.json",
    "resources/items/affixes.json"
    ```
  - [ ] Verify corpus counts meet minimums: ≥674 base items, ≥445 unique items, ≥1,112 affixes

- [ ] Task 1: Define TypeScript types in `src/shared/types/itemDatabase.ts` (AC: #4)
  - [ ] Create `src/shared/types/itemDatabase.ts` (no barrel file; no `index.ts` in this directory)
  - [ ] Export the following interfaces (see Dev Notes: TypeScript Type Schema for field rationale):
    ```typescript
    export interface AffixTier {
      tier: number        // 1-indexed tier number
      minValue: number    // minimum rolled value at this tier
      maxValue: number    // maximum rolled value at this tier
    }

    export interface AffixEntry {
      id: string
      name: string
      type: 'prefix' | 'suffix' | 'implicit'
      itemSlots: string[]     // slot keys this affix can appear on (e.g., ['helmet', 'chest'])
      tiers: AffixTier[]      // ordered T1..TN; length = max tier count
    }

    export interface BaseItem {
      id: string
      name: string
      baseType: string           // display name for item class (e.g., "Sabre", "Leather Helmet")
      slot: string               // slot key matching build gear slot (e.g., "weapon", "helmet", "chest")
      implicitAffixIds: string[] // IDs into AffixEntry[] for implicit/inherent modifiers
    }

    export interface UniqueItemAffix {
      affixId: string
      fixedMinValue: number      // minimum of the fixed roll range
      fixedMaxValue: number      // maximum of the fixed roll range
    }

    export interface UniqueItem {
      id: string
      name: string
      baseType: string
      slot: string
      affixes: UniqueItemAffix[] // all affixes are known/fixed on uniques
    }

    export interface ItemDatabase {
      baseItems: BaseItem[]
      uniqueItems: UniqueItem[]
      affixes: AffixEntry[]
    }
    ```
  - [ ] **No default exports** — all exports are named (project convention)

- [ ] Task 2: Add `ITEM_DATA_ERROR` to errors.ts and errorNormalizer.ts (AC: #5)
  - [ ] In `src/shared/types/errors.ts`, add `'ITEM_DATA_ERROR'` to the `ErrorType` union (after `'ICON_ERROR'`):
    ```typescript
    export type ErrorType =
      | 'API_ERROR'
      | 'NETWORK_ERROR'
      | 'TIMEOUT'
      | 'PARSE_ERROR'
      | 'DATA_STALE'
      | 'STORAGE_ERROR'
      | 'AUTH_ERROR'
      | 'ICON_ERROR'
      | 'ITEM_DATA_ERROR'
      | 'UNKNOWN'
    ```
  - [ ] In `src/shared/utils/errorNormalizer.ts`, add to both `ERROR_TYPE_MAP` and `USER_MESSAGES`:
    ```typescript
    // In ERROR_TYPE_MAP:
    ITEM_DATA_ERROR: 'ITEM_DATA_ERROR',

    // In USER_MESSAGES:
    ITEM_DATA_ERROR: 'Item database unavailable. Gear input will use free-text mode.',
    ```
  - [ ] Verify `RETRYABLE_ERROR_TYPES` in errors.ts does NOT include `ITEM_DATA_ERROR` (it should be non-retryable — failure causes graceful fallback, not retry)

- [ ] Task 3: Create Rust models for item database (AC: #1, #5)
  - [ ] Create `src-tauri/src/models/item_data.rs` with structs matching the JSON schema:
    ```rust
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Deserialize, Serialize, Clone)]
    #[serde(rename_all = "camelCase")]
    pub struct AffixTier {
        pub tier: u32,
        pub min_value: f64,
        pub max_value: f64,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    #[serde(rename_all = "camelCase")]
    pub struct RawAffix {
        pub id: String,
        pub name: String,
        #[serde(rename = "type")]
        pub affix_type: String,
        pub item_slots: Vec<String>,
        pub tiers: Vec<AffixTier>,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    #[serde(rename_all = "camelCase")]
    pub struct RawBaseItem {
        pub id: String,
        pub name: String,
        pub base_type: String,
        pub slot: String,
        pub implicit_affix_ids: Vec<String>,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    #[serde(rename_all = "camelCase")]
    pub struct RawUniqueItemAffix {
        pub affix_id: String,
        pub fixed_min_value: f64,
        pub fixed_max_value: f64,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    #[serde(rename_all = "camelCase")]
    pub struct RawUniqueItem {
        pub id: String,
        pub name: String,
        pub base_type: String,
        pub slot: String,
        pub affixes: Vec<RawUniqueItemAffix>,
    }

    #[derive(Debug, Deserialize, Serialize, Clone)]
    #[serde(rename_all = "camelCase")]
    pub struct ItemDatabase {
        pub base_items: Vec<RawBaseItem>,
        pub unique_items: Vec<RawUniqueItem>,
        pub affixes: Vec<RawAffix>,
    }
    ```
  - [ ] Add `pub mod item_data;` to `src-tauri/src/models/mod.rs`

- [ ] Task 4: Create Rust item data service at `src-tauri/src/services/item_data_service.rs` (AC: #1, #3)
  - [ ] Create `src-tauri/src/services/item_data_service.rs` following the `game_data_service.rs` pattern:
    ```rust
    use std::path::{Path, PathBuf};
    use tauri::Manager;
    use crate::models::item_data::ItemDatabase;

    pub fn ensure_item_data_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
        let base = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("ITEM_DATA_ERROR: app_data_dir: {}", e))?;
        let data_dir = base.join("lebo").join("items");
        std::fs::create_dir_all(&data_dir)
            .map_err(|e| format!("ITEM_DATA_ERROR: create items dir: {}", e))?;
        Ok(data_dir)
    }

    pub fn copy_bundled_item_resources(app_handle: &tauri::AppHandle) -> Result<(), String> {
        let data_dir = ensure_item_data_dir(app_handle)?;
        // Guard: only copy if not already present (same pattern as copy_bundled_resources)
        if data_dir.join("base-items.json").exists() {
            return Ok(());
        }
        let resource_dir = app_handle
            .path()
            .resource_dir()
            .map_err(|e| format!("ITEM_DATA_ERROR: resource_dir: {}", e))?;
        let src = resource_dir.join("resources").join("items");
        for filename in &["base-items.json", "uniques.json", "affixes.json"] {
            let src_path = src.join(filename);
            let dst_path = data_dir.join(filename);
            std::fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("ITEM_DATA_ERROR: copy {}: {}", filename, e))?;
        }
        Ok(())
    }

    pub fn load_item_database_from_dir(data_dir: &Path) -> Result<ItemDatabase, String> {
        let base_items_raw = std::fs::read_to_string(data_dir.join("base-items.json"))
            .map_err(|e| format!("ITEM_DATA_ERROR: read base-items.json: {}", e))?;
        let unique_items_raw = std::fs::read_to_string(data_dir.join("uniques.json"))
            .map_err(|e| format!("ITEM_DATA_ERROR: read uniques.json: {}", e))?;
        let affixes_raw = std::fs::read_to_string(data_dir.join("affixes.json"))
            .map_err(|e| format!("ITEM_DATA_ERROR: read affixes.json: {}", e))?;

        let base_items = serde_json::from_str(&base_items_raw)
            .map_err(|e| format!("ITEM_DATA_ERROR: parse base-items.json: {}", e))?;
        let unique_items = serde_json::from_str(&unique_items_raw)
            .map_err(|e| format!("ITEM_DATA_ERROR: parse uniques.json: {}", e))?;
        let affixes = serde_json::from_str(&affixes_raw)
            .map_err(|e| format!("ITEM_DATA_ERROR: parse affixes.json: {}", e))?;

        Ok(ItemDatabase { base_items, unique_items, affixes })
    }
    ```
  - [ ] Add `pub mod item_data_service;` to `src-tauri/src/services/mod.rs`
    - **First check:** Read `src-tauri/src/services/mod.rs` to confirm the file exists and get current contents before editing

- [ ] Task 5: Create Rust `item_commands.rs` and register in `lib.rs` (AC: #1, #5)
  - [ ] Create `src-tauri/src/commands/item_commands.rs`:
    ```rust
    use crate::models::item_data::ItemDatabase;
    use crate::services::item_data_service;

    #[tauri::command]
    pub async fn load_item_database(app_handle: tauri::AppHandle) -> Result<ItemDatabase, String> {
        item_data_service::copy_bundled_item_resources(&app_handle)?;
        let data_dir = item_data_service::ensure_item_data_dir(&app_handle)?;
        item_data_service::load_item_database_from_dir(&data_dir)
    }
    ```
  - [ ] Add `pub mod item_commands;` to `src-tauri/src/commands/mod.rs`
  - [ ] In `src-tauri/src/lib.rs`:
    - Add import: `use commands::item_commands::load_item_database;`
    - Add `load_item_database` to `invoke_handler!` macro

- [ ] Task 6: Extend `useGameDataStore` with `itemDatabase` slice (AC: #1, #3)
  - [ ] In `src/shared/stores/gameDataStore.ts`, add to the `GameDataStore` interface and implementation:
    ```typescript
    // Add to imports at top:
    import type { ItemDatabase } from '../types/itemDatabase'

    // Add to GameDataStore interface:
    itemDatabase: ItemDatabase | null
    setItemDatabase: (db: ItemDatabase | null) => void

    // Add to create() initial state:
    itemDatabase: null,
    setItemDatabase: (db) => set({ itemDatabase: db }),
    ```
  - [ ] **TypeScript strict mode:** `noUnusedLocals: true` — ensure the `ItemDatabase` import is actually used in the interface (it is, via the field type)

- [ ] Task 7: Create `itemDatabaseLoader.ts` and wire to `App.tsx` startup (AC: #1, #3, #6)
  - [ ] Create `src/features/item-database/itemDatabaseLoader.ts`:
    ```typescript
    import { invokeCommand } from '../../shared/utils/invokeCommand'
    import { useGameDataStore } from '../../shared/stores/gameDataStore'
    import type { ItemDatabase } from '../../shared/types/itemDatabase'

    export async function loadItemDatabase(): Promise<void> {
      const db = await invokeCommand<ItemDatabase>('load_item_database')
      useGameDataStore.getState().setItemDatabase(db)
    }
    ```
    Note: If `invokeCommand` throws (ITEM_DATA_ERROR prefix → normalizeAppError), the error propagates to the `.catch(console.error)` in App.tsx — `itemDatabase` stays null, free-text fallback activates for all GearSlot components. No toast — the fallback is silent.
  - [ ] In `src/App.tsx`, add the import and call inside the startup `useEffect`:
    ```typescript
    // Add import:
    import { loadItemDatabase } from './features/item-database/itemDatabaseLoader'

    // In the useEffect(() => { ... }, []) block, alongside other parallel calls:
    loadItemDatabase().catch(console.error)
    ```
    This goes directly after the existing `initializeIconPipeline().catch(console.error)` line. No `await`, no chaining — fully parallel, non-blocking (same pattern as the three existing startup calls).

- [ ] Task 8: Tests (AC: #1, #3, #4, #5)
  - [ ] Create `src/features/item-database/itemDatabaseLoader.test.ts`:
    - Mock `invokeCommand` via `vi.mock('../../shared/utils/invokeCommand', ...)`
    - Test 1: Successful load → `useGameDataStore.getState().itemDatabase` is populated with returned data
    - Test 2: Failed load (invokeCommand throws) → `itemDatabase` remains null (verify store unchanged after error caught upstream)
    - **Do NOT** let tests reach real Tauri IPC (project rule from project-context.md)
  - [ ] No additional test needed for the TypeScript types file (it is type-only; TS compiler enforces it)
  - [ ] **No Rust unit tests in this story** — the data loading follows an identical pattern to `game_data_service.rs` which has no unit tests in the current codebase; integration is validated by the TypeScript side

## Dev Notes

### Data Sourcing (Task 0 Guidance)

The three JSON files do NOT exist yet and must be sourced as part of this story. Community sources to investigate (in priority order):

1. **Musholic/PathOfBuildingForLastEpoch** (GitHub) — has Last Epoch data exports including item bases, uniques, and affixes. May be in Lua or JSON format; transformation to the defined schema may be needed.
2. **tunklab.com or lastepochtools.com** — may expose structured item data; check for public data endpoints or downloadable exports.
3. **Last Epoch game files** — community tools that dump Unity assets may expose item data directly. Not required since this is data-only, but may produce the most accurate data.

**Critical requirement:** The JSON files must use `camelCase` keys to match the `#[serde(rename_all = "camelCase")]` Rust models. For example, `{ "id": "...", "baseType": "Helmet", "itemSlots": [...] }`.

**If a source provides data in a different schema**, write a one-off Node.js or Python transformation script (not included in the app build) to produce the three canonical JSON files. Place the transformation script in `docs/data-transform/` for reproducibility but do not include it in the Tauri bundle.

**Slot key convention:** Use lowercase slug format consistent with the build gear slot keys already in `BuildState.contextData.gear[].slot` (check `src/shared/types/build.ts` to confirm the exact slot key strings used in Phase 1 — the item DB slot values must match these exactly so GearSlot filtering works in Story 5.4).

### TypeScript Type Schema — Design Rationale

| Field | Used By (Story) | Why This Shape |
|-------|-----------------|----------------|
| `AffixEntry.tiers` | 5.3 (AffixTierControl pip count + value display) | Array indexed by tier; `tiers.length` = max tier; `tiers[i].minValue/maxValue` drives monospace value label |
| `AffixEntry.itemSlots` | 5.5 (AffixPicker filters affixes by slot) | Enables slot-scoped affix search in the "+" custom affix picker |
| `BaseItem.implicitAffixIds` | 5.4 (GearSlot pre-populate on item select) | When item selected, these IDs are looked up in `affixes` array to pre-populate AffixTierControl rows at median tier |
| `UniqueItem.affixes[].fixedMinValue/fixedMaxValue` | 5.4 (GearSlot pre-populate at "median tier") | Uniques have fixed ranges, not tier-indexed ranges; median = (min + max) / 2 displayed in value label |
| `AffixEntry.type` | 5.5 (distinguish implicit vs prefix/suffix in UI) | Implicits shown separately from prefix/suffix in GearSlot; "+" adds prefix/suffix only |

### Architecture Decisions Applied

From `_bmad-output/planning-artifacts/architecture.md` — Decision 4: Item Database Architecture:
- **Storage location:** `{app_data}/lebo/items/` (runtime) ← copied from `resources/items/` (bundled) on first launch
- **Load strategy:** Rust reads + deserializes → returns via `AppResult<ItemDatabase>` → TypeScript calls `invokeCommand` → stores in `useGameDataStore.itemDatabase`
- **In-memory after load:** All item search (Story 5.2) happens in TypeScript after load; never IPC round-trip
- **Parallel startup:** `loadItemDatabase()` fires in parallel with `initGameData()`, `loadBuildsOnStartup()`, `initializeIconPipeline()` — no ordering dependency

### What Already Exists (Do NOT Recreate)

| Existing | Location | Notes |
|----------|----------|-------|
| `invokeCommand<T>()` wrapper | `src/shared/utils/invokeCommand.ts` | Always use this; never raw `invoke()` |
| `useGameDataStore` | `src/shared/stores/gameDataStore.ts` | Extend in-place; do NOT create new store |
| `normalizeAppError` | `src/shared/utils/errorNormalizer.ts` | Already handles substring prefix matching; just add entry |
| `game_data_service.rs` copy pattern | `src-tauri/src/services/game_data_service.rs` | Mirror this pattern exactly for item service |
| Error prefix convention | All Rust commands | `"ITEM_DATA_ERROR: ..."` prefix → `ErrorType` map lookup |

### What Does NOT Exist Yet (Must Be Created)

1. `src-tauri/resources/items/` directory + three JSON files (Task 0)
2. `src/shared/types/itemDatabase.ts` (Task 1)
3. `ITEM_DATA_ERROR` in `errors.ts` + `errorNormalizer.ts` (Task 2)
4. `src-tauri/src/models/item_data.rs` (Task 3)
5. `src-tauri/src/services/item_data_service.rs` (Task 4)
6. `src-tauri/src/commands/item_commands.rs` (Task 5)
7. `src/features/item-database/itemDatabaseLoader.ts` (Task 7)

### Brownfield Risk: No `BuildState` Changes Needed

This story does NOT touch `BuildState` or `buildPersistence.ts`. Item database is read-only reference data (separate from build state). No schema migration needed. Epic 6 handles `BuildState` schema v2 migration; story 5-1 has zero overlap.

### Brownfield Risk: `GameDataStore` Extension

Adding `itemDatabase: ItemDatabase | null` to `useGameDataStore` is safe:
- It does not break any existing selector — only new consumers (Stories 5.2+) will read it
- **However:** All existing test files that mock `useGameDataStore` will need to add `itemDatabase: null` to their mock objects to satisfy TypeScript strict mode. Before implementing Task 6, grep for mock usages:
  ```
  grep -r "useGameDataStore" src --include="*.test.*"
  ```
  Add `itemDatabase: null` to any partial mock objects in those test files to prevent `noUnusedLocals` / TypeScript compile errors.

### Startup Wiring: `App.tsx` Exact Placement

Current startup `useEffect` body (simplified):
```typescript
initGameData().catch(console.error)         // line ~44
loadBuildsOnStartup().catch(console.error)  // line ~45
initializeIconPipeline().catch(console.error) // line ~46

// Stub Weaver Tree loader ...               // line ~48-52
// Sequential vault reads (chained .then()) // line ~55-68
```

Add `loadItemDatabase().catch(console.error)` directly after line ~46 (after `initializeIconPipeline`). It MUST be BEFORE the Weaver Tree loader and BEFORE the sequential vault reads. No `await`, no `.then()` chaining — pure fire-and-forget parallel call.

### `commands/mod.rs` and `services/mod.rs` — Check Before Edit

Before editing `src-tauri/src/commands/mod.rs`, read it — the current content is:
```rust
pub mod app_commands;
pub mod build_commands;
pub mod claude_commands;
pub mod game_data_commands;
pub mod icon_commands;
```
Add: `pub mod item_commands;`

For `src-tauri/src/services/mod.rs`, read it first to confirm it exists and contains `pub mod game_data_service;` and `pub mod connectivity_service;` — then add `pub mod item_data_service;`.

### `lib.rs` Import and Handler Registration

Current `lib.rs` imports (from `commands::icon_commands`):
```rust
use commands::icon_commands::{get_icon_cache_path, initialize_icon_pipeline, IconMapCache};
```

Add after this line:
```rust
use commands::item_commands::load_item_database;
```

Add `load_item_database` to the `invoke_handler!` macro list alongside the other commands.

### `tauri.conf.json` Resources Entry

Current `bundle.resources` ends with:
```json
"resources/icons/skill-icon-map.json",
"resources/icons/skills/**/*"
```

Add:
```json
"resources/items/base-items.json",
"resources/items/uniques.json",
"resources/items/affixes.json"
```

### Project Context Rules (from `_bmad-output/project-context.md`)

- **No barrel files:** `itemDatabase.ts` in `src/shared/types/` — no `index.ts` re-export. `itemDatabaseLoader.ts` in `src/features/item-database/` — no `index.ts`.
- **No new top-level Zustand stores:** `itemDatabase` field is added to `useGameDataStore` only.
- **TypeScript strict mode:** `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`. Every import must be used.
- **Named exports only:** All TypeScript exports in this story are named (no `export default`).
- **All IPC calls use `invokeCommand<T>()`:** Never raw `invoke()`.
- **Error prefix convention:** Rust errors prefixed `"ITEM_DATA_ERROR: ..."` → `normalizeAppError` substring match → `ErrorType.ITEM_DATA_ERROR`.
- **Desktop-first Tauri:** Data loading is Rust → TypeScript via IPC, never Node.js.
- **API key never crosses IPC boundary:** Not applicable here (no AI calls in this story).

### Files to Create

| Path | What |
|------|------|
| `src-tauri/resources/items/base-items.json` | Sourced item data — base items array |
| `src-tauri/resources/items/uniques.json` | Sourced item data — unique items array |
| `src-tauri/resources/items/affixes.json` | Sourced item data — affixes array |
| `src/shared/types/itemDatabase.ts` | TypeScript type definitions |
| `src-tauri/src/models/item_data.rs` | Rust model structs |
| `src-tauri/src/services/item_data_service.rs` | Rust service layer |
| `src-tauri/src/commands/item_commands.rs` | Rust Tauri command |
| `src/features/item-database/itemDatabaseLoader.ts` | TypeScript startup loader |
| `src/features/item-database/itemDatabaseLoader.test.ts` | Unit tests for loader |

### Files to Modify

| File | What Changes |
|------|-------------|
| `tauri.conf.json` | Add 3 items resource entries to `bundle.resources` |
| `src-tauri/src/models/mod.rs` | Add `pub mod item_data;` |
| `src-tauri/src/services/mod.rs` | Add `pub mod item_data_service;` |
| `src-tauri/src/commands/mod.rs` | Add `pub mod item_commands;` |
| `src-tauri/src/lib.rs` | Add import + `load_item_database` to invoke_handler |
| `src/shared/types/errors.ts` | Add `'ITEM_DATA_ERROR'` to `ErrorType` union |
| `src/shared/utils/errorNormalizer.ts` | Add `ITEM_DATA_ERROR` to `ERROR_TYPE_MAP` + `USER_MESSAGES` |
| `src/shared/stores/gameDataStore.ts` | Add `itemDatabase` field + `setItemDatabase` action |
| `src/App.tsx` | Add `loadItemDatabase().catch(console.error)` to startup useEffect |
| Existing `*.test.*` mocking `useGameDataStore` | Add `itemDatabase: null` to partial mock objects (see Brownfield Risk section) |

### Do NOT Touch

- `BuildState` (`src/shared/types/build.ts`) — no gear schema changes in this story
- `buildPersistence.ts` — no migration needed for item database (it's reference data, not build state)
- `SkillTreeCanvas`, `pixiRenderer.ts` — no canvas changes
- `StalenessBar.tsx` — item data freshness check and staleness banner extension is Story 5.6, not this story
- Any existing Rust commands — only add new files; do not modify game_data_commands.rs or icon_commands.rs

### Previous Story Intelligence (from Story 4.3)

- Pattern for extending `useGameDataStore` with new fields: add to interface, add to `create()` initial state, add setter → identical to `weaverTreeData`/`weaverGameNodes` fields added in Story 4.2
- Pattern for new Rust command module: create `commands/xxx_commands.rs` → add to `commands/mod.rs` → import in `lib.rs` → register in `invoke_handler!` → identical to `icon_commands.rs` added in Story 2.2
- When adding fields to `GameDataStore`, existing test files that build partial mock objects will fail to compile — scan for these proactively (see Brownfield Risk section)
- Story 4.3 Completion Note: "Updated all 11 test fixtures missing the field" — adding `weaverAllocations` to BuildState required updating 11 test files. Adding `itemDatabase` to `useGameDataStore` mock will likely require similar sweeping. Run `pnpm vitest --run` after Task 6 to surface all affected test files at once.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 5, Story 5.1 ACs]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Decision 4: Item Database Architecture]
- [Source: `_bmad-output/project-context.md` — Technology Stack, Critical Implementation Rules]
- [Source: `lebo/src/shared/stores/gameDataStore.ts` — existing store shape; weaverTreeData/weaverGameNodes pattern to mirror]
- [Source: `lebo/src/shared/types/errors.ts` — current ErrorType union; ICON_ERROR already present as pattern]
- [Source: `lebo/src/shared/utils/errorNormalizer.ts` — current ERROR_TYPE_MAP + USER_MESSAGES shape]
- [Source: `lebo/src-tauri/src/commands/icon_commands.rs` — new Rust command module pattern]
- [Source: `lebo/src-tauri/src/services/game_data_service.rs` — copy_bundled_resources + load pattern]
- [Source: `lebo/src-tauri/src/models/game_data.rs` — serde struct + rename_all = "camelCase" pattern]
- [Source: `lebo/src-tauri/src/lib.rs` — current invoke_handler! registration]
- [Source: `lebo/src-tauri/tauri.conf.json` — current bundle.resources array]
- [Source: `lebo/src/App.tsx:43-46` — parallel startup calls pattern; loadItemDatabase inserts here]
- [Source: `_bmad-output/implementation-artifacts/4-3-weaver-tree-renderer-conditional-on-research-spike-go.md` — GameDataStore extension pattern + "updated 11 test fixtures" warning]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

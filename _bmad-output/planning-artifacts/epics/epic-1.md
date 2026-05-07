# Epic 1 — Project Scaffold & Game Data Pipeline

**Goal:** Stand up the Tauri app skeleton and get Last Epoch game data (classes, masteries, passive trees, skill trees, nodes) fetched from the community API, stored in SQLite, and queryable from the frontend.

**Done when:** A developer can launch the app, see game data loading, and query any node from any mastery tree via the Zustand gameDataStore.

---

## Story 1.1 — Tauri Project Scaffold

**As a** developer  
**I want** a properly configured Tauri 2.x project with React + TypeScript + Vite + Tailwind  
**So that** all subsequent development has a working foundation

**Acceptance Criteria:**
- [ ] `pnpm tauri dev` starts the app with a React frontend in a Tauri window
- [ ] TypeScript compiles without errors
- [ ] Tailwind CSS classes apply correctly
- [ ] Tauri IPC is accessible from the frontend (`@tauri-apps/api` installed)
- [ ] Project structure matches the architecture doc's directory layout
- [ ] `pnpm tauri build` produces a distributable binary

**Technical Notes:**
- Use Tauri 2.x (`pnpm create tauri-app`)
- Frontend framework: React + TypeScript
- Bundler: Vite 5
- Add `tailwindcss`, `postcss`, `autoprefixer`
- Add `zustand`, `pixi.js`, `@pixi/react` (or manual mount), `react-router-dom`

---

## Story 1.2 — SQLite Schema & Migration System

**As a** developer  
**I want** a SQLite database initialized with the full game data schema  
**So that** game data and builds can be stored and queried locally

**Acceptance Criteria:**
- [ ] SQLite DB created at app data directory on first launch
- [ ] All tables from architecture doc created: `classes`, `masteries`, `passive_nodes`, `passive_edges`, `skill_nodes`, `skill_edges`, `skills`, `data_meta`, `builds`
- [ ] Schema migrations run idempotently on app start
- [ ] Tauri IPC command `get_db_status` returns schema version

**Technical Notes:**
- Use `tauri-plugin-sql` with SQLite
- Migration files in `src-tauri/migrations/`
- `data_meta` table stores `schema_version`, `last_fetched`, `game_version`

---

## Story 1.3 — Game Data Fetch & Versioned Cache

**As a** user  
**I want** the app to check for updated game data on launch and download it when newer data is available  
**So that** my build analysis always uses current passive tree and skill data without manual setup

**Acceptance Criteria:**
- [ ] On launch, bundled resources are copied to the app data directory if no local manifest exists (first-launch bootstrap)
- [ ] App performs a non-blocking background version check: compares `game_version` in local `manifest.json` against the remote manifest
- [ ] If remote `game_version` differs: `DataStalenessBar` shows "{N} version(s) behind. Suggestions may be inaccurate." with an "Update Now" button
- [ ] User can click "Update Now" to trigger a download; button shows "Downloading…" and is disabled during download
- [ ] All class JSON files are downloaded and validated before `manifest.json` is written; a failed download leaves existing data intact
- [ ] On download success: staleness bar dismisses; store reflects updated `game_version`
- [ ] On download failure: staleness bar shows "Update failed: {message}" with a "Retry" button and a "Continue with current data" dismiss
- [ ] Network requests time out after 30 seconds
- [ ] If the background version check fails (network unavailable): failure is silently swallowed; app loads normally on local data with no error shown
- [ ] All classes listed in `manifest.json` are stored as flat JSON files under `app_data_dir/lebo/game-data/classes/`
- [ ] `http:default` capability restricts allowed outbound URLs to `https://raw.githubusercontent.com/alec-vautherot/**`

**Technical Notes:**
- Data source: `https://raw.githubusercontent.com/alec-vautherot/lebo-data/main` — a curated GitHub raw file repo with `manifest.json` + `classes/{id}.json`
- HTTP client: `tauri-plugin-http` (`reqwest`) built with `timeout(30s)`; single client instance reused across all requests in a download batch
- Schema validation: `serde_json::from_str::<RawClassData>` before writing each class file; rejects malformed data without touching disk
- Partial-write safety: class files written before `manifest.json`; a mid-download failure leaves the old manifest intact
- IPC commands: `initialize_game_data`, `check_data_version`, `download_game_data_update`, `get_manifest`, `load_game_data`
- Download is blocked while optimization is running (`isOptimizing` guard in `DataStalenessBar`)

---

## Story 1.4 — Game Data Store (Frontend)

**As a** developer  
**I want** a Zustand `gameDataStore` that loads all game data from SQLite into memory  
**So that** React components can access class/mastery/node data reactively

**Acceptance Criteria:**
- [ ] `gameDataStore` fetches all classes, masteries, passive trees, skills, and skill trees from SQLite via IPC on app launch
- [ ] Store exposes: `classes[]`, `getMastery(id)`, `getPassiveTree(masteryId)`, `getSkill(id)`, `getSkillTree(skillId)`, `isLoaded`
- [ ] If data is not yet fetched: store returns `isLoaded: false` — UI shows loading state
- [ ] TypeScript types defined for all game data entities (`Class`, `Mastery`, `PassiveTree`, `Node`, `Edge`, `Skill`)

**Technical Notes:**
- Types in `src/lib/types.ts`
- IPC calls in `src/lib/tauri.ts`
- Store in `src/stores/gameDataStore.ts`
- All node `effects` and `tags` parsed from JSON strings to typed arrays on load

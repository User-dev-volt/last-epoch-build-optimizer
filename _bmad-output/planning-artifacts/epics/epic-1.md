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

## Story 1.3 — Community Game Data Fetch & Cache

**As a** user  
**I want** the app to automatically fetch Last Epoch game data on first launch  
**So that** all class/mastery/skill tree data is available without manual setup

**Acceptance Criteria:**
- [ ] On launch, app checks `data_meta.last_fetched`
- [ ] If absent or > 7 days old: fetch from community API
- [ ] All 5 classes, 15 masteries, passive trees, skills, and skill trees stored in SQLite
- [ ] If fetch fails: show error with retry button; do not crash
- [ ] Loading progress shown in UI (e.g., "Loading game data... 3/15 masteries")
- [ ] `data_meta.last_fetched` updated on successful fetch
- [ ] Subsequent launches use cached data (no re-fetch if fresh)

**Technical Notes:**
- Rust `reqwest` HTTP client for data fetch
- Schema-validate all API responses before DB insertion (reject malformed data)
- Tauri command: `fetch_game_data(force: bool)` — `force=false` respects cache
- Emit progress events to frontend: `game-data-progress` with `{ current, total, step }`
- Community data source: lastepochtools.com API or agreed-upon community dataset
- Store raw JSON in a fallback static file for offline use

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

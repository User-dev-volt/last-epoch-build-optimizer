# LastEpochBuildOptimizer — Snapshot

> All state for this project lives here. Game_Save only holds a pointer to this file.
> Update this on every Wrap Up and Quick Save.

---

## Status

**Phase:** `Building`
**Health:** `On Track`
**Last Touched:** `2026-04-30`

---

## Current Focus

```
Epic 4 — AI Optimization Engine. Claude API integration, prompt builder, streaming suggestions.
```

---

## Next Action

```
Start Epic 4. Read _bmad-output/planning-artifacts/epics/epic-4.md, then implement:
- Story 4.1: API key storage (Tauri secure store or SQLite)
- Story 4.2: Prompt builder — serialize build + tree context for Claude
The optimization Rust command stub is already in src-tauri/src/commands/optimization.rs
and the optimizationStore is wired for streaming.
```

---

## Mental RAM

- Epics 1–3 complete. App runs: class select → mastery select → build screen with live Pixi.js tree
- Pixi.js StrictMode fix: `initDone` flag prevents `destroy()` before `app.init()` resolves
- Scoring wired in App.tsx useEffect watching `passiveAllocations` + `masteryId`
- Save/Load modals done; Rust `save_build` accepts optional `id` for upsert
- URL import stub in LoadModal → calls `import_build_from_url` (returns stub error — real impl in Epic 4)
- Game data: 375 passive nodes across 15 masteries, embedded via `include_str!` in game_data.rs
- If blank screen: delete `%APPDATA%\com.md_ki.lebo\lebo.db` to force re-seed
- Cargo target dir (Windows App Control workaround): `C:/Users/MD_Ki/cargo-targets/lebo`

---

## Open Loops

- [ ] Epic 4: Claude API key storage + prompt builder + streaming
- [ ] Epic 4: SuggestionsPanel UI wired to real optimization data
- [ ] Epic 5: Polish, error states, keyboard shortcuts, onboarding
- [ ] Story 3.4: URL import from lastepochtools.com (stubbed, needs real Rust impl)
- [ ] Skill tree tab switcher shows placeholder — skill tree data not yet in game-data.json

---

## Decision Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-04-15 | Tauri 2 over Electron | 10x lower memory, native Rust backend |
| 2026-04-15 | include_str! for game data | Avoids runtime path issues in dev vs prod |
| 2026-04-15 | initDone flag for Pixi cleanup | StrictMode fires cleanup before async init resolves |
| 2026-04-15 | Scoring wired in App.tsx | Cleanest place to subscribe to both buildStore + gameDataStore |

---

## Session History

| Date | What I Did | Where I Left Off |
|------|------------|------------------|
| 2026-04-15 | Epics 1–3: DB, game data seeding, Pixi.js tree, scoring engine, Save/Load modals | Start Epic 4 — AI optimization |

---

## Project Links

- **App source:** `D:\Obsidian Brain\Brain\10_Active_Projects\LastEpochBuildOptimizer\lebo\`
- **Cargo target:** `C:/Users/MD_Ki/cargo-targets/lebo`
- **BMAD artifacts:** `_bmad-output/planning-artifacts/`
- **Epics:** `_bmad-output/planning-artifacts/epics/epic-{1..5}.md`
- **Architecture:** `_bmad-output/planning-artifacts/architecture.md`

---

## Completion Criteria

- [ ] All 5 epics complete
- [ ] Claude API suggestions working end-to-end
- [ ] Save/Load/Import fully functional
- [ ] Scores update in real-time across all masteries
- [ ] App builds and runs as standalone .exe

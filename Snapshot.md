# LastEpochBuildOptimizer — Snapshot

> All state for this project lives here. Game_Save only holds a pointer to this file.
> Update this on every Wrap Up and Quick Save.

---

## Status

**Phase:** `Polish / Epic 5`
**Health:** `On Track`
**Last Touched:** `2026-05-14`

---

## Current Focus

```
Epic 5 — Polish, UX, error states. Epic 4 (AI Optimization Engine) is fully working
with both Claude and OpenRouter. Fixing UX friction and edge cases surfaced during testing.
```

---

## Next Action
Move Story 4-3 through code review and merge pipeline; Story is ready for review with clean build, all 641 passing tests, and complete test coverage for weaver allocation logic.

---

## Mental RAM

- **Epics 1–4 complete.** Full flow works: class → mastery → build tree → AI optimize → apply suggestions
- Claude API + OpenRouter both working end-to-end with streaming suggestions
- Stronghold vault (Argon2id): all vault ops MUST use `tokio::task::spawn_blocking` or they block the Tauri async runtime and cause 1-2 min UI freezes. Argon2id hash is cached via `OnceLock` — only runs once per process.
- OpenRouter free models rotate constantly — treat 400/402/404 as skip-to-next, not fatal. Model list verified 2026-05-05 (see Decision Log).
- Settings view kept always-mounted (display:none) so in-flight API key saves survive navigation away and back
- Prerequisite lock fix: build context sent to AI now includes `lockedFromRemoval: bool` per node so AI can't suggest removing prerequisite nodes
- PixiJS renderer: node labels (`currentPts/maxPts`) drawn with `Text` below each node. Preview coloring: red = points removed, green = points added (via `previewRemoved`/`previewAdded` sets in `HighlightedNodes`)
- Cargo target dir (Windows App Control workaround): `C:/Users/MD_Ki/cargo-targets/lebo`
- If blank screen: delete `%APPDATA%\com.md_ki.lebo\lebo.db` to force re-seed

---

## Open Loops

- [ ] Story 3.4: URL import from lastepochtools.com (stubbed, needs real Rust impl)
- [ ] Skill tree tab switcher shows placeholder — skill tree data not yet in game-data.json
- [ ] Epic 5: General polish pass — onboarding, empty states
- [ ] OpenRouter model list will drift — re-verify against `https://openrouter.ai/api/v1/models` periodically

---

## Decision Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-04-15 | Tauri 2 over Electron | 10x lower memory, native Rust backend |
| 2026-04-15 | include_str! for game data | Avoids runtime path issues in dev vs prod |
| 2026-04-15 | initDone flag for Pixi cleanup | StrictMode fires cleanup before async init resolves |
| 2026-04-15 | Scoring wired in App.tsx | Cleanest place to subscribe to both buildStore + gameDataStore |
| 2026-05-04 | Stronghold vault ops → spawn_blocking | Argon2id KDF on async thread starves Tokio runtime; caused 1-2 min UI freezes |
| 2026-05-04 | OnceLock for Argon2id hash | Hash is deterministic; no reason to recompute each vault open |
| 2026-05-04 | Settings always-mounted (display:none) | Unmounting loses in-flight save state; CSS hide preserves component lifecycle |
| 2026-05-04 | Provider cards replace tab switcher | Separate "save key" from "activate provider" — both keys can be stored independently |
| 2026-05-05 | 400/402/404 all skip-to-next in OpenRouter | Provider-side limits/missing models should not kill the whole optimization run |
| 2026-05-05 | lockedFromRemoval in AI prompt context | AI was suggesting removing prerequisite nodes; guard exists on apply but suggestion was confusing |

---

## Session History

| Date | What I Did | Where I Left Off |
|------|------------|------------------|
| 2026-04-15 | Epics 1–3: DB, game data seeding, Pixi.js tree, scoring engine, Save/Load modals | Start Epic 4 — AI optimization |
| 2026-05-04 | Epic 4 complete: Claude + OpenRouter streaming, vault perf fix, UX polish (labels, preview colors, settings persistence, provider cards) | Epic 5 polish |
| 2026-05-05 | OpenRouter error handling: 400/402/404 skip-to-next, model list updated from live API, Test Connection button | Continue Epic 5 |

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

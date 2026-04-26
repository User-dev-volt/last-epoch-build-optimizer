# Project Context — Last Epoch Build Optimizer (LEBO)
## Auto-generated from Architecture + PRD

**Date:** 2026-04-14  
**For:** Developers, AI agents, and future sessions

---

## What This Project Is

A Tauri desktop app (Rust + React/TypeScript) that gives Last Epoch hardcore players an AI-powered skill tree optimizer. Users create builds from scratch or import existing ones, get scored across Damage/Survivability/Speed, and receive AI suggestions (via Claude API) for specific skill tree node changes with before/after impact deltas.

---

## Tech Stack (Quick Reference)

- **App shell:** Tauri 2.x (Rust backend + WebView2 frontend)
- **Frontend:** React 18 + TypeScript 5 + Zustand + Tailwind CSS
- **Graph:** Pixi.js 8 (WebGL canvas — not SVG/DOM)
- **Storage:** SQLite via tauri-plugin-sql
- **AI:** Claude claude-sonnet-4-6 via Anthropic API (streaming, structured output)
- **Build tool:** Vite 5

---

## Key Architectural Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Desktop framework | Tauri (not Electron) | 10x lower memory, faster, smaller binary |
| Graph renderer | Pixi.js (not D3/SVG) | 100+ nodes at 60fps requires WebGL |
| Scores | Deterministic engine (not AI) | Consistent, real-time, no API cost per click |
| AI role | Suggestions + explanations only | Scoring is pre-computed; AI provides reasoning |
| Data storage | SQLite local | No backend needed; fast; ACID |
| API key | OS keychain (not config file) | Security; never plaintext |

---

## Project Structure

```
lebo/
├── src/                    # React app
│   ├── components/         # UI components (screens/, graph/, panels/, ui/)
│   ├── stores/             # Zustand stores (build, score, optimization, gameData, ui)
│   ├── engine/             # Scoring engine, validation, graph utils
│   └── lib/                # Tauri IPC wrappers, shared types
└── src-tauri/              # Rust backend
    └── src/
        ├── commands/       # Tauri IPC handlers
        ├── db/             # SQLite schema + queries
        └── claude/         # Claude API client + prompt builder
```

---

## Data Flow

```
Community API → Rust fetch → SQLite cache → TS game data store → React UI
User clicks node → buildStore.allocateNode() → scoreStore.recalculate() → UI update
User clicks Optimize → IPC: optimize_build → Rust → Claude API (streaming) 
  → Tauri events → optimizationStore → suggestions rendered on graph
```

---

## State Stores (Zustand)

| Store | Owns |
|-------|------|
| `buildStore` | Current class/mastery, node allocations, skill slots, save/load |
| `scoreStore` | Current scores (damage/survivability/speed), recalculates on build change |
| `optimizationStore` | AI suggestions, goal selector, loading/error state |
| `gameDataStore` | All game data (classes, trees, nodes, skills) from SQLite |
| `uiStore` | Graph zoom, selected node/suggestion, panel collapse state |

---

## AI Prompt Strategy

- System prompt: static, always cached
- Game data context block: cached with `cache_control: ephemeral` (reused in session)
- Build state: dynamic, not cached
- Response: structured JSON (`OptimizationResponse` schema)
- Streaming: Claude chunks emitted via Tauri `window.emit()` → frontend listens

---

## Scoring Engine

Pure TypeScript, no API calls. Runs on every node allocation change (<16ms target).
- Accumulates weighted `NodeEffect` values by stat type
- Normalizes 0–100 against mastery's theoretical max
- Tags: `increased_damage`, `flat_damage`, `multiplier`, `penetration`, `increased_health`, `damage_reduction`, `dodge`, `movement_speed`, `attack_speed`, etc.

---

## Critical Paths to Implement First

1. **Game data pipeline** — SQLite schema → fetch from community API → cache → serve to frontend (blocks everything else)
2. **Skill tree graph render** — Pixi.js canvas mounting → node/edge rendering → interaction (most complex UI piece)
3. **Scoring engine** — Pure TS, no dependencies — can be built in isolation with test data
4. **Build store + node allocation logic** — Reachability validation, point budget enforcement
5. **Claude API integration** — Prompt construction → streaming → response parsing → validation
6. **Full UX assembly** — Wire all panels together, import/save/load, error states

---

## Constraints to Never Violate

- Scores MUST be deterministic — same build = same score every time
- Node allocation MUST validate connectivity (cannot allocate disconnected nodes)
- API key MUST go through OS keychain — never write to disk as plaintext
- Graph MUST use Pixi.js canvas — do NOT fall back to SVG for the main tree
- All community API responses MUST be schema-validated before DB insertion

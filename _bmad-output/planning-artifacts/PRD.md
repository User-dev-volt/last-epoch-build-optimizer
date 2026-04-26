# Product Requirements Document
## Last Epoch Build Optimizer (LEBO)

**Version:** 1.0  
**Date:** 2026-04-14  
**Status:** Draft — Pending Architecture  
**Track:** BMad Method | Modules: BMM + GDS

---

## 1. Executive Summary

The Last Epoch Build Optimizer (LEBO) is a desktop application for hardcore Last Epoch players that combines a full-fidelity interactive skill tree visualizer with an AI-powered optimization engine. Unlike static build planners, LEBO analyzes a player's specific build state, scores it across damage/survivability/speed, and generates targeted skill tree node recommendations with before/after impact scoring and natural-language explanations of every suggestion.

---

## 2. Problem Statement

Hardcore Last Epoch players currently have no tool that bridges the gap between static build planning (what nodes exist) and active optimization (which nodes *I specifically* should change and why). Existing tools:

- **lastepochtools.com** — Build planner and database, but static. No AI. No suggestions. No scoring.
- **Maxroll guides** — Static tier-list build guides. Fixed builds, not personalized.
- **Path of Building equivalent** — Doesn't exist for Last Epoch at the quality level players want.

The result: min-maxers spend hours cross-referencing wikis, community discords, and spreadsheets to optimize manually. LEBO eliminates this loop.

---

## 3. Goals & Success Metrics

### Product Goals
1. Become the go-to desktop tool for Last Epoch build optimization
2. Deliver genuinely useful AI suggestions that reflect real game mechanics
3. Provide the best skill tree visualization available for Last Epoch outside the game itself

### Success Metrics (MVP)
| Metric | Target |
|--------|--------|
| AI suggestion accuracy | Suggestions are mechanically valid (no invalid node paths) 100% of the time |
| Skill tree load time | < 500ms per class/mastery tree |
| User can go from launch → first suggestion | < 3 minutes |
| Scoring system shows delta on all suggestions | 100% coverage |

---

## 4. Target Users

### Primary Persona: The Min-Maxer
- **Who:** Dedicated Last Epoch player, 200+ hours, currently in endgame content (Empowered Monolith, Arena)
- **Goal:** Squeeze every % of performance out of their build — damage, clear speed, or boss survivability
- **Pain:** Spends 30–60 min per optimization session manually reading patch notes, wikis, and other players' guides
- **Expectation:** Technical depth — they want damage formula reasoning, not hand-wavy advice

### Secondary Persona: The Theory-Crafter
- **Who:** Plays multiple classes, wants to explore novel builds rather than copy meta
- **Goal:** Spin up a new build concept from scratch, validate it with AI, then iterate
- **Pain:** No tooling to test a build concept before investing hours leveling it in-game
- **Expectation:** Freedom to configure any node combination and get honest scoring

---

## 5. Scope

### In Scope (MVP)
- All 5 classes: Sentinel, Mage, Primalist, Acolyte, Rogue
- All 15 masteries (3 per class)
- Full passive tree visualization per class/mastery
- Skill-level skill trees for all active skills
- Build input: create from scratch OR import via community build code/link
- AI optimization engine (Claude API) for skill tree nodes
- Optimization goal selector: Damage / Survivability / Speed / Balanced
- Before/after numeric scoring across all 3 dimensions
- Per-suggestion explanation panel (why this change, what it improves)
- Context panel: active skills, gear slots, idol slots (display only, not AI-optimized)
- Local save/load of builds

### Out of Scope (MVP)
- Gear/item optimization AI
- Idol optimization AI  
- Build sharing / public URLs
- Local game file parsing
- Multiplayer/social features
- Web version
- Monetization

---

## 6. Feature Requirements

### F1 — Class & Mastery Selector
- **FR1.1:** Display all 5 base classes on app launch
- **FR1.2:** Selecting a class reveals its 3 masteries
- **FR1.3:** Selecting a mastery loads the passive tree + lists available active skills
- **FR1.4:** User can change mastery at any time (clears current build with confirmation)

### F2 — Skill Tree Visualizer
- **FR2.1:** Render passive tree as an interactive node graph (zoom, pan, click nodes)
- **FR2.2:** Nodes display: name, description, point cost, connections to adjacent nodes
- **FR2.3:** Allocated nodes are visually distinct from available and locked nodes
- **FR2.4:** Node path validation — cannot allocate disconnected nodes
- **FR2.5:** Point budget tracked and displayed (remaining points visible)
- **FR2.6:** Skill-specific trees accessible per active skill slot
- **FR2.7:** AI-suggested nodes highlighted with an overlay (distinct color/glow)
- **FR2.8:** Clicking a suggested node shows its explanation in the detail panel

### F3 — Build Input
- **FR3.1:** "New Build" mode — starts with empty tree, user allocates nodes manually
- **FR3.2:** "Import Build" — accepts lastepochtools.com build URLs or build codes
- **FR3.3:** Imported builds populate the node graph with the imported allocation
- **FR3.4:** Local save: save named build snapshots to disk
- **FR3.5:** Local load: browse and load previously saved builds

### F4 — AI Optimization Engine
- **FR4.1:** "Optimize" button triggers AI analysis of current skill tree state
- **FR4.2:** User selects optimization goal before running (Damage / Survivability / Speed / Balanced)
- **FR4.3:** AI receives: current node allocations, unallocated nodes, point budget, active skills, goal
- **FR4.4:** AI returns: list of suggested node changes (add/remove/swap), each with before/after score delta
- **FR4.5:** Suggestions are ranked by impact (highest delta first)
- **FR4.6:** User can apply individual suggestions or "Apply All"
- **FR4.7:** AI model: Claude (Anthropic API) with structured output
- **FR4.8:** Optimization runs in < 10 seconds (streaming response preferred)

### F5 — Scoring System
- **FR5.1:** Build scored across 3 dimensions: Damage, Survivability, Speed (0–100 scale each)
- **FR5.2:** Scores displayed as numeric values + visual bars on the main UI
- **FR5.3:** Each AI suggestion shows Δ score for each dimension
- **FR5.4:** Score recalculates when user manually changes node allocations
- **FR5.5:** Scoring model is deterministic given the same node allocations (not AI-generated per request — computed from a scoring engine)

### F6 — Suggestion Detail Panel
- **FR6.1:** Clicking any suggestion opens a detail panel
- **FR6.2:** Panel shows: node name, current state, proposed state, score delta breakdown, AI explanation text
- **FR6.3:** Explanation text is technical — references damage types, mechanics, synergies (appropriate for min-maxers)
- **FR6.4:** "Apply This Change" button in panel

### F7 — Context Panel (display only)
- **FR7.1:** Side panel shows active skill slots (what skills are equipped)
- **FR7.2:** Shows gear slots (weapon, armor, etc.) — empty in MVP, user can label them for context
- **FR7.3:** Shows idol grid — display only
- **FR7.4:** AI is aware of active skills when generating skill tree suggestions (skills influence passive synergies)

---

## 7. Non-Functional Requirements

### Performance
- **NFR1:** App launch to usable state: < 3 seconds
- **NFR2:** Skill tree render: < 500ms after class/mastery selection
- **NFR3:** Node click interaction: < 50ms response
- **NFR4:** AI optimization response: < 10 seconds (streaming preferred)

### Reliability
- **NFR5:** App must not crash on invalid build imports — show error state gracefully
- **NFR6:** AI API failures must surface a retry option, not a crash

### Data
- **NFR7:** Game data (trees, nodes, skills) fetched from community source on first launch and cached locally
- **NFR8:** Cache invalidation: check for updates on launch (weekly refresh or on-demand)

### UX
- **NFR9:** All primary workflows accessible with keyboard shortcuts
- **NFR10:** Skill tree graph must support mouse wheel zoom and click-drag pan
- **NFR11:** App must be usable at 1080p and above

---

## 8. Technical Constraints

- **Desktop only:** Electron or Tauri (architecture phase decides; Tauri preferred for performance)
- **AI:** Claude API (Anthropic) — structured output mode for scoring + suggestions
- **Data:** Community Last Epoch database (lastepochtools.com or equivalent) — no local game file dependency
- **Graph rendering:** Must handle trees with 100+ nodes at smooth framerates
- **No backend server required in MVP** — desktop app calls Claude API directly (API key managed locally)

---

## 9. Data Model (High-Level)

```
Class
  └─ Mastery[]
       └─ PassiveTree
            └─ Node[]
                 ├─ id, name, description
                 ├─ x, y (position in graph)
                 ├─ connections: Node[]
                 ├─ maxPoints: number
                 └─ tags: string[] (damage types, etc.)

Skill
  └─ SkillTree
       └─ Node[] (same structure as PassiveTree nodes)

Build
  ├─ classId, masteryId
  ├─ passiveAllocations: Map<nodeId, pointsAllocated>
  ├─ skillAllocations: Map<skillId, Map<nodeId, pointsAllocated>>
  ├─ equippedSkills: skillId[]
  └─ name, savedAt

OptimizationResult
  ├─ goal: 'damage' | 'survivability' | 'speed' | 'balanced'
  ├─ baseScores: { damage, survivability, speed }
  ├─ suggestions: Suggestion[]

Suggestion
  ├─ type: 'add' | 'remove' | 'swap'
  ├─ nodeId (target)
  ├─ scoreDelta: { damage, survivability, speed }
  ├─ explanation: string
  └─ rank: number
```

---

## 10. UI Flow

```
Launch
  └─ Class Selector Screen
       └─ [Select Class] → Mastery Selector
            └─ [Select Mastery] → Main Build Screen
                 ├─ Skill Tree Graph (center, hero)
                 ├─ Build Scores Panel (top or sidebar)
                 ├─ Optimization Controls (goal selector + Optimize button)
                 ├─ Suggestions List Panel (right sidebar)
                 │    └─ [Click suggestion] → Detail Panel
                 └─ Context Panel (skills, gear, idols — bottom or left)
```

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Community data API is unreliable or rate-limited | Medium | High | Cache aggressively; ship with a fallback static dataset |
| AI scoring inconsistency (same build = different scores across runs) | Medium | High | Scoring engine is deterministic; AI only generates suggestion explanations |
| Skill tree graph rendering is too slow for 100+ node trees | Medium | High | Use a canvas/WebGL renderer (Pixi.js, Konva, or D3 with canvas) |
| Claude API cost at scale | Low (MVP) | Medium | Batch suggestions per request; cache results per build hash |
| Last Epoch patches change skill trees | High (ongoing) | Medium | Community data refresh pipeline; version-tag cached data |

---

## 12. Milestones

| Milestone | Deliverable |
|-----------|-------------|
| M1 — Data Pipeline | Game data fetched, parsed, stored locally for all classes |
| M2 — Tree Visualizer | Passive tree renders interactively for all masteries |
| M3 — Build I/O | Create, save, load, import builds |
| M4 — Scoring Engine | Deterministic scoring for damage/survivability/speed |
| M5 — AI Integration | Claude API connected, suggestions returned with scoring |
| M6 — Polish & UX | Visual design, keyboard shortcuts, edge cases, error states |

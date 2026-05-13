# Epic 3 — Scoring Engine & Build I/O

**Goal:** Implement the deterministic scoring engine that rates builds 0–100 per dimension, and build the full save/load/import system for builds.

**Done when:** Users can save/load named builds locally, import from lastepochtools.com URLs, and see accurate real-time scores that update as they click nodes.

---

## Story 3.1 — Deterministic Scoring Engine

**As a** user  
**I want** my build scored across Damage, Survivability, and Speed dimensions in real-time, accounting for how my equipped skills actually use those stats  
**So that** I can see the true impact of my passive node choices on my specific playstyle

**Acceptance Criteria:**

**Scoring formula**
- [ ] Three score dimensions: Damage (0–100), Survivability (0–100), Speed (0–100)
- [ ] `Score = clamp((playerTotal / masteryMax) × 100, 0, 100)` per dimension
- [ ] `playerTotal` = sum of `(effect.magnitude × typeWeight × allocatedRanks / maxRanks)` for all effects on all allocated nodes whose resolved dimension matches the target
- [ ] Effect type weights: `more_*` = 3×, `increased_*` = 2×, all flat/additive effects = 1×
- [ ] Multi-rank nodes contribute proportionally: a 2/3-rank node contributes ⅔ of its max potential
- [ ] Tags not in any dimension list contribute to an internal `utility` accumulator (not shown in UI; reserved for future use)
- [ ] If `masteryMax` for a dimension is 0 (no nodes exist for it in the mastery), that dimension's score is 0 — no division occurs

**Context-aware tag reclassification**
- [ ] Before scoring, the engine runs a context remap using equipped skills from the context panel
- [ ] If the build's equipped skills are majority spells (skill type = `spell`), `cast_speed` is reclassified from Speed → also contributes to Damage at full weight
- [ ] If the build's equipped skills are majority weapon attacks (skill type = `melee` or `ranged`), `attack_speed` is reclassified from Speed → also contributes to Damage at full weight
- [ ] Reclassified tags contribute to *both* their original dimension and the reclassified one (not moved, duplicated)
- [ ] "Majority" = more than half of the equipped skill slots contain that skill type; ties default to no reclassification
- [ ] Context remap re-runs whenever equipped skills change in the context panel

**`masteryMax` (denominator)**
- [ ] `masteryMax` per dimension is computed once per mastery at game data load time
- [ ] Algorithm: greedy allocation of a simulated 100-point budget — sort all mastery nodes descending by per-point contribution to this dimension, allocate points greedily until 100 points are spent (respecting each node's `maxRanks`); `masteryMax` = sum of contributions from that simulated allocation
- [ ] `masteryMax` values are cached in `gameDataStore` and reused across score recalculations

**Performance & correctness**
- [ ] Time from `buildStore` state commit to `scoreStore` state commit ≤ 16ms, measured in a unit test using `performance.now()` with a full-size mastery fixture (100+ nodes)
- [ ] Given identical node allocations and identical equipped skills, the engine always produces identical scores (no randomness, no set-iteration nondeterminism — use sorted arrays, not Sets, when iterating effects)
- [ ] `scoreStore` exposes: `{ damage: number, survivability: number, speed: number, utility: number, lastUpdatedAt: number }`

**Subscription & lifecycle**
- [ ] `scoreStore` subscribes to `buildStore` via `zustand.subscribe()` — subscription is initialized once in `src/engine/scoring.ts` module scope via an exported `initScoringEngine()` function
- [ ] `initScoringEngine()` returns an `unsubscribe` handle; `App.tsx` stores it and calls it on unmount
- [ ] `scoreStore` also subscribes to changes in equipped skills (context panel) to trigger reclassification re-runs

**Testing**
- [ ] Unit tests in `src/engine/scoring.test.ts` cover: basic per-dimension score, multi-rank partial allocation, context remap (spell majority, attack majority, tie/no-remap), zero-dimension mastery (no crash), unknown tag → utility bucket, `masteryMax` greedy algorithm produces correct denominator for a known fixture

**Technical Notes:**

Scoring logic in `src/engine/scoring.ts`:

```typescript
// Base dimension tag lists (before context remap)
const DAMAGE_TAGS = ['increased_damage', 'flat_damage', 'more_damage', 'critical_strike_chance', 'critical_strike_multiplier', 'penetration', 'damage_over_time'];
const SURVIVABILITY_TAGS = ['increased_health', 'flat_health', 'armor', 'damage_reduction', 'dodge_rating', 'block_chance', 'resist', 'leech'];
const SPEED_TAGS = ['movement_speed', 'attack_speed', 'cast_speed', 'cooldown_recovery'];

// Effect type weights
const TYPE_WEIGHTS: Record<string, number> = {
  more: 3,
  increased: 2,
  flat: 1,         // default for any unrecognized prefix
};

// Resolve weight from effect tag prefix: 'more_damage' → 3, 'increased_health' → 2, etc.
function resolveWeight(tag: string): number { ... }

// Context remap: returns a map of extra dimension contributions per tag
function buildContextRemap(equippedSkills: EquippedSkill[]): Map<string, Dimension[]> { ... }

// masteryMax greedy simulation (run once at load, stored in gameDataStore)
function computeMasteryMax(nodes: PassiveNode[], pointBudget: number): DimensionScores { ... }

// Main scoring entry point
function scoreAllocation(
  allocations: NodeAllocations,
  masteryMax: DimensionScores,
  contextRemap: Map<string, Dimension[]>
): ScoredDimensions { ... }
```

- `NodeEffect` must have a `magnitude: number` field — verify this exists in `shared/types/gameData.ts` before implementing; if absent, add it there as part of this story
- `scoreStore` shape: `{ damage, survivability, speed, utility, lastUpdatedAt }` — all numbers
- `initScoringEngine()` wires up both subscriptions (buildStore allocations + equipped skills) and returns a cleanup handle
- Dev-mode logging: unknown tags emit `console.warn('[scoring] unknown tag: ${tag}')` — stripped in prod builds via `import.meta.env.DEV` guard

---

## Story 3.2 — Build Scores Panel UI

**As a** user  
**I want** to see my build scores displayed clearly in the left panel  
**So that** I can monitor how my choices affect my build's performance

**Acceptance Criteria:**
- [ ] Left panel shows 3 score bars (Damage red, Survivability blue, Speed teal)
- [ ] Each bar shows dimension label, filled bar, and numeric score
- [ ] Point budget shown: "47 / 100 points used" + "53 remaining"
- [ ] Mastery name shown at top of panel
- [ ] All values update in real-time as user allocates/deallocates nodes
- [ ] Panel is collapsible (chevron toggle) — graph expands when collapsed
- [ ] Score bars animate smoothly when values change (CSS transition)

**Technical Notes:**
- `BuildScoresPanel.tsx` subscribes to `scoreStore` and `buildStore`
- Bar fill: `width: ${score}%` as inline style
- Colors: `#E85050` damage, `#50A0E8` survivability, `#50E8A0` speed
- Monospace font for score numbers
- Panel width: 200px fixed; collapsible

---

## Story 3.3 — Local Build Save & Load

**As a** user  
**I want** to save my builds locally and load them later  
**So that** I can work on multiple builds and return to them across sessions

**Acceptance Criteria:**
- [ ] [Save] button → dropdown: "Save" (overwrite if named) / "Save As..." (prompts name)
- [ ] Saved builds stored in SQLite `builds` table
- [ ] [Import] button → tab "From Saved Builds" shows list: name, class, mastery, last modified
- [ ] Clicking a saved build loads it: populates class/mastery, node allocations, equipped skills
- [ ] Loading a build navigates to the correct mastery's BuildScreen
- [ ] Confirmation dialog when loading over an unsaved build ("You have unsaved changes. Load anyway?")
- [ ] Delete option on saved build entries (with confirmation)
- [ ] Max 50 saved builds (oldest overwritten; user warned)

**Technical Notes:**
- Tauri commands: `save_build(build: BuildData)`, `load_builds()`, `delete_build(id: string)`
- `BuildData` serialized to JSON for `passive_allocations` and `skill_allocations` fields
- `buildStore.isDirty` tracks unsaved changes

---

## Story 3.4 — Build Import from lastepochtools.com

**As a** user  
**I want** to import an existing build from a lastepochtools.com URL  
**So that** I can optimize builds I've already planned or found online

**Acceptance Criteria:**
- [ ] [Import] button → tab "From URL" with a URL/code input field
- [ ] Accepts lastepochtools.com build URLs
- [ ] On import: build populates node allocations in the graph
- [ ] Invalid URL shows inline error: "Couldn't parse this build link. Check the URL and try again."
- [ ] Partial imports (some nodes not found in local data) show warning: "X nodes in this build weren't recognized and were skipped."
- [ ] Successful import navigates to the correct mastery's BuildScreen with nodes populated

**Technical Notes:**
- Tauri command: `import_build_from_url(url: String) -> Result<BuildData, String>`
- Rust: GET lastepochtools.com API, parse response, map to internal `BuildData` schema
- Unknown nodes (not in local SQLite): skip with count, do not fail entire import
- If mastery data not loaded yet: trigger `fetch_game_data` first, then import

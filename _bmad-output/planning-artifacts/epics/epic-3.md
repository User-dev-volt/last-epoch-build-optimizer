# Epic 3 — Scoring Engine & Build I/O

**Goal:** Implement the deterministic scoring engine that rates builds 0–100 per dimension, and build the full save/load/import system for builds.

**Done when:** Users can save/load named builds locally, import from lastepochtools.com URLs, and see accurate real-time scores that update as they click nodes.

---

## Story 3.1 — Deterministic Scoring Engine

**As a** user  
**I want** my build scored across Damage, Survivability, and Speed dimensions in real-time, accounting for how my equipped skills actually use those stats  
**So that** I can see the true impact of my passive node choices on my specific playstyle

**Acceptance Criteria:**

**Pre-conditions (verify before implementing)**
- [ ] `NodeEffect` in `shared/types/gameData.ts` has a `magnitude` field — confirm it exists, document its scale (integer percent, e.g. `50` = "50% increased damage", or decimal fraction, e.g. `0.5`), and ensure the scoring formula is calibrated to that scale; this must be resolved before any other scoring AC is implemented
- [ ] `EquippedSkill` in `shared/types/gameData.ts` has a `type` field typed as `'spell' | 'melee' | 'ranged'` — if absent, add it as part of this story before implementing context remap
- [ ] `PassiveNode` in `shared/types/gameData.ts` has a `maxRanks: number` field (positive integer for all valid nodes)

**Scoring formula**
- [ ] Three score dimensions: Damage (0–100), Survivability (0–100), Speed (0–100)
- [ ] `Score = masteryMax > 0 ? clamp((playerTotal / masteryMax) × 100, 0, 100) : 0` — division is only performed when `masteryMax > 0`
- [ ] `playerTotal` = sum of `(effect.magnitude × typeWeight × allocatedRanks / maxRanks)` for all effects on all allocated nodes whose resolved dimension matches the target
- [ ] If a node's `maxRanks` is 0 (malformed game data), skip that node's contribution entirely and emit `console.warn('[scoring] node with maxRanks=0 skipped: ${nodeId}')` in dev mode
- [ ] Effect type weights: `more_*` = 3×, `increased_*` = 2×, all other prefixes = 1× (flat/additive default)
- [ ] Weight resolution: extract the first underscore-delimited token from the effect tag (e.g. `'more'` from `'more_damage'`, `'increased'` from `'increased_cast_speed'`); look up in `TYPE_WEIGHTS`; default to 1 if not found
- [ ] Multi-rank nodes contribute proportionally: a 2/3-rank node contributes ⅔ of its max potential
- [ ] If `masteryMax` for a dimension is 0 (no nodes exist for it in the mastery), that dimension's score is 0 — no division occurs

**Context-aware tag reclassification**
- [ ] Before scoring, the engine runs a context remap using equipped skills from the context panel
- [ ] If the build's equipped skills are majority spells (skill type = `spell`), `cast_speed` is reclassified from Speed → Damage (contributes to Damage only; removed from Speed)
- [ ] If the build's equipped skills are majority weapon attacks (skill type = `melee` or `ranged`), `attack_speed` is reclassified from Speed → Damage (contributes to Damage only; removed from Speed)
- [ ] "Majority" = more than half of the *filled* (non-null) equipped skill slots contain that skill type; empty slots do not count toward the denominator; ties default to no reclassification
- [ ] When context remap changes (equipped skills updated), `masteryMax` is recomputed with the active remap applied before scores are recalculated — ensures the denominator uses the same tag assignments as the numerator and scores remain in the 0–100 range
- [ ] Context remap re-runs whenever equipped skills change in the context panel

**`masteryMax` (denominator)**
- [ ] `masteryMax` per dimension is computed at game data load time and recomputed whenever the active context remap changes (equipped skills updated)
- [ ] Point budget is defined as the named constant `PASSIVE_POINT_BUDGET = 100` in `src/engine/scoring.ts`
- [ ] Algorithm: greedy allocation of a simulated `PASSIVE_POINT_BUDGET`-point budget, respecting tree topology — only nodes reachable from the tree's root nodes (nodes with no prerequisites) via allocated prerequisite paths may be selected; sort eligible reachable nodes descending by per-point contribution to this dimension, allocate greedily (respecting each node's `maxRanks`) and expand the reachable set as nodes are allocated; `masteryMax` = sum of contributions from that simulated allocation
- [ ] `masteryMax` values are cached in `gameDataStore`; the cache entry for a mastery is invalidated when game data is re-fetched (staleness refresh) and recomputed on next access

**Performance & correctness**
- [ ] Time from `buildStore` state commit to `scoreStore` state commit ≤ 16ms — measured in a unit test using `performance.now()` with a full-size mastery fixture (100+ nodes); run 50 iterations after a 5-iteration warm-up and assert the P99 result is ≤ 16ms
- [ ] Given identical node allocations and identical equipped skills, the engine always produces identical scores (no randomness, no set-iteration nondeterminism — use sorted arrays, not Sets, when iterating effects)
- [ ] `scoreStore` exposes: `{ damage: number, survivability: number, speed: number, lastUpdatedAt: number }` where `lastUpdatedAt` is `Date.now()` at the time of the last score computation

**Subscription & lifecycle**
- [ ] `scoreStore` subscribes to `buildStore` via `zustand.subscribe()` — subscription is initialized once in `src/engine/scoring.ts` module scope via an exported `initScoringEngine()` function
- [ ] `initScoringEngine()` also subscribes to equipped skills changes (context panel) to trigger context remap re-runs and `masteryMax` recomputation
- [ ] `initScoringEngine()` returns a single combined cleanup function that unsubscribes both subscriptions; `App.tsx` stores it and calls it on unmount

**Testing**
- [ ] Unit tests in `src/engine/scoring.test.ts` cover: basic per-dimension score, multi-rank partial allocation, context remap (spell majority, attack majority, tie/no-remap), zero-dimension mastery (no crash), unknown tag → console.warn emitted in dev mode, `masteryMax` greedy algorithm produces correct denominator for a known fixture, `masteryMax` respects tree topology (unreachable node is not allocated), `maxRanks=0` node skipped without crash, P99 performance with 100-node fixture ≤ 16ms

**Technical Notes:**

Scoring logic in `src/engine/scoring.ts`:

```typescript
// Update if Last Epoch changes the passive point cap
const PASSIVE_POINT_BUDGET = 100;

// Base dimension tag lists (before context remap)
const DAMAGE_TAGS = ['increased_damage', 'flat_damage', 'more_damage', 'critical_strike_chance', 'critical_strike_multiplier', 'penetration', 'damage_over_time'];
const SURVIVABILITY_TAGS = ['increased_health', 'flat_health', 'armor', 'damage_reduction', 'dodge_rating', 'block_chance', 'resist', 'leech'];
const SPEED_TAGS = ['movement_speed', 'attack_speed', 'cast_speed', 'cooldown_recovery'];

// Effect type weights — any prefix not listed defaults to 1
const TYPE_WEIGHTS: Record<string, number> = {
  more: 3,
  increased: 2,
};

// Extract first underscore-delimited token from tag; look up TYPE_WEIGHTS; default 1
function resolveWeight(tag: string): number { ... }

// Context remap: returns a map of tag → replacement dimension (reclassified tags move, not duplicate)
function buildContextRemap(equippedSkills: EquippedSkill[]): Map<string, Dimension> { ... }

// masteryMax greedy simulation — respects tree topology via prerequisite graph
// pointBudget = PASSIVE_POINT_BUDGET
function computeMasteryMax(nodes: PassiveNode[], edges: TreeEdge[], pointBudget: number, contextRemap: Map<string, Dimension>): DimensionScores { ... }

// Main scoring entry point
function scoreAllocation(
  allocations: NodeAllocations,
  masteryMax: DimensionScores,
  contextRemap: Map<string, Dimension>
): ScoredDimensions { ... }
```

- `NodeEffect.magnitude` scale must be confirmed and documented (see Pre-conditions) before calibrating the formula
- `computeMasteryMax` takes both `nodes` and `edges` (prerequisite graph) to enforce topology constraints during simulation
- `scoreStore` shape: `{ damage, survivability, speed, lastUpdatedAt }` — `utility` is not tracked; unknown tags emit `console.warn('[scoring] unknown tag: ${tag}')` guarded by `if (import.meta.env.DEV)` (Vite replaces this with `false` at build time; the minifier dead-code-eliminates the block in production)
- `initScoringEngine()` wires up both subscriptions (buildStore allocations + equipped skills) and returns a single combined cleanup function

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

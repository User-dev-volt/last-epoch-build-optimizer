# Story 7.0: Scoring Engine v2 — masteryMax, Context Remap & Accuracy Improvements

Status: ready-for-dev

## Story

As a theory-crafter,
I want my build scored accurately against the mastery's theoretical best allocation — with scores that shift based on which skills I have equipped — so that the Damage, Survivability, and Speed numbers reflect true relative performance rather than an arbitrary hardcoded cap.

## Context

The current `scoringEngine.ts` uses a hardcoded `RAW_SCORE_CAP = 650` calibrated to one Void Knight build, uppercase tag sets with no magnitude weighting, and no context awareness. This story replaces it with the reviewed and corrected algorithm from the Phase 1 code-review findings.

**This story is a prerequisite for Epic 7** — the optimization slider needs accurate per-dimension scoring to compute weights correctly.

## Acceptance Criteria

**Pre-conditions (verify before coding begins — block on these)**

1. **Given** `GameNode` in `shared/types/gameData.ts`
   **When** this story starts
   **Then** the dev has confirmed whether `GameNode.tags` strings carry numeric magnitude (e.g., `"increased_damage_50"`) or whether magnitude must be added as a separate `NodeEffect[]` field; document the confirmed format in a `Dev Notes` comment before any formula code is written

2. **Given** `ClassData.skills` in `shared/types/gameData.ts` (currently `SkillEntry[]` with no `type` field)
   **When** context remap is implemented
   **Then** `SkillEntry` has a `type: 'spell' | 'melee' | 'ranged' | 'unknown'` field; if the field is absent from the data pipeline, add it with a default of `'unknown'` as part of this story

3. **Given** `GameNode.maxPoints` (currently present)
   **When** the proportional scoring formula runs
   **Then** nodes where `maxPoints === 0` are skipped entirely and emit `console.warn('[scoring] node with maxPoints=0 skipped: ${nodeId}')` guarded by `if (import.meta.env.DEV)`

**Scoring formula**

4. **Given** the revised formula
   **When** scoring a dimension
   **Then** `Score = masteryMax > 0 ? clamp((playerTotal / masteryMax) × 100, 0, 100) : 0` — division is performed only when `masteryMax > 0`; the hardcoded `RAW_SCORE_CAP` is removed

5. **Given** a node is allocated at `allocatedPoints` out of `maxPoints`
   **When** computing `playerTotal`
   **Then** the node contributes `magnitude × typeWeight × (allocatedPoints / maxPoints)` per matching effect; multi-rank nodes contribute proportionally

6. **Given** an effect tag string
   **When** resolving its type weight
   **Then** `resolveWeight` extracts the first underscore-delimited token (e.g., `'more'` from `'more_damage'`), looks it up in `TYPE_WEIGHTS = { more: 3, increased: 2 }`, and defaults to `1` for any unrecognised prefix — the old `Set`-based classification is removed

7. **Given** `masteryMax` for a dimension is `0` (no nodes in the mastery contribute to it)
   **When** scoring
   **Then** that dimension scores `0` and no division occurs

**Context-aware tag reclassification**

8. **Given** the build has majority spell skills (more than half of *filled* — non-null — equipped skill slots have `type === 'spell'`)
   **When** scoring Speed
   **Then** `cast_speed` tags are removed from Speed and added to Damage only (moved, not duplicated); empty skill slots do not count toward the denominator; ties = no reclassification

9. **Given** the build has majority weapon-attack skills (`type === 'melee'` or `'ranged'`)
   **When** scoring Speed
   **Then** `attack_speed` tags are removed from Speed and added to Damage only

10. **Given** equipped skills change in the context panel
    **When** the remap is recomputed
    **Then** `masteryMax` is also recomputed with the new remap applied before scores are recalculated — denominator and numerator always use the same tag assignments

**`masteryMax` (denominator)**

11. **Given** a mastery's node graph and the active context remap
    **When** computing `masteryMax`
    **Then** the greedy simulation respects tree topology: only nodes reachable from root nodes (nodes with no prerequisites) via already-allocated prerequisite paths are eligible; the constant `PASSIVE_POINT_BUDGET = 100` is used (named constant, not magic number)

12. **Given** game data is re-fetched (staleness refresh)
    **When** new game data loads
    **Then** the `masteryMax` cache entry in `gameDataStore` is invalidated and recomputed on next access

**Performance & correctness**

13. **Given** the new engine
    **When** a performance test runs
    **Then** a unit test using `performance.now()` runs 50 iterations after a 5-iteration warm-up against a 100+ node fixture and asserts P99 ≤ 16ms

14. **Given** identical `nodeAllocations` and identical equipped skills
    **When** scoring is run twice
    **Then** results are identical — sorted arrays (not `Set` iteration) are used wherever effects are iterated

**Store shape & lifecycle**

15. **Given** the `optimizationStore` score shape (currently `{ damage, survivability, speed }`)
    **When** this story is complete
    **Then** `lastUpdatedAt: number` (value of `Date.now()` at computation time) is added; `utility` is NOT added; the old score type is updated in `shared/types/optimization.ts`

16. **Given** `initScoringEngine()` currently returns one `unsubscribe` handle
    **When** it also subscribes to equipped skills changes
    **Then** it returns a single combined cleanup function that unsubscribes both the `buildStore` subscription and the equipped-skills subscription; `App.tsx` stores and calls this on unmount

## Tasks / Subtasks

- [ ] Task 1: Verify Pre-conditions and update types (AC: #1, #2, #3)
  - [ ] Read the actual game data JSON to confirm tag format — do tags carry magnitude (e.g., `"more_damage_50"`) or is magnitude a separate field to be added?
  - [ ] Document the confirmed magnitude format in Dev Agent Record before proceeding
  - [ ] If `SkillEntry` lacks `type`: add `type: 'spell' | 'melee' | 'ranged' | 'unknown'` to `SkillEntry` in `shared/types/gameData.ts` (default `'unknown'`)
  - [ ] Add `lastUpdatedAt: number` to `BuildScore` in `shared/types/optimization.ts`
  - [ ] Remove `utility` from `BuildScore` if present

- [ ] Task 2: Replace `scoringEngine.ts` with v2 implementation (AC: #4–#10, #14)
  - [ ] Add `PASSIVE_POINT_BUDGET = 100` named constant
  - [ ] Replace uppercase `Set`-based tag classification with lowercase underscore-format `DAMAGE_TAGS`, `SURVIVABILITY_TAGS`, `SPEED_TAGS` arrays
  - [ ] Implement `resolveWeight(tag: string): number` — first token before `_`, look up `TYPE_WEIGHTS`, default 1
  - [ ] Implement `buildContextRemap(skills: SkillEntry[]): Map<string, Dimension>` — maps `cast_speed`→`'damage'` for spell majority, `attack_speed`→`'damage'` for attack majority; only filled slots count for majority
  - [ ] Implement `computeMasteryMax(nodes: GameNode[], edges: TreeEdge[], pointBudget: number, contextRemap: Map<string, Dimension>): DimensionScores` — greedy simulation respecting topology
  - [ ] Implement `scoreAllocation(allocations: NodeAllocations, masteryMax: DimensionScores, contextRemap: Map<string, Dimension>): BuildScore` with `masteryMax > 0` guard and `maxPoints === 0` node skip + dev warn
  - [ ] Ensure all effect iteration uses sorted arrays, not `Set` or `Object.entries` in unpredictable order
  - [ ] Remove `RAW_SCORE_CAP` entirely

- [ ] Task 3: Update `gameDataStore` for `masteryMax` caching (AC: #11, #12)
  - [ ] Add `masteryMaxCache: Record<string, DimensionScores>` to `useGameDataStore`
  - [ ] Invalidate cache on game data re-fetch (call `clearMasteryMaxCache()` in the staleness-refresh path)
  - [ ] `getMasteryMax(masteryId, nodes, edges, contextRemap)` computes on cache miss and stores result

- [ ] Task 4: Update `initScoringEngine()` subscription and cleanup (AC: #16)
  - [ ] Subscribe to `buildStore` (existing) AND to equipped-skills changes in context panel
  - [ ] On equipped-skills change: recompute context remap, invalidate `masteryMax` cache for active mastery, recompute scores
  - [ ] Return a single combined cleanup function from `initScoringEngine()`
  - [ ] Update `App.tsx` to call the new combined cleanup on unmount

- [ ] Task 5: Tests (AC: #3, #5, #6, #8, #9, #13, #14)
  - [ ] Unit tests in `src/features/optimization/scoringEngine.test.ts` cover:
    - Basic per-dimension score with known fixture
    - Multi-rank partial allocation (2/3 rank = ⅔ contribution)
    - `resolveWeight`: `'more_damage'`→3, `'increased_health'`→2, `'flat_anything'`→1, `'unknown_tag'`→1
    - Context remap: spell majority → `cast_speed` moves to Damage; attack majority → `attack_speed` moves to Damage; tie → no remap; empty slots excluded from majority count
    - Zero `masteryMax` dimension → score 0, no crash
    - `maxPoints === 0` node → skipped, `console.warn` emitted in dev mode
    - `masteryMax` greedy respects topology (unreachable node not selected)
    - Determinism: same inputs → same scores across two calls
    - P99 performance: 50 iterations after 5 warm-up, 100+ node fixture, P99 ≤ 16ms

## Dev Notes

### Existing Code to Replace

- `lebo/src/features/optimization/scoringEngine.ts` — full replacement; current implementation uses `RAW_SCORE_CAP = 650` and uppercase `Set`-based tag classification
- Current `calculateScore(build, gameData): BuildScore` signature changes to `calculateScore(build, gameData, equippedSkills): BuildScore` or the engine is driven via store subscriptions only

### Game Data Tag Format — MUST Confirm Before Coding

The current `GameNode.tags` is `string[]` with uppercase tags like `'DAMAGE'`, `'HEALTH'`, `'MOVEMENT'`. The v2 formula needs lowercase underscore-prefixed tags with magnitude (e.g., `'more_damage'`, `'increased_health'`). Pre-condition AC #1 must be resolved before any formula code is written:

- **Option A:** Tags already carry magnitude in a parseable format (e.g., `"increased_damage_50"` where `50` is the magnitude). Update `resolveWeight` and magnitude extraction accordingly.
- **Option B:** Tags are semantic only (`"DAMAGE"`, `"HEALTH"`) and magnitude is implicit (1 per rank). In this case the formula simplifies: `magnitude = 1` always, and `typeWeight` is derived from a separate effect-type field or from the tag itself.
- **Option C:** `NodeEffect[]` (with `tag` and `magnitude`) needs to be added to `GameNode` and the data pipeline (Rust scraper) needs updating.

Document which option applies and adjust the formula accordingly. Do not assume Option A or C without confirming against actual game data files.

### `TreeEdge` Type for Topology

The prerequisite graph comes from `GameNode.prerequisiteNodeIds`. For `computeMasteryMax`, derive edges as:
```typescript
type TreeEdge = { from: string; to: string } // 'from' must be allocated before 'to' is reachable
const edges = Object.values(nodes).flatMap(n =>
  n.prerequisiteNodeIds.map(prereqId => ({ from: prereqId, to: n.id }))
)
```
Root nodes = nodes with empty `prerequisiteNodeIds`.

### Zustand Store Pattern

Follow the existing store pattern — no `immer`. `useGameDataStore` is extended for `masteryMaxCache`. Follow the `updateContextGear` pattern in `buildStore.ts` for the combined cleanup return from `initScoringEngine()`.

### Tag Reclassification: Move Not Duplicate

The context remap **moves** tags from one dimension to another — it does not add a tag to both dimensions. A `cast_speed` tag in a spell build counts toward Damage only and is excluded from Speed. Ensure `buildContextRemap` removes the original and maps to the replacement.

### Scoring Model Reference

See `lebo/docs/scoring-model.md` for the Phase 1 derivation notes. This story replaces that model.

### File List

- `lebo/src/features/optimization/scoringEngine.ts` — replaced (v2 implementation)
- `lebo/src/features/optimization/scoringEngine.test.ts` — replaced/updated
- `lebo/src/shared/types/gameData.ts` — modified (add `SkillEntry.type` if absent)
- `lebo/src/shared/types/optimization.ts` — modified (add `lastUpdatedAt`, remove `utility` if present)
- `lebo/src/shared/stores/gameDataStore.ts` — modified (add `masteryMaxCache` + invalidation)
- `lebo/src/App.tsx` — modified (update `initScoringEngine` cleanup call if signature changes)

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

_to be filled_

### Completion Notes List

_to be filled_

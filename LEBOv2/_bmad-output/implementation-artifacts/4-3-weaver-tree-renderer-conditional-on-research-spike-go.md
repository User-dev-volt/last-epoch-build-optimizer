# Story 4.3: Weaver Tree Renderer (Conditional on Research Spike GO)

Status: ready-for-dev

> ⚠️ **DEFERRED — SPIKE VERDICT WAS NO-GO (2026-05-13)**
>
> Story 4.1 returned NO-GO: no machine-readable Weaver Tree node data (node IDs, positions, edge graph) is available from any community source. This story is written and ready so it can be picked up immediately when data becomes available. **Do not begin implementation until the re-evaluation conditions in the Dev Notes are met.**
>
> **Re-evaluation triggers** (check on each epic boundary):
> - Musholic/PathOfBuildingForLastEpoch releases Weaver Tree support (watch changelog)
> - Community Unity asset dump produces Weaver node graph
> - lastepochtools.com becomes accessible and exposes structured data
> - Any GitHub repo surfaces Weaver node IDs + positions + edges

---

## Story

As a theory-crafter,
I want to view the Weaver Tree in a web/radial PixiJS layout, allocate points from a separate Weaver point pool, use search to highlight nodes, and RESET my Weaver allocations,
so that I can plan my Weaver Tree investments alongside my class skill trees.

## Acceptance Criteria

1. **Given** the research spike confirmed GO and Weaver Tree data has been obtained
   **When** Weaver Tree data is loaded into `useGameDataStore.weaverTreeData: TreeData`
   **Then** `weaverTreeData` is non-null and the `SkillTreeView` Weaver tab renders `SkillTreeCanvas` instead of `WeaverTreePlaceholder`

2. **Given** the player opens the Weaver Tree tab
   **When** the Weaver Tree renders
   **Then** it uses `<SkillTreeCanvas treeData={weaverTreeData} treeLayout="weaver" ... />` with the existing component; a `weaverLayout()` function in `pixiRenderer.ts` applies the web/radial layout algorithm — nodes are positioned radially from a central hub with branches radiating outward

3. **Given** the Weaver Tree has its own point pool separate from passive points
   **When** the player allocates Weaver nodes
   **Then** allocations are stored in `useBuildStore.weaverAllocations: Record<string, number>` (extends `BuildState`); the `UnspentCounter` above the Weaver Tree shows Weaver-specific unspent points derived from `calculateWeaverPoints()`

4. **Given** nodes that are unreachable (prerequisites not met)
   **When** they are displayed
   **Then** they show the locked visual state (`drawLocked`); hovering shows a tooltip explaining the requirement (same mechanism as passive/skill trees via `useSkillTree` hook)

5. **Given** the BudgetToggle is ON and the Weaver Tree unspent counter reaches 0
   **When** the player tries to allocate another Weaver node
   **Then** further Weaver node allocation is blocked (same enforcement logic as passive/skill trees via `budgetEnforced` in buildStore)

6. **And** the existing search bar (from Story 1.5) works on the Weaver Tree: typing highlights matching nodes in gold and dims non-matching nodes; × clears the filter

7. **And** the RESET button works on the Weaver Tree: clears all `weaverAllocations` to empty, pushes to undo stack (MAX_UNDO_STACK = 10), and the unspent counter reflects the full Weaver budget

8. **And** `weaverLayout.ts` is at `src/features/weaver-tree/weaverLayout.ts` with no barrel file

9. **And** `weaverAllocations` persists with build saves (included in `BuildState`); RESET pushes to undo stack via `undoNodeChange`

10. **And** `WeaverTreePlaceholder` is replaced by `SkillTreeCanvas` in the `weaverTreeData !== null` branch of `SkillTreeView.tsx` — the conditional gate already exists and must not be restructured

## Tasks / Subtasks

> **PREREQUISITE:** Before starting any task, confirm `useGameDataStore.weaverTreeData` is non-null in the running app. The data loading strategy must be defined in an updated spike report addendum before Task 1 begins.

- [ ] Task 0: Define and implement data loading for Weaver Tree (AC: #1)
  - [ ] Based on newly available data source, determine format and write a Rust command or TypeScript loader that populates `weaverTreeData`
  - [ ] Call the loader at app startup alongside `loadGameData()`; result stored via `useGameDataStore.setWeaverTreeData(data)`
  - [ ] If data has x/y coordinates: validate they map to `TreeNode.x/y` world-space integers; apply linear scale transform if needed
  - [ ] If data has node names/effects but no positions: `weaverLayout.ts` must generate positions algorithmically (see Task 2)
  - [ ] If data uses a Lua/JSON format from Musholic repo: write a Rust deserializer or TypeScript transformer to produce `TreeData`

- [ ] Task 1: Add `weaverAllocations` to `BuildState` and `buildStore.ts` (AC: #3, #5, #7, #9)
  - [ ] In `src/shared/types/build.ts`, add `weaverAllocations: Record<string, number>` to `BuildState` interface
  - [ ] In `src/shared/stores/buildStore.ts`, add `weaverAllocations` to initial build object in `createBuild()` (default `{}`)
  - [ ] Add `applyWeaverNodeChange(nodeId: string, delta: number, treeData: TreeData): ApplyNodeResult` to `BuildStore` interface and implementation — mirrors `applyNodeChange` but reads/writes `weaverAllocations` instead of `nodeAllocations`; respects `budgetEnforced` check against `calculateWeaverPoints(characterLevel)`
  - [ ] Extend `resetActiveTree` to handle `treeType: 'weaver'` — clears `weaverAllocations`, pushes to undo stack
  - [ ] Ensure `weaverAllocations` serializes/deserializes correctly with existing build save/load flow (Rust stores raw JSON — no Rust change needed; TypeScript side must include the field)

- [ ] Task 2: Implement `weaverLayout.ts` radial layout algorithm (AC: #2, #8)
  - [ ] Create `src/features/weaver-tree/weaverLayout.ts` (no barrel file)
  - [ ] Export `applyWeaverLayout(rawNodes: RawWeaverNode[], rawEdges: RawWeaverEdge[]): TreeData` — produces `TreeNode[]` with computed `x/y` world-space coordinates + `TreeEdge[]`
  - [ ] Layout algorithm: place a central hub node at (0, 0); use BFS from hub to assign nodes to concentric rings; ring N has radius `N * RING_SPACING` (suggest RING_SPACING = 120 world units); distribute nodes evenly around each ring using `angle = (2π / nodesInRing) * index`
  - [ ] If source data already has x/y coordinates: skip algorithmic placement; apply scale transform to normalize to world-space integers
  - [ ] `NodeSize` assignment: hub node = 'large'; inner ring (ring 1) = 'medium'; outer rings = 'small'
  - [ ] `NodeState` assignment: all nodes start as 'available' (actual state is computed by `SkillTreeCanvas` from `weaverAllocations` + `connections`)
  - [ ] Write `weaverLayout.test.ts` covering: correct node count, all nodes have non-NaN x/y, no two nodes at identical position, edges reference valid node IDs

- [ ] Task 3: Add `treeLayout` prop to `SkillTreeCanvas` and wire to `pixiRenderer.ts` (AC: #2)
  - [ ] In `src/features/skill-tree/types.ts`, add `treeLayout?: 'standard' | 'weaver'` to `SkillTreeCanvasProps` (optional; default 'standard')
  - [ ] In `SkillTreeCanvas.tsx`, pass `treeLayout` down to `initRenderer(...)` call
  - [ ] In `pixiRenderer.ts`, accept `treeLayout` in renderer config and call `weaverLayout()` post-transform when `treeLayout === 'weaver'`
  - [ ] **CRITICAL:** The existing radial layout from `weaverLayout.ts` already positions nodes — `pixiRenderer.ts` must NOT re-layout; it simply uses the `x/y` from `TreeData.nodes` (same as standard layout). The `treeLayout` prop tells the renderer to expect a radial shape for `fitToTree()` viewport centering (use bounding box of all nodes, not just root cluster)

- [ ] Task 4: Wire Weaver Tree into `SkillTreeView.tsx` (AC: #1, #2, #3, #4, #5, #6, #7)
  - [ ] In the `isWeaverTab` early return (currently at line ~313), replace the `weaverTreeData !== null` branch's `<WeaverTreePlaceholder />` with:
    ```tsx
    <SkillTreeCanvas
      treeData={weaverTreeData}
      treeLayout="weaver"
      nodeAllocations={weaverAllocations}
      highlightedNodes={weaverHighlightedNodes}
      iconTextures={EMPTY_TEXTURES}
      selectedNodeId={selectedNodeId}
      onNodeClick={handleWeaverNodeClick}
      onNodeHover={handleNodeHover}
      onNodeSelect={handleNodeSelect}
      onNodeContextMenu={handleNodeContextMenu}
      onKeyboardNavigate={handleKeyboardNavigate}
      onPointerMove={handlePointerMove}
      flashNodeIds={flashNodeIds}
    />
    ```
  - [ ] Add `weaverAllocations` selector from `useBuildStore` (alongside existing selectors at top of `SkillTreeView`)
  - [ ] Add `applyWeaverNodeChange` selector from `useBuildStore`
  - [ ] Add `handleWeaverNodeClick` callback that calls `applyWeaverNodeChange(nodeId, delta, weaverTreeData)` — mirrors `handleNodeClick` logic
  - [ ] Add `weaverInteraction = useSkillTree(isWeaverTab ? weaverTreeData : null)` — reuse the hook for hover, flash, tooltip state on the Weaver tree
  - [ ] Wire `weaverHighlightedNodes` to search query (same `searchHighlighted`/`searchDimmed` memos, applied when `isWeaverTab`)
  - [ ] In the Weaver tab JSX, render `TreeControls` with `onReset={() => resetActiveTree('weaver')}` and `onSearch={setSearchQuery}`
  - [ ] Add `UnspentCounter` above the Weaver canvas: `unspent = calculateWeaverPoints(characterLevel) - allocatedWeaverPoints`; `treeType="weaver"`

- [ ] Task 5: Add `calculateWeaverPoints` to `budgetCalculator.ts` (AC: #3, #5)
  - [ ] In `src/shared/utils/budgetCalculator.ts`, add and export:
    ```typescript
    // Approximate formula: 13 points from Woven faction ranks + ~40 from Woven Echo completions
    // Exact formula unknown; capped at 53 as best confirmed total from docs/weaver-tree-spike.md §3
    export function calculateWeaverPoints(_level: number): number {
      return 53
    }
    ```
  - [ ] Note in a comment that the function signature accepts `level` for future use when the formula is confirmed — it is ignored for now since weaver points are not level-gated in the same way as passive points
  - [ ] Add a test in `budgetCalculator.test.ts` that `calculateWeaverPoints(1) === 53` and `calculateWeaverPoints(100) === 53`

- [ ] Task 6: NodeTooltip wiring for Weaver nodes (AC: #4)
  - [ ] Weaver nodes need `GameNode.name` for tooltip display — ensure `weaverTreeData` population (Task 0) includes node names in a lookup accessible to the tooltip renderer
  - [ ] If raw Weaver data uses a separate naming map, build `weaverGameNodes: Record<string, Pick<GameNode, 'name' | 'prerequisiteNodeIds'>>` and pass it to `NodeTooltip` when `isWeaverTab`
  - [ ] Prerequisite tooltip text follows the same pattern as passive/skill trees: "Requires: {prerequisiteNodeName} at {N}+"

- [ ] Task 7: Tests (AC: #2, #3, #6, #7)
  - [ ] `weaverLayout.test.ts` — see Task 2 subtasks
  - [ ] `budgetCalculator.test.ts` — add `calculateWeaverPoints` tests (see Task 5)
  - [ ] Extend `buildStore` unit tests: `applyWeaverNodeChange` increments/decrements `weaverAllocations`; budget enforcement blocks at 0 unspent; `resetActiveTree('weaver')` clears `weaverAllocations` and pushes undo
  - [ ] Extend `SkillTreeView` integration test: when `weaverTreeData` is non-null, Weaver tab renders `SkillTreeCanvas` not `WeaverTreePlaceholder`

## Dev Notes

### DEFERRED STATUS — Read Before Writing Any Code

**Current state (2026-05-13):** `useGameDataStore.weaverTreeData` is always `null` because no community source exposes machine-readable Weaver node data. Story 4.1 was NO-GO. This story file exists so the work is fully specified when data becomes available. If you are reading this and data is still unavailable, **stop here**.

The gate is already wired in `SkillTreeView.tsx:313-331`:
```tsx
if (isWeaverTab) {
  return (
    <div ...>
      <SkillTreeTabBar ... />
      <div className="flex-1 min-h-0">
        {weaverTreeData !== null ? (
          // Story 4.3 will replace this branch with SkillTreeCanvas when spike is GO
          <WeaverTreePlaceholder />
        ) : (
          <WeaverTreePlaceholder />
        )}
      </div>
    </div>
  )
}
```

**Task 4's sole job** is to replace the inner `<WeaverTreePlaceholder />` in the `weaverTreeData !== null` branch. Do NOT refactor the outer structure.

### Architecture Decisions — From epics.md and architecture.md

| Aspect | Value |
|--------|-------|
| Data field | `useGameDataStore.weaverTreeData: TreeData \| null` — already exists (added in Story 4.2) |
| Allocation store | `useBuildStore.weaverAllocations: Record<string, number>` — must be added to `BuildState` in this story |
| Renderer | Reuse `<SkillTreeCanvas treeLayout="weaver" ... />` — add `treeLayout` prop (new) |
| Layout function | `weaverLayout.ts` at `src/features/weaver-tree/weaverLayout.ts` — must implement radial layout |
| Rendering function | `weaverLayout()` called in `pixiRenderer.ts` when `treeLayout === 'weaver'` |
| Tab position | Index 6 — already implemented in `SkillTreeTabBar.tsx` and `SkillTreeView.tsx` |
| Point pool | Separate from passive/skill points — `calculateWeaverPoints()` in `budgetCalculator.ts` |
| UnspentCounter | Rendered above Weaver canvas — same component, `treeType="weaver"` label |
| Search + RESET | `TreeControls` already handles this; `resetActiveTree('weaver')` must be added to buildStore |

### What Already Exists (Do NOT Recreate)

From Story 4.2 (`lebo/src/shared/stores/gameDataStore.ts`):
```typescript
weaverTreeData: TreeData | null  // always null until data source found
setWeaverTreeData: (data: TreeData | null) => void
```

From Story 4.2 (`lebo/src/features/weaver-tree/WeaverTreePlaceholder.tsx`):
```typescript
export function WeaverTreePlaceholder() { ... }  // still renders when weaverTreeData is null
```

Tab index 6 already registered in `SkillTreeTabBar.tsx` and all guards in `SkillTreeView.tsx` already updated to `> 6`.

### What Does NOT Exist Yet (Must Be Created)

1. **`BuildState.weaverAllocations`** — not in `src/shared/types/build.ts`; this is the most significant brownfield risk. Adding a field to `BuildState` could break Phase 1 save loading if not handled gracefully. Use `??  {}` coercion when loading from JSON (same pattern as `nodeAllocations`).

2. **`applyWeaverNodeChange`** in `buildStore.ts` — new action, mirrors `applyNodeChange`. Prerequisite validation follows the same `connections[]` graph check.

3. **`weaverLayout.ts`** — new file. Radial layout algorithm. See Task 2 for the spec.

4. **`treeLayout` prop on `SkillTreeCanvas`** — `SkillTreeCanvasProps` in `src/features/skill-tree/types.ts` does not have this. Add as optional.

5. **`calculateWeaverPoints`** — not in `budgetCalculator.ts`. Total budget is ~53 (confirmed in spike; not level-gated).

6. **`resetActiveTree('weaver')`** — `resetActiveTree` in `buildStore.ts` currently handles `'passive' | 'skill'`. Must be extended.

### Brownfield Risk: `BuildState.weaverAllocations` Migration

`BuildState.schemaVersion` is currently `1`. When `weaverAllocations` is added to the interface, any saved build loaded without this field will have `weaverAllocations: undefined`. Add a coercion in `buildPersistence.ts` load path (the `migrateBuildState` function):
```typescript
weaverAllocations: raw.weaverAllocations ?? {}
```
This is the same pattern used for other optional record fields. Do NOT bump `schemaVersion` for this addition — it is additive and backward-compatible with a `?? {}` default.

### PixiJS Layout: Radial vs. Standard

The existing `pixiRenderer.ts` uses `TreeData.nodes[].x/y` directly for positioning — it does **not** compute positions. `weaverLayout.ts` must assign x/y during data transformation, not during rendering. `pixiRenderer.ts` only needs to know `treeLayout="weaver"` for the `fitToTree()` viewport calculation: a radial tree should fit to its bounding box differently (center on (0,0) hub, use max radius as the viewport extent).

### `useSkillTree` Hook Reuse

`useSkillTree.ts` manages hover, flash, nodeError, contextMenu state. It is already parameterized by `treeData` (can be null). Calling it for the Weaver tab:
```typescript
const weaverInteraction = useSkillTree(isWeaverTab ? weaverTreeData : null)
```
This is safe because `useSkillTree(null)` returns all-empty state (no hover, no errors). The Weaver tab uses `weaverInteraction` where passive/skill tabs use `passiveInteraction`/`skillInteraction`.

**HOOKS ORDER:** All `useSkillTree` calls must remain BEFORE the `isWeaverTab` early return in `SkillTreeView.tsx`. Currently:
```
line ~227: const passiveInteraction = useSkillTree(treeData)
line ~228: const skillInteraction = useSkillTree(skillTreeData, slotId ?? undefined)
```
Add after line 228:
```typescript
const weaverInteraction = useSkillTree(isWeaverTab ? weaverTreeData : null)
```

### Icon Textures on Weaver Tree

Weaver Tree nodes are game mechanics (faction/echo nodes), not class skills — they do NOT have skill icons. Pass `iconTextures={new Map()}` (or a `EMPTY_TEXTURES` constant) to `SkillTreeCanvas` for the Weaver tab. The placeholder fill color (`drawAvailable`) will render for all nodes. Do NOT call `useIconTextures` for Weaver nodes.

### Prerequisite Validation for Weaver Nodes

The Weaver Tree has prerequisite relationships (inner nodes unlock outer nodes). The existing `applyNodeChange` in buildStore already handles this via `connections[]` in `TreeData`. `applyWeaverNodeChange` follows the same algorithm — no new validation logic needed, only a separate allocation map (`weaverAllocations` instead of `nodeAllocations`).

### Files to Create

| Path | What |
|------|------|
| `src/features/weaver-tree/weaverLayout.ts` | Radial layout algorithm → produces `TreeData` from raw Weaver data |
| `src/features/weaver-tree/weaverLayout.test.ts` | Layout correctness tests |

### Files to Modify

| File | What Changes |
|------|-------------|
| `src/shared/types/build.ts` | Add `weaverAllocations: Record<string, number>` to `BuildState` |
| `src/shared/stores/buildStore.ts` | Add `applyWeaverNodeChange`, extend `resetActiveTree('weaver')`, init `weaverAllocations: {}` in `createBuild()` |
| `src/shared/utils/budgetCalculator.ts` | Add `calculateWeaverPoints()` |
| `src/shared/utils/budgetCalculator.test.ts` | Add `calculateWeaverPoints` tests |
| `src/features/skill-tree/types.ts` | Add `treeLayout?: 'standard' \| 'weaver'` to `SkillTreeCanvasProps` |
| `src/features/skill-tree/pixiRenderer.ts` | Accept + use `treeLayout` for `fitToTree()` viewport centering |
| `src/features/skill-tree/SkillTreeView.tsx` | Replace `WeaverTreePlaceholder` in `weaverTreeData !== null` branch; add `weaverInteraction`, `weaverAllocations`, `handleWeaverNodeClick`; add `UnspentCounter`; add `TreeControls` |
| `src/features/build-manager/buildPersistence.ts` | Add `weaverAllocations: raw.weaverAllocations ?? {}` coercion in `migrateBuildState` |

### Do NOT Touch

- `SkillTreeView.tsx` outer structure of the `isWeaverTab` early return — only replace the inner placeholder in the `weaverTreeData !== null` branch
- `WeaverTreePlaceholder.tsx` — still renders when `weaverTreeData === null`; no changes needed
- `gameDataStore.ts` — `weaverTreeData` field already exists; only the loader (Task 0) populates it
- `pixiRenderer.ts` drawing functions (`drawAllocated`, `drawAvailable`, `drawLocked`, etc.) — no changes; radial vs standard is a layout concern, not a draw concern
- `SkillTreeTabBar.tsx` — Weaver tab already present at index 6

### Project Context Rules

From `_bmad-output/project-context.md`:
- **No barrel files** — `weaverLayout.ts` in `src/features/weaver-tree/`; no `index.ts`
- **No new top-level Zustand stores** — `weaverAllocations` extends `useBuildStore` (in `BuildState`), NOT a new store
- **SkillTreeCanvas is props-only** — `iconTextures` (pass `new Map()`), `treeData` (pass `weaverTreeData`), `nodeAllocations` (pass `weaverAllocations`) — all passed as props; no internal store access inside SkillTreeCanvas
- **TypeScript strict mode** — `noUnusedLocals: true`; if you add `weaverInteraction` but don't use all its fields, destructure only what you use
- **Named exports only** — `weaverLayout.ts` exports `applyWeaverLayout`, not default
- **Tailwind v4 / no @apply** — use inline `style={{ ... }}` for CSS token colors
- **All TypeScript IPC calls use `invokeCommand<T>()`** — if Task 0 introduces a new Rust command for data loading, it must follow `AppResult<T>` return type and register in `lib.rs`
- **Atomic writes in Rust** — if Weaver data is cached to disk, use temp-file-then-rename pattern
- **vitest-axe** — `applyWeaverLayout` is pure TypeScript (no UI); no axe check needed for this function

### Point Pool Mechanics (From Spike Report §3)

The Weaver Tree has ~53 total points available at endgame. The current `calculateWeaverPoints()` returns a flat 53 regardless of level because:
- 13 points come from Woven faction rank progression (rank 1–13, not strictly level-gated)
- ~40 points come from first-time Woven Echo completions (accumulated over time)
- No confirmed formula ties points directly to character level

If the game exposes a formula in the future, `calculateWeaverPoints(level: number)` already has the right signature to implement it. The `_level` parameter naming signals intentional non-use without triggering `noUnusedParameters`.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 4: Story 4.3 ACs, UX-DR14]
- [Source: `_bmad-output/implementation-artifacts/4-1-weaver-tree-research-spike.md` — NO-GO verdict, point pool formula, re-evaluation triggers]
- [Source: `_bmad-output/implementation-artifacts/4-2-weaver-tree-tab-and-placeholder-component.md` — Existing gate code structure, `weaverTreeData` field already in gameDataStore, hooks order safety analysis]
- [Source: `docs/weaver-tree-spike.md` — Full spike findings, §3 point pool mechanics (53 total), §7 re-evaluation conditions]
- [Source: `lebo/src/features/skill-tree/SkillTreeView.tsx:313-331` — Current Weaver early return with `weaverTreeData !== null` gate]
- [Source: `lebo/src/features/skill-tree/SkillTreeView.tsx:227-228` — `passiveInteraction` + `skillInteraction` hook calls; `weaverInteraction` must be added here]
- [Source: `lebo/src/shared/stores/buildStore.ts` — `applyNodeChange`, `resetActiveTree`, `BuildStore` interface to extend]
- [Source: `lebo/src/shared/types/build.ts` — `BuildState` interface; `weaverAllocations` not yet present]
- [Source: `lebo/src/shared/types/treeData.ts` — `TreeNode` shape: `{ id, x, y, size, maxPoints, connections: string[], state: NodeState }`]
- [Source: `lebo/src/shared/utils/budgetCalculator.ts` — Existing `calculatePassivePoints`, `calculateSkillPoints`; add `calculateWeaverPoints` alongside]
- [Source: `lebo/src/features/skill-tree/SkillTreeCanvas.tsx` — Props-only contract; `SkillTreeCanvasProps` to extend with `treeLayout?`]
- [Source: `lebo/src/features/skill-tree/pixiRenderer.ts` — `initRenderer` entry point; `fitToTree` is where treeLayout matters for viewport]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Decision 7: Weaver Tree Renderer (Spike-Gated); no new top-level stores; atomic writes]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

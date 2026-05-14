# Story 4.1: Weaver Tree Research Spike

Status: ready-for-dev

## Story

As a developer,
I want to investigate community data sources for Weaver Tree node layout and point pool mechanics before committing to implementation,
so that the Weaver Tree epic has confirmed data before any rendering code is written.

## Acceptance Criteria

1. **Given** the research targets: tunklab.com, lastepochtools.com, the Last Epoch wiki (Fandom), and any known community Last Epoch data repositories (GitHub)
   **When** the spike researcher investigates
   **Then** the spike report (`docs/weaver-tree-spike.md`) documents:
   - (1) Whether machine-readable Weaver Tree node data (node IDs, positions/coordinates, edges, point costs) exists in any community source
   - (2) The format of node coordinates and whether they are compatible with the existing PixiJS layout system and the `TreeData` type used throughout the app
   - (3) The Weaver Tree's point pool mechanics: how many points per level, whether the pool is separate from passive points, and the exact formula if discoverable
   - (4) A clear **GO / NO-GO** recommendation for Story 4.3 (renderer)

2. **Given** the spike report is complete
   **When** the team reviews it
   **Then** Story 4.2 (placeholder tab) is **NOT blocked** — it proceeds regardless of spike outcome; Story 4.3 (renderer) is gated on a GO recommendation

3. **And** the spike does NOT produce any production code — only the findings document at `docs/weaver-tree-spike.md`

4. **And** if the spike result is NO-GO, the report documents the reason clearly so the placeholder message in Story 4.2 accurately reflects the situation

5. **And** if the spike result is GO, the report specifies the data loading strategy so Story 4.3 can be implemented without a second research iteration

## Tasks / Subtasks

- [ ] Task 1: Re-check tunklab.com for Weaver Tree data (AC: #1 — items 1, 2, 3)
  - [ ] Navigate to `https://lastepoch.tunklab.com/` — confirm if SSL 526 is resolved (was temporary as of 2026-05-08 per Story 2.1)
  - [ ] If accessible, search for a Weaver Tree section: look for links titled "Weaver Tree", "Weaver", or similar
  - [ ] Check if Weaver node data is structured with: node IDs, x/y positions, edge connections, point costs
  - [ ] Document: whether data exists, its format, and whether coordinates are present or must be derived

- [ ] Task 2: Check lastepochtools.com for Weaver Tree data (AC: #1 — items 1, 2, 3)
  - [ ] Navigate to `https://www.lastepochtools.com/` — check if a Weaver Tree section exists
  - [ ] Try known URL patterns: `/weaver`, `/weaver-tree`, `/skills/weaver`, `/passive/weaver`
  - [ ] If a Weaver Tree page exists: inspect the page for node grid structure, coordinate data, edge/connection data, point costs
  - [ ] Document: whether data exists, its format, and HTTP accessibility (403 / accessible)

- [ ] Task 3: Check Musholic/PathOfBuildingForLastEpoch for Weaver Tree data (AC: #1 — items 1, 2, 3)
  - [ ] The repo is MIT-licensed and actively maintained (v0.11.0, 2026-04-02) — check if Weaver Tree data is present
  - [ ] Look in the data Lua tables for any `weaver` key or Weaver Tree node definitions
  - [ ] If Weaver data exists: document node count, whether positions/coordinates are included, the schema structure
  - [ ] Check the repo changelog/releases since April 2026 for any Weaver Tree additions
  - [ ] Document findings and note whether Lua → JSON conversion would be feasible

- [ ] Task 4: Search GitHub for other community Weaver Tree data repos (AC: #1 — items 1, 2)
  - [ ] Search GitHub: `last epoch weaver tree data`, `last epoch weaver nodes`, `last epoch weaver json`
  - [ ] Check any results with: machine-readable format (JSON, CSV, Lua), node coordinates, edge data
  - [ ] Check `prowner/last-epoch-data` for Weaver Tree additions since the original game-data spike (was incomplete as of that spike)
  - [ ] Document any viable candidates with URL, license, format, and completeness

- [ ] Task 5: Check Last Epoch wiki for Weaver Tree mechanics (AC: #1 — item 3)
  - [ ] Navigate to the Weaver Tree article on the Last Epoch wiki (`wiki.lastepoch.com` or Fandom)
  - [ ] Document: how many point pools exist, the unlock formula (e.g., "1 point per N character levels"), whether it is truly separate from passive tree points
  - [ ] Note any visual layout description (radial, web, how many tiers) that can inform whether web/radial PixiJS layout is correct
  - [ ] Document wiki URL for attribution in the spike report

- [ ] Task 6: Assess coordinate format compatibility (AC: #1 — item 2)
  - [ ] If any source provides x/y coordinates: determine the coordinate space (pixel-based, grid-based, integer offsets)
  - [ ] Compare against existing `TreeData` type at `src/shared/types/treeData.ts` — node `x`/`y` are world-space integers relative to tree origin 0,0
  - [ ] Determine: can coordinates be used directly, or do they require scaling/transformation?
  - [ ] If no coordinates exist: assess feasibility of algorithmic derivation from a web/radial graph layout (the same approach used for passive/skill trees in Story 1.3b)
  - [ ] Document the compatibility assessment

- [ ] Task 7: Write the spike report (AC: #1–#5)
  - [ ] Create `docs/weaver-tree-spike.md` with these sections:
    1. **Data Sources Evaluated** — table of each source with: URL, Weaver data found (yes/no), format, license, accessibility
    2. **Node Data Format** — if GO: schema of node fields (IDs, coordinates, edges, costs); if NO-GO: what is missing
    3. **Point Pool Mechanics** — exact formula or best confirmed approximation; separate pool confirmed yes/no
    4. **Coordinate Compatibility** — direct use vs. algorithmic derivation; compatibility with `TreeData` type
    5. **GO / NO-GO Recommendation** — explicit one-line verdict for Story 4.3
    6. **Impact on Story 4.2** — confirm placeholder tab proceeds regardless; note what the placeholder text should say
    7. **Impact on Story 4.3** — if GO: data loading strategy, `weaverTreeData` population path; if NO-GO: what Story 4.3 becomes (deferred/cancelled)
  - [ ] Do NOT write any TypeScript, Rust, or configuration files — the report is the only deliverable

## Dev Notes

### This Is a Pure Research Spike — No Code Output

Story 4.1's sole deliverable is `docs/weaver-tree-spike.md`. Do not create or modify any files in `src/`, `src-tauri/`, `lebo/`, or configuration files. The only filesystem change is a new markdown file in `docs/`.

### Context From Prior Research (docs/game-data-source.md)

The game-data spike (Story 1.3a) already evaluated these same sources for passive/skill tree data. Key findings that carry forward:

- **lastepochtools.com**: Returns HTTP 403 to automated requests. Human-readable only. No documented API. No Weaver Tree section was noted at the time of that spike (pre-v1.4 scope).
- **lastepoch.tunklab.com**: Was inaccessible (SSL 526) at the time of the icon spike (2026-05-08). Tunk later described this as a temporary SSL misconfiguration — the site may be back up by now.
- **Musholic/PathOfBuildingForLastEpoch**: MIT license. Covered "all classes" but had 57% unrecognized mods. Positional data availability was not confirmed. This is the highest-priority source to check since it is the most actively maintained and permissively licensed.
- **prowner/last-epoch-data**: Was incomplete and unlicensed as of the prior spike. Low probability of having Weaver Tree data but worth a quick check for updates.

### What "Machine-Readable" Means

For Story 4.3 to be feasible, the Weaver Tree data must be, or be derivable as:
- A list of nodes with: `id: string`, `name: string`, `x: number`, `y: number` (or derivable positions), `maxPoints: number`, `effects: {description, tags}[]`
- A list of edges with: `fromId: string`, `toId: string`

This maps directly to the existing `TreeData` type in `src/shared/types/treeData.ts`. If source data lacks x/y, Story 4.3 would need a layout algorithm step (same as Story 1.3b for passive trees — positions were algorithmically derived there too). This is NOT a blocker for GO, just additional Story 4.3 scope.

### Architecture If Spike Is GO

The architecture is fully defined — Story 4.3 does not need another design spike. From `_bmad-output/planning-artifacts/architecture.md` Decision 7:

| Aspect | Value |
|--------|-------|
| Data field | `useGameDataStore.weaverTreeData: TreeData \| null` — extend `GameDataStore` in `gameDataStore.ts` |
| Allocation tracking | `useBuildStore.weaverAllocations: Record<string, number>` — extend `BuildState` |
| Renderer | Reuse `<SkillTreeCanvas treeLayout="weaver" ... />` with a new `weaverLayout()` function in `pixiRenderer.ts` |
| New feature folder | `src/features/weaver-tree/` — `WeaverTreePlaceholder.tsx` (Story 4.2) + `weaverLayout.ts` (Story 4.3) |
| Tab position | Rightmost tab in center panel tab bar (always present per UX-DR14) |
| Point pool label | `UnspentCounter` above Weaver Tree, separate from passive counter |

### Architecture If Spike Is NO-GO

Story 4.2 still delivers the `WeaverTreePlaceholder.tsx` component with the static message: `"Weaver Tree planning is in research. Data sourcing is in progress."` Story 4.3 is deferred or cancelled. No code changes to `gameDataStore` or `buildStore` are needed for the placeholder path.

### What the Weaver Tree Is (Game Knowledge)

The Weaver Tree is a distinct character progression system in Last Epoch. Key facts from the game:
- It is a separate tree from class passive trees and active skill trees
- Nodes are arranged in a web/radial pattern (concentric rings or radial branches)
- It has its own point pool, separate from passive tree points
- Point acquisition appears tied to character level but the exact formula is not documented in any of the previously reviewed sources
- The Weaver Tree does not belong to any specific class — it is a shared system across all characters
- The tree was added in a patch after 1.0 (likely 1.1 or later); some community tools may not yet have full coverage

### Known PixiJS Layout Constraint

The existing `treeDataTransformer.ts` + `pixiRenderer.ts` pipeline uses world-space x/y integers where (0,0) is the tree root. If Weaver node coordinates are in a different scale (e.g., pixel offsets from a 1920×1080 canvas), they'll need a linear transform to world-space integers. This is straightforward but should be documented in the spike report so Story 4.3 can budget the work.

### Accessibility Note (For Report Section 6)

`WeaverTreePlaceholder.tsx` (Story 4.2) must pass `vitest-axe` with zero violations per UX-DR15. The spike report doesn't need to address this, but Story 4.2 does. The placeholder is just a static div with text — axe compliance is trivial.

### Project Structure Notes

- Output file only: `docs/weaver-tree-spike.md` (alongside `icon-pipeline-spike.md` and `game-data-source.md`)
- No barrel files: if any new TS code were created (it should not be), no `index.ts` re-exports
- No new Zustand stores: `weaverTreeData` extends `gameDataStore.ts`; `weaverAllocations` extends `buildStore.ts` — this is for Story 4.3, not this spike

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 4 overview and Story 4.1 ACs]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Decision 7: Weaver Tree Renderer (Spike-Gated)]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — GameDataStore interface: `weaverTreeData: TreeData | null`]
- [Source: `_bmad-output/project-context.md` — No barrel files, four-store constraint, Tailwind CSS tokens]
- [Source: `docs/game-data-source.md` — Prior spike results for community sources (tunklab, lastepochtools, Musholic repo)]
- [Source: `_bmad-output/implementation-artifacts/2-1-icon-pipeline-research-spike.md` — Spike report format and pattern to follow]
- [Source: `_bmad-output/planning-artifacts/epics.md` — UX-DR14: Weaver Tree tab always present; UX-DR15: vitest-axe on WeaverTreePlaceholder]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

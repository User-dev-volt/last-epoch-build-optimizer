# Story 3.1: Character Level Input and Passive Point Budget Calculation

Status: done

## Story

As a theory-crafter,
I want to enter my character level and see the total available passive points calculated automatically, with an unspent points counter that reflects how many points I have left to allocate,
so that I can plan builds within my actual character's limitations.

## Acceptance Criteria

1. **Given** a new character level field (1–100 numeric input) in the build panel
   **When** the player enters their character level
   **Then** `calculatePassivePoints(level)` in `budgetCalculator.ts` computes the available passive points (approximation: `level + 20`; confirm against community data at implementation) and the result is accessible as a derived value in `useBuildStore`

2. **Given** the character level is set and some passive nodes are allocated
   **When** the `UnspentCounter` component is rendered above the passive tree
   **Then** it shows `availablePassivePoints - allocatedPassivePoints` in `--color-accent-gold` if > 0, or in `--color-text-secondary` if = 0; the `aria-live="polite"` attribute ensures screen reader announcement on change

3. **Given** the character level input field
   **When** rendered
   **Then** it appears on the same row as the `BudgetToggle` switch; the character level label reads "Level" and the field accepts integers 1–100

4. **And** `characterLevel` is stored in `useBuildStore` as part of `BuildState`; it persists with build saves; `migrateBuildState` defaults missing `characterLevel` to `1` for backward compatibility

5. **And** `budgetEnforced: boolean` (default `false`) is stored in `useBuildStore` and `BuildState`; `BudgetToggle` reads/writes this value; enforcement logic is **not** added in this story (that is Story 3.3)

6. **And** `budgetCalculator.ts` is at `src/shared/utils/budgetCalculator.ts` (no barrel file) and exports `calculatePassivePoints(level: number): number`

7. **And** `UnspentCounter` is at `src/features/skill-tree/UnspentCounter.tsx`; it passes vitest-axe with zero violations (UX-DR15)

8. **And** `BudgetToggle` is at `src/features/skill-tree/BudgetToggle.tsx`; it passes vitest-axe with zero violations (UX-DR15)

9. **And** `UnspentCounter` shows "(Budget off)" label in `--color-text-muted` when `budgetEnforced` is `false`, so players know enforcement is inactive (UX-DR7)

## Tasks / Subtasks

- [x] Task 1: Add `characterLevel` and `budgetEnforced` to `BuildState` and `useBuildStore` (AC: #4, #5)
  - [x] In `src/shared/types/build.ts`: add `characterLevel: number` and `budgetEnforced: boolean` to `BuildState` interface
  - [x] In `src/shared/stores/buildStore.ts`: add `setCharacterLevel(level: number): void` and `setBudgetEnforced(v: boolean): void` actions to the `BuildStore` interface
  - [x] In `buildStore.ts`: implement both setters using `set()`; initialize both in `createBuild()`: `characterLevel: 1`, `budgetEnforced: false`
  - [x] In the `applyNodeChange` auto-create path (lines 86-103): also set `characterLevel: 1` and `budgetEnforced: false` in the newly created build
  - [x] In `src/features/build-manager/buildPersistence.ts` → `migrateBuildState`: add `characterLevel: typeof obj.characterLevel === 'number' ? obj.characterLevel : 1` and `budgetEnforced: typeof obj.budgetEnforced === 'boolean' ? obj.budgetEnforced : false` to the returned object

- [x] Task 2: Create `budgetCalculator.ts` (AC: #6)
  - [x] Create `src/shared/utils/budgetCalculator.ts`
  - [x] Export `calculatePassivePoints(level: number): number` — returns `level + 20` as approximation; add a single-line comment with the Last Epoch source if confirmed otherwise during implementation
  - [x] Export `calculateSkillPoints(level: number): number` — stub returning `level` (used by Story 3.2; export it now to avoid Story 3.2 needing to re-edit the file)

- [x] Task 3: Create `UnspentCounter.tsx` (AC: #2, #7, #9)
  - [x] Create `src/features/skill-tree/UnspentCounter.tsx`
  - [x] Props: `count: number`, `treeType: 'passive' | 'skill'`, `budgetEnforced: boolean`
  - [x] Render as a `<span>` (or `<div>`) with `aria-live="polite"` and `aria-label={\`Unspent \${treeType} points: \${count}\`}`
  - [x] Color: `var(--color-accent-gold)` when `count > 0`, `var(--color-text-secondary)` when `count === 0`
  - [x] When `budgetEnforced === false`: append `" (Budget off)"` in a `<span>` styled with `color: var(--color-text-muted)` at smaller size
  - [x] Create `src/features/skill-tree/UnspentCounter.test.tsx` — test: renders count in gold, renders "(Budget off)" label, aria-live attribute present, axe check

- [x] Task 4: Create `BudgetToggle.tsx` (AC: #3, #5, #8)
  - [x] Create `src/features/skill-tree/BudgetToggle.tsx`
  - [x] Use **Headless UI `Switch`** (already installed: `@headlessui/react 2.2.10`)
  - [x] Layout: single row `flex items-center gap-3` containing:
    - Left: `<label>` "Level" + `<input type="number" min={1} max={100}>` (28px height, 56px wide, same styling as existing inputs: bg `var(--color-bg-elevated)`, border `var(--color-bg-elevated)` → `var(--color-accent-gold)` on focus, text `var(--color-text-primary)`)
    - Right: `<Switch>` from Headless UI with label "Enforce Level Budget"
  - [x] Reads from `useBuildStore`: `activeBuild?.characterLevel ?? 1` and `activeBuild?.budgetEnforced ?? false`
  - [x] Writes via: `setCharacterLevel(value)` on level input change (clamp to 1–100), `setBudgetEnforced(v)` on switch toggle
  - [x] Guard: only renders when `activeBuild !== null`
  - [x] Switch styling: gold background when `checked=true` (`var(--color-accent-gold)`), muted when `false` (`var(--color-bg-elevated)`); 2px gold focus ring on the switch thumb per NFR12
  - [x] Create `src/features/skill-tree/BudgetToggle.test.tsx` — test: renders level input and switch, level change calls `setCharacterLevel`, switch toggle calls `setBudgetEnforced`, axe check

- [x] Task 5: Integrate into `SkillTreeView.tsx` (AC: #1, #2, #3)
  - [x] Import `BudgetToggle`, `UnspentCounter`, `calculatePassivePoints` from their paths
  - [x] Read from store: `const characterLevel = useBuildStore(s => s.activeBuild?.characterLevel ?? 1)` and `const budgetEnforced = useBuildStore(s => s.activeBuild?.budgetEnforced ?? false)`
  - [x] Compute `allocatedPassivePoints`: `Object.values(baseAllocatedNodes).reduce((sum, v) => sum + v, 0)` — use `baseAllocatedNodes` (not preview) so the counter reflects actual allocation, not preview
  - [x] Compute `unspentPassivePoints = calculatePassivePoints(characterLevel) - allocatedPassivePoints`
  - [x] In the passive tab render path, **before `{showControls && <TreeControls .../>}`**, add a conditional row
  - [x] Do NOT modify `TreeControls.tsx` — add the new row as a sibling above it

- [x] Task 6: Create `budgetCalculator.test.ts` (AC: #6)
  - [x] Create `src/shared/utils/budgetCalculator.test.ts`
  - [x] Test `calculatePassivePoints`: level 1 → 21, level 50 → 70, level 100 → 120
  - [x] Test `calculateSkillPoints`: level 1 → 1, level 20 → 20

- [x] Task 7: Update `buildStore.test.ts` (AC: #4, #5)
  - [x] Verify `createBuild` initializes `characterLevel: 1` and `budgetEnforced: false`
  - [x] Verify `setCharacterLevel` updates `activeBuild.characterLevel`
  - [x] Verify `setBudgetEnforced` updates `activeBuild.budgetEnforced`

## Dev Notes

### Current `BuildState` and `BuildStore` — What Changes and What to Preserve

**Current `BuildState` interface** (`src/shared/types/build.ts` lines 19-35): has `schemaVersion: 1` as a literal type. Add `characterLevel: number` and `budgetEnforced: boolean` as new fields. The `schemaVersion` stays at `1` — Epic 6 handles the formal v1→v2 schema migration; these fields are additive now and will be incorporated into v2 when Epic 6 runs.

**Current `buildStore.ts` `createBuild()`** (lines 58-79): initializes the build object literal inline. Add both new fields here. Also add them to the auto-create path inside `applyNodeChange` (lines 86-103) — this path creates a build on first node click; it must also include the new fields.

**`migrateBuildState`** (`buildPersistence.ts` lines 6-33): currently maps raw JSON to `BuildState`. Extend the returned object with the two new fields using `typeof` guards to default missing fields. Pattern to follow (line 17-19 shows the existing pattern):
```typescript
characterLevel: typeof obj.characterLevel === 'number' ? obj.characterLevel : 1,
budgetEnforced: typeof obj.budgetEnforced === 'boolean' ? obj.budgetEnforced : false,
```

### `useBuildStore` Zustand Pattern

**Do not use `immer` middleware.** Store uses `create<Interface>()((set, get) => ...)` pattern with inline function bodies (lines 42-312). Setters look like:
```typescript
setCharacterLevel: (level) =>
  set((s) =>
    s.activeBuild
      ? { activeBuild: { ...s.activeBuild, characterLevel: level, isPersisted: false, updatedAt: new Date().toISOString() } }
      : {}
  ),
setBudgetEnforced: (v) =>
  set((s) =>
    s.activeBuild
      ? { activeBuild: { ...s.activeBuild, budgetEnforced: v, isPersisted: false, updatedAt: new Date().toISOString() } }
      : {}
  ),
```
Note: `isPersisted: false` + `updatedAt` update are required so the save button re-activates after changing level/toggle — follow the pattern of `updateContextGear` (lines 271-283).

### Headless UI Switch Pattern

`@headlessui/react 2.2.10` is installed. For the `Switch`:
```tsx
import { Switch } from '@headlessui/react'

<Switch
  checked={budgetEnforced}
  onChange={setBudgetEnforced}
  className={...}
  aria-label="Enforce level budget"
>
  {/* render prop optional in HUI 2.x — can be empty */}
</Switch>
```
The `Switch` already has full ARIA switch semantics (`role="switch"`, `aria-checked`). Style with inline styles using CSS variables — no `@apply` (Tailwind v4 dropped reliable `@apply` support for custom properties).

Gold active / muted inactive pattern matching existing buttons in `LeftPanel.tsx`:
```typescript
style={{
  width: 36,
  height: 20,
  borderRadius: 10,
  backgroundColor: budgetEnforced ? 'var(--color-accent-gold)' : 'var(--color-bg-elevated)',
  border: '1px solid',
  borderColor: budgetEnforced ? 'var(--color-accent-gold)' : 'var(--color-bg-elevated)',
  cursor: 'pointer',
  // focus ring is provided by :focus-visible in global.css — do NOT add outline: none
}}
```

### `SkillTreeView.tsx` Integration Points

- `baseAllocatedNodes` already exists (line 113): `const baseAllocatedNodes = activeBuild?.nodeAllocations ?? EMPTY_ALLOCATED` — use this for the passive points calculation, not `nodeAllocations` (which may contain preview state).
- The new row goes between the `activeSkill` header block (lines 382-399) and `{showControls && <TreeControls .../>}` (line 401). Only render when `isPassiveTab && activeBuild !== null`.
- `activeBuild` is already subscribed (line 60).
- Add two new `useBuildStore` selectors alongside existing ones (lines 56-75 area).

### `UnspentCounter` — Key Behaviors

- `count` can go negative if a loaded build has more allocations than the current level allows (possible with brownfield saves). Render negative counts as-is — clamping/blocking is Story 3.3's job.
- `treeType` prop drives the `aria-label`: `"Unspent passive points: 14"` vs `"Unspent skill points: 3"`.
- Story 3.2 will add a second `UnspentCounter` instance for skill tabs with `treeType="skill"`. Design the component to be reusable for both without changes.

### No Skill Tab Changes in This Story

This story only touches the **passive tab** counter. Skill tab budget counters are Story 3.2. The `BudgetToggle` row only renders on the passive tab (`isPassiveTab && activeBuild !== null`).

### Testing Patterns to Follow

From `pixiRenderer.test.ts` and `ContextPanel.test.tsx`:
- Mock Tauri IPC: `vi.mock('../../shared/utils/invokeCommand', () => ({ invokeCommand: vi.fn() }))`
- Mock `useBuildStore`: `vi.mock('../../shared/stores/buildStore', () => ({ useBuildStore: vi.fn() }))`
- Use `@testing-library/react` `render` + `screen` + `fireEvent`
- Axe: `import { axe } from 'vitest-axe'` then `expect(await axe(container)).toHaveNoViolations()`
- No snapshot tests — explicit `expect` assertions only

### File List

- `lebo/src/shared/types/build.ts` — modified (add `characterLevel`, `budgetEnforced` to `BuildState`)
- `lebo/src/shared/stores/buildStore.ts` — modified (add fields, setters, init in createBuild + applyNodeChange auto-create)
- `lebo/src/features/build-manager/buildPersistence.ts` — modified (`migrateBuildState` handles new fields)
- `lebo/src/shared/utils/budgetCalculator.ts` — NEW
- `lebo/src/shared/utils/budgetCalculator.test.ts` — NEW
- `lebo/src/features/skill-tree/UnspentCounter.tsx` — NEW
- `lebo/src/features/skill-tree/UnspentCounter.test.tsx` — NEW
- `lebo/src/features/skill-tree/BudgetToggle.tsx` — NEW
- `lebo/src/features/skill-tree/BudgetToggle.test.tsx` — NEW
- `lebo/src/features/skill-tree/SkillTreeView.tsx` — modified (add BudgetToggle row + UnspentCounter above passive TreeControls)
- `lebo/src/shared/stores/buildStore.test.ts` — modified (add tests for new fields/setters)

### Project Context Rules Applicable

- No barrel files — `budgetCalculator.ts`, `UnspentCounter.tsx`, `BudgetToggle.tsx` are imported directly
- No raw `invoke()` — this story adds no Tauri IPC calls
- No new Zustand stores — extend `useBuildStore` only
- TypeScript strict mode — `noUnusedLocals`: all new props/params must be used or TypeScript will reject the build
- `schemaVersion` stays `1` — Epic 6 owns the v2 migration; these are additive fields
- `isPersisted: false` + `updatedAt` must be set on any `BuildState` mutation so auto-save triggers correctly
- No `@apply` in any CSS — use inline `style={{}}` with CSS variable references

### References

- [Source: epics.md#Story 3.1]
- [Source: epics.md#UX-DR7] — UnspentCounter: aria-live, gold/muted colors, "(Budget off)" label
- [Source: epics.md#UX-DR8] — BudgetToggle: Headless UI Switch, Level input on same row, gold active state
- [Source: epics.md#FR18, FR20, FR21, FR22] — budget formula, toggle default, free theory-craft, immediate counter update
- [Source: epics.md#NFR12] — 2px gold focus ring on all interactive elements
- [Source: epics.md#NFR17] — vitest-axe zero violations
- [Source: project-context.md#Framework-Specific Rules] — Zustand store pattern, no immer, props-only SkillTreeCanvas
- `buildStore.ts` lines 58-79 — `createBuild` init pattern
- `buildStore.ts` lines 86-103 — auto-create path inside `applyNodeChange`
- `buildPersistence.ts` lines 6-33 — `migrateBuildState` field mapping pattern
- `SkillTreeView.tsx` lines 113, 346 — `baseAllocatedNodes` and `activeAllocations`
- `SkillTreeView.tsx` lines 382-410 — insertion point for budget row (between skill header and TreeControls)
- `LeftPanel.tsx` lines 53-68 — gold/muted button style pattern to match

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- All 7 tasks complete. 76 new/modified tests pass (4 test files).
- `characterLevel` and `budgetEnforced` added to `BuildState` interface, `createBuild`, `applyNodeChange` auto-create path, and `migrateBuildState` migration with `typeof` guards for backward compatibility.
- `budgetCalculator.ts` exports `calculatePassivePoints` (level + 20 approximation) and `calculateSkillPoints` stub for Story 3.2.
- `UnspentCounter` is tree-type agnostic — renders gold/secondary based on count, shows "(Budget off)" label when enforcement is off, `aria-live="polite"` for screen reader support.
- `BudgetToggle` uses Headless UI `Switch` with inline CSS variable styles; level input clamps to 1–100; guard prevents render when `activeBuild` is null.
- Budget row inserted in `SkillTreeView` using an IIFE pattern to compute `unspentPassivePoints` inline — only renders on passive tab when `activeBuild` is non-null.
- Pre-existing test failures in `ProviderSelector.test.tsx` and `Settings.test.tsx` (6 tests) confirmed pre-existing via git stash verification; not caused by this story.

### File List

- `lebo/src/shared/types/build.ts` — modified (added `characterLevel`, `budgetEnforced` to `BuildState`)
- `lebo/src/shared/stores/buildStore.ts` — modified (added fields, setters, init in `createBuild` + `applyNodeChange` auto-create)
- `lebo/src/features/build-manager/buildPersistence.ts` — modified (`migrateBuildState` handles new fields)
- `lebo/src/shared/utils/budgetCalculator.ts` — NEW
- `lebo/src/shared/utils/budgetCalculator.test.ts` — NEW
- `lebo/src/features/skill-tree/UnspentCounter.tsx` — NEW
- `lebo/src/features/skill-tree/UnspentCounter.test.tsx` — NEW
- `lebo/src/features/skill-tree/BudgetToggle.tsx` — NEW
- `lebo/src/features/skill-tree/BudgetToggle.test.tsx` — NEW
- `lebo/src/features/skill-tree/SkillTreeView.tsx` — modified (imports + selectors + budget row above TreeControls)
- `lebo/src/shared/stores/buildStore.test.ts` — modified (updated fixtures + new tests for `createBuild`, `setCharacterLevel`, `setBudgetEnforced`)

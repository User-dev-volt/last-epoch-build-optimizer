# Story 3.2: Active Skill Level Input and Per-Skill Tree Budget

Status: ready-for-dev

## Story

As a theory-crafter,
I want to enter my active skill's level per slot and see the skill tree's point budget update accordingly, with an accurate unspent counter for each skill tab,
so that my skill tree planning reflects the actual number of points I have in that skill.

## Acceptance Criteria

1. **Given** each active skill tab has an adjacent skill level input (1–20 numeric field)
   **When** the player changes a skill's level
   **Then** `calculateSkillPoints(level)` in `budgetCalculator.ts` computes the max allocatable points for that skill tree (formula confirmed at implementation; current stub: 1 point per level); the result drives the `UnspentCounter` for that slot

2. **Given** a skill tab is active and has a skill assigned
   **When** the `UnspentCounter` is rendered in the skill tab budget row
   **Then** it shows `calculateSkillPoints(activeSkillLevels[slotId]) - allocatedSkillPoints[slotId]` with the same gold/muted color behavior as the passive counter; `budgetEnforced` prop reads from `activeBuild.budgetEnforced`

3. **Given** the skill level input is 20 (maximum)
   **When** the counter is shown
   **Then** the maximum skill tree budget is reflected correctly

4. **And** `activeSkillLevels: Record<string, number>` is stored in `BuildState` and persists with build saves; `migrateBuildState` defaults missing `activeSkillLevels` to `{}` for backward compatibility

5. **And** `calculateSkillPoints` is exported from `budgetCalculator.ts` alongside `calculatePassivePoints`; `calculateSkillPoints` is not a stub — it returns the correct point budget (confirm formula against Last Epoch game data or community source; annotate with citation comment)

6. **And** `SkillLevelInput` is at `src/features/skill-tree/SkillLevelInput.tsx`; it passes vitest-axe with zero violations (UX-DR15)

7. **And** the skill tab budget row replaces the current `<LevelDisplay>` with `<SkillLevelInput>` for slots that have an assigned skill; `<LevelDisplay>` is removed from the skill tab row and deleted if no longer referenced

8. **And** `activeSkillLevels[slotId]` defaults to `1` for any slot not yet set; unspent counter may go negative for brownfield saves — render as-is (clamping/blocking is Story 3.3)

## Tasks / Subtasks

- [ ] Task 1: Add `activeSkillLevels` to `BuildState` and `useBuildStore` (AC: #4)
  - [ ] In `src/shared/types/build.ts`: add `activeSkillLevels: Record<string, number>` to `BuildState` interface
  - [ ] In `src/shared/stores/buildStore.ts`: add `setSkillLevel(slotId: string, level: number): void` to the `BuildStore` interface
  - [ ] In `buildStore.ts`: implement `setSkillLevel` using `set()` — spread `activeBuild.activeSkillLevels` with the new entry, set `isPersisted: false` and `updatedAt`; guard: only mutate if `activeBuild !== null`
  - [ ] In `createBuild()` (line 70): initialize `activeSkillLevels: {}`
  - [ ] In `applyNodeChange` auto-create path (line 112): also set `activeSkillLevels: {}`
  - [ ] In `src/features/build-manager/buildPersistence.ts` → `migrateBuildState`: add `activeSkillLevels` migration — validate it's an object, default to `{}`

- [ ] Task 2: Confirm and finalize `calculateSkillPoints` (AC: #5)
  - [ ] Verify the Last Epoch skill point formula against community data (Last Epoch wiki or datamine); the current stub `return level` may be correct (1 point per level, 1–20), but must be confirmed with a citation comment
  - [ ] If the formula differs from the stub, update `calculateSkillPoints` in `src/shared/utils/budgetCalculator.ts` and adjust `budgetCalculator.test.ts` accordingly
  - [ ] Add `export const MAX_SKILL_LEVEL = 20` and `export const MAX_SKILL_POINTS = calculateSkillPoints(MAX_SKILL_LEVEL)` constants to `budgetCalculator.ts`
  - [ ] Update `src/shared/utils/budgetCalculator.test.ts`: add tests for `calculateSkillPoints` at levels 1, 10, 20; add tests for `MAX_SKILL_LEVEL` and `MAX_SKILL_POINTS`; remove the stub comment from the function

- [ ] Task 3: Create `SkillLevelInput.tsx` (AC: #6)
  - [ ] Create `src/features/skill-tree/SkillLevelInput.tsx`
  - [ ] Props: `slotId: string` — reads `activeSkillLevels[slotId] ?? 1` from `useBuildStore`, writes via `setSkillLevel`
  - [ ] Controlled input pattern identical to the level input in `BudgetToggle.tsx`: local `inputValue: string` state; `onChange` updates local state only; `onBlur` and `onKeyDown Enter` clamp (1–`MAX_SKILL_LEVEL`) and write to store; `onKeyDown Escape` reverts to stored value; `useEffect` syncs local state from store when external changes occur (build switch, undo) and input is not focused
  - [ ] Track focus with `isFocused` boolean state; toggle `outline: '2px solid var(--color-accent-gold)'` on the input's inline style via `onFocus`/`onBlur` (NFR12)
  - [ ] Label: "Skill Lv." prepended as a `<span>` styled `color: var(--color-text-muted)`, `fontSize: 12`; input is 28px height, ~48px wide, same styling as `BudgetToggle`'s level input
  - [ ] Guard: only renders when `activeBuild !== null`; use `import { MAX_SKILL_LEVEL } from '../../shared/utils/budgetCalculator'`
  - [ ] Create `src/features/skill-tree/SkillLevelInput.test.tsx`: test: renders label and input, value change commits on blur, clear-then-blur defaults to 1, Enter commits, Escape reverts, external store change syncs while not focused, axe check

- [ ] Task 4: Update `SkillTreeView.tsx` skill tab budget row (AC: #1, #2, #3, #7)
  - [ ] Import `SkillLevelInput` from `./SkillLevelInput`, `calculateSkillPoints` from `../../shared/utils/budgetCalculator`
  - [ ] Remove the `LevelDisplay` import and component render from the skill tab budget row
  - [ ] Add selector: `const skillLevel = useBuildStore(s => slotId ? (s.activeBuild?.activeSkillLevels[slotId] ?? 1) : 1)` — note: `slotId` is computed before selectors in the current render flow; use a stable fallback
  - [ ] Compute `allocatedSkillPoints = Object.values(slotAllocations).reduce((sum, v) => sum + v, 0)` — `slotAllocations` already exists at line 165
  - [ ] Compute `unspentSkillPoints = calculateSkillPoints(skillLevel) - allocatedSkillPoints`
  - [ ] In the skill tab budget row (currently lines 415–419): replace `<LevelDisplay characterLevel={characterLevel} />` with `<SkillLevelInput slotId={slotId!} />` and append `<UnspentCounter count={unspentSkillPoints} treeType="skill" budgetEnforced={budgetEnforced} />`; guard the whole row on `!isPassiveTab && activeBuild && slotId && activeSkill`
  - [ ] Remove `<LevelDisplay>` from the skill tab budget row; delete `LevelDisplay.tsx` and `LevelDisplay.test.tsx` **only if** no other file references the component (grep first)

- [ ] Task 5: Update `buildStore.test.ts` (AC: #4)
  - [ ] Verify `createBuild` initializes `activeSkillLevels: {}`
  - [ ] Verify `setSkillLevel` sets `activeBuild.activeSkillLevels['slot-0']` and sets `isPersisted: false`
  - [ ] Update `makeBuild()` / `MOCK_BUILD` fixture helper to include `activeSkillLevels: {}`

- [ ] Task 6: Update fixture mocks across test files (AC: #4)
  - [ ] Add `activeSkillLevels: {}` to every test fixture that constructs a `BuildState` — grep for `schemaVersion: 1` to find all fixture sites
  - [ ] Update `buildPersistence.test.ts`: add `activeSkillLevels` to `mockBuild`; add a migration test that defaults missing `activeSkillLevels` to `{}`

## Dev Notes

### What Story 3.1 Delivered — Build On These

- `calculateSkillPoints(level: number): number` **already exists** in `budgetCalculator.ts` as a stub returning `level`. Task 2 confirms/updates the formula — do not rewrite, just verify and annotate.
- `MAX_CHARACTER_LEVEL = 100`, `MAX_PASSIVE_POINTS = 98` already exported from `budgetCalculator.ts`.
- `UnspentCounter` at `src/features/skill-tree/UnspentCounter.tsx` is already reusable for `treeType="skill"` — no changes needed to the component itself.
- `budgetEnforced` is already in `BuildState` and `useBuildStore`; `setBudgetEnforced` is already implemented.
- `LevelDisplay` at `src/features/skill-tree/LevelDisplay.tsx` shows `Lv. {characterLevel}` read-only. Story 3.2 replaces it in the skill tab row with `SkillLevelInput`. Delete it after replacement if nothing else references it.

### `BuildState` — What to Add

Current interface (`src/shared/types/build.ts`):
```typescript
export interface BuildState {
  schemaVersion: 1
  id: string
  name: string
  classId: string
  masteryId: string
  characterLevel: number
  budgetEnforced: boolean
  nodeAllocations: Record<string, number>
  skillNodeAllocations: Record<string, Record<string, number>>
  activeSkillLevels: Record<string, number>   // ADD THIS
  contextData: { gear: GearItem[]; skills: ActiveSkill[]; idols: IdolItem[] }
  isPersisted: boolean
  createdAt: string
  updatedAt: string
}
```

`schemaVersion` stays `1` — Epic 6 owns the v2 migration. This is an additive field.

### `setSkillLevel` Pattern

Follow `setCharacterLevel` exactly (lines 89–94 in `buildStore.ts`):
```typescript
setSkillLevel: (slotId, level) =>
  set((s) =>
    s.activeBuild
      ? {
          activeBuild: {
            ...s.activeBuild,
            activeSkillLevels: { ...s.activeBuild.activeSkillLevels, [slotId]: level },
            isPersisted: false,
            updatedAt: new Date().toISOString(),
          },
        }
      : {}
  ),
```

### `migrateBuildState` Pattern

Existing field migration pattern from lines 17–18 in `buildPersistence.ts`:
```typescript
activeSkillLevels:
  typeof obj.activeSkillLevels === 'object' && obj.activeSkillLevels !== null
    ? (obj.activeSkillLevels as Record<string, number>)
    : {},
```

### `SkillLevelInput` — Controlled Input Pattern

Copy the controlled-input pattern verbatim from `BudgetToggle.tsx` for its level `<input>`:
- Local `inputValue: string` state initialized from `activeSkillLevels[slotId] ?? 1`
- `onChange`: set local state, no store write
- `onBlur`: parse → clamp → `setSkillLevel(slotId, clamped)` → reset local state
- `onKeyDown Enter`: same as `onBlur`; set a `justCommittedRef` so subsequent blur skips the commit
- `onKeyDown Escape`: restore local state from current store value; blur without commit
- `useEffect`: when store's `activeSkillLevels[slotId]` changes AND input is not focused, sync `inputValue`
- Focus ring: `isFocused` boolean state → `outline: '2px solid var(--color-accent-gold)'` on `onFocus`/`onBlur`

Clamp bounds: `Math.min(MAX_SKILL_LEVEL, Math.max(1, parsed))`. Import `MAX_SKILL_LEVEL` from `budgetCalculator.ts`.

### `SkillTreeView.tsx` — Selector Ordering Constraint

`slotId` is computed at line 162: `const slotId = isPassiveTab ? null : \`slot-\${safeTabIndex - 1}\``

Zustand `useBuildStore` selectors are called unconditionally (hooks rules). The skill level selector must use a fallback for `slotId === null`:
```typescript
const skillLevel = useBuildStore(
  (s) => slotId ? (s.activeBuild?.activeSkillLevels[slotId] ?? 1) : 1
)
```
Place this selector alongside the other `useBuildStore` calls in the selectors block (lines 61–76).

Compute unspent points **below the early returns** (after line 352), alongside `allocatedPassivePoints`:
```typescript
const allocatedSkillPoints = Object.values(slotAllocations).reduce((sum, v) => sum + v, 0)
const unspentSkillPoints = calculateSkillPoints(skillLevel) - allocatedSkillPoints
```

`slotAllocations` is already computed at line 165: `const slotAllocations = slotId ? (skillNodeAllocations[slotId] ?? EMPTY_ALLOCATED) : EMPTY_ALLOCATED`

### Updated Skill Tab Budget Row

Current render (lines 415–419):
```tsx
} : !isPassiveTab && activeBuild ? (
  <div style={{ display: 'flex', alignItems: 'center', padding: '4px 12px', height: 36, borderBottom: '1px solid var(--color-bg-elevated)' }}>
    <LevelDisplay characterLevel={characterLevel} />
  </div>
) : null}
```

Replacement (guard on `activeSkill` so the row only shows when a skill is assigned):
```tsx
} : !isPassiveTab && activeBuild && slotId && activeSkill ? (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', height: 36, borderBottom: '1px solid var(--color-bg-elevated)' }}>
    <SkillLevelInput slotId={slotId} />
    <UnspentCounter count={unspentSkillPoints} treeType="skill" budgetEnforced={budgetEnforced} />
  </div>
) : null}
```

### `LevelDisplay` Deletion

After replacing `LevelDisplay` in `SkillTreeView.tsx`, grep for `LevelDisplay` across the whole project. If the only hits are the component file itself and its test file, delete both:
- `lebo/src/features/skill-tree/LevelDisplay.tsx`
- `lebo/src/features/skill-tree/LevelDisplay.test.tsx`

### Testing Patterns

Follow patterns from `BudgetToggle.test.tsx` (for `SkillLevelInput`):
- Mock `useBuildStore`: `vi.mock('../../shared/stores/buildStore', () => ({ useBuildStore: vi.fn() }))`
- Supply store state via `vi.mocked(useBuildStore).mockImplementation(selector => selector(mockStore))`
- `fireEvent.change(input, { target: { value: '15' } })` to test typing
- `fireEvent.blur(input)` to trigger commit
- `fireEvent.keyDown(input, { key: 'Enter' })` to test Enter commit
- `fireEvent.keyDown(input, { key: 'Escape' })` to test revert
- Axe: `expect(await axe(container)).toHaveNoViolations()`

### File List

- `lebo/src/shared/types/build.ts` — modified (add `activeSkillLevels` to `BuildState`)
- `lebo/src/shared/stores/buildStore.ts` — modified (add `setSkillLevel` to interface + implementation; initialize in `createBuild` + `applyNodeChange` auto-create path)
- `lebo/src/features/build-manager/buildPersistence.ts` — modified (`migrateBuildState` handles `activeSkillLevels`)
- `lebo/src/shared/utils/budgetCalculator.ts` — modified (confirm formula, add `MAX_SKILL_LEVEL`, `MAX_SKILL_POINTS`)
- `lebo/src/shared/utils/budgetCalculator.test.ts` — modified (add skill point tests, constants tests)
- `lebo/src/features/skill-tree/SkillLevelInput.tsx` — NEW
- `lebo/src/features/skill-tree/SkillLevelInput.test.tsx` — NEW
- `lebo/src/features/skill-tree/SkillTreeView.tsx` — modified (import SkillLevelInput, add selector, compute unspent skill points, update skill tab budget row)
- `lebo/src/shared/stores/buildStore.test.ts` — modified (add `activeSkillLevels` to fixture, add `setSkillLevel` tests)
- `lebo/src/features/build-manager/buildPersistence.test.ts` — modified (add `activeSkillLevels` to mockBuild, add migration test)
- Various test fixtures — modified (add `activeSkillLevels: {}` wherever `BuildState` is constructed)
- `lebo/src/features/skill-tree/LevelDisplay.tsx` — DELETED (if no other references)
- `lebo/src/features/skill-tree/LevelDisplay.test.tsx` — DELETED (if no other references)

### Project Context Rules

- No barrel files — `SkillLevelInput.tsx` imported directly
- No raw `invoke()` — this story adds no Tauri IPC calls
- `isPersisted: false` + `updatedAt` must be set on any `BuildState` mutation
- TypeScript strict mode: all new props/params must be used
- `schemaVersion` stays `1` — Epic 6 owns the v2 migration
- No `@apply` in CSS — inline `style={{}}` with CSS variable references

### References

- [Source: epics.md#Story 3.2]
- [Source: epics.md#FR19, FR22] — per-slot skill level input, immediate counter update
- [Source: epics.md#UX-DR15] — vitest-axe zero violations
- [Source: epics.md#NFR12] — 2px gold focus ring on all interactive elements
- `buildStore.ts` lines 89–94 — `setCharacterLevel` pattern to follow for `setSkillLevel`
- `buildStore.ts` lines 64–87 — `createBuild()` init pattern
- `buildStore.ts` lines 108–130 — `applyNodeChange` auto-create path
- `buildPersistence.ts` lines 17–18 — `migrateBuildState` field mapping pattern
- `BudgetToggle.tsx` — controlled input pattern for `SkillLevelInput`
- `budgetCalculator.ts` — existing constants and function exports
- `SkillTreeView.tsx` lines 61–76 — selector block location
- `SkillTreeView.tsx` line 162 — `slotId` derivation
- `SkillTreeView.tsx` line 165 — `slotAllocations` derivation
- `SkillTreeView.tsx` lines 352–355 — existing `allocatedPassivePoints` / `unspentPassivePoints` pattern
- `SkillTreeView.tsx` lines 391–419 — skill tab header and budget row structure

# Story 6.2: Optimization Preset Migration and Build Persistence Integration

Status: ready-for-dev

## Story

As a theory-crafter,
I want my Phase 1 builds to load cleanly in Phase 2 with their optimization goal migrated to the equivalent slider position, and all Phase 1 build management features to continue working,
so that I don't lose any saved builds or data when upgrading to Phase 2.

## Acceptance Criteria

**AC1 — `"Maximize Damage"` preset maps to sliderPosition 100:**
Given a Phase 1 build with `goalPreset: "Maximize Damage"`,
when `migrateBuildState` runs,
then `sliderPosition = 100` and `fineTuneWeights = null` are set on the result, and `goalPreset` does not appear on the returned `BuildState`.

**AC2 — `"Maximize Survivability"` preset maps to sliderPosition 0:**
Given a Phase 1 build with `goalPreset: "Maximize Survivability"`,
when `migrateBuildState` runs,
then `sliderPosition = 0` and `fineTuneWeights = null` are set.

**AC3 — `"Balanced"` preset maps to sliderPosition 50:**
Given a Phase 1 build with `goalPreset: "Balanced"`,
when `migrateBuildState` runs,
then `sliderPosition = 50` and `fineTuneWeights = null` are set.

**AC4 — `"Maximize Speed"` preset maps to fineTuneWeights:**
Given a Phase 1 build with `goalPreset: "Maximize Speed"`,
when `migrateBuildState` runs,
then `sliderPosition = 50` and `fineTuneWeights = { damage: 25, survivability: 0, speed: 75 }` are set.

**AC5 — null/missing goalPreset defaults to Balanced:**
Given a Phase 1 build with `goalPreset` absent or `null`,
when `migrateBuildState` runs,
then `sliderPosition = 50` and `fineTuneWeights = null` are set (Balanced default).

**AC6 — v2 build passthrough preserves sliderPosition/fineTuneWeights:**
Given a v2 build with `sliderPosition: 100` and `fineTuneWeights: null` already set,
when `migrateBuildState` runs (idempotency path),
then `sliderPosition` and `fineTuneWeights` are preserved from the saved data (not reset to defaults).

**AC7 — v2 build passthrough sets defaults when fields absent:**
Given a v2 build saved before this story (no `sliderPosition` field),
when `migrateBuildState` runs,
then `sliderPosition` defaults to `50` and `fineTuneWeights` defaults to `null`.

**AC8 — `migrateBuildState` already called in loadBuild — no regression:**
Given Phase 1 build management operations (save, load, rename, delete),
when exercised in Phase 2,
then all operations work correctly with no regression (FR53); `loadBuild` continues to call `migrateBuildState` on every SQLite load, ensuring no v1 build ever reaches `useBuildStore` without migration.

## Tasks / Subtasks

- [ ] Task 1: Add `FineTuneWeights` to `src/shared/types/optimization.ts` (AC1–AC7)
  - [ ] 1.1: Export `interface FineTuneWeights { damage: number; survivability: number; speed: number }` from `optimization.ts`

- [ ] Task 2: Add `sliderPosition` and `fineTuneWeights` to `BuildState` in `src/shared/types/build.ts` (AC1–AC7)
  - [ ] 2.1: Import `FineTuneWeights` from `./optimization`
  - [ ] 2.2: Add `sliderPosition?: number` to `BuildState` (optional — avoids cascading changes across all existing `BuildState` constructions in tests and `buildStore.ts`)
  - [ ] 2.3: Add `fineTuneWeights?: FineTuneWeights | null` to `BuildState` (optional for same reason)

- [ ] Task 3: Extend `migrateBuildState` in `src/features/build-manager/buildPersistence.ts` (AC1–AC7)
  - [ ] 3.1: Import `FineTuneWeights` from `../../shared/types/optimization`
  - [ ] 3.2: Add `goalPreset` → slider mapping helper (inline or small private function):
    - `"Maximize Damage"` → `{ sliderPosition: 100, fineTuneWeights: null }`
    - `"Maximize Survivability"` → `{ sliderPosition: 0, fineTuneWeights: null }`
    - `"Maximize Speed"` → `{ sliderPosition: 50, fineTuneWeights: { damage: 25, survivability: 0, speed: 75 } }`
    - `"Balanced"` (or null/missing/unrecognised) → `{ sliderPosition: 50, fineTuneWeights: null }`
  - [ ] 3.3: In the v1 → v2 path: read `obj.goalPreset`, apply mapping, spread `{ sliderPosition, fineTuneWeights }` into the returned object
  - [ ] 3.4: In the v2 passthrough path: preserve `sliderPosition`/`fineTuneWeights` from `obj` if present; default to `50`/`null` if absent (AC6/AC7)

- [ ] Task 4: Add tests in `src/features/build-manager/buildPersistence.test.ts` (AC1–AC8)
  - [ ] 4.1: Test: v1 + `"Maximize Damage"` → `sliderPosition: 100, fineTuneWeights: null` (AC1)
  - [ ] 4.2: Test: v1 + `"Maximize Survivability"` → `sliderPosition: 0, fineTuneWeights: null` (AC2)
  - [ ] 4.3: Test: v1 + `"Balanced"` → `sliderPosition: 50, fineTuneWeights: null` (AC3)
  - [ ] 4.4: Test: v1 + `"Maximize Speed"` → `sliderPosition: 50, fineTuneWeights: { damage: 25, survivability: 0, speed: 75 }` (AC4)
  - [ ] 4.5: Test: v1 + `goalPreset: null` → `sliderPosition: 50, fineTuneWeights: null` (AC5)
  - [ ] 4.6: Test: v1 + `goalPreset` absent → `sliderPosition: 50, fineTuneWeights: null` (AC5)
  - [ ] 4.7: Test: v2 with `sliderPosition: 100` preserved through passthrough (AC6)
  - [ ] 4.8: Test: v2 without `sliderPosition` → defaults to 50 (AC7)
  - [ ] 4.9: Verify all existing tests still pass — `mockBuild` fixture remains valid (no required fields added)

## Dev Notes

### CRITICAL: Make sliderPosition / fineTuneWeights Optional in BuildState

Add both fields as **optional** (`?`) in `BuildState`, NOT required. There are 15+ places across the codebase that construct literal `BuildState` objects (test fixtures in `buildStore.test.ts`, `GearSlot.test.tsx`, `ContextPanel.test.tsx`, `SuggestionsList.test.tsx`, `scoringEngine.test.ts`, `RightPanel.test.tsx`, `SkillTreeView.test.tsx`, `SavedBuildsList.test.tsx`, `buildPersistence.test.ts`, and inline constructions in `buildStore.ts:createBuild` and `buildStore.ts:applyNodeChange`). Making these fields required would force 15+ simultaneous file edits and is out of scope.

Optional fields let `migrateBuildState` always produce them, while Epic 7 stories read them from `activeBuild` with a fallback of `50`/`null` when undefined.

**Why this is safe:** `migrateBuildState` is called on every load from SQLite (`buildPersistence.ts:loadBuild`). No build from disk will ever reach the store without going through migration, which now always sets both fields. Freshly created builds (via `buildStore.createBuild`) legitimately don't need these fields until Epic 7 wires the slider UI; the slider component will default to 50 when the field is absent.

### CRITICAL: Do NOT Touch `optimizationStore.ts`

`optimizationStore` does not get `sliderPosition` or `fineTuneWeights` in this story. That extension is explicitly scoped to Epic 7 Story 7-1 (`OptimizationSlider component and useOptimizationStore extension`). The architecture file (Decision 6) specifies this — do NOT jump ahead.

### CRITICAL: goalPreset is a Raw JSON Field — Not in TypeScript Types

`goalPreset` is a Phase 1 field that existed in Phase 1's `BuildState`. It is **not** in the current `BuildState` type (Phase 2). You access it via `obj.goalPreset` where `obj` is `Record<string, unknown>` inside `migrateBuildState`. Do not add `goalPreset` to any TypeScript interface — it's a raw disk artifact.

### CRITICAL: Only v1 Path Gets goalPreset Conversion

The `goalPreset` field only appears on Phase 1 saves (`schemaVersion === 1`). The v2 passthrough path (already existing in `migrateBuildState`) will never have `goalPreset` — those builds already migrated. The v2 path must:
- Preserve `sliderPosition`/`fineTuneWeights` if present (saved Phase 2 builds after this story)
- Default to `50`/`null` if absent (Phase 2 builds saved before this story lands)

### Implementation Pattern for migrateBuildState

The current `migrateBuildState` structure (after story 6-1):

```typescript
// v2 passthrough path (line ~51):
if (obj.schemaVersion === 2) {
  return {
    ...sharedFields,
    schemaVersion: 2,
    contextData: { ... },
    // ADD THESE:
    sliderPosition: typeof obj.sliderPosition === 'number' ? obj.sliderPosition : 50,
    fineTuneWeights: isFineTuneWeights(obj.fineTuneWeights) ? obj.fineTuneWeights : null,
  }
}

// v1 → v2 path (bottom return, line ~85):
return {
  ...sharedFields,
  schemaVersion: 2,
  contextData: { ... },    // migratedGear from 6-1 already here
  // ADD THESE:
  ...migrateGoalPreset(obj.goalPreset),
}
```

The `migrateGoalPreset` helper (can be a small module-level function, NOT exported):
```typescript
function migrateGoalPreset(
  preset: unknown
): { sliderPosition: number; fineTuneWeights: FineTuneWeights | null } {
  switch (preset) {
    case 'Maximize Damage':       return { sliderPosition: 100, fineTuneWeights: null }
    case 'Maximize Survivability': return { sliderPosition: 0,   fineTuneWeights: null }
    case 'Maximize Speed':        return { sliderPosition: 50,   fineTuneWeights: { damage: 25, survivability: 0, speed: 75 } }
    case 'Balanced':
    default:                       return { sliderPosition: 50,   fineTuneWeights: null }
  }
}
```

The `isFineTuneWeights` guard for v2 passthrough:
```typescript
function isFineTuneWeights(v: unknown): v is FineTuneWeights {
  return (
    typeof v === 'object' && v !== null &&
    typeof (v as Record<string, unknown>).damage === 'number' &&
    typeof (v as Record<string, unknown>).survivability === 'number' &&
    typeof (v as Record<string, unknown>).speed === 'number'
  )
}
```

### No New Files

This story modifies three existing files:
- `lebo/src/shared/types/optimization.ts` (add `FineTuneWeights` interface)
- `lebo/src/shared/types/build.ts` (add optional `sliderPosition` and `fineTuneWeights` fields)
- `lebo/src/features/build-manager/buildPersistence.ts` (extend `migrateBuildState`)
- `lebo/src/features/build-manager/buildPersistence.test.ts` (new test group)

No Rust changes. No store changes. No UI changes. No new files.

### No Changes Needed to loadBuild

`loadBuild` in `buildPersistence.ts` already calls `migrateBuildState` before calling `setActiveBuild` (established in story 6-1, line 145). AC8 is verified by confirming this existing code path, not by writing new code. Add a test that exercises the full `loadBuild` → `migrateBuildState` path with a Phase 1 JSON payload containing `goalPreset` and confirms the store receives the migrated `sliderPosition`.

### Testing Pattern

These tests are pure unit tests — no mocks needed for `migrateGoalPreset` behaviour. Group them as a new `describe` block adjacent to the existing `migrateBuildState — v2 migration` block:

```typescript
describe('migrateBuildState — goalPreset migration', () => {
  it('maps "Maximize Damage" to sliderPosition 100', () => {
    const raw = { schemaVersion: 1, id: 'x', name: 'T', goalPreset: 'Maximize Damage' }
    const result = migrateBuildState(raw)
    expect(result.sliderPosition).toBe(100)
    expect(result.fineTuneWeights).toBeNull()
  })
  // ... etc for all presets
})
```

For the `loadBuild` integration test (AC8), use the existing `describe('loadBuild')` block pattern with `mockInvoke.mockResolvedValue(JSON.stringify({ ...someV1Build, goalPreset: 'Maximize Damage' }))` and confirm `useBuildStore.getState().activeBuild?.sliderPosition` equals `100`.

### Downstream Note: Epic 7 Wiring

Story 7-1 will read `activeBuild.sliderPosition ?? 50` and `activeBuild.fineTuneWeights ?? null` when initializing the slider UI. No action required in this story — just leave the fields optional and ensure `migrateBuildState` always populates them for loaded builds.

### Previous Story Learnings (from 6-1)

- **`build.ts` not `buildState.ts`**: New types go in the existing `src/shared/types/build.ts`. The architecture doc wrongly references `buildState.ts` — that file doesn't exist. (Same rule applies here — `FineTuneWeights` goes in `optimization.ts`, not a new file.)
- **TypeScript strict: `noUnusedLocals`**: If you add `FineTuneWeights` to `optimization.ts` and import it in `build.ts`, make sure the import is actually used (it will be, on the field types). Same for `buildPersistence.ts`.
- **Test reset pattern**: `useBuildStore.setState(initialBuildState, true)` in `beforeEach` — already established in the test file. Follow this pattern for any new `loadBuild` tests added.
- **Mock pattern**: `vi.mock('../../shared/utils/invokeCommand', ...)` — already in place in `buildPersistence.test.ts`. No new mocks needed.

### Project Structure Notes

Files touched follow existing conventions:
- `optimization.ts` — shared type file, named export only, no default export
- `build.ts` — shared type file, extend `BuildState` interface in place
- `buildPersistence.ts` — feature utility, co-located with `build-manager/`
- `buildPersistence.test.ts` — co-located with source, `ComponentName.test.ts` pattern

### Project Context Rules

- **TypeScript strict mode**: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` — all enforced. Any unused import or parameter is a compile error.
- **No barrel files**: Do NOT create `index.ts` re-export files anywhere in `src/`.
- **Named exports only**: No default exports (except `App.tsx` which already uses named export).
- **Import order**: external libs → internal shared → internal feature-local.
- **No raw `invoke()`**: Not applicable here (no new IPC), but `buildPersistence.ts` already uses `invokeCommand<T>()` — don't change this.
- **No new Zustand stores**: Four stores only. No new stores for this story.
- **Write no comments by default**: Only add a comment where the WHY is non-obvious. The `migrateGoalPreset` switch statement is self-evident — no comment needed. A brief comment on the `isFineTuneWeights` guard explaining it validates the raw disk object is acceptable (it's a non-obvious defensive choice).
- **Vitest config in `vite.config.ts`**: Do not create a separate `vitest.config.ts`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 6.2] — ACs, user story, goalPreset mapping table
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision 6] — Optimization Slider State & Backward Compatibility; `sliderPosition` in `optimizationStore`; preset → slider mapping table
- [Source: lebo/src/features/build-manager/buildPersistence.ts:51-93] — current `migrateBuildState` v2 passthrough and v1→v2 paths to extend
- [Source: lebo/src/shared/types/build.ts] — `BuildState` interface to extend with optional fields
- [Source: lebo/src/shared/types/optimization.ts] — add `FineTuneWeights` here
- [Source: lebo/src/features/build-manager/buildPersistence.test.ts] — existing test patterns to follow
- [Source: _bmad-output/project-context.md#Critical Implementation Rules] — no barrel files, strict TypeScript, optional field approach rationale

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

### Review Findings

### Change Log

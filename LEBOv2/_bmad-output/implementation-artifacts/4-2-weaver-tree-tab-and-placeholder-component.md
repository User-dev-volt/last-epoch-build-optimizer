# Story 4.2: Weaver Tree Tab and Placeholder Component

Status: ready-for-dev

## Story

As a theory-crafter,
I want the Weaver Tree tab to always be visible in the skill tree tab bar, showing a clear placeholder message if the tree data is not yet available,
so that the UI layout is consistent and I understand the feature's status.

## Acceptance Criteria

1. **Given** the center panel tab bar renders tabs
   **When** the tab bar is displayed
   **Then** a "Weaver Tree" tab appears as the rightmost tab regardless of whether Weaver Tree data is available; its presence does not depend on the research spike outcome

2. **Given** `useGameDataStore.weaverTreeData` is null (spike result was NO-GO — always null for now)
   **When** the player clicks the Weaver Tree tab
   **Then** the center panel renders `WeaverTreePlaceholder` with the text "Weaver Tree planning is in research. Node data is not available from community sources." in `--color-text-secondary`; no error, no crash, no loading spinner

3. **Given** `useGameDataStore.weaverTreeData` is non-null (future Story 4.3 path — wire the gate now)
   **When** the player clicks the Weaver Tree tab
   **Then** the placeholder is replaced by the SkillTreeCanvas rendering the Weaver Tree (Story 4.3 branch — the conditional check must exist in code even though Story 4.3 is deferred)

4. **And** `WeaverTreePlaceholder` is at `src/features/weaver-tree/WeaverTreePlaceholder.tsx` with no barrel file

5. **And** `WeaverTreePlaceholder` passes vitest-axe with zero violations (UX-DR15)

6. **And** the Weaver Tree tab does NOT trigger `onSkillTabClick` — it is a standalone tab, not a skill slot tab

7. **And** clicking the Weaver Tree tab resets the search query and selected node (same behavior as switching any tab)

## Tasks / Subtasks

- [ ] Task 1: Add `weaverTreeData` to `gameDataStore.ts` (AC: #2, #3)
  - [ ] In `src/shared/stores/gameDataStore.ts`, add import at top (line 2 after current imports):
    ```typescript
    import type { TreeData } from '../types/treeData'
    ```
  - [ ] Add to `GameDataStore` interface (after `setIsUpdating: ...`):
    ```typescript
    weaverTreeData: TreeData | null
    setWeaverTreeData: (data: TreeData | null) => void
    ```
  - [ ] Add to initial state in `create<GameDataStore>()((set) => ({` (after `isUpdating: false`):
    ```typescript
    weaverTreeData: null,
    ```
  - [ ] Add to the implementation (after `setIsUpdating: (updating) => set({ isUpdating: updating })`):
    ```typescript
    setWeaverTreeData: (data) => set({ weaverTreeData: data }),
    ```

- [ ] Task 2: Create `WeaverTreePlaceholder.tsx` (AC: #2, #4, #5)
  - [ ] Create `src/features/weaver-tree/WeaverTreePlaceholder.tsx`:
    ```typescript
    export function WeaverTreePlaceholder() {
      return (
        <div
          className="flex items-center justify-center h-full"
          role="region"
          aria-label="Weaver Tree"
        >
          <p
            className="text-sm text-center max-w-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Weaver Tree planning is in research. Node data is not available from community sources.
          </p>
        </div>
      )
    }
    ```
  - [ ] Do NOT create an `index.ts` barrel file in `src/features/weaver-tree/`

- [ ] Task 3: Create `WeaverTreePlaceholder.test.tsx` (AC: #5)
  - [ ] Create `src/features/weaver-tree/WeaverTreePlaceholder.test.tsx`:
    ```typescript
    import { describe, it, expect } from 'vitest'
    import { render, screen } from '@testing-library/react'
    import { axe } from 'vitest-axe'
    import { WeaverTreePlaceholder } from './WeaverTreePlaceholder'

    describe('WeaverTreePlaceholder', () => {
      it('renders the placeholder message', () => {
        render(<WeaverTreePlaceholder />)
        expect(
          screen.getByText(
            'Weaver Tree planning is in research. Node data is not available from community sources.'
          )
        ).toBeTruthy()
      })

      it('has role="region" and aria-label="Weaver Tree"', () => {
        const { container } = render(<WeaverTreePlaceholder />)
        const root = container.firstElementChild as HTMLElement
        expect(root.getAttribute('role')).toBe('region')
        expect(root.getAttribute('aria-label')).toBe('Weaver Tree')
      })

      it('passes axe accessibility check', async () => {
        const { container } = render(<WeaverTreePlaceholder />)
        expect(await axe(container)).toHaveNoViolations()
      })
    })
    ```

- [ ] Task 4: Add Weaver Tree tab to `SkillTreeTabBar.tsx` (AC: #1, #6)
  - [ ] In `src/features/skill-tree/SkillTreeTabBar.tsx`, find the `tabs` array construction and append the Weaver entry:
    ```typescript
    const tabs = [
      { id: '__passive__', label: 'Passive Tree' },
      ...SKILL_SLOT_LABELS.map((fallback, i) => {
        const slotId = `slot-${i}`
        const assigned = activeSkills.find((s) => s.slotId === slotId)
        return { id: slotId, label: assigned?.skillName ?? fallback }
      }),
      { id: '__weaver__', label: 'Weaver Tree' },  // ADD THIS LINE
    ]
    ```
  - [ ] Change `const isSkillTab = i >= 1` to `const isSkillTab = i >= 1 && i <= 5` — this prevents the Weaver tab (index 6) from triggering `onSkillTabClick`
  - [ ] The `isEmpty` check is unchanged — it already guards on `isSkillTab`, so Weaver tab (not a skill tab) will have `isEmpty = false` automatically

- [ ] Task 5: Update `SkillTreeTabBar.test.tsx` for 7 tabs (AC: #1, #6)
  - [ ] In `src/features/skill-tree/SkillTreeTabBar.test.tsx`, update the first test:
    - Change the test name from `'always renders 6 tabs (passive + 5 skill slots)'` to `'always renders 7 tabs (passive + 5 skill slots + weaver)'`
    - Change `expect(tabs).toHaveLength(6)` to `expect(tabs).toHaveLength(7)`
    - Add assertion: `expect(screen.getByText('Weaver Tree')).toBeInTheDocument()`
  - [ ] Update the second test `'shows assigned skill names and fallback labels for empty slots'`:
    - Change `expect(tabs).toHaveLength(6)` to `expect(tabs).toHaveLength(7)`
  - [ ] Add a new test after the existing ones:
    ```typescript
    it('renders Weaver Tree as the last (rightmost) tab', () => {
      render(<SkillTreeTabBar activeSkills={[]} selectedIndex={0} onChange={() => {}} />)
      const tabs = screen.getAllByRole('tab')
      expect(tabs[6].textContent).toBe('Weaver Tree')
    })

    it('does not call onSkillTabClick when Weaver Tree tab is clicked', async () => {
      const onSkillTabClick = vi.fn()
      render(
        <SkillTreeTabBar
          activeSkills={[]}
          selectedIndex={0}
          onChange={() => {}}
          onSkillTabClick={onSkillTabClick}
        />
      )
      await userEvent.click(screen.getByText('Weaver Tree'))
      expect(onSkillTabClick).not.toHaveBeenCalled()
    })
    ```

- [ ] Task 6: Wire the Weaver tab into `SkillTreeView.tsx` (AC: #1, #2, #3, #6, #7)
  - [ ] Add `weaverTreeData` selector near the top of `SkillTreeView` (line ~64, after the `isLoading` selector):
    ```typescript
    const weaverTreeData = useGameDataStore((s) => s.weaverTreeData)
    ```
  - [ ] Add `WeaverTreePlaceholder` import at the top (near other feature imports):
    ```typescript
    import { WeaverTreePlaceholder } from '../weaver-tree/WeaverTreePlaceholder'
    ```
  - [ ] Fix the `safeTabIndex` guard (currently line ~159): change `activeTabIndex > 5` to `activeTabIndex > 6`:
    ```typescript
    const safeTabIndex = activeTabIndex > 6 ? 0 : activeTabIndex
    ```
  - [ ] Fix the `useEffect` guard (currently line ~99): change `if (activeTabIndex > 5)` to `if (activeTabIndex > 6)`:
    ```typescript
    useEffect(() => {
      if (activeTabIndex > 6) {
        setActiveTabIndex(0)
      }
    }, [activeTabIndex])
    ```
  - [ ] Add `isWeaverTab` derived value immediately after `isPassiveTab` (line ~160):
    ```typescript
    const isWeaverTab = safeTabIndex === 6
    ```
  - [ ] Fix `slotId` to handle Weaver tab (line ~162): change from:
    ```typescript
    const slotId = isPassiveTab ? null : `slot-${safeTabIndex - 1}`
    ```
    to:
    ```typescript
    const slotId = isPassiveTab || isWeaverTab ? null : `slot-${safeTabIndex - 1}`
    ```
  - [ ] Fix `isPickerFullPanel` to exclude Weaver tab (line ~375):
    ```typescript
    const isPickerFullPanel =
      !isPassiveTab &&
      !isWeaverTab &&
      pickerState !== null &&
      !pickerState.isPopover &&
      pickerState.slotIndex === safeTabIndex - 1
    ```
  - [ ] Add Weaver tab early return **after the `isLoading` return** and **before** the passive tab early return:
    ```typescript
    if (isWeaverTab) {
      return (
        <div id="skill-tree-canvas" className="flex flex-col h-full">
          <SkillTreeTabBar
            activeSkills={activeSkills}
            selectedIndex={safeTabIndex}
            onChange={handleTabChange}
            onSkillTabClick={handleSkillTabClick}
          />
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
  - [ ] Fix the second early return to exclude Weaver tab (currently `if (!isPassiveTab && ...)`):
    ```typescript
    if (!isPassiveTab && !isWeaverTab && (!selectedClassId || !selectedMasteryId || !gameData || !classData)) {
    ```

## Dev Notes

### Story 4.1 Spike Outcome — CRITICAL CONTEXT

Story 4.1 verdict: **NO-GO for Story 4.3.** The `weaverTreeData` field will be `null` indefinitely in production. `WeaverTreePlaceholder` will always render for this tab.

**Why the `weaverTreeData !== null` branch must still exist in the code:** Architecture Decision 7 in `_bmad-output/planning-artifacts/architecture.md` specifies the tab rendering switches on `useGameDataStore.weaverTreeData !== null`. The conditional must be present so Story 4.3 can be wired in without structural refactoring if the data situation changes. This is NOT dead code — it is a declared gate for future work.

**Placeholder text:** The original ACs say "Weaver Tree planning is in research. Data sourcing is in progress." — updated to "Weaver Tree planning is in research. Node data is not available from community sources." to accurately reflect the spike finding (community sources don't expose the node graph). The spike report at `docs/weaver-tree-spike.md` Section 6 confirms this text guidance.

### Integration Architecture — DO NOT REINVENT

`SkillTreeTabBar` uses Headless UI `TabGroup`/`TabList`/`Tab`. Indices are:
- 0 = Passive Tree
- 1–5 = Skill slots 0–4 (`slot-0` through `slot-4`)
- 6 = Weaver Tree (NEW)

`SkillTreeView` maps `activeTabIndex` → behavior. All 7 paths after this change:
- `safeTabIndex = 0` → `isPassiveTab = true`
- `safeTabIndex = 1-5` → `isPassiveTab = false, isWeaverTab = false` → skill slot tabs
- `safeTabIndex = 6` → `isWeaverTab = true` → early return with placeholder

### Files to Create (New)

- `src/features/weaver-tree/WeaverTreePlaceholder.tsx`
- `src/features/weaver-tree/WeaverTreePlaceholder.test.tsx`

### Files to Modify (Existing)

| File | What Changes |
|------|-------------|
| `src/shared/stores/gameDataStore.ts` | Add `weaverTreeData: TreeData \| null` + setter |
| `src/features/skill-tree/SkillTreeTabBar.tsx` | Append Weaver tab to `tabs` array; fix `isSkillTab` to `i >= 1 && i <= 5` |
| `src/features/skill-tree/SkillTreeTabBar.test.tsx` | Update tab count 6→7; add Weaver tab tests |
| `src/features/skill-tree/SkillTreeView.tsx` | Add `weaverTreeData` selector; add `isWeaverTab`; fix guards; add early return |

### Critical Lines in `SkillTreeView.tsx` to Touch

These are the exact locations — do NOT make unrelated changes to this file:

1. **Line ~64** — store selectors block: add `weaverTreeData` after `isLoading`
2. **Line ~99** — `useEffect` with `activeTabIndex > 5`: change to `> 6`
3. **Line ~159** — `safeTabIndex` computation: change `> 5` to `> 6`
4. **Line ~160** — add `const isWeaverTab = safeTabIndex === 6` immediately after `isPassiveTab`
5. **Line ~162** — `slotId` computation: add `|| isWeaverTab` to the null guard
6. **Line ~310** — passive tab early return: untouched
7. **Line ~325** — ADD the Weaver tab early return here (between the two existing early returns)
8. **Line ~339** — skill tab early return: add `&& !isWeaverTab` to the condition
9. **Line ~375** — `isPickerFullPanel`: add `&& !isWeaverTab`

### Do NOT Touch

- `SkillTreeView.tsx` rendering logic inside the final JSX `return` for passive/skill tab content — no changes there
- `pixiRenderer.ts` — Weaver rendering is Story 4.3 (deferred)
- `buildStore.ts` — `weaverAllocations` is Story 4.3 (deferred)
- `treeDataTransformer.ts` — no Weaver layout needed for placeholder

### Hooks Order — Why Early Return Is Safe

All `useMemo` and `useCallback` hooks in `SkillTreeView` are defined BEFORE the early returns. The Weaver early return fires after all hooks complete, so React's rules of hooks are not violated. When `isWeaverTab = true`:
- `treeData` will be `null` (no class data dependencies matter)
- `slotId` will be `null`
- `skillTreeData` will be `null`
- `passiveInteraction` / `skillInteraction` both handle `null` treeData gracefully
- The early return prevents all this null state from reaching JSX that expects non-null data

### Accessibility Requirements

`WeaverTreePlaceholder` is a static informational component. vitest-axe compliance requirements:
- `role="region"` with `aria-label="Weaver Tree"` (landmark region)
- Text content rendered as `<p>` (not `<div>` — screen readers handle `<p>` better for prose)
- No interactive elements → no focus management needed
- `--color-text-secondary` contrast against `--color-bg-base` already meets WCAG AA per existing token system

### Project Structure Notes

- Feature folder: `src/features/weaver-tree/` (new, no barrel file)
- Component naming: `WeaverTreePlaceholder.tsx` — PascalCase component in kebab-case folder
- Test co-location: `WeaverTreePlaceholder.test.tsx` beside `WeaverTreePlaceholder.tsx`
- No `index.ts` in `weaver-tree/` — all imports must be direct (e.g., `import { WeaverTreePlaceholder } from '../weaver-tree/WeaverTreePlaceholder'`)

### Project Context Rules

From `_bmad-output/project-context.md` (critical rules for this story):

- **No barrel files** — never create `index.ts` in any `src/features/*` folder
- **TypeScript strict mode** — `noUnusedLocals: true`; if you add `weaverTreeData` to the selector but don't use it in the early return, TypeScript will reject it. Use it.
- **Four stores only** — `weaverTreeData` extends `useGameDataStore`, NOT a new store
- **Named exports only** — `WeaverTreePlaceholder` is a named export, not default
- **No barrel files** — mentioned twice because it's the most common mistake
- **Tailwind v4 / no @apply** — use inline `style={{ color: 'var(--color-text-secondary)' }}` for color tokens or Tailwind class names that map to them; do not use `@apply`
- **vitest-axe** — `import { axe } from 'vitest-axe'` then `expect(await axe(container)).toHaveNoViolations()`; `toHaveNoViolations` matcher is set up in `test-setup.ts` — do not re-declare it

### Previous Story Intelligence (Story 4.1)

Story 4.1 produced only `docs/weaver-tree-spike.md`. No TypeScript was written. Therefore:
- No existing pattern to follow for `weaver-tree/` folder
- No previous Weaver-related imports exist to be aware of
- The `weaverTreeData` field in `gameDataStore` does not yet exist — add it fresh

**Spike report key finding for placeholder text:** "No machine-readable Weaver Tree node data (IDs, positions, edge graph) found in any community source." — the placeholder text reflects this precisely.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 4: Story 4.2 ACs, UX-DR14, UX-DR15]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Decision 7: Weaver Tree Renderer (Spike-Gated), Architecture boundary: `weaverTreeData: TreeData | null` in `GameDataStore`]
- [Source: `_bmad-output/implementation-artifacts/4-1-weaver-tree-research-spike.md` — Completion Notes: NO-GO verdict, placeholder text guidance]
- [Source: `_bmad-output/project-context.md` — No barrel files, four-store constraint, named exports, vitest-axe setup]
- [Source: `lebo/src/features/skill-tree/SkillTreeTabBar.tsx` — Current tab structure: 6 tabs (passive + 5 slots)]
- [Source: `lebo/src/features/skill-tree/SkillTreeView.tsx` — `activeTabIndex > 5` guards (lines ~99, ~159), `slotId` computation (~162), `isPickerFullPanel` (~375), early return positions]
- [Source: `lebo/src/shared/stores/gameDataStore.ts` — Existing store interface to extend]
- [Source: `lebo/src/shared/types/treeData.ts` — `TreeData` interface: `{ nodes: TreeNode[], edges: TreeEdge[] }`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

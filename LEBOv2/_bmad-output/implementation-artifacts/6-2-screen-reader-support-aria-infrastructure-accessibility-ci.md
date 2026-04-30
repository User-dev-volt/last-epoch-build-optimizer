# Story 6.2: Screen Reader Support, ARIA Infrastructure & Accessibility CI

Status: ready-for-dev

## Story

As an advanced Last Epoch player who uses assistive technology,
I want screen reader announcements for all dynamic content changes — suggestion updates, build optimization progress, error states — and complete ARIA compliance throughout the app,
So that the tool is fully usable with NVDA (Windows) and VoiceOver (macOS) without any functionality gaps.

## Acceptance Criteria

**Given** axe-core is integrated into the Vitest suite
**When** any CI build runs
**Then** axe-core automatically audits WCAG 2.1 AA compliance on the main view and settings view
**And** any axe violation causes the build to fail — no accessibility regressions can ship

**Given** AI optimization is running
**When** the loading state becomes active (`isOptimizing` → true)
**Then** the `#ai-status-region` `aria-live="polite"` region announces "Analyzing your build..." to screen readers

**Given** AI optimization completes
**When** `hasOptimizationCompleted` → true
**Then** the `#ai-status-region` region announces "Optimization complete. [N] suggestions available"

**Given** a critical error occurs (API failure, stream error)
**When** `streamError` transitions to a non-null value
**Then** the `#critical-error-region` `aria-live="assertive"` region announces the error message immediately

**Given** the user navigates to a SuggestionCard
**When** a card receives keyboard focus (via Up/Down nav from Story 6.1)
**Then** the screen reader announces full card content: "[Rank N] [change type] [node name] — [description]. Damage: [before] → [after]. Survivability: [before] → [after]. Speed: [before] → [after]. [Explanation text]" (UX-DR5)

**Given** any interactive element with a `focus:outline-none` override
**When** it receives keyboard focus
**Then** a 2px solid accent-gold focus ring is visible (or an equivalent custom focus indicator)

**Given** the user has `prefers-reduced-motion: reduce` set in OS preferences
**When** optimization loading pulses or PixiJS node glow animations run
**Then** PixiJS animation effects (glow intensity, pulse) are disabled at the JavaScript level
**And** all functional state is still communicated by static visual indicators

## Tasks / Subtasks

- [ ] Task 1: Install vitest-axe and configure (AC: 1)
  - [ ] `pnpm add -D vitest-axe` from the `lebo/` directory
  - [ ] In `lebo/src/test-setup.ts`, add:
    ```ts
    import { toHaveNoViolations } from 'vitest-axe'
    expect.extend(toHaveNoViolations)
    ```
  - [ ] Verify `vitest-axe` exports: `{ axe, toHaveNoViolations }` — the `axe` function wraps `axe-core` and accepts a DOM container element

- [ ] Task 2: Write axe integration tests for main view and settings view (AC: 1)
  - [ ] Create `lebo/src/App.a11y.test.tsx`:
    - Mock all Tauri commands (pattern: `vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))`)
    - Mock `@tauri-apps/plugin-updater` (already mocked in other test files — copy pattern)
    - Render `<App />` with default store state (no active build, no suggestions)
    - Run `axe(container)` and assert `toHaveNoViolations()`
    - Second test: set store to settings view (`useAppStore.getState().setCurrentView('settings')`) and re-render + re-run axe
  - [ ] The axe tests render component trees against jsdom — PixiJS canvas will not mount (no WebGL in jsdom); this is expected. The overlay div and non-canvas DOM will be audited.
  - [ ] Pass `{ rules: { 'color-contrast': { enabled: false } } }` to `axe()` only if color-contrast violations appear that are false positives from the dark theme (jsdom doesn't compute CSS custom property contrast). Do NOT blanket-disable other rules.
  - [ ] If a violation is found, fix the component rather than disabling the rule

- [ ] Task 3: Wire live region content announcements (AC: 2, 3, 4)
  - [ ] Create `lebo/src/shared/hooks/useAccessibilityAnnouncer.ts`:
    ```ts
    export function useAccessibilityAnnouncer() {
      useEffect(() => {
        return useOptimizationStore.subscribe((state, prev) => {
          if (state.isOptimizing && !prev.isOptimizing) {
            setRegion('ai-status-region', 'Analyzing your build...')
          }
          if (state.hasOptimizationCompleted && !prev.hasOptimizationCompleted) {
            setRegion('ai-status-region', `Optimization complete. ${state.suggestions.length} suggestions available`)
          }
          if (state.streamError && state.streamError !== prev.streamError) {
            const msg = state.streamError.message ?? 'An error occurred. Please try again.'
            setRegion('critical-error-region', msg)
          }
        })
      }, [])
    }

    function setRegion(id: string, text: string) {
      const el = document.getElementById(id)
      if (!el) return
      el.textContent = ''                  // force re-announcement by clearing first
      requestAnimationFrame(() => { el.textContent = text })
    }
    ```
  - [ ] Call `useAccessibilityAnnouncer()` in `App.tsx` — add to the hook call list at the top of `App()`
  - [ ] Do NOT touch `import-progress-region` — this region is infrastructure-ready but will remain empty until Story 2.1/2.2 implements actual build code parsing (that story is deferred). The div remains in place.
  - [ ] When `isOptimizing` goes false (optimization ends or errors), also clear `#ai-status-region`:
    ```ts
    if (!state.isOptimizing && prev.isOptimizing && !state.hasOptimizationCompleted) {
      setRegion('ai-status-region', '')
    }
    ```

- [ ] Task 4: Fix `focus:outline-none` violations — components that remove the global focus ring with no replacement (AC: 6)
  - [ ] **`SkillTreeTabBar.tsx`** — `Tab` component at line ~27:
    - Replace `focus:outline-none` with Headless UI v2's data attribute focus class:
      `data-[focus]:outline data-[focus]:outline-2 data-[focus]:outline-[var(--color-accent-gold)] data-[focus]:outline-offset-[-2px]`
    - Do NOT use Tailwind's `focus:` prefix on Headless UI primitives — Headless UI v2 uses `data-[focus]` not `:focus`
    - The existing `borderBottom: '2px solid var(--color-accent-gold)'` shows selected state only; this adds a separate visible focus state
  - [ ] **`GoalSelector.tsx`** — `Radio` component at line ~44:
    - Replace `focus:outline-none` with `data-[focus]:outline data-[focus]:outline-2 data-[focus]:outline-[var(--color-accent-gold)]`
  - [ ] **`SavedBuildsList.tsx`** — rename `<input>` at line ~114:
    - Remove `outline: 'none'` from the inline style object
    - Add `className="... focus:outline focus:outline-1 focus:outline-[var(--color-accent-gold)]"` (the existing gold border is static, not a focus indicator; the explicit gold outline on focus is the correct fix)
  - [ ] **`ClassMasterySelector.tsx`** — `focus:outline-none` on dropdown panel container elements (lines ~49, ~108): Leave these as-is. These are Headless UI Listbox panel containers that Headless UI manages for focus — they are `role="listbox"` with `aria-orientation` attributes and Headless UI manages focus indicators internally for the options. Removing `focus:outline-none` would cause double-outline.

- [ ] Task 5: Enhance SuggestionCard aria-label with score deltas (AC: 5)
  - [ ] In `SuggestionCard.tsx`, update the `ariaLabel` construction (currently line ~95):
    ```ts
    function formatScore(v: number | null): string {
      return v === null ? '—' : String(v)
    }
    const ariaLabel = [
      `[Rank ${suggestion.rank}]`,
      `${changeType} ${toNodeName} — ${changeDescription}.`,
      `Damage: ${formatScore(suggestion.baselineScore.damage)} → ${formatScore(suggestion.previewScore.damage)}.`,
      `Survivability: ${formatScore(suggestion.baselineScore.survivability)} → ${formatScore(suggestion.previewScore.survivability)}.`,
      `Speed: ${formatScore(suggestion.baselineScore.speed)} → ${formatScore(suggestion.previewScore.speed)}.`,
      suggestion.explanation,
    ].join(' ')
    ```
  - [ ] `baselineScore` and `previewScore` are both on `SuggestionResult` (types already defined in `optimization.ts`). No new data needed.
  - [ ] Update `SuggestionCard.test.tsx` to assert the new aria-label format includes score values

- [ ] Task 6: Create `useReducedMotion` hook and apply to PixiJS renderer (AC: 7)
  - [ ] Create `lebo/src/shared/hooks/useReducedMotion.ts`:
    ```ts
    import { useState, useEffect } from 'react'

    export function useReducedMotion(): boolean {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      const [reducedMotion, setReducedMotion] = useState(mq.matches)
      useEffect(() => {
        const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
      }, [])
      return reducedMotion
    }
    ```
  - [ ] In `SkillTreeCanvas.tsx`, call `useReducedMotion()` and pass the result to the renderer:
    - Read current `RendererInstance` interface in `types.ts` — check if `renderTree` or `setReducedMotion` exists
    - Add `setReducedMotion(enabled: boolean): void` to `RendererInstance` in `types.ts`
    - Implement in `pixiRenderer.ts`: store `reducedMotionEnabled` flag; when true, skip the glow/tween alpha animation in the highlight loop (the `isGlowing` branch around line 180 — set alpha directly instead of animating)
    - In `SkillTreeCanvas.tsx`, call `renderer.setReducedMotion(reducedMotion)` in a `useEffect([reducedMotion, rendererRef.current])` after renderer init
  - [ ] CSS-level reduced motion is already handled globally in `global.css` (kills all `animate-*` and `transition-*`). The `useReducedMotion` hook is specifically for PixiJS WebGL animations that CSS cannot reach.
  - [ ] Add `useReducedMotion.test.ts` — mock `window.matchMedia`, test initial state and change event handling

- [ ] Task 7: Tests (all ACs)
  - [ ] `App.a11y.test.tsx` — axe audit for main view and settings view (Task 2 above)
  - [ ] `useAccessibilityAnnouncer.test.ts` — test region injection: isOptimizing→true, completion with count, streamError injection, clear on abort
  - [ ] `useReducedMotion.test.ts` — matchMedia mock, initial state, change handler
  - [ ] `SuggestionCard.test.tsx` — extend existing test: assert aria-label includes "Damage: X → Y" format
  - [ ] `pnpm tsc --noEmit` — clean
  - [ ] `pnpm vitest run` — all tests passing

## Dev Notes

### What's Already Done — Do NOT Re-implement

Story 6.1 and prior work delivered these — verify they pass axe rather than re-build them:

- **Skip links** in `App.tsx` lines 139–152: `href="#skill-tree-canvas"` and `href="#suggestion-panel"`, rendered as `sr-only` until focused, then gold-background. These already satisfy the skip-link AC. The axe audit will verify the href targets exist.
- **ARIA live region divs** in `App.tsx` lines 155–157: `import-progress-region` (polite), `ai-status-region` (polite), `critical-error-region` (assertive) — the DOM nodes exist; Task 3 wires content.
- **Reduced motion CSS** in `global.css` lines 73–82: `@media (prefers-reduced-motion: reduce)` kills all `animation-duration` and `transition-duration` globally. This covers all CSS animations (`animate-pulse` in OptimizeButton, `transition-[width]` in ScoreGauge, panel collapse transitions). Task 6 adds the JS-side hook for PixiJS only.
- **Global focus ring** in `global.css` lines 84–88: `:focus-visible { outline: 2px solid var(--color-accent-gold) }` — applies to all interactive elements. Task 4 fixes the components that override this with `focus:outline-none` without a replacement.
- **SuggestionCard** `role="article"` + `aria-label` + `tabIndex={-1}` — from Story 6.1. Task 5 enhances the label content.
- **SkillTreeCanvas overlay buttons** with `aria-label="${id} — ${state}"` — from Story 6.1.

### vitest-axe Usage Pattern

```ts
import { axe } from 'vitest-axe'
import 'vitest-axe/extend-expect'  // or use test-setup.ts extension

const { container } = render(<App />)
const results = await axe(container)
expect(results).toHaveNoViolations()
```

The `axe()` call is async — always `await` it. Results include `violations`, `passes`, `incomplete`. `toHaveNoViolations()` checks that `violations` is empty.

**PixiJS canvas in jsdom:** PixiJS will throw or silently fail WebGL init in jsdom. The SkillTreeCanvas component has guards for missing renderer — the overlay div and all non-canvas DOM will still render. The axe audit audits the DOM tree, not the canvas pixels. This is the correct behavior for WCAG auditing.

**Color-contrast rule**: jsdom computes CSS custom properties as empty strings, which means contrast ratios will report 0:0 as "undefined". Disable this specific rule in the axe call to avoid false positives:
```ts
const results = await axe(container, {
  rules: { 'color-contrast': { enabled: false } }
})
```
This is the standard practice for design-token-heavy apps. All other rules must pass.

### Live Region Wiring — Anti-patterns to Avoid

- **Do NOT set `textContent` directly** without clearing first. Screen readers only announce changes to `aria-live` regions — if the text is the same as the previous announcement (e.g., two back-to-back optimizations), the second announcement is silently dropped. The clear→rAF→set pattern in Task 3 forces a DOM mutation both times.
- **Do NOT use `innerHTML`** — use `textContent` only. No HTML in live regions.
- **Do NOT announce on every render** — use `useOptimizationStore.subscribe()` (Zustand subscription) to detect state *transitions*, not `useOptimizationStore()` (selector) which fires on every render that reads the value. The difference is critical for avoiding noise announcements.
- **`aria-live="assertive"` is for critical errors only** — it interrupts the current screen reader speech. Never use it for status updates or progress.

### Headless UI v2 Focus Indicators — `data-[focus]` vs `focus:`

Headless UI v2 adds `data-focus` attribute to the focused element rather than relying on `:focus` CSS pseudo-class. This means:
- Tailwind's `focus:` prefix does NOT work reliably on Headless UI primitives
- Use `data-[focus]:` prefix instead
- Example: `data-[focus]:outline data-[focus]:outline-2 data-[focus]:outline-[var(--color-accent-gold)]`
- This is why `GoalSelector` and `SkillTreeTabBar` currently have visual focus gaps — their `focus:outline-none` suppressed the global `:focus-visible` ring and no `data-[focus]:` replacement was added

### PixiJS Glow Animation — Where It Lives

The glow animation is in `pixiRenderer.ts` around line 180. The `isGlowing` flag (from `highlightedNodes.glowing.has(node.id)`) controls whether a node's alpha pulses. When `reducedMotionEnabled` is true:
- Set the glow node's alpha to a fixed value (e.g., `0.85`) instead of animating it
- Skip the sine/cosine time-based alpha calculation
- The gold ring and purple suggested overlay still render — only the pulsing animation is disabled

### SuggestionCard Label — Score Format

The `baselineScore` and `previewScore` objects have `damage`, `survivability`, `speed` fields (all `number | null`). Format `null` as `—` (em dash) since it means "no data for this axis". Do not format as `0` or `null`.

Screen readers will read "Damage: 47 → 52" as "Damage: 47 arrow 52" or "Damage: 47 to 52" depending on the reader. The `→` character (U+2192) is read as "right arrow" or "to" by NVDA and VoiceOver — acceptable.

### NFR16 — Manual Verification Required

NFR16 (tooltip readability at 100% system font scale) must be verified manually on Windows before marking story complete:
- Set Windows display scale to 100% (not 125% or 150%)
- Open app and verify `NodeTooltip`, `DataStalenessBar`, status bar text is readable
- This cannot be automated — note it in Dev Agent Record as verified

### File Locations Summary

| File | Change Type |
|---|---|
| `lebo/src/test-setup.ts` | Add vitest-axe matcher extension |
| `lebo/src/App.tsx` | Call `useAccessibilityAnnouncer()` hook |
| `lebo/src/App.a11y.test.tsx` | NEW — axe integration tests for main + settings view |
| `lebo/src/shared/hooks/useAccessibilityAnnouncer.ts` | NEW — live region wiring hook |
| `lebo/src/shared/hooks/useAccessibilityAnnouncer.test.ts` | NEW — announcer hook tests |
| `lebo/src/shared/hooks/useReducedMotion.ts` | NEW — reads prefers-reduced-motion |
| `lebo/src/shared/hooks/useReducedMotion.test.ts` | NEW — matchMedia mock test |
| `lebo/src/features/skill-tree/types.ts` | Add `setReducedMotion` to `RendererInstance` |
| `lebo/src/features/skill-tree/pixiRenderer.ts` | Implement `setReducedMotion` + skip glow pulse |
| `lebo/src/features/skill-tree/SkillTreeCanvas.tsx` | Call `useReducedMotion()` + pass to renderer |
| `lebo/src/features/skill-tree/SkillTreeTabBar.tsx` | Fix `focus:outline-none` → `data-[focus]:outline` |
| `lebo/src/features/optimization/GoalSelector.tsx` | Fix `focus:outline-none` → `data-[focus]:outline` |
| `lebo/src/features/optimization/SuggestionCard.tsx` | Enhance `ariaLabel` with score before/after |
| `lebo/src/features/optimization/SuggestionCard.test.tsx` | Assert new aria-label format |
| `lebo/src/features/build-manager/SavedBuildsList.tsx` | Remove `outline: 'none'`, add gold focus class |

### Coding Patterns (from prior stories)

- Tailwind v4 CSS-first: `className` for layout/spacing, `style={{ color: 'var(--color-...)' }}` for design tokens
- No barrel `index.ts` — import directly from source files
- Tests co-located with source, `*.test.tsx` / `*.test.ts`
- Mock `@tauri-apps/api/core` via `vi.mock(...)` in any test that imports Tauri commands (required pattern — Tauri is unavailable in jsdom)
- `getState()` in event handlers/subscriptions, not store selectors
- `useReducedMotion` follows the same pattern as `useConnectivity` — read a system API, return boolean, reactive to changes

## Project Context

- Architecture: Tauri 2.x + React 19 + TypeScript + PixiJS v8 + Zustand v5 + Tailwind v4 + Headless UI v2
- Stack: [architecture.md](../_bmad-output/planning-artifacts/architecture.md)
- Epics: [epics.md](../_bmad-output/planning-artifacts/epics.md) — Epic 6, Story 6.2
- UX spec: [ux-design-specification.md](../_bmad-output/planning-artifacts/ux-design-specification.md) — Accessibility Strategy at ~line 874; UX-DR5 (SuggestionCard screen reader label)
- Previous story: [6-1-keyboard-navigation-global-shortcuts.md](./6-1-keyboard-navigation-global-shortcuts.md) — all keyboard nav + invisible-button overlay built there; story 6.2 layers ARIA announcements on top

## Dev Agent Record

_To be filled in during implementation._

## Story Completion Status

Story created: 2026-04-29
Status: ready-for-dev

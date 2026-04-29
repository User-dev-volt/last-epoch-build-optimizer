# Story 6.1: Keyboard Navigation & Global Shortcuts

Status: ready-for-dev

## Story

As an advanced Last Epoch player who prefers keyboard-driven workflows,
I want to navigate the skill tree, trigger optimization, and interact with suggestions entirely by keyboard,
So that I can operate the tool efficiently without requiring a mouse for any primary action.

## Acceptance Criteria

**Given** the app is open with a build loaded
**When** the user presses `O` (while not in a text input)
**Then** focus moves to the Optimize button in the right panel

**Given** the app is open
**When** the user presses `I` (while not in a text input)
**Then** focus moves to the build import input in the left panel

**Given** a build is active
**When** the user presses `Ctrl+S`
**Then** the current build saves (existing behavior, already implemented)

**Given** a suggestion card is expanded or a tree preview is active
**When** the user presses `Escape`
**Then** the expanded card collapses or the tree preview clears — returning to neutral state

**Given** the suggestion list is visible and has keyboard focus
**When** the user presses `Up` or `Down` arrow keys
**Then** focus moves between suggestion cards
**And** pressing `Enter` on a focused card expands or applies it
**And** pressing `P` activates preview for the focused suggestion
**And** pressing `S` skips/dismisses the focused suggestion

**Given** the skill tree canvas has keyboard focus
**When** the user presses `Tab`
**Then** focus moves to the next node in connection graph order (parent nodes before children)
**And** the focused node shows a 2px solid accent-gold focus ring
**And** pressing `Enter` allocates or deallocates the focused node

**Given** the user is within a node cluster with keyboard focus
**When** the user presses an arrow key (Up/Down/Left/Right)
**Then** focus moves to the nearest adjacent node in that direction

## Tasks / Subtasks

- [ ] Task 1: Extend global shortcuts in `App.tsx` (AC: 1, 2, 4)
  - [ ] In the existing `handleKeyDown` useEffect, add `O` and `I` shortcuts with the input element guard:
    `if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target as HTMLElement).isContentEditable) return`
    Apply the guard to bare-key shortcuts only (`O`, `I`) — `Ctrl+S` and `Escape` are already safe
  - [ ] `O`: `document.getElementById('optimize-button')?.focus()`
  - [ ] `I`: `document.getElementById('build-import-input')?.focus()`
  - [ ] `Escape`: call `useOptimizationStore.getState().setPreviewSuggestionRank(null)` to clear tree preview; optionally dispatch a custom event `keyboard:escape` that `SuggestionsList` listens to for collapsing expanded cards
  - [ ] Add `id="optimize-button"` to the Optimize button in `RightPanel` or wherever it lives
  - [ ] Add `id="build-import-input"` to the build import text input in `LeftPanel`/`BuildImportInput`
  - [ ] Guard: do NOT emit `O`/`I` shortcuts when `currentView === 'settings'` (no skill tree or optimize button)

- [ ] Task 2: Add `addTickerListener` to `RendererInstance` and `pixiRenderer.ts` (required for Task 3)
  - [ ] In `lebo/src/features/skill-tree/types.ts`, add to `RendererInstance`:
    `addTickerListener(fn: () => void): () => void  // returns unsubscribe fn`
  - [ ] In `pixiRenderer.ts`, implement using `app.ticker.add(fn)` / `app.ticker.remove(fn)`:
    ```ts
    function addTickerListener(fn: () => void): () => void {
      app.ticker.add(fn)
      return () => app.ticker.remove(fn)
    }
    return { renderTree, resize, destroy, getViewport, addTickerListener }
    ```

- [ ] Task 3: Refactor `SkillTreeCanvas.tsx` — invisible-button overlay pattern (AC: 6, 7)
  - [ ] Remove from container `<div>`: `tabIndex`, `onFocus`, `onBlur`, `onKeyDown` props, and `focusedIndexRef`, `handleFocus`, `handleBlur`, `handleKeyDown` functions — the overlay buttons will own all keyboard interaction
  - [ ] Add overlay `<div>` (same size, `position: absolute, inset: 0, pointerEvents: none`) on top of canvas
  - [ ] Add state: `nodeButtons: Array<{id: string, screenX: number, screenY: number, r: number}>` — positions of visible viewport nodes
  - [ ] Add ref: `buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())`
  - [ ] Add ref: `focusedNodeIdRef = useRef<string | null>(null)`
  - [ ] Add ref: `treeDataRef = useRef(treeData)` — keep current in ticker callback (no stale closure)
  - [ ] **Position sync function** (call on mount + ticker):
    ```ts
    function syncButtonPositions() {
      const r = rendererRef.current
      const container = containerRef.current
      if (!r || !container) return
      const { x: panX, y: panY, scale } = r.getViewport()
      const { width, height } = container.getBoundingClientRect()
      const visible = treeDataRef.current.nodes.filter((n) => {
        const sx = panX + n.x * scale
        const sy = panY + n.y * scale
        return sx > -50 && sx < width + 50 && sy > -50 && sy < height + 50
      })
      setNodeButtons(
        visible.map((n) => ({
          id: n.id,
          screenX: panX + n.x * scale,
          screenY: panY + n.y * scale,
          r: NODE_RADIUS_MAP[n.size] * scale,  // import NODE_RADIUS_MAP from pixiRenderer or define locally
        }))
      )
    }
    ```
  - [ ] Register ticker listener after renderer init: `const unsub = r.addTickerListener(syncButtonPositions); return () => unsub()`; also call `syncButtonPositions()` immediately after first render
  - [ ] **Connection-graph Tab traversal:** build a `Map<string, string[]>` from `treeData.edges` (bidirectional: each edge adds both directions). On `Tab` key in a button's `onKeyDown`, find current node's connections, pick the next connected node (cycle through `connections` array). On `Shift+Tab`, go to the previous. If no connections (isolated node), wrap to the next node in `nodes` array order.
  - [ ] **Arrow key — nearest adjacent node:** On arrow key, from the focused node, filter to connected nodes only, find the one whose screen direction best matches the arrow direction using angle: `Math.atan2(dy, dx)`. No connections → no movement.
  - [ ] **Render hidden buttons:**
    ```tsx
    {nodeButtons.map(({ id, screenX, screenY, r }) => {
      const node = treeData.nodes.find((n) => n.id === id)
      // look up name/state from treeData.nodes
      return (
        <button
          key={id}
          ref={(el) => el ? buttonRefs.current.set(id, el) : buttonRefs.current.delete(id)}
          aria-label={`${node?.name ?? id} — ${node?.state ?? 'unknown'}`}
          className="sr-only focus:not-sr-only focus:absolute focus:outline focus:outline-2 focus:outline-[var(--color-accent-gold)] focus:rounded-full"
          style={{ left: screenX - r, top: screenY - r, width: r * 2, height: r * 2 }}
          onKeyDown={(e) => handleNodeKeyDown(e, id)}
          onFocus={() => {
            focusedNodeIdRef.current = id
            const node = treeDataRef.current.nodes.find((n) => n.id === id)
            if (node && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect()
              onKeyboardNavigate(id, rect.left + screenX, rect.top + screenY)
            }
          }}
          onBlur={() => {
            focusedNodeIdRef.current = null
            onKeyboardNavigate(null, 0, 0)
          }}
          onClick={() => onNodeClick(id)}
          tabIndex={0}
        />
      )
    })}
    ```
  - [ ] **`handleNodeKeyDown`** inside SkillTreeCanvas handles: `Enter`/`Space` → `onNodeClick(id)`, `Tab`/`Shift+Tab` → focus next/prev connected node button, `ArrowUp/Down/Left/Right` → focus nearest adjacent connected node button, `Escape` → blur + `onKeyboardNavigate(null,0,0)`
  - [ ] Button `tabIndex={0}` — all buttons focusable; the Tab traversal is managed manually in `onKeyDown` by calling `buttonRefs.current.get(nextId)?.focus()`, NOT by relying on DOM tab order
  - [ ] Container `<div>` loses its `tabIndex={0}` — it is no longer a keyboard target. Set `aria-hidden="true"` on the canvas `<canvas>` element (screen readers use the buttons, not the canvas)
  - [ ] NodeTooltip continues to render via `useSkillTree` + `SkillTreeView` as before — no change to that flow. The `onFocus` handler fires `onKeyboardNavigate` which sets `keyboardFocusedNodeId` in `useSkillTree`, which triggers the tooltip in `SkillTreeView`.
  - [ ] `NODE_RADIUS_MAP`: the pixel radius for each node size. Either import the `NODE_RADIUS` const from `pixiRenderer.ts` (export it) or duplicate locally as `const NODE_RADIUS_MAP = { small: 12, medium: 18, large: 26 }` (same values). Do NOT query the DOM — use the same constants the renderer uses.

- [ ] Task 4: Keyboard nav in `SuggestionsList.tsx` (AC: 5)
  - [ ] Add `focusedCardIndex: number | null` state to `SuggestionsList`
  - [ ] Wrap the suggestion card list container with `onKeyDown={handleListKeyDown}` and `role="list"`
  - [ ] `handleListKeyDown`:
    - `ArrowDown`: increment `focusedCardIndex` (clamp to active suggestions length - 1)
    - `ArrowUp`: decrement `focusedCardIndex` (clamp to 0)
    - `P`: call `setPreviewSuggestionRank(activeSuggestions[focusedCardIndex].rank)` if card focused
    - `S`: call `skipSuggestion(activeSuggestions[focusedCardIndex].rank)` if card focused
    - `Enter`: expand focused card (toggle expanded state on it)
    - `Escape`: collapse all → `setFocusedCardIndex(null)`, clear preview
  - [ ] Pass `isFocused: boolean` prop to `SuggestionCard`; card renders with `ref` so `SuggestionsList` can call `.focus()` when `focusedCardIndex` changes via `useEffect`
  - [ ] Add `tabIndex={0}` to each `SuggestionCard`'s root element so it can receive programmatic focus
  - [ ] `SuggestionCard` must have `role="article"` and `aria-label="[Rank N] [description]. [explanation]"` for screen reader support (Story 6.2 will add full ARIA live regions — in this story, static aria-label is sufficient)
  - [ ] Listen for global `keyboard:escape` custom event (dispatched from `App.tsx` Escape handler) to collapse expanded cards from outside

- [ ] Task 5: Add keyboard shortcuts reference to Settings view
  - [ ] In `lebo/src/features/settings/Settings.tsx`, add a "Keyboard Shortcuts" section at the bottom with a table:
    | Shortcut | Action |
    |---|---|
    | `O` | Focus Optimize button |
    | `I` | Focus Import Build input |
    | `Ctrl+S` | Save current build |
    | `Escape` | Collapse suggestion / Clear preview |
    | `Up / Down` | Navigate suggestion list |
    | `P` | Preview focused suggestion |
    | `S` | Skip focused suggestion |
    | `Tab / Shift+Tab` | Navigate tree nodes (connection order) |
    | `Enter` | Allocate / deallocate focused tree node |
    | `Arrow keys` | Move to adjacent connected tree node |

- [ ] Task 6: Tests
  - [ ] `SkillTreeCanvas.test.tsx` (new, co-located at `lebo/src/features/skill-tree/SkillTreeCanvas.test.tsx`):
    - Mock `initRenderer` returning a fake `RendererInstance` with `getViewport()`, `addTickerListener()`, `renderTree()`, `resize()`, `destroy()`
    - Test: Tab key on first visible button fires `onKeyboardNavigate` with correct nodeId
    - Test: Enter on a focused button fires `onNodeClick`
    - Test: Escape on a focused button fires `onKeyboardNavigate(null, 0, 0)`
    - Test: Arrow key moves focus to an adjacent connected node (mock treeData with 2 connected nodes)
  - [ ] `SuggestionsList.test.tsx` (extend existing):
    - Test: ArrowDown moves focus to next card
    - Test: P key triggers `setPreviewSuggestionRank` on focused card
    - Test: S key triggers `skipSuggestion` on focused card
    - Test: Escape clears focused card
  - [ ] `pnpm tsc --noEmit` — clean
  - [ ] `pnpm vitest run` — all passing

## Dev Notes

### Existing Keyboard State — What Already Works

Do NOT remove or break these:
- **`Ctrl+S`** in `App.tsx` (`lebo/src/App.tsx:72-82`) — already implemented, no changes needed
- **Skip links** in `App.tsx` (`lebo/src/App.tsx:103-117`) — "Skip to tree" and "Skip to suggestions" already rendered; Story 6.2 needs these, don't touch them
- **Story 1.5 minimal canvas nav** — `tabIndex={0}` + `onKeyDown` in `SkillTreeCanvas.tsx`; THIS IS WHAT STORY 6.1 REPLACES. After Task 3, the `SkillTreeCanvas.tsx` keyboard approach changes from the container `div` approach to the invisible-button overlay approach.

### Critical: Input Element Guard for Bare-Key Shortcuts

The `O` and `I` shortcuts MUST include this guard (add at start of `handleKeyDown` before any bare-key handling):
```ts
const target = e.target as HTMLElement
const isInputTarget =
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target.isContentEditable
if (isInputTarget && !e.ctrlKey && !e.metaKey) return
```
Without this guard, typing `o` in the build name field, API key input (`#build-import-input`), or any context panel search box will hijack focus mid-typing. `Ctrl+S` is already safe (has `e.ctrlKey` check). `Escape` is safe globally.

### Connection-Graph Traversal — Using Existing `TreeNode.connections`

`TreeData.edges: TreeEdge[]` and `TreeNode.connections: string[]` both exist. Use `TreeNode.connections` directly for adjacency — it's already bidirectional per node:

```ts
// Build lookup map once when treeData changes
const connectionMap = useMemo(() => {
  const map = new Map<string, string[]>()
  for (const node of treeData.nodes) {
    map.set(node.id, node.connections)
  }
  return map
}, [treeData])
```

Tab traversal: from the current node, get `connectionMap.get(currentId) ?? []`, take the next ID in that array (cycling). If the array is empty, fall back to `nodes` array linear order (for truly isolated nodes).

Arrow key traversal: from the current node's screen position, filter to connected nodes, compute angle to each, pick the one whose angle is closest to the arrow direction:
```ts
const dirAngles = { ArrowRight: 0, ArrowDown: Math.PI/2, ArrowLeft: Math.PI, ArrowUp: -Math.PI/2 }
const targetAngle = dirAngles[e.key]
const connected = connectionMap.get(currentId) ?? []
const best = connected.reduce((best, id) => {
  const btn = buttonData[id]  // screen position from nodeButtons state
  if (!btn) return best
  const angle = Math.atan2(btn.screenY - currentBtn.screenY, btn.screenX - currentBtn.screenX)
  const diff = Math.abs(((angle - targetAngle) + Math.PI) % (2 * Math.PI) - Math.PI)
  return diff < best.diff ? { id, diff } : best
}, { id: null as string | null, diff: Infinity })
if (best.id) buttonRefs.current.get(best.id)?.focus()
```

### Invisible-Button Overlay Pattern — Key Constraints

- **`pointer-events: none`** on the overlay container — mouse clicks still reach the PixiJS canvas beneath
- Each button: `pointer-events: auto` to allow click + focus
- Each button: `position: absolute` inside the `position: relative` overlay div; `transform: translate(-50%, -50%)` to center on node coordinates
- **`sr-only` until focused**: use Tailwind's `sr-only` class (`position: absolute; width: 1px; height: 1px; ...`) as default, then `focus:not-sr-only focus:absolute focus:w-auto focus:h-auto` to show the focus ring on keyboard focus. The button is invisible to sighted mouse users, visible only when keyboard-focused.
- **Focus ring style**: `focus:outline focus:outline-2 focus:outline-[var(--color-accent-gold)] focus:rounded-full` — 2px gold ring, circular (matches node shape)
- **Tab DOM order vs. programmatic focus**: Set all buttons to `tabIndex={-1}` initially. Only the first node gets `tabIndex={0}`. Manage focus entirely programmatically via `buttonRefs.current.get(nextId)?.focus()` in `onKeyDown`. This prevents the browser's default Tab cycling through all buttons (which would be linear DOM order, not graph order).
  
  **Correction from above task:** Use `tabIndex={-1}` on all buttons except the first reachable node; manage Tab/arrow keys manually in `handleNodeKeyDown` by calling `.focus()` on target buttons. Do NOT set `tabIndex={0}` on all buttons — that creates 300+ tab stops in a large tree.

- **Viewport-only rendering**: only render buttons for nodes visible in current pan/zoom viewport (plus a 50px buffer). This is critical for performance — a full passive tree has hundreds of nodes but only ~30-50 are visible at any time.

### Pan/Zoom Position Sync — Ticker Pattern

The `addTickerListener` in Task 2 fires after every PixiJS render frame. The sync function reads `renderer.getViewport()` to get current `{x, y, scale}` (these are the `worldContainer.x/y/scale` values from `pixiRenderer.ts`). This fires at 60fps during pan/zoom — the `setNodeButtons` React state update must be debounced or use a ref-based approach to avoid triggering 60 React re-renders per second.

**Recommended pattern** — use a ref for button data and only trigger React state sync when the viewport has changed:
```ts
const lastViewportRef = useRef({ x: 0, y: 0, scale: 1 })
function syncButtonPositions() {
  const r = rendererRef.current
  if (!r) return
  const vp = r.getViewport()
  const last = lastViewportRef.current
  if (vp.x === last.x && vp.y === last.y && vp.scale === last.scale) return
  lastViewportRef.current = vp
  // now compute and setNodeButtons(...)
}
```
This throttles React re-renders to only when the viewport actually changes (not every frame if user isn't panning/zooming).

### `RendererInstance` Extension — Non-Breaking

Adding `addTickerListener` to `RendererInstance` in `types.ts` is a breaking change to the type only — `SkillTreeCanvas.tsx` is the only consumer. Mock this method in tests. The `pixiRenderer.ts` implementation is straightforward: `app.ticker.add(fn)` / `app.ticker.remove(fn)`.

Note: `pixiRenderer.ts` exports `NODE_RADIUS = { small: 12, medium: 18, large: 26 }`. Export it if it isn't already, or duplicate the constant in `SkillTreeCanvas.tsx`. Do NOT query the DOM for node sizes.

### `SuggestionsList.tsx` — Focused Card vs Expanded Card

`SuggestionsList` already manages `expandedRank` state (or similar) and `previewSuggestionRank`. The keyboard `focusedCardIndex` is a new piece of state that tracks which card has keyboard focus. They are independent:
- `focusedCardIndex` → which card the keyboard is on (for P/S/Enter actions)
- `expandedRank` → which card is expanded (toggled by Enter)
- `previewSuggestionRank` → which suggestion's nodes are highlighted on tree (toggled by P)

Read `SuggestionsList.tsx` fully before implementing — it already has complex state for apply errors, retry, etc. Do not inadvertently break any of that.

### File Locations Summary

| File | Change Type |
|---|---|
| `lebo/src/App.tsx` | Extend `handleKeyDown` useEffect — add `O`, `I`, `Escape` |
| `lebo/src/features/skill-tree/types.ts` | Add `addTickerListener` to `RendererInstance` |
| `lebo/src/features/skill-tree/pixiRenderer.ts` | Implement `addTickerListener` + export `NODE_RADIUS` |
| `lebo/src/features/skill-tree/SkillTreeCanvas.tsx` | Major refactor — invisible-button overlay pattern |
| `lebo/src/features/optimization/SuggestionsList.tsx` | Add keyboard nav (Up/Down/P/S/Enter/Escape) |
| `lebo/src/features/optimization/SuggestionCard.tsx` | Add `role="article"`, `aria-label`, `tabIndex={-1}` |
| `lebo/src/features/settings/Settings.tsx` | Add keyboard shortcuts reference table |
| `lebo/src/features/skill-tree/SkillTreeCanvas.test.tsx` | New — keyboard overlay tests |

### Coding Patterns (from prior stories)

- Tailwind v4 CSS-first: `className` for layout/spacing, `style={{ color: 'var(--color-...)' }}` for design tokens
- No barrel `index.ts` — import directly from source files
- Tests co-located with source, `*.test.tsx`
- Mock `@tauri-apps/api/core` in tests that invoke Tauri commands
- `getState()` in event handlers, not store subscriptions

### NFR15 — This Story Finalizes It

NFR15 requires every interactive control to be keyboard-reachable and activatable. After this story:
- Skill tree nodes: keyboard-reachable via hidden button overlay ✓
- Suggestion cards: keyboard-reachable via Up/Down nav ✓
- Optimize button: reachable via `O` shortcut ✓
- Build import input: reachable via `I` shortcut ✓
- All Headless UI components (Settings, dialogs): keyboard-native ✓ (already)

Story 6.2 will layer axe-core CI enforcement and ARIA live regions on top of this foundation.

## Project Context

- Architecture: Tauri 2.x + React 19 + TypeScript + PixiJS v8 + Zustand v5 + Tailwind v4 + Headless UI
- Stack: [architecture.md](../_bmad-output/planning-artifacts/architecture.md)
- Epics: [epics.md](../_bmad-output/planning-artifacts/epics.md) — Epic 6, Story 6.1 (lines ~1210–1268)
- UX spec: [ux-design-specification.md](../_bmad-output/planning-artifacts/ux-design-specification.md) — keyboard shortcuts at line ~823; accessibility strategy at line ~880

## Story Completion Status

Story created: 2026-04-29
Status: ready-for-dev

# Story 5.4: Error Handling Infrastructure & Reliability

Status: ready-for-dev

## Story

As an advanced Last Epoch player,
I want every error state — API failures, storage errors, network errors — to show me a clear message with a specific next step,
So that I'm never left wondering if the app is broken — I always know what went wrong and what to do about it.

## Acceptance Criteria

1. **Given** a retryable error occurs (API_ERROR, NETWORK_ERROR, TIMEOUT)
   **When** the error surfaces in the UI
   **Then** the relevant panel shows an inline error identifying the failure type in plain language
   **And** a "Retry" button is visible and functional for retryable error types
   **And** all errors conform to the `AppError` type: `{ type: ErrorType, message: string, detail?: string }`

2. **Given** a non-retryable error occurs (PARSE_ERROR, AUTH_ERROR, UNKNOWN)
   **When** the error surfaces
   **Then** no "Retry" button appears
   **And** actionable next steps are shown (e.g., "Check your API key in Settings" for AUTH_ERROR)

3. **Given** a storage error occurs (STORAGE_ERROR)
   **When** the SQLite read/write fails
   **Then** a dismissible toast notification appears (non-blocking)
   **And** the active build in memory is not lost
   **And** the user is guided to try saving again

4. **Given** game data download fails on launch (NFR13)
   **When** the failure occurs
   **Then** the app launches using cached local data without any blocking error screen
   **And** the staleness indicator reflects the cached state

5. **Given** all external services are unavailable simultaneously (NFR14)
   **When** the user attempts to use the app
   **Then** skill tree visualization, saved build loading, and manual node editing all work
   **And** only AI optimization is restricted (with the offline/error message)

6. **Given** a catastrophic React render error occurs (unhandled exception in component tree)
   **When** the ErrorBoundary catches it
   **Then** a full-panel fallback renders with: "Something went wrong" message and a "Reload App" button
   **And** clicking "Reload App" calls `window.location.reload()`

## Tasks / Subtasks

- [ ] Task 1: Add `isRetryable()` helper to error types (AC: 1, 2)
  - [ ] In `lebo/src/shared/types/errors.ts`, export `RETRYABLE_ERROR_TYPES: ErrorType[]` = `['API_ERROR', 'NETWORK_ERROR', 'TIMEOUT']`
  - [ ] Export `isRetryable(type: ErrorType): boolean` function

- [ ] Task 2: Create `Toast.tsx` styled wrapper (AC: 3)
  - [ ] Create `lebo/src/shared/components/Toast.tsx`
  - [ ] Export `showErrorToast(message: string): void` — calls `toast.error(message, { style: { borderLeft: '3px solid var(--color-data-negative)' } })`
  - [ ] Export `showSuccessToast(message: string): void` — calls `toast.success(message)` (TOASTER_OPTS in App.tsx already handles base styles)
  - [ ] Export `showInfoToast(message: string, opts?: object): void` — calls `toast(message, opts)` (replaces direct `toast()` calls)

- [ ] Task 3: Add Retry button to optimization error banner in `SuggestionsList.tsx` (AC: 1, 2)
  - [ ] Add `onRetry: () => void` prop to `SuggestionsList`
  - [ ] Import `isRetryable` from `shared/types/errors`
  - [ ] When `streamError && isRetryable(streamError.type)`: render a "Retry" button inside the error banner alongside the dismiss (×) button
  - [ ] "Retry" button `data-testid="retry-optimization-button"` — calls `onRetry()` on click
  - [ ] `RightPanel.tsx`: pass `startOptimization` as `onRetry` to `<SuggestionsList onRetry={startOptimization} />`

- [ ] Task 4: Add storage error toasts in `buildPersistence.ts` (AC: 3)
  - [ ] In `saveBuild()`: wrap `invokeCommand` call in try/catch; on catch call `showErrorToast('Failed to save build. Your work is safe in memory — try again.')` and re-throw
  - [ ] In `loadBuild()`: on catch call `showErrorToast('Failed to load build. Please try again.')` and re-throw
  - [ ] In `deleteBuild()`: on catch call `showErrorToast('Failed to delete build. Please try again.')` and re-throw
  - [ ] In `renameBuild()`: on catch call `showErrorToast('Failed to rename build. Please try again.')` and re-throw
  - [ ] Replace all raw `toast(...)` calls in `buildPersistence.ts` with `showInfoToast(...)` from `Toast.tsx`

- [ ] Task 5: Migrate `SavedBuildsList.tsx` toast calls to `Toast.tsx` wrappers (AC: 3)
  - [ ] Replace direct `toast(...)` / `toast.dismiss(...)` calls with `showInfoToast()` where applicable (the unsaved-build confirmation toast uses a render function — leave it as `toast(fn)` since it needs custom JSX)

- [ ] Task 6: Create `ErrorBoundary.tsx` (AC: 6)
  - [ ] Create `lebo/src/shared/components/ErrorBoundary.tsx` — React class component
  - [ ] State: `{ hasError: boolean }`; implement `static getDerivedStateFromError()` → `{ hasError: true }`
  - [ ] Fallback render: full-panel centered layout with "Something went wrong." heading + "Reload App" button → `window.location.reload()`
  - [ ] Style fallback using design tokens: `bg-surface` background, `text-primary` heading, accent-gold button
  - [ ] Props: `{ children: React.ReactNode }`
  - [ ] Wrap the main layout content in `App.tsx` with `<ErrorBoundary>` (see Dev Notes for placement)

- [ ] Task 7: Tests (AC: 1–6)
  - [ ] Update `lebo/src/shared/types/errors.test.ts` (or `errorNormalizer.test.ts`) — add tests for `isRetryable()`:
    - [ ] `API_ERROR`, `NETWORK_ERROR`, `TIMEOUT` return `true`
    - [ ] `AUTH_ERROR`, `PARSE_ERROR`, `STORAGE_ERROR`, `DATA_STALE`, `UNKNOWN` return `false`
  - [ ] Create `lebo/src/shared/components/ErrorBoundary.test.tsx`:
    - [ ] When a child throws: fallback renders with "Something went wrong"
    - [ ] "Reload App" button is present
  - [ ] Update `lebo/src/features/optimization/SuggestionsList.test.tsx`:
    - [ ] When `streamError` is retryable (API_ERROR): "Retry" button renders with `data-testid="retry-optimization-button"`
    - [ ] When `streamError` is non-retryable (AUTH_ERROR): "Retry" button does NOT render
    - [ ] Clicking "Retry" button calls `onRetry` prop
  - [ ] Update `lebo/src/features/build-manager/buildPersistence.test.ts`:
    - [ ] When `invokeCommand('save_build')` rejects: `showErrorToast` is called
    - [ ] Error is re-thrown (so callers can handle if needed)
  - [ ] `pnpm tsc --noEmit` — clean
  - [ ] `pnpm vitest run` — all tests pass

## Dev Notes

### What Already Exists — DO NOT Reinvent

| What | Status | Where |
|------|--------|-------|
| `AppError` interface + `ErrorType` union (8 types) | ✅ exists | `lebo/src/shared/types/errors.ts` |
| `normalizeAppError()` + `USER_MESSAGES` map (all 8 types) | ✅ exists | `lebo/src/shared/utils/errorNormalizer.ts` |
| `invokeCommand()` wrapper — auto-throws normalized `AppError` | ✅ exists | `lebo/src/shared/utils/invokeCommand.ts` |
| `optimizationStore.streamError: AppError | null` + `setStreamError()` | ✅ exists | `lebo/src/shared/stores/optimizationStore.ts` |
| `react-hot-toast` installed + `<Toaster>` mounted in App.tsx with TOASTER_OPTS | ✅ exists | `lebo/src/App.tsx:1–27` |
| Error banner in `SuggestionsList` (message + dismiss × + AUTH_ERROR "Go to Settings" link) | ✅ exists | `lebo/src/features/optimization/SuggestionsList.tsx:231–261` |
| `startOptimization()` — re-runs optimization (and clears previous error via `clearSuggestions()`) | ✅ exists | `lebo/src/shared/stores/useOptimizationStream.ts:131` |
| `<Toaster>` already renders at `<App>` level — no second Toaster needed | ✅ exists | `lebo/src/App.tsx:88,129` |
| Toast calls already in `buildPersistence.ts` (success) and `SavedBuildsList.tsx` (unsaved-build confirm) | ✅ exists | see both files |
| Game data launch failure is already non-blocking (`initGameData().catch(console.error)` in App.tsx) | ✅ exists | `lebo/src/App.tsx:36` |

---

### `errors.ts` — additions only

```typescript
export const RETRYABLE_ERROR_TYPES: ErrorType[] = ['API_ERROR', 'NETWORK_ERROR', 'TIMEOUT']

export function isRetryable(type: ErrorType): boolean {
  return RETRYABLE_ERROR_TYPES.includes(type)
}
```

---

### `Toast.tsx` — full implementation

```typescript
import toast from 'react-hot-toast'

export function showErrorToast(message: string): void {
  toast.error(message, {
    style: { borderLeft: '3px solid var(--color-data-negative)' },
  })
}

export function showSuccessToast(message: string): void {
  toast.success(message)
}

export function showInfoToast(message: string, opts?: Parameters<typeof toast>[1]): void {
  toast(message, opts)
}
```

**Why a wrapper?** The global `TOASTER_OPTS` in App.tsx covers base styles (background, text color, border). Error toasts need an additional left-border in `data-negative` color as a visual discriminator — that extra style must be passed per-call, not globally. Centralizing in `Toast.tsx` prevents style drift across files.

**Do NOT add a second `<Toaster>` component anywhere** — one is already mounted in `App.tsx`.

---

### `SuggestionsList.tsx` — Retry button addition

Current error banner (lines 231–261) shows the error message, optional "Go to Settings" link, and dismiss ×. Add a Retry button for retryable types:

```tsx
// New prop:
interface SuggestionsListProps {
  onRetry: () => void
}

// Inside error banner, after the <span> with the message and before the dismiss ×:
{isRetryable(streamError.type) && (
  <button
    onClick={onRetry}
    data-testid="retry-optimization-button"
    className="text-xs shrink-0 underline"
    style={{ color: 'var(--color-accent-gold)' }}
  >
    Retry
  </button>
)}
```

**Retry behavior:** `onRetry` receives `startOptimization` from `RightPanel`. `startOptimization()` internally calls `clearSuggestions()` first (which resets `streamError` to `null`), then re-invokes the Claude API — so the error banner disappears and the loading skeleton reappears automatically. No separate "clear error" call needed.

**Warning — hook duplication:** Do NOT call `useOptimizationStream()` inside `SuggestionsList` — the hook registers Tauri event listeners on mount. Two instances would receive duplicate events. Always pass `startOptimization` via the `onRetry` prop from `RightPanel` (which already calls the hook).

---

### `buildPersistence.ts` — error toast pattern

```typescript
import { showErrorToast, showInfoToast } from '../../shared/components/Toast'

// saveBuild — wrap existing invokeCommand call:
try {
  await invokeCommand('save_build', { ... })
  setActiveBuildPersisted()
  // ... existing state updates ...
  showInfoToast(`Build saved as ${build.name}`, { duration: 3000 })
} catch (err) {
  showErrorToast('Failed to save build. Your work is safe in memory — try again.')
  throw err  // re-throw so useAutoSave can log it
}

// loadBuild, deleteBuild, renameBuild — same pattern:
try {
  await invokeCommand(...)
  // ... existing logic ...
} catch (err) {
  showErrorToast('Failed to [load/delete/rename] build. Please try again.')
  throw err
}
```

**Re-throw on error:** The callers of `saveBuild` (e.g., `useAutoSave`) already have `.catch(console.error)` guards. Re-throwing ensures those guards still fire and that the active build in memory is never silently discarded.

**The unsaved-build confirmation toast in `SavedBuildsList.tsx` uses a render function `toast((t) => <span>...</span>)`** — this custom JSX form cannot go through `showInfoToast()`. Leave it as a direct `toast(fn)` call; only migrate simple string toasts.

---

### `ErrorBoundary.tsx` — full implementation

```typescript
import React from 'react'

interface State { hasError: boolean }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center h-full gap-4"
          style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}
          data-testid="error-boundary-fallback"
        >
          <p className="text-sm font-semibold">Something went wrong.</p>
          <button
            onClick={() => window.location.reload()}
            data-testid="reload-app-button"
            className="px-3 py-1.5 rounded text-sm"
            style={{
              backgroundColor: 'var(--color-accent-gold)',
              color: 'var(--color-bg-base)',
            }}
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Placement in `App.tsx`:** Wrap the main layout content (not the entire App including `<Toaster>`) so toasts still work during error recovery:

```tsx
// In App.tsx, inside the return, wrap the layout with ErrorBoundary:
return (
  <>
    <ErrorBoundary>
      {currentView === 'settings' ? (
        <Settings />
      ) : (
        <div className="...existing layout...">
          <AppHeader />
          <StatusBar />
          <LeftPanel />
          <CenterCanvas />
          <RightPanel />
        </div>
      )}
    </ErrorBoundary>
    <Toaster position="bottom-center" toastOptions={TOASTER_OPTS} />
  </>
)
```

**Note:** React Error Boundaries only catch errors in the render/lifecycle of child components — NOT in event handlers or async code. The `startOptimization` async path already handles errors via `setStreamError()`. The ErrorBoundary is a last-resort safety net for unexpected render exceptions.

---

### File Locations

**New files:**
- `lebo/src/shared/types/errors.ts` (modified — add `RETRYABLE_ERROR_TYPES` + `isRetryable()`)
- `lebo/src/shared/components/Toast.tsx` (new)
- `lebo/src/shared/components/ErrorBoundary.tsx` (new)
- `lebo/src/shared/components/ErrorBoundary.test.tsx` (new)

**Modified files:**
- `lebo/src/features/optimization/SuggestionsList.tsx` — add `onRetry` prop + Retry button
- `lebo/src/features/optimization/SuggestionsList.test.tsx` — Retry button tests
- `lebo/src/features/layout/RightPanel.tsx` — pass `startOptimization` as `onRetry` to SuggestionsList
- `lebo/src/features/build-manager/buildPersistence.ts` — add error toasts on all catch paths
- `lebo/src/features/build-manager/buildPersistence.test.ts` — error toast tests
- `lebo/src/App.tsx` — wrap layout with `<ErrorBoundary>`

---

### Testing — ErrorBoundary mock pattern

```typescript
// ErrorBoundary.test.tsx
function ThrowingComponent() {
  throw new Error('test error')
}

it('renders fallback when child throws', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  render(
    <ErrorBoundary>
      <ThrowingComponent />
    </ErrorBoundary>
  )
  expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument()
  expect(screen.getByTestId('reload-app-button')).toBeInTheDocument()
  consoleSpy.mockRestore()
})
```

**Suppress `console.error`:** React logs boundary errors to console during tests. The `consoleSpy.mockImplementation(() => {})` suppresses this noise. Restore it after the test.

---

### Regression Warnings

- `SuggestionsList` gains a required `onRetry` prop — update all existing render sites (only `RightPanel.tsx` renders it)
- `buildPersistence.ts` errors now re-throw after toasting — confirm `useAutoSave` in `App.tsx` still handles this gracefully (it calls `.catch(console.error)` which is sufficient)
- `App.tsx` layout changes around `<ErrorBoundary>` — ensure both the settings view and main view are wrapped, and that `<Toaster>` remains outside the ErrorBoundary
- `SuggestionsList.test.tsx` must provide the `onRetry` prop to all existing test renders (use `vi.fn()` as a no-op default)

---

### Scope boundaries — do NOT do in this story

- No changes to the Rust error types or `AppError` serialization from the backend
- No changes to `errorNormalizer.ts` or `invokeCommand.ts` — they are complete
- No error boundaries around individual components beyond the single top-level one
- No retry logic for build load/delete/rename operations (storage errors are user-actionable; they can retry via the UI)
- No error analytics or Sentry integration
- No changes to `DataStalenessBar` (game data staleness display is already handled in its own story)

## Dev Agent Record

### Agent Model Used

_to be filled on implementation_

### Completion Notes List

_to be filled on implementation_

### File List

_to be filled on implementation_

### Review Findings

_to be filled on implementation_

## Change Log

- 2026-04-28: Story 5.4 created — Error Handling Infrastructure & Reliability

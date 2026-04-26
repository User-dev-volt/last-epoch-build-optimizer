# Story 5.2: Connectivity Detection & Offline Mode

Status: review

## Story

As a Last Epoch player using LEBOv2,
I want the app to detect and display my internet connectivity status,
so that I know when AI features are unavailable and never encounter a confusing error when offline.

## Acceptance Criteria

1. **Given** the app launches
   **When** initialization completes
   **Then** a connectivity check fires automatically and `appStore.isOnline` is set to `true` only if the check succeeds — it is never assumed `true` at startup

2. **Given** the app is online
   **When** the StatusBar renders
   **Then** it displays a green dot + "Online" (already implemented — no change needed)

3. **Given** the app is offline
   **When** the StatusBar renders
   **Then** it displays an amber dot + "Offline" (already implemented — no change needed)

4. **Given** the app is offline
   **When** the Optimize button renders in RightPanel
   **Then** the button is disabled and an inline message is shown: "AI optimization requires internet connectivity. Connect to the internet and retry."

5. **Given** the app is offline and Optimize is disabled
   **When** connectivity is restored
   **Then** the Optimize button becomes enabled and the offline message disappears — without restart

6. **Given** the app is running
   **When** connectivity state changes (online→offline or offline→online)
   **Then** Rust emits a Tauri event `app:connectivity-changed` with payload `{ is_online: bool }`, and `appStore.isOnline` updates within 30 seconds

7. **Given** the app is running
   **When** 30 seconds elapse
   **Then** connectivity is re-checked and if the state has changed, `app:connectivity-changed` is emitted

## Tasks / Subtasks

- [x] Task 1: Create `connectivity_service.rs` (AC: 1, 6, 7)
  - [x] Create `lebo/src-tauri/src/services/connectivity_service.rs`
  - [x] Implement `pub async fn check_once() -> bool` — HEAD request to `game_data_service::REMOTE_DATA_BASE_URL` with 5s timeout, returns `true` if a response is received regardless of HTTP status, `false` on connection error or timeout (see Dev Notes for reqwest pattern)
  - [x] Implement `pub async fn start_watcher(app_handle: tauri::AppHandle)` — initial check + emit, then loops on 30s interval, emits `app:connectivity-changed` only on state change (see Dev Notes for pattern)
  - [x] Add `pub mod connectivity_service;` to `lebo/src-tauri/src/services/mod.rs`

- [x] Task 2: Add `check_connectivity` Tauri command (AC: 1)
  - [x] In `lebo/src-tauri/src/commands/app_commands.rs`, add `check_connectivity` command
  - [x] Add `use crate::services::connectivity_service;` import to `app_commands.rs`
  - [x] Register `check_connectivity` in `lib.rs` invoke_handler

- [x] Task 3: Start watcher in `lib.rs` setup (AC: 6, 7)
  - [x] Add `.setup()` closure to `tauri::Builder` in `lib.rs` (before `.plugin()` calls) that spawns `connectivity_service::start_watcher`

- [x] Task 4: Create `src/shared/hooks/useConnectivity.ts` (AC: 1, 5, 6)
  - [x] Create `lebo/src/shared/hooks/useConnectivity.ts`
  - [x] On mount: call `invokeCommand<boolean>('check_connectivity')` → `setOnline(result)` (catches and ignores errors — connectivity failure is itself a valid offline state)
  - [x] Listen to `app:connectivity-changed` Tauri event → call `setOnline(payload.is_online)` on each event
  - [x] Return `unlisten` cleanup function from the `useEffect` (see Dev Notes for listen pattern)
  - [x] `data-testid` not applicable — this is a hook, not a component

- [x] Task 5: Mount `useConnectivity()` in `App.tsx` (AC: 1)
  - [x] Import and call `useConnectivity()` inside `App()` — placed alongside other hooks at the top of the function body
  - [x] `useConnectivity` called unconditionally (hooks ordering rule)

- [x] Task 6: Update `RightPanel.tsx` for offline guard (AC: 4, 5)
  - [x] Subscribe to `isOnline` from appStore: `const isOnline = useAppStore((s) => s.isOnline)`
  - [x] Change OptimizeButton disabled prop: `disabled={!activeBuild || !isOnline}`
  - [x] Add offline note below OptimizeButton (shown when `!isOnline`) with `data-testid="offline-note"`
  - [x] Offline note renders above context note (visual priority)

- [x] Task 7: Tests (AC: 1–7)
  - [x] Create `lebo/src/shared/hooks/useConnectivity.test.ts`:
    - [x] `check_connectivity` is called on mount
    - [x] `setOnline(true)` is called when command resolves `true`
    - [x] `app:connectivity-changed` event with `{ is_online: false }` calls `setOnline(false)`
    - [x] `app:connectivity-changed` event with `{ is_online: true }` calls `setOnline(true)`
    - [x] Unlisten is called on unmount
  - [x] Update `lebo/src/features/layout/RightPanel.test.tsx`:
    - [x] When `isOnline=false` and `activeBuild` present: OptimizeButton is disabled
    - [x] When `isOnline=false`: offline note text is visible
    - [x] When `isOnline=true` and `activeBuild` present: OptimizeButton is enabled (existing behavior preserved)
    - [x] When `isOnline=false` and `!activeBuild`: offline note is still visible (button was already disabled)
  - [x] `pnpm tsc --noEmit` — clean
  - [x] `pnpm vitest run` — all 380 tests pass (36 files)

## Dev Notes

### Connectivity check — reqwest pattern in Rust

Use `tauri_plugin_http::reqwest` (already imported in `game_data_service.rs`). The HEAD request to the game data base URL is sufficient — any response (even 4xx) means network is reachable:

```rust
use tauri_plugin_http::reqwest;
use crate::services::game_data_service::REMOTE_DATA_BASE_URL;

pub async fn check_once() -> bool {
    let url = format!("{}/manifest.json", REMOTE_DATA_BASE_URL);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build();
    match client {
        Err(_) => false,
        Ok(c) => c.head(&url).send().await.is_ok(),
    }
}
```

**Why HEAD?** Minimal data transfer — we only need to know if the host is reachable, not fetch the manifest body. Any network error (DNS failure, timeout, refused connection) returns `is_ok() == false`.

---

### start_watcher — polling loop pattern

```rust
use tauri::Emitter;

pub async fn start_watcher(app_handle: tauri::AppHandle) {
    let mut prev_state: Option<bool> = None;
    let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));
    loop {
        interval.tick().await;
        let is_online = check_once().await;
        if prev_state != Some(is_online) {
            prev_state = Some(is_online);
            let _ = app_handle.emit(
                "app:connectivity-changed",
                serde_json::json!({ "is_online": is_online }),
            );
        }
    }
}
```

**Note:** `interval.tick().await` fires immediately on first call (elapsed since creation = 0), so the first check happens right away. This is the correct Tokio behavior — the watcher does an initial check on spawn, then every 30s. This means `start_watcher` handles the background polling, and `check_connectivity` (the Tauri command) handles the eager on-mount check from the frontend.

**CRITICAL:** Do NOT await `start_watcher` — it runs forever. Always spawn it:
```rust
tauri::async_runtime::spawn(connectivity_service::start_watcher(app_handle.clone()));
```

---

### lib.rs setup closure — exact position

```rust
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(connectivity_service::start_watcher(handle));
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        // ... rest of plugins unchanged
        .invoke_handler(tauri::generate_handler![
            // ... existing commands
            check_connectivity,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Add `use commands::app_commands::{check_api_key_configured, check_connectivity, set_api_key};` to update the existing import.

Also add at the top: `use services::connectivity_service;` or reference via full path `crate::services::connectivity_service`.

---

### useConnectivity.ts — event listener pattern

```typescript
import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invokeCommand } from '../utils/invokeCommand'
import { useAppStore } from '../stores/appStore'

export function useConnectivity() {
  const setOnline = useAppStore((s) => s.setOnline)

  useEffect(() => {
    // Eager check on mount
    invokeCommand<boolean>('check_connectivity')
      .then((isOnline) => setOnline(isOnline))
      .catch(() => setOnline(false))

    // Listen for background watcher events
    let unlisten: (() => void) | undefined
    listen<{ is_online: boolean }>('app:connectivity-changed', (event) => {
      setOnline(event.payload.is_online)
    }).then((fn) => { unlisten = fn })

    return () => { unlisten?.() }
  }, [])  // empty dep array — mount-only, same pattern as Story 5.1's ApiKeyInput
}
```

**Pattern note:** `listen()` returns a Promise of unlisten function. The `useEffect` cleanup captures it via closure after the Promise resolves. This is the standard Tauri event listener pattern used in `useOptimizationStream.ts` — check that file for a complete reference example.

---

### RightPanel.tsx — exact diff context

Current OptimizeButton call (line ~83):
```tsx
<OptimizeButton
  onOptimize={startOptimization}
  disabled={!activeBuild}
  isOptimizing={isOptimizing}
/>
```

After change:
```tsx
<OptimizeButton
  onOptimize={startOptimization}
  disabled={!activeBuild || !isOnline}
  isOptimizing={isOptimizing}
/>

{!isOnline && (
  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }} data-testid="offline-note">
    AI optimization requires internet connectivity. Connect to the internet and retry.
  </p>
)}
```

The offline note renders **between** the OptimizeButton and the existing `showContextNote` banner — both can be visible simultaneously if user is offline AND has empty context. This is fine; the offline note takes priority visually since it's higher in the list.

---

### Testing patterns

**useConnectivity.test.ts** — mock `@tauri-apps/api/event` the same way it's mocked in `useOptimizationStream` tests. Pattern:

```typescript
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()), // returns unlisten fn
}))
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))
```

When simulating an event, invoke the callback passed to `listen` directly in the test:
```typescript
const listenMock = vi.mocked(listen)
const handler = listenMock.mock.calls[0][1]  // second arg = event handler
handler({ payload: { is_online: false } } as Event<{ is_online: boolean }>)
```

**RightPanel.test.tsx** — already mocks `@tauri-apps/api/event` and `@tauri-apps/api/core`. Add:
```typescript
useAppStore.setState({ isOnline: false })
```
to simulate offline state in tests.

---

### What Already Exists — DO NOT Reinvent

| What | Status | Where |
|------|--------|-------|
| `appStore.isOnline: boolean` (default: `false`) | ✅ Done | `shared/stores/appStore.ts:11` |
| `appStore.setOnline()` action | ✅ Done | `shared/stores/appStore.ts:26` |
| StatusBar Online/Offline display + dot color | ✅ Done | `features/layout/StatusBar.tsx` |
| `NETWORK_ERROR` type in errors.ts | ✅ Done | `shared/types/errors.ts:3` |
| NETWORK_ERROR normalization in errorNormalizer | ✅ Done | `shared/utils/errorNormalizer.ts:5` |
| `reqwest` via `tauri_plugin_http` in Rust | ✅ Done | `services/game_data_service.rs:4` |
| `REMOTE_DATA_BASE_URL` constant | ✅ Done | `services/game_data_service.rs:7` |
| `tauri::Emitter` trait for `app_handle.emit()` | ✅ Done | Used in `claude_commands.rs` |
| `services/mod.rs` | ✅ Done | Needs `pub mod connectivity_service;` added |

---

### File Locations

**New files:**
- `lebo/src-tauri/src/services/connectivity_service.rs`
- `lebo/src/shared/hooks/useConnectivity.ts`
- `lebo/src/shared/hooks/useConnectivity.test.ts`

**Modified files:**
- `lebo/src-tauri/src/services/mod.rs` — add `pub mod connectivity_service;`
- `lebo/src-tauri/src/commands/app_commands.rs` — add `check_connectivity` command
- `lebo/src-tauri/src/lib.rs` — register command + setup watcher
- `lebo/src/App.tsx` — call `useConnectivity()`
- `lebo/src/features/layout/RightPanel.tsx` — offline guard + message
- `lebo/src/features/layout/RightPanel.test.tsx` — offline tests

---

### Regression Warnings

- `App.tsx` gains a new hook call (`useConnectivity()`) — place it alongside existing hooks, NOT inside a conditional branch (hooks ordering law)
- `RightPanel.tsx` gains `isOnline` subscription — existing tests that render RightPanel need `useAppStore.setState({ isOnline: true })` in their `beforeEach` to preserve current behavior (optimize button enabled when activeBuild is set)
- `lib.rs` gains a `.setup()` closure — this must come before `.plugin()` calls; see the exact position in Dev Notes above

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Created `connectivity_service.rs` with `check_once()` (HEAD request, 5s timeout) and `start_watcher()` (30s poll loop, emits only on state change)
- `check_connectivity` Tauri command does eager on-mount check + emits event so frontend store updates immediately
- `.setup()` closure added to `tauri::Builder` before `.plugin()` calls — spawns the background watcher
- `useConnectivity` hook: eager invoke on mount + Tauri event listener; unlisten cleanup on unmount
- `RightPanel` offline guard: `disabled={!activeBuild || !isOnline}` + offline note with `data-testid="offline-note"`
- Existing RightPanel tests updated: `beforeEach` now sets `isOnline: true` to preserve prior enabled-button behavior
- All 380 tests pass (36 files), `tsc --noEmit` clean

### File List

- `lebo/src-tauri/src/services/connectivity_service.rs` (new)
- `lebo/src/shared/hooks/useConnectivity.ts` (new)
- `lebo/src/shared/hooks/useConnectivity.test.ts` (new)
- `lebo/src-tauri/src/services/mod.rs` (modified)
- `lebo/src-tauri/src/commands/app_commands.rs` (modified)
- `lebo/src-tauri/src/lib.rs` (modified)
- `lebo/src/App.tsx` (modified)
- `lebo/src/features/layout/RightPanel.tsx` (modified)
- `lebo/src/features/layout/RightPanel.test.tsx` (modified)

## Change Log

- 2026-04-26: Story 5.2 created — Connectivity Detection & Offline Mode
- 2026-04-26: Story 5.2 implemented — Rust connectivity service, Tauri command, useConnectivity hook, RightPanel offline guard; all ACs satisfied, 380 tests passing

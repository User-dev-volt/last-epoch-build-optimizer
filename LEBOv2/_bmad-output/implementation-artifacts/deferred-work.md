## Deferred from: code review of 2-3-typescript-icon-texture-loading-useicontextures-hook (2026-05-12)

- **`loadedIdsRef` accumulates across class switches** — `useIconTextures.ts` — The loaded-IDs Set is never cleared on class change. Memory grows with each class visited per session. Harmless in practice because PixiJS Assets cache deduplication by URL means re-loading is free anyway, and Last Epoch skill IDs are globally unique. Revisit if per-class texture scoping is needed.
- **`classData` not memoized in `SkillTreeView`** — `SkillTreeView.tsx:89` — `classData` is a plain property access (`gameData.classes[selectedClassId]`) not wrapped in `useMemo`. A new `gameData` object reference from Zustand on any unrelated update creates a new `skillIds` array, re-triggering Effect B. The `loadedIdsRef` guard prevents duplicate IPC calls but the filter loop still runs. Acceptable at current scale; add `useMemo(() => gameData?.classes[selectedClassId], [gameData, selectedClassId])` if profiling shows waste.

## Known Vitest baseline (as of story 2.2, 2026-05-12)

6 pre-existing test failures exist in the suite that are **not regressions** introduced by any story work. The passing bar for all stories is 502/508 (not 508/508). These failures are:

- `ProviderSelector` and `Settings` component tests — 6 tests fail due to Headless UI dialog portal rendering incompatibilities with jsdom. These are pre-existing since Epic 1 and tracked here as the known baseline. Fix is blocked on either upgrading jsdom or switching to a full browser test runner for those components.

Any story that introduces new failures beyond this 502/508 baseline must fix them before marking the story complete.

## Deferred from: code review of 2-2-rust-icon-pipeline-commands post-remediation (2026-05-12)

- **Concurrent get_icon_cache_path cold-cache reads** — `icon_commands.rs` — Mutex is released after the empty-check; all concurrent callers (e.g. 20+ per-node calls from Story 2.4) each incur a disk read before any of them populates the cache. Benign: data is deterministic and the map file is tiny. Fix with `OnceLock` or hold the lock across the slow path if concurrent reads become observable.
- **path.to_string_lossy() on non-UTF-8 paths** — `icon_commands.rs:~L88` — Returns a lossy UTF-8 string that silently replaces non-UTF-8 chars with U+FFFD. On Windows, `%APPDATA%` is almost always valid UTF-8, and the caller falls back to placeholder on `None`. Low real-world risk.
- **Blocking sync file I/O in async Tauri command** — `icon_commands.rs:~L97` — `std::fs::copy` × 1,027 files blocks the async runtime thread during `initialize_icon_pipeline`. One-time startup operation; acceptable until profiling shows otherwise. Fix with `spawn_blocking` or `tokio::fs` if needed.
- **Test temp dir leak on panic** — `icon_commands.rs` test module — `fs::remove_dir_all` only runs on happy path; panicking tests leave temp dirs behind. Test hygiene only; no production impact.

## Deferred from: code review of 2-2-rust-icon-pipeline-commands (2026-05-12)

- **Production build verification** — `bundle.resources` glob `"resources/icons/skills/*"` was not verified in a full `pnpm tauri build`. Tauri 2 supports glob patterns in resources, but the actual build output should be smoke-tested before the first release to confirm all 1,027 PNGs are bundled correctly.

- **Icon cache staleness / invalidation** — Once `skill-icon-map.json` exists in the cache, updated icons from game patches are never picked up. This is intentional for Phase 2 (icons change rarely; dev re-runs `tools/extract-icons/ --extract` on game patches). Story 6.3 (Manifest v2 & Atomic Data Update Pipeline) is the planned remediation point for in-app icon freshness detection.

- **`App.tsx` caller behavior on `initialize_icon_pipeline` failure** — Story 2.3 (`useIconTextures`) is the actual caller. On `Err`, it should log the error via `console.error` and continue without blocking render; the hook treats an empty/partial cache the same as a cold cache (all lookups return `null`, all nodes render as placeholder fill). Do NOT surface an error toast for icon init failure — it is non-blocking.

## Deferred from: code review of 2-1-icon-pipeline-research-spike (2026-05-08)

- **Non-default Steam library path detection** — `detect_steam_path()` in Story 2.2 must enumerate all Steam library roots via `HKCU\SOFTWARE\Valve\Steam\SteamPath` + `libraryfolders.vdf`, not hard-code the default `C:\Program Files (x86)\Steam\` path. A significant portion of users install large games on secondary drives.
- **Hardcoded bundle filename fragility on game updates** — `skill_icons_assets_all.bundle` is the current filename but Addressables content builds may hash it on future patches. Story 2.2 should check file existence at runtime and log a clear diagnostic warning if the bundle is absent after a game update.
- **CDN skillId format mismatch (kebab-case vs underscore)** — If `lastepochtools.com` icons use `mirror_image`-style identifiers, a translation function will be needed to convert app kebab-case skillIds before constructing the CDN URL. Blocked on CDN URL confirmation; Story 2.2 scope.
- **Icon cache invalidation on game update** — The spike specifies the icon cache path but not what triggers a cache bust when the player updates Last Epoch. `initialize_icon_pipeline()` needs a version-comparison mechanism similar to the existing game data staleness check.
- **macOS App Sandbox entitlements for Steam path** — A future Mac App Store build with App Sandbox cannot freely read `~/Library/Application Support/Steam/` without an explicit entitlement or security-scope bookmark flow. Future macOS distribution concern.
- **Epic Games / Game Pass install paths not addressed** — The spike scoped to Steam only. Epic and Xbox Game Pass paths differ; Xbox `WindowsApps` paths are typically read-denied without special permissions. Out of current project scope.

## Deferred from: code review of 1-4-active-skill-tab-skill-picker-integration (2026-05-07)

- **`applySkillNodeChange` not atomic** — `buildStore.ts` — Uses `get()`/`set()` pattern; stale snapshot on rapid clicks could lose intermediate undo states. Pre-existing pattern in `applyNodeChange`.
- **Dependent-blocking only fires at `newPoints === 0`** — `buildStore.ts` — Partial removal that still leaves a dependent unsatisfied is not blocked. Same as pre-existing `applyNodeChange` behaviour.
- **`buildPersistence.ts` bare-cast `skillNodeAllocations`** — `buildPersistence.ts` — Nested structure not deeply validated on load; runtime safe due to `?? 0` guards on all reads.
- **Inactive `useSkillTree` instance stale state** — `SkillTreeView.tsx` — Two hook instances run simultaneously; inactive one retains hover/error state visible on tab return. Hooks rules block a conditional call fix.
- **Popover `position: fixed` without React portal** — `SkillTreeView.tsx` — Inline fixed positioning breaks if any ancestor has a CSS transform. Not present in current layout.
- **`assignSkillToSlot` leaves empty `{}` key** — `buildStore.ts` — Cleared slot writes `{}` rather than deleting the key; harmless for correctness but could confuse future slot-enumeration code.
- **`transformSkillEntry` silently nulls unknown masteryId** — `gameDataLoader.ts` — Data integrity gap; unknown masteryId produces `masteryName: null` indistinguishable from a base-class skill.

## Deferred from: code review of 1-2-prerequisite-validation-with-visual-flash-feedback (2026-05-07)

- **`flashNodeIds` never reset on success** — `useSkillTree.ts` — `flashNodeIds` stays non-null after first failure. Functionally safe (new array reference re-triggers effect on each failure), but semantically stale. Consider resetting to null on successful allocation.
- **Preview mode real-click gap** — `SkillTreeView.tsx` — User can commit real allocations while preview overlay is active. No guard prevents interaction during suggestion preview.
- **`computePreviewAllocations` missing maxPoints upper bound** — `SkillTreeView.tsx` — Preview allocation can exceed node's `maxPoints` without clamping. Could show illegal states in preview UI.
- **Flash only shows depth-1 dependents** — `pixiRenderer.ts` / `useSkillTree.ts` — When blocking a removal, only immediate children are flashed. Transitive dependency chain not visualized. Consider showing full chain in a future story.
- **Test coverage gap: `flashNodeIds` post-failure success path** — `useSkillTree.test.ts` — The test `"is null on successful click"` only verifies fresh-state. Doesn't prove flash is cleared after a prior failure followed by a success.

## Deferred from: code review of 1-1-upgrade-nodeallocations (2026-05-06)

- **Silent failure on missing nodeId** — `buildStore.ts:96` returns `{ success: false }` with no `error` field when the nodeId is not found in `treeData`. Defensive guard that shouldn't fire in normal usage but produces an invisible no-op if it does. Consider adding `error: 'Node not found in tree'` for debuggability.
- **`new Text()` GC pressure in pixiRenderer** — `pixiRenderer.ts:245` creates and destroys PixiJS `Text` objects on every `renderTree` call. No object pooling. Pre-existing architecture. Address if frame-time spikes appear under high allocation counts (object pool or reuse existing Text children).

## Deferred from: code review of 1-5-tree-search-bar-and-reset-button (2026-05-07)

- **`activeTabIndex > 5` magic number + dep array** — `SkillTreeView.tsx:83` — Replaces dynamic `>= 1 + activeSkills.length` guard with hardcoded `> 5`. Equivalent for current fixed 5-slot tab bar but fragile if slot count becomes dynamic. Dep array change from `[activeSkills.length, activeTabIndex]` to `[activeTabIndex]` loses reactivity to skill-count changes.
- **Double node iteration in search memos** — `SkillTreeView.tsx:172` — `searchHighlighted` and `searchDimmed` each traverse `activeTreeData.nodes` independently. Acceptable for current tree sizes (50–200 nodes); consider single-pass partition if larger trees are introduced.
- **Inline `style` objects in `TreeControls` recreated every render** — `TreeControls.tsx` — All style props are inline object literals; reallocated on every keystroke. Switch to module-level constants or Tailwind classes.
- **Weaver Tree tab not covered by `showControls`** — `SkillTreeView.tsx:343` — AC 6 requires search/reset on the Weaver Tree tab. `showControls` only handles passive and skill tabs. Revisit when Story 4.2 implements the Weaver Tree tab.

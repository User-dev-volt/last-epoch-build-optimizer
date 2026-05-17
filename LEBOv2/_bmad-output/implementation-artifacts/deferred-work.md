# Deferred Work

## Deferred from: code review of 5-6-item-data-freshness-check-and-stalenessbar-extension (2026-05-17)

- Partial write leaves mixed-version item DB when network fails mid-loop (`item_commands.rs`). `update_item_data` downloads and commits files sequentially — if the 2nd or 3rd file fails after the 1st is already renamed, the item DB on disk has mixed versions. Fixing requires a two-phase pattern (download all to temp, then rename all). Spec prescribed sequential atomic-per-file; risk is low and banner retries are available.
- `itemDataStaleAcknowledged` never resets after a successful update (`gameDataStore.ts`). After `setIsItemDataStale(false)`, the acknowledged flag remains `true`. If `checkItemDataFreshness` fires again in the same session (currently it doesn't — startup-only), a new stale condition would be silently suppressed. Same structural pattern as the existing game data banner.
- `schemaVersion` bumped from 1 to 2 in `manifest.json` with no migration guard. Old installs with v1 manifests deserialize cleanly via `#[serde(default)]` on the new `item_data_version` field. No active migration path needed unless future code branches on `schemaVersion`.
- TOCTOU: `check_item_data_freshness` and `update_item_data` each fetch the remote manifest independently. A remote release between the two calls could cause the version written to disk to differ from the files downloaded. Inherent to the command-per-operation architecture; cosmetic version mismatch only.
- `versions_behind` in `DataVersionCheckResult` is always 0 or 1 for item data (semver comparison yields no real count). Matches the existing game data check pattern; no regression.
- `http_client()` in `game_data_service.rs` promoted to `pub` for reuse by `item_commands.rs`. Acceptable DRY choice per dev notes; no hidden coupling risk given the single timeout setting.
- `copy_bundled_item_resources` all-or-nothing existence check: once all three item files exist, bundled resources are never refreshed. A prior partial update could leave a mixed-version state that persists forever. Pre-existing behavior; item data freshness check (this story) is the intended remedy.

## Deferred from: code review of 3-3-enforce-level-budget-toggle-and-allocation-enforcement (2026-05-13)

- Budget check in `applyNodeChange` / `applySkillNodeChange` only verifies ≥1 unspent point exists, not that `delta` points are available. A caller passing `delta > 1` could allocate multiple points past the budget ceiling (`buildStore.ts:165`). In practice the UI always passes `delta = ±1`; spec doesn't address multi-delta; fix would add complexity for a theoretical case.

## Deferred from: code review of 4-3-weaver-tree-renderer-conditional-on-research-spike-go (2026-05-14)

- `weaverSearchHighlighted`/`weaverSearchDimmed` memos depend on `weaverGameNodes` Zustand selector reference (`SkillTreeView.tsx`). If any unrelated `gameDataStore` update fires, both memos re-run unnecessarily. Benign in practice (weaverGameNodes set once at startup) — pre-existing project-wide selector pattern.
- `migrateBuildState` for `weaverAllocations` uses object-shape check + type cast without validating individual value types (`buildPersistence.ts`). A corrupted save with string values would produce NaN for unspent point count. Same pattern as all other allocation fields — pre-existing project-wide issue.

## Deferred from: code review of 5-5-custom-affix-addition-and-free-text-fallback (2026-05-17)

- No removal mechanism for individual custom affixes — `customAffixIds` can only grow; only `handleClear` resets the slot entirely (`GearSlot.tsx`). Out of scope for 5.5.
- `excludeIds.includes()` in `AffixPicker` is O(n×m) — a `Set` conversion would give O(1) lookup (`AffixPicker.tsx:22`). With only a handful of excluded IDs in practice this is premature optimization.
- `+ Add affix` button rendered whenever `selectedItem !== null`, even if `itemDatabase` becomes null post-selection — button has no visible feedback when picker can't open (`GearSlot.tsx`). Game-data failure scenario; `selectedItem` can only be set while `itemDatabase !== null` so this requires an in-session reload failure.
- `AffixPicker value={null}` + `immediate` prop — if `onClose` doesn't fire synchronously, Headless UI may re-open the dropdown on the next focus event (`AffixPicker.tsx:29`). Theoretical concurrent-mode edge; all tests pass.

## Deferred from: code review of 5-4-gearslot-component-with-typeahead-item-search (2026-05-16)

- `ComboboxButton` (▾) added to GearSlot without AC coverage — functional but undocumented scope creep (`GearSlot.tsx`). Pre-existing.
- Inline style + Tailwind mixing — `var(--color-bg-elevated)` used for both slot border and dropdown background; border may be invisible when dropdown is open (`GearSlot.tsx`). Pre-existing project-wide pattern.
- Off-by-one tier stale reference if DB hot-reloads while item is selected — `resolvedAffixes` memo updates but `affixTiers` retains old keys, leading to mismatched tier state (`GearSlot.tsx:81–84`). Pre-existing edge case, out of scope for this story.
- `isEmptyContext` `.trim()` throws if `itemName` is null/undefined — schema violation that TypeScript should prevent at compile time (`RightPanel.tsx:40`). Pre-existing project-wide concern.

## Deferred from: code review of 5-1-item-database-load-and-typescript-types (2026-05-14)

- Version staleness: `copy_bundled_item_resources` skips copy if `base-items.json` exists, so updated bundled data after an app upgrade will never overwrite the cached copy (`item_data_service.rs:18`). Story 5.6 handles data freshness; no version/hash mechanism added in this story.
- `AffixEntry.type` TypeScript union includes `'implicit'` but current data only emits `"prefix"` / `"suffix"`; Rust model deserializes `type` as an unvalidated `String`. If future data adds new type values they'll pass through silently.
- No `isLoadingItemDatabase` flag in `gameDataStore` — downstream components (Stories 5.3–5.5) can't distinguish "still loading" from "load failed". Null-handling pattern to be defined when GearSlot is built.
- Concurrent race on `copy_bundled_item_resources`: two simultaneous invocations can both pass the `exists()` guard and interleave writes to the same destination files. Pre-existing pattern in game_data_service; startup fires the command once so race is unlikely in practice.
- Blocking sync I/O (`std::fs::read_to_string`, `serde_json::from_str`) runs on the async Tauri executor without `spawn_blocking`. Pre-existing pattern across all service files in the project.
- `UniqueItem` / `RawUniqueItem` have no `implicitAffixIds` field — unique item implicits silently omitted. Known gap documented in dev notes; source data has implicits as text strings not IDs.

## Deferred from: code review of 4-2-weaver-tree-tab-and-placeholder-component (2026-05-13)

- Magic hardcoded indices (6, 7) for Weaver tab across `SkillTreeView.tsx` and tests — pre-existing pattern used for all other tab indices; no named constant.
- `openPickerForCurrentSlot` latent bug: `safeTabIndex - 1` would yield slot 5 (out-of-range) if Weaver early return is removed. Currently unreachable; guarded by early return.
- Redundant double-guard: `useEffect` at line ~99 resets `activeTabIndex > 6` redundantly with inline clamp at line ~161 — defensive, pre-existing pattern from old tab count guard.
- `handleReset` has no explicit Weaver guard but is implicitly safe because `TreeControls` never renders on the Weaver tab early-return path — fragile implicit dependency if JSX structure changes.

## Deferred from: code review of 5-3-affixtiercontrol-pip-based-tier-selection (2026-05-16)

- Out-of-range `currentTier` crash risk: `affixEntry.tiers[currentTier - 1]` throws if caller passes 0, negative, or > tiers.length. Spec-deliberate — "caller guarantees within [1, tiers.length]"; Story 5.4 GearSlot owns clamping. Add a defensive guard if any runtime crash is observed.
- Gap mismatch: AC #1 says "4px gap" but Dev Notes example and implementation use `gap: 8` (8px). Dev Notes are authoritative; AC text has minor inconsistency. Cosmetic only.
- Missing Home/End key support: WAI-ARIA Authoring Practices slider pattern recommends Home (go to min) and End (go to max) keys. Story only specifies Left/Right. Address in an accessibility polish story post-MVP.
- Inline pip style objects recreated per render: `Array.from` map creates new style object literals every render. Project-wide inline style pattern; benign for small pip counts. Optimize with CSS classes if profiling shows cost.
- No `userEvent.setup()` in tests: tests use v14+ legacy direct API. Tests pass. Project-wide concern to address in bulk test refactor.
- `width: 40` overflow risk: the 40px monospace span may silently clip very large tier value strings. Spec-specified value. Acceptable for current Last Epoch affix data range.
- `aria-valuemin={1}` hardcoded: assumes all affix tier numbering starts at 1. Current data always uses 1-based tiers; theoretical type concern if future data changes.

## Deferred from: code review of 4-1-weaver-tree-research-spike (2026-05-13)

- Official wiki (wiki.lastepoch.com) returned ECONNREFUSED — may be a transient outage rather than permanently offline. A future spike or re-evaluation should retry this source.
- "Duel Destruction / Dual Destruction" node name ambiguity in partial catalog — two different names from different guides for the same node; not flagged as a data quality issue in the report.
- "Low-value node" / "endgame node" labels in node catalog are editorial judgments without a cited source.
- Musholic repo version discrepancy — story spec referenced v0.11.0 (2026-04-02), WebFetch during spike returned v0.12.0 (April 2025); current actual version is uncertain. Verify at next epic boundary.
- prowner/last-epoch-data is unlicensed (all-rights-reserved by default) — legal risk not discussed. Moot under NO-GO but relevant if data becomes available.
- Re-evaluation triggers for Story 4.3 (Musholic repo, community dump, lastepochtools API) have no assigned process owner or check schedule. Risk of unplanned Story 4.3 restart mid-sprint.
- Echo point total is approximate (~40 from echoes). Story 4.3's Weaver point counter will need a plan for detecting when EHG patches echo reward values — the point formula is not versioned in the current `gameVersion` staleness system.
- Weaver node prerequisites: the Weaver Tree likely has node prerequisite relationships; Story 4.3 will need to decide whether to implement prerequisite validation logic (analogous to passive tree prerequisite checking in `applyNodeChange`).

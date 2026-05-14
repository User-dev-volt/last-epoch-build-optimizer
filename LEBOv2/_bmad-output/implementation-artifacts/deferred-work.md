# Deferred Work

## Deferred from: code review of 3-3-enforce-level-budget-toggle-and-allocation-enforcement (2026-05-13)

- Budget check in `applyNodeChange` / `applySkillNodeChange` only verifies ≥1 unspent point exists, not that `delta` points are available. A caller passing `delta > 1` could allocate multiple points past the budget ceiling (`buildStore.ts:165`). In practice the UI always passes `delta = ±1`; spec doesn't address multi-delta; fix would add complexity for a theoretical case.

## Deferred from: code review of 4-2-weaver-tree-tab-and-placeholder-component (2026-05-13)

- Magic hardcoded indices (6, 7) for Weaver tab across `SkillTreeView.tsx` and tests — pre-existing pattern used for all other tab indices; no named constant.
- `openPickerForCurrentSlot` latent bug: `safeTabIndex - 1` would yield slot 5 (out-of-range) if Weaver early return is removed. Currently unreachable; guarded by early return.
- Redundant double-guard: `useEffect` at line ~99 resets `activeTabIndex > 6` redundantly with inline clamp at line ~161 — defensive, pre-existing pattern from old tab count guard.
- `handleReset` has no explicit Weaver guard but is implicitly safe because `TreeControls` never renders on the Weaver tab early-return path — fragile implicit dependency if JSX structure changes.

## Deferred from: code review of 4-1-weaver-tree-research-spike (2026-05-13)

- Official wiki (wiki.lastepoch.com) returned ECONNREFUSED — may be a transient outage rather than permanently offline. A future spike or re-evaluation should retry this source.
- "Duel Destruction / Dual Destruction" node name ambiguity in partial catalog — two different names from different guides for the same node; not flagged as a data quality issue in the report.
- "Low-value node" / "endgame node" labels in node catalog are editorial judgments without a cited source.
- Musholic repo version discrepancy — story spec referenced v0.11.0 (2026-04-02), WebFetch during spike returned v0.12.0 (April 2025); current actual version is uncertain. Verify at next epic boundary.
- prowner/last-epoch-data is unlicensed (all-rights-reserved by default) — legal risk not discussed. Moot under NO-GO but relevant if data becomes available.
- Re-evaluation triggers for Story 4.3 (Musholic repo, community dump, lastepochtools API) have no assigned process owner or check schedule. Risk of unplanned Story 4.3 restart mid-sprint.
- Echo point total is approximate (~40 from echoes). Story 4.3's Weaver point counter will need a plan for detecting when EHG patches echo reward values — the point formula is not versioned in the current `gameVersion` staleness system.
- Weaver node prerequisites: the Weaver Tree likely has node prerequisite relationships; Story 4.3 will need to decide whether to implement prerequisite validation logic (analogous to passive tree prerequisite checking in `applyNodeChange`).

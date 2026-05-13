# Deferred Work

## Deferred from: code review of 3-3-enforce-level-budget-toggle-and-allocation-enforcement (2026-05-13)

- Budget check in `applyNodeChange` / `applySkillNodeChange` only verifies ≥1 unspent point exists, not that `delta` points are available. A caller passing `delta > 1` could allocate multiple points past the budget ceiling (`buildStore.ts:165`). In practice the UI always passes `delta = ±1`; spec doesn't address multi-delta; fix would add complexity for a theoretical case.

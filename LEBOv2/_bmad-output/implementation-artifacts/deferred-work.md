## Deferred from: code review of 1-1-upgrade-nodeallocations (2026-05-06)

- **Silent failure on missing nodeId** — `buildStore.ts:96` returns `{ success: false }` with no `error` field when the nodeId is not found in `treeData`. Defensive guard that shouldn't fire in normal usage but produces an invisible no-op if it does. Consider adding `error: 'Node not found in tree'` for debuggability.
- **`new Text()` GC pressure in pixiRenderer** — `pixiRenderer.ts:245` creates and destroys PixiJS `Text` objects on every `renderTree` call. No object pooling. Pre-existing architecture. Address if frame-time spikes appear under high allocation counts (object pool or reuse existing Text children).

# LEBOv2 — Claude Code Notes

## Model Routing — Haiku vs Sonnet

Use the Agent tool with `model: "claude-haiku-4-5-20251001"` for these tasks:

| Task type | Example |
|-----------|---------|
| Sprint/epic status lookups | "What stories are in-progress?" |
| File existence / inventory checks | "Does this component file exist?" |
| Commit message generation | After a focused change is complete |
| Boilerplate from an established pattern | New TypeScript interface matching existing ones |
| Test result summarization | "Did the tests pass? What failed?" |
| YAML/JSON formatting or validation | Reformatting a config file |
| Simple grep/search with no reasoning | "Find all usages of this function name" |

Use Sonnet (default) for everything else:
- PixiJS / WebGL rendering work
- Architecture or design decisions
- Debugging across multiple files
- BMAD planning, story creation, epic decomposition
- Any task requiring judgment about trade-offs

## BMAD Session Context

`sprint-status.yaml` and `epics.md` are pre-loaded into your context at session
start by the Second Brain hook. **Do not re-read them during the session** unless
you just wrote a change to them and need to verify it. Work from the pre-loaded
versions — they are current as of session start.

## Playwright MCP Rules

**Never call `page.goto()` inside `browser_run_code`.** It orphans the tool's page context and hangs indefinitely. Navigation must always be a separate `browser_navigate` call.

Correct pattern:
1. `browser_run_code` — setup only (addInitScript, evaluate, assertions)
2. `browser_navigate` — navigate
3. `browser_take_screenshot` — inspect result

## PixiJS / WebGL

The WebGL `getShaderInfoLog` null patch is applied at module load in `pixiRenderer.ts`. Do not re-inject it via Playwright — it's already in the source.

This app is canvas-based (PixiJS). `browser_snapshot` (accessibility tree) is useless here — use `browser_take_screenshot` for all visual inspection.

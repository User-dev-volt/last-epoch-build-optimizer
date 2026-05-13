# Epic 3 — Scoring Engine & Build I/O

**Goal:** Implement the deterministic scoring engine that rates builds 0–100 per dimension, and build the full save/load/import system for builds.

**Done when:** Users can save/load named builds locally, import from lastepochtools.com URLs, and see accurate real-time scores that update as they click nodes.

---

## Story 3.1 — Deterministic Scoring Engine

**As a** user  
**I want** my build scored across Damage, Survivability, and Speed dimensions in real-time  
**So that** I can see the objective impact of my node choices

**Acceptance Criteria:**
- [ ] `scoreStore.scores` updates within 16ms of any node allocation change
- [ ] Three score dimensions: Damage (0–100), Survivability (0–100), Speed (0–100)
- [ ] Same node allocations always produce identical scores (deterministic)
- [ ] Scores based on `NodeEffect` tags: damage-relevant nodes contribute to Damage, etc.
- [ ] Scores normalized against the mastery's theoretical maximum
- [ ] Score bars in BuildScoresPanel update reactively (Zustand subscription)

**Technical Notes:**

Scoring logic in `src/engine/scoring.ts`:

```typescript
// Tag → dimension mapping
const DAMAGE_TAGS = ['increased_damage', 'flat_damage', 'more_damage', 'critical_strike_chance', 'critical_strike_multiplier', 'penetration', 'damage_over_time'];
const SURVIVABILITY_TAGS = ['increased_health', 'flat_health', 'armor', 'damage_reduction', 'dodge_rating', 'block_chance', 'resist', 'leech'];
const SPEED_TAGS = ['movement_speed', 'attack_speed', 'cast_speed', 'cooldown_recovery'];

// Weights per effect type (applied within each dimension)
// 'more' multipliers weight highest, 'flat' weights lowest
```

- `masteryMax` computed at game data load for each mastery (sum all nodes' max-points contributions per dimension)
- Score = `(playerTotal / masteryMax) * 100`, clamped to [0, 100]
- `scoreStore` subscribes to `buildStore` via Zustand's `subscribe()`

---

## Story 3.2 — Build Scores Panel UI

**As a** user  
**I want** to see my build scores displayed clearly in the left panel  
**So that** I can monitor how my choices affect my build's performance

**Acceptance Criteria:**
- [ ] Left panel shows 3 score bars (Damage red, Survivability blue, Speed teal)
- [ ] Each bar shows dimension label, filled bar, and numeric score
- [ ] Point budget shown: "47 / 100 points used" + "53 remaining"
- [ ] Mastery name shown at top of panel
- [ ] All values update in real-time as user allocates/deallocates nodes
- [ ] Panel is collapsible (chevron toggle) — graph expands when collapsed
- [ ] Score bars animate smoothly when values change (CSS transition)

**Technical Notes:**
- `BuildScoresPanel.tsx` subscribes to `scoreStore` and `buildStore`
- Bar fill: `width: ${score}%` as inline style
- Colors: `#E85050` damage, `#50A0E8` survivability, `#50E8A0` speed
- Monospace font for score numbers
- Panel width: 200px fixed; collapsible

---

## Story 3.3 — Local Build Save & Load

**As a** user  
**I want** to save my builds locally and load them later  
**So that** I can work on multiple builds and return to them across sessions

**Acceptance Criteria:**
- [ ] [Save] button → dropdown: "Save" (overwrite if named) / "Save As..." (prompts name)
- [ ] Saved builds stored in SQLite `builds` table
- [ ] [Import] button → tab "From Saved Builds" shows list: name, class, mastery, last modified
- [ ] Clicking a saved build loads it: populates class/mastery, node allocations, equipped skills
- [ ] Loading a build navigates to the correct mastery's BuildScreen
- [ ] Confirmation dialog when loading over an unsaved build ("You have unsaved changes. Load anyway?")
- [ ] Delete option on saved build entries (with confirmation)
- [ ] Max 50 saved builds (oldest overwritten; user warned)

**Technical Notes:**
- Tauri commands: `save_build(build: BuildData)`, `load_builds()`, `delete_build(id: string)`
- `BuildData` serialized to JSON for `passive_allocations` and `skill_allocations` fields
- `buildStore.isDirty` tracks unsaved changes

---

## Story 3.4 — Build Import from lastepochtools.com

**As a** user  
**I want** to import an existing build from a lastepochtools.com URL  
**So that** I can optimize builds I've already planned or found online

**Acceptance Criteria:**
- [ ] [Import] button → tab "From URL" with a URL/code input field
- [ ] Accepts lastepochtools.com build URLs
- [ ] On import: build populates node allocations in the graph
- [ ] Invalid URL shows inline error: "Couldn't parse this build link. Check the URL and try again."
- [ ] Partial imports (some nodes not found in local data) show warning: "X nodes in this build weren't recognized and were skipped."
- [ ] Successful import navigates to the correct mastery's BuildScreen with nodes populated

**Technical Notes:**
- Tauri command: `import_build_from_url(url: String) -> Result<BuildData, String>`
- Rust: GET lastepochtools.com API, parse response, map to internal `BuildData` schema
- Unknown nodes (not in local SQLite): skip with count, do not fail entire import
- If mastery data not loaded yet: trigger `fetch_game_data` first, then import

# Epic 4 — AI Optimization Engine

**Goal:** Integrate Claude API to generate AI-powered skill tree optimization suggestions with before/after score deltas and technical explanations. Users can run optimization, receive ranked suggestions on the graph, and apply them individually or all at once.

**Done when:** Users can click "Optimize", wait < 10s, see ranked suggestions overlaid on the graph with score deltas, read explanations, and apply changes.

---

## Story 4.1 — API Key Setup & Storage

**As a** user  
**I want** to securely store my Anthropic API key  
**So that** LEBO can call the Claude API without storing my key insecurely

**Acceptance Criteria:**
- [ ] On first "Optimize" click (no key stored): ApiKeyModal appears
- [ ] Modal explains: "Enter your Anthropic API key. It's stored in your OS keychain — never in plain text."
- [ ] Input field (password type), [Save Key] button, link to Anthropic console
- [ ] Key stored via Tauri keychain plugin (Windows Credential Manager / macOS Keychain)
- [ ] Subsequent launches: key loaded from keychain silently — no re-entry required
- [ ] Settings page: [Change API Key] option clears and re-prompts
- [ ] Invalid key (API returns 401): show error "Invalid API key. Please check and update it in Settings."

**Technical Notes:**
- Tauri commands: `get_api_key() -> Option<String>`, `set_api_key(key: String)`
- Use `tauri-plugin-keychain` or equivalent
- Never log the API key — redact in all error messages

---

## Story 4.2 — Claude API Client (Rust)

**As a** developer  
**I want** a Rust module that calls the Claude API with streaming  
**So that** optimization requests can stream responses back to the frontend progressively

**Acceptance Criteria:**
- [ ] `claude/client.rs` implements `optimize(prompt: String, api_key: String) -> Stream<Chunk>`
- [ ] Uses Claude claude-sonnet-4-6 model
- [ ] Streaming SSE response parsed chunk by chunk
- [ ] Each chunk emitted to frontend via Tauri event: `optimization-chunk` with payload `{ delta: string }`
- [ ] On stream complete: emit `optimization-complete`
- [ ] On API error: emit `optimization-error` with `{ message: string, code: number }`
- [ ] System prompt and game data context block marked with `cache_control: { type: "ephemeral" }`
- [ ] Timeout: 30 seconds; emit error if exceeded

**Technical Notes:**
- `reqwest` with streaming feature for HTTP
- Parse Claude's SSE format: `data: {...}` lines
- Prompt caching: include `cache_control` header on system prompt block and game data block
- Model: `claude-sonnet-4-6`
- Max tokens: 2048 (sufficient for 5 suggestions with explanations)

---

## Story 4.3 — Prompt Builder

**As a** developer  
**I want** a prompt builder that constructs the full optimization prompt from the current build state  
**So that** Claude receives accurate, complete context about the build

**Acceptance Criteria:**
- [ ] `claude/prompt_builder.rs` builds the full prompt given: `BuildState`, `GameData`, `goal`
- [ ] System prompt: static string (as per architecture doc)
- [ ] User prompt includes: class, mastery, goal, allocated nodes (with descriptions), reachable unallocated nodes (with descriptions), point budget, current scores
- [ ] Game data context block is marked for prompt caching
- [ ] Output: `Messages API` request body (JSON) with correct structure
- [ ] Prompt is validated: if no reachable unallocated nodes exist, include a note for Claude

**Technical Notes:**
- Build the prompt as `Vec<MessageParam>` matching Anthropic Messages API format
- Node list truncated to top 50 by score relevance if very large (prevents hitting token limit)
- Include `OptimizationResponse` JSON schema inline in the prompt as structured output guidance

---

## Story 4.4 — Optimization Flow & Frontend Integration

**As a** user  
**I want** to click "Optimize" and see suggestions appear progressively on the graph  
**So that** I can get AI recommendations without waiting for the full response

**Acceptance Criteria:**
- [ ] Goal selector tabs: Damage / Survivability / Speed / Balanced (keyboard shortcut 1–4)
- [ ] "Optimize Build" button triggers the optimization flow
- [ ] Button state: "Analyzing..." with pulsing animation during API call
- [ ] Suggestions appear in the SuggestionsPanel as they stream in (not all at once)
- [ ] Suggested nodes highlighted on the graph with green glow rings as each suggestion arrives
- [ ] "3 suggestions found" count shown above list
- [ ] Each suggestion card shows: action (Add/Remove/Swap), node name, score deltas (Δ per dimension)
- [ ] [Apply] button on each card; [Apply All Suggestions] at bottom
- [ ] Error state: "Optimization failed. Check your API key or internet connection." + [Retry]
- [ ] If no key set: triggers Story 4.1 modal

**Technical Notes:**
- `optimizationStore.runOptimization()` → IPC `optimize_build`
- Listen to `optimization-chunk` events → `optimizationStore.appendChunk()`
- Parse accumulated JSON as it streams: use partial JSON parser or accumulate then parse on complete
- `optimizationStore.suggestions` updates reactively → `SuggestionsPanel` and Pixi overlay re-render
- Debounce: if user changes allocations mid-stream, cancel current optimization (abort signal)

---

## Story 4.5 — Suggestion Detail Panel

**As a** user  
**I want** to click a suggestion and see a detailed explanation with full score impact  
**So that** I can make informed decisions about applying AI recommendations

**Acceptance Criteria:**
- [ ] Clicking a suggestion card expands it OR opens a drawer in the right panel
- [ ] Detail shows: node name, current state, proposed state, before/after scores per dimension (absolute + delta)
- [ ] AI explanation text rendered in full (2–4 sentences, technical)
- [ ] [Apply This Change] button applies the suggestion to the build
- [ ] [Dismiss] removes the suggestion from the list without applying
- [ ] After applying: suggestion marked as applied (greyed out), graph node changes state to allocated/deallocated
- [ ] Scores recalculate immediately after applying a suggestion

**Technical Notes:**
- `SuggestionDetailDrawer.tsx`: slides in from right or expands inline
- Applied suggestions tracked in `optimizationStore.appliedSuggestions: Set<string>`
- Applying a suggestion calls `buildStore.allocateNode()` or `buildStore.deallocateNode()`
- `scoreStore` re-runs after every applied suggestion

---

## Story 4.6 — Context Bar & AI Skill Awareness

**As a** user  
**I want** to set my equipped active skills so the AI can account for them in suggestions  
**So that** passive tree suggestions properly account for active skill synergies

**Acceptance Criteria:**
- [ ] Context bar shows 5 skill slots at the bottom of BuildScreen
- [ ] Each slot is a dropdown populated with skills available to the current mastery
- [ ] Selecting a skill in a slot updates `buildStore.equippedSkills`
- [ ] AI prompt includes equipped skill names and types (passed to Claude)
- [ ] Unequipped slots shown as "—" and ignored by AI
- [ ] Switching mastery clears equipped skills (with confirmation)

**Technical Notes:**
- Skill options from `gameDataStore.getSkillsForMastery(masteryId)`
- `equippedSkills` persisted with build save/load
- Context bar is purely display — no skill tree optimization for skills in this story (AI awareness only)

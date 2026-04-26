# Epic 5 — Polish, Error States & UX Hardening

**Goal:** Turn a working prototype into a shippable product. Full visual polish matching the design system, all empty/error/loading states handled, keyboard shortcuts, onboarding flow, and edge case coverage.

**Done when:** A first-time user can install, launch, set up their API key, and complete a full optimize cycle without hitting any unhandled state.

---

## Story 5.1 — Design System & Visual Polish

**As a** user  
**I want** the app to look and feel like the UX design spec  
**So that** it feels like a premium game companion tool, not a prototype

**Acceptance Criteria:**
- [ ] Full color palette applied: `#0D0E12` base, `#C8943A` gold accent, per design doc
- [ ] Typography: Cinzel for headers, Inter for UI text, JetBrains Mono for numbers
- [ ] Class/mastery selector cards match design: dark background, gold hover border, glow
- [ ] All panels have correct background colors (`#161820` surface, `#1E2028` elevated)
- [ ] Score bars use correct colors (red/blue/teal) with smooth CSS transitions
- [ ] Suggestion cards styled: gold rank badge, delta chips with positive/negative coloring
- [ ] All buttons follow the design system: primary (gold fill), secondary (outlined), destructive (red)
- [ ] Scrollbars styled to match dark theme (custom CSS)
- [ ] App icon and window title set to "LEBO — Last Epoch Build Optimizer"

**Technical Notes:**
- Tailwind custom theme defined in `tailwind.config.ts` — all palette colors as CSS variables
- Cinzel and JetBrains Mono loaded via Google Fonts or local files
- Custom scrollbar styles in `global.css`

---

## Story 5.2 — Onboarding & First Launch Flow

**As a** new user  
**I want** a clear onboarding experience on first launch  
**So that** I understand how to use the app without reading documentation

**Acceptance Criteria:**
- [ ] First launch: splash screen with LEBO logo + "Loading game data..." progress bar
- [ ] Progress updates: "Fetching class data... (3/15)" etc.
- [ ] After data load: class selector shown
- [ ] First time on BuildScreen: dismissable tooltip overlay: "Click nodes to allocate points. Use the Optimize button for AI suggestions."
- [ ] Tooltip only shown once (stored in `data_meta` as `onboarding_done: true`)
- [ ] API key prompt flows naturally from first Optimize attempt (Story 4.1)

---

## Story 5.3 — Keyboard Shortcuts

**As a** power user  
**I want** keyboard shortcuts for all primary actions  
**So that** I can navigate and optimize builds without touching the mouse

**Acceptance Criteria:**
- [ ] `Ctrl+S` — Save build
- [ ] `Ctrl+O` — Open load modal
- [ ] `Ctrl+Z` / `Ctrl+Y` — Undo / Redo node allocations
- [ ] `Space` — Fit tree to view
- [ ] `R` — Reset zoom
- [ ] `Enter` — Run optimization
- [ ] `1` / `2` / `3` / `4` — Switch optimization goal (Damage / Survivability / Speed / Balanced)
- [ ] `Escape` — Close any open modal or panel
- [ ] `Tab` — Cycle through suggestion cards in SuggestionsPanel
- [ ] Shortcut reference visible in Settings or via `?` key

**Technical Notes:**
- Global keyboard handler in `App.tsx` using `useEffect` + `keydown` listener
- Shortcuts disabled when typing in input fields (`event.target` check)
- Shortcut map defined in a constants file for easy reference

---

## Story 5.4 — Error States & Empty States

**As a** user  
**I want** clear, actionable messages when something goes wrong  
**So that** I'm never left staring at a broken or empty screen

**Acceptance Criteria:**
- [ ] Game data fetch failure: "Couldn't load game data. Check your internet connection." + [Retry] + [Use offline data]
- [ ] Build import failure: inline error in import modal
- [ ] AI optimization failure: "Optimization failed." + specific reason (network / invalid key / timeout) + [Retry]
- [ ] Invalid node allocation attempt: brief toast ("Node not reachable" / "Not enough points")
- [ ] Empty suggestion list (AI returned 0 valid suggestions): "Your build looks optimal for this goal. Try a different optimization target."
- [ ] No skills equipped (context bar all empty): warning below Optimize button: "Tip: Add your active skills for more accurate suggestions."
- [ ] Build not saved on close: confirmation dialog "You have unsaved changes. Exit anyway?"

**Technical Notes:**
- Toast system: `react-hot-toast` or custom lightweight component
- Error boundaries around graph, panels — prevent full app crash from component errors
- All error messages include actionable next step (not just "something went wrong")

---

## Story 5.5 — Settings Panel

**As a** user  
**I want** a settings panel for app configuration  
**So that** I can manage my API key, refresh game data, and adjust preferences

**Acceptance Criteria:**
- [ ] Settings accessible via gear icon in TopBar
- [ ] Settings sections: API Key, Game Data, Appearance
- [ ] API Key: masked display of stored key, [Change Key] button
- [ ] Game Data: "Last updated: {date}", [Refresh Now] button, version display
- [ ] Appearance: placeholder for future theme options (just shows current theme)
- [ ] [Close] returns to previous screen

**Technical Notes:**
- Settings as a modal or slide-over panel
- IPC calls for key management and data refresh
- Refresh triggers `fetch_game_data(force: true)`

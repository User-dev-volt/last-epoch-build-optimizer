# Epic 2 — Skill Tree Graph Visualizer

**Goal:** Build the interactive Pixi.js skill tree graph — the hero element of the app. Users can view any mastery's passive tree and all active skill trees, click to allocate/deallocate nodes, zoom and pan, and see visual distinction between node states.

**Done when:** The full passive tree for any mastery renders correctly, is interactive, respects point budget and connectivity rules, and performs at 60fps.

---

## Story 2.1 — Class & Mastery Selector Screens

**As a** user  
**I want** to select my class and mastery from a visual selector  
**So that** I can navigate to the correct skill tree for my character

**Acceptance Criteria:**
- [ ] Launch screen shows 5 class cards (Sentinel, Mage, Primalist, Acolyte, Rogue)
- [ ] Each card shows class name + mastery names in subtitle
- [ ] Clicking a class navigates to the mastery selector showing 3 mastery cards
- [ ] Each mastery card shows name + brief description + damage type tags
- [ ] Clicking a mastery navigates to the main BuildScreen
- [ ] Breadcrumb: "Sentinel › Void Knight" shown in TopBar on BuildScreen
- [ ] Clicking breadcrumb class segment returns to mastery selector (with confirmation if build has allocations)

**Technical Notes:**
- Routes: `/` (class selector), `/mastery/:classId` (mastery selector), `/build/:masteryId` (build screen)
- Data sourced from `gameDataStore`
- Class card images: placeholder styled divs for MVP (can be replaced with artwork later)
- Design: matches UX design doc (dark cards, gold hover border, subtle glow)

---

## Story 2.2 — Pixi.js Canvas Mount & Graph Data Model

**As a** developer  
**I want** a Pixi.js canvas mounted in the BuildScreen with the passive tree data loaded  
**So that** I can render the skill tree graph in subsequent stories

**Acceptance Criteria:**
- [ ] Pixi.js `Application` created and mounted in BuildScreen center panel
- [ ] Canvas fills available space, respects panel layout (left/right panels take their fixed width)
- [ ] `SkillTreeGraph` component accepts `tree: PassiveTree`, `allocations: Map<string, number>`, `suggestions: Suggestion[]` props
- [ ] Graph data model built: adjacency map of `nodeId → Node`, edge list for rendering
- [ ] Component unmounts cleanly (no memory leaks when switching masteries)
- [ ] Canvas background: `#0D0E12` (matches design system)

**Technical Notes:**
- Mount Pixi app in a `useEffect` with cleanup
- `tree` prop change triggers full graph rebuild
- Graph layout uses x/y coordinates from game data (nodes have fixed positions from Last Epoch)
- Do NOT use `@pixi/react` — mount manually for full control

---

## Story 2.3 — Node & Edge Rendering

**As a** user  
**I want** to see all passive tree nodes and their connections rendered  
**So that** I can understand the shape and layout of the skill tree

**Acceptance Criteria:**
- [ ] All nodes rendered as circles at their x/y positions
- [ ] Edges rendered as lines between connected nodes (below nodes in z-order)
- [ ] Node states visually distinct:
  - Unallocated (reachable): blue-tint fill `#1E3048`, subtle border
  - Unallocated (locked): dark fill `#181A1E`, muted border
  - Allocated: gold fill `#C8943A`, bright gold border `#E8B050`, glow effect
  - AI-suggested: green glow ring `#4AE870` around node (separate layer)
- [ ] Node size proportional to `maxPoints` (single-point nodes are smaller than keystones)
- [ ] Tree is centered and fits in the viewport on initial render

**Technical Notes:**
- Use Pixi `Graphics` for circles and lines (batch them for performance)
- Glow effect: use Pixi `GlowFilter` or a second circle slightly larger with low opacity
- Render order: edges → locked nodes → available nodes → allocated nodes → suggestion overlay
- Node positions from game data normalized if needed (scale to fit canvas coordinate space)

---

## Story 2.4 — Graph Interaction (Zoom, Pan, Click)

**As a** user  
**I want** to zoom, pan, and click nodes in the skill tree graph  
**So that** I can navigate the tree and allocate nodes

**Acceptance Criteria:**
- [ ] Scroll wheel zooms in/out (0.3x – 2.5x range, smooth)
- [ ] Click + drag pans the graph
- [ ] Single click on a node: selects it (highlights selection ring, updates uiStore.selectedNodeId)
- [ ] Hover on node: shows tooltip with node name, description, cost, current allocation
- [ ] Double-click on an allocatable node: allocates 1 point (calls buildStore.allocateNode)
- [ ] Double-click on an allocated node: deallocates (calls buildStore.deallocateNode)
- [ ] Right-click on node: context menu with "Allocate / Remove / View in panel"
- [ ] [Fit] button: resets zoom to show full tree centered
- [ ] Zoom in/out buttons (± controls) in graph corner

**Technical Notes:**
- Zoom: transform the root `Container`, not individual nodes
- Pan: pointer events on stage; track pointer state
- Tooltip: render as DOM overlay (absolute positioned React div over canvas) for HTML + accessibility
- Context menu: React component, positioned at pointer location
- Pointer cursor changes to `pointer` on node hover

---

## Story 2.5 — Node Allocation Logic & Validation

**As a** user  
**I want** node allocation to respect the rules of Last Epoch's skill tree  
**So that** I can't create invalid builds

**Acceptance Criteria:**
- [ ] Cannot allocate a node unless it is connected (via edges) to at least one already-allocated node OR is a starting node
- [ ] Cannot allocate more points than `node.maxPoints`
- [ ] Cannot allocate beyond the class's total point budget
- [ ] Cannot deallocate a node if doing so would disconnect other allocated nodes (connectivity check)
- [ ] Point budget displayed in BuildScoresPanel updates in real-time
- [ ] Attempting invalid allocation: shows brief toast error ("Node is not reachable" / "Out of points")
- [ ] Undo (`Ctrl+Z`) reverts last allocation/deallocation

**Technical Notes:**
- Reachability: BFS/DFS from starting nodes through allocated nodes
- Connectivity check on deallocation: BFS to verify remaining allocated nodes still form a connected subgraph from start
- History stack for undo: stored in `buildStore` as `allocationHistory: BuildSnapshot[]`, max 50 entries
- `graphUtils.ts`: `isNodeReachable(nodeId, allocations, tree)`, `canDeallocate(nodeId, allocations, tree)`

---

## Story 2.6 — Skill Tree Tab Switcher

**As a** user  
**I want** to switch between the passive tree and individual skill trees  
**So that** I can optimize both my passive and active skill node allocations

**Acceptance Criteria:**
- [ ] Tab bar above graph: "Passive Tree" tab + one tab per equipped skill (up to 5)
- [ ] Switching tabs loads the corresponding tree into the Pixi canvas
- [ ] Each skill tab shows skill name + icon
- [ ] Empty skill slots show "—" and are not interactive
- [ ] Point budget per skill tree is separate from passive tree budget
- [ ] Switching back to Passive restores that tree's state

**Technical Notes:**
- `uiStore.activeTab`: `'passive' | skillId`
- Graph component re-renders with new tree data on tab switch
- Pixi app is reused — only the data changes (do not recreate Pixi app)

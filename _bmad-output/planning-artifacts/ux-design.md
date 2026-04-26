# UX Design Document
## Last Epoch Build Optimizer (LEBO)

**Version:** 1.0  
**Date:** 2026-04-14

---

## 1. Design Philosophy

**"The game, extended."**

LEBO should feel like opening a second monitor alongside Last Epoch — same world, same darkness, but with the analytical clarity of a professional tool. The skill tree graph is the hero. Everything else serves it.

**Three design principles:**
1. **Graph-first** — The skill tree is always visible, always the largest element. Other panels are secondary.
2. **Scan-first UX** — Users should be able to read their build state and top suggestions at a glance without scrolling.
3. **Mechanical honesty** — Never hide complexity. Min-maxers want the numbers, the formulas, the reasons. Show them.

---

## 2. Design Language

### Color Palette
```
Background Base:     #0D0E12  (near-black, slightly warm)
Surface:             #161820  (card/panel background)
Surface Elevated:    #1E2028  (modals, active panels)
Border:              #2A2D38  (subtle panel borders)

Gold Accent:         #C8943A  (primary brand — Last Epoch's amber)
Gold Bright:         #E8B050  (hover states, highlights)
Gold Dim:            #7A5820  (inactive/dimmed gold)

Text Primary:        #E8E4DC  (warm off-white)
Text Secondary:      #8A8878  (labels, metadata)
Text Muted:          #4A4840  (disabled, placeholder)

Node Default:        #2A2D38  (unallocated node fill)
Node Allocated:      #C8943A  (allocated — gold fill)
Node Available:      #1E3048  (allocatable — blue-tint fill)
Node Locked:         #181A1E  (not yet reachable)
Node Suggested:      #2A4830  (AI suggestion — green-tint overlay)
Node Suggested Glow: #4AE870  (glow ring on suggested node)

Damage Score:        #E85050  (red)
Survivability Score: #50A0E8  (blue)
Speed Score:         #50E8A0  (teal/green)

Positive Delta:      #4AE870  (green)
Negative Delta:      #E85050  (red)
Neutral:             #8A8878  (grey)
```

### Typography
```
Display (headers):    Cinzel or IM Fell English — fantasy serif, used sparingly
Interface:            Inter or JetBrains Mono — clean, readable at small sizes
Numbers/scores:       JetBrains Mono — monospace for alignment
Node descriptions:    Inter 13px, #E8E4DC
Labels:               Inter 11px, #8A8878, uppercase tracked
```

### Iconography
- Custom icon set matching Last Epoch's visual vocabulary (damage type icons, skill category icons)
- Node type indicators use small geometric icons inside the node circle

---

## 3. Screen Architecture

### Main Build Screen (primary view)

```
┌────────────────────────────────────────────────────────────────────────┐
│ LEBO             [Class: Sentinel › Void Knight]     [Save] [Import]  │  ← Top bar
├──────────┬────────────────────────────────────────┬────────────────────┤
│          │                                        │                    │
│  BUILD   │                                        │   SUGGESTIONS      │
│  SCORES  │          SKILL TREE GRAPH              │   PANEL            │
│  PANEL   │          (hero, interactive)           │                    │
│          │                                        │   [goal selector]  │
│  DMG 74  │                                        │   [Optimize btn]   │
│  ████░░  │                                        │                    │
│          │                                        │   1. Add: Abyssal  │
│  SUR 58  │                                        │      Endurance     │
│  ████░░  │                                        │   ▲DMG+4 ▲SUR+8   │
│          │                                        │                    │
│  SPD 41  │                                        │   2. Remove: Iron  │
│  ████░░  │                                        │      Reach         │
│          │                                        │   ▲DMG+6 ▼SUR-2   │
│  POINTS  │                                        │                    │
│  47/100  │                                        │   3. ...           │
│          │                                        │                    │
├──────────┴────────────────────────────────────────┴────────────────────┤
│  CONTEXT: [Warpath ▼] [Devouring Orb ▼] [Anomaly ▼] [--] [--]  Gear ▸ │  ← Context bar
└────────────────────────────────────────────────────────────────────────┘
```

**Panel breakdown:**
- **Left panel (200px):** Build scores — 3 score bars, point budget, mastery label
- **Center (flex):** Skill tree graph — takes remaining width, zoomable/pannable
- **Right panel (280px):** Suggestions list + optimization controls
- **Bottom bar (48px):** Active skill slots + gear toggle

---

## 4. Screen-by-Screen Specs

### 4.1 — Class Selector (Launch Screen)

**Layout:** Full-screen centered card grid, 5 class cards in a row (or 3+2)

**Each class card:**
- Class silhouette/artwork (dark stylized image)
- Class name (Cinzel, 18px gold)
- Subtext: mastery names in small text
- Hover: gold border glow, card lifts slightly
- Click: transitions to Mastery Selector

**Background:** Animated subtle particle effect or static dark texture

---

### 4.2 — Mastery Selector

**Layout:** Three mastery cards centered, class name as header

**Each mastery card:**
- Mastery name (large)
- Brief description of playstyle (2 lines)
- Key damage type tags displayed as chips (e.g., "Void Damage" "Melee")
- Hover + click same as class cards

**Back navigation:** Breadcrumb — "Sentinel ›" clickable

---

### 4.3 — Main Build Screen

This is the primary view. All sub-sections below.

#### 4.3.1 — Skill Tree Graph (center hero)

**Graph rendering:**
- Canvas-based (Pixi.js or Konva.js) for performance
- Nodes: circles, ~32px diameter at 100% zoom
- Connections: lines between nodes, color indicates: reachable (dim), path-locked (darker)
- Allocated nodes: gold fill, bright gold border, glow effect
- Available (unallocated but reachable): blue-tint fill, subtle border
- Locked: dark fill, no border prominence
- AI-suggested: green overlay glow ring around node

**Interaction:**
- Scroll wheel: zoom (0.3x to 2.5x)
- Click + drag: pan
- Click node: select (shows detail in floating tooltip + updates detail panel)
- Right-click node: context menu → "Allocate / Remove / View suggestion"
- Double-click node: allocate/deallocate directly

**Node tooltip (on hover):**
```
┌─────────────────────────┐
│ Void Bolts              │
│ ─────────────────────── │
│ Your Void attacks        │
│ have 15% chance to fire  │
│ a bolt dealing 8 Void    │
│ damage.                  │
│                          │
│ Cost: 1 point            │
│ [Allocated ✓]            │
└─────────────────────────┘
```

**Zoom controls:**
- Floating mini-controls bottom-right of graph: [–] [fit] [+]
- "Fit" resets zoom to show full tree

#### 4.3.2 — Left Panel: Build Scores

```
┌──────────────────┐
│ VOID KNIGHT      │  ← Mastery label
│ ────────────── │
│                  │
│ DAMAGE           │
│ [████████░░] 74  │  ← Bar + number
│                  │
│ SURVIVABILITY    │
│ [██████░░░░] 58  │
│                  │
│ SPEED            │
│ [████░░░░░░] 41  │
│                  │
│ ────────────── │
│ POINTS           │
│  47 / 100        │  ← Large number
│  53 remaining    │
│                  │
│ [Reset Tree]     │
└──────────────────┘
```

Score bars:
- Damage bar: red fill (`#E85050`)
- Survivability bar: blue fill (`#50A0E8`)
- Speed bar: teal fill (`#50E8A0`)
- Numbers update in real-time as nodes are toggled

#### 4.3.3 — Right Panel: Suggestions

**Top section — Optimization Controls:**
```
OPTIMIZE FOR
[Damage] [Survive] [Speed] [Balanced]  ← Tab-style selector

[▶ Optimize Build]  ← Primary CTA button (gold)
```

**Loading state:** Subtle pulsing animation on the optimize button while AI runs

**Suggestions list:**
```
3 suggestions found

┌─────────────────────────────────┐
│ ① ADD: Abyssal Endurance        │
│ "Allocate 1 point"              │
│ ▲ DMG +4  ▲ SUR +8  ◈ SPD ±0  │
│                     [Apply]     │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ ② REMOVE: Iron Reach            │
│ "Deallocate 2 points"           │
│ ▲ DMG +6  ▼ SUR -2  ◈ SPD ±0  │
│                     [Apply]     │
└─────────────────────────────────┘

[Apply All Suggestions]
```

Click any suggestion card → expands to show full AI explanation

#### 4.3.4 — Suggestion Detail Panel (expanded state)

When a suggestion is clicked, the right panel expands or a drawer slides in:

```
← Back to suggestions

② REMOVE: Iron Reach
──────────────────────────────────────
Current:   2 points allocated
Proposed:  0 points allocated

SCORE IMPACT
  Damage:         47 → 53  (+6)
  Survivability:  61 → 59  (-2)
  Speed:          38 → 38  (±0)

WHY THIS CHANGE
──────────────────────────────────────
Iron Reach increases melee range by
15%, but your current build is
optimized for Void Bolt damage which
is a projectile — not a melee hit.
The 2 points are wasted. Reallocating
them to Void Essence adds 12% more
Void damage scaling, directly
amplifying your core damage source.

[Apply This Change]  [Dismiss]
```

#### 4.3.5 — Context Bar (bottom)

```
ACTIVE SKILLS   [Warpath ▼] [Devouring Orb ▼] [Anomaly ▼] [Empty ▼] [Empty ▼]   | GEAR ▸ IDOLS ▸
```

- Skill slots are dropdowns — select equipped skills
- GEAR/IDOLS toggle an additional panel above the bar (display only)
- AI optimization is aware of equipped skills (passed to prompt)

---

## 5. Import Build Flow

**Trigger:** Click [Import] in top bar

**Modal:**
```
┌────────────────────────────────────┐
│ Import Build                    ✕  │
│                                    │
│ Paste a lastepochtools.com         │
│ build URL or build code:           │
│                                    │
│ [_________________________________]│
│                                    │
│ [Cancel]            [Import Build] │
└────────────────────────────────────┘
```

Success: modal closes, tree populates, scores recalculate
Error: inline error message — "Invalid build code. Please check the URL and try again."

---

## 6. Save / Load Flow

**Save:**
- Click [Save] → dropdown: "Save" (overwrite) / "Save As..."
- "Save As" prompts for a name
- Saved as local JSON in app data directory

**Load:**
- Click [Import] → tab: "From URL" / "From Saved Builds"
- Saved builds list: name, class, mastery, last modified date
- Click to load

---

## 7. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+S` | Save build |
| `Ctrl+O` | Open/load build |
| `Ctrl+Z` | Undo last node change |
| `Ctrl+Y` | Redo |
| `Space` | Fit tree to view |
| `R` | Reset zoom |
| `Enter` | Run optimization |
| `1/2/3/4` | Switch optimization goal (Damage/Survive/Speed/Balanced) |
| `Escape` | Close panels/modals |
| `Tab` | Cycle through suggestions |

---

## 8. Empty States

**No build loaded:**
> "Select a class above to start building, or import an existing build."

**No suggestions yet:**
> "Select an optimization goal and click Optimize to get AI-powered suggestions."

**AI loading:**
> Animated pulsing dots: "Analyzing your build..."

**AI error:**
> "Couldn't reach the AI engine. Check your internet connection." + [Retry] button

---

## 9. Responsive Behavior

- **Minimum supported:** 1280×720
- **Optimal:** 1920×1080
- **Panels:** Left and right panels can be collapsed to give more space to the graph
- **Ultra-wide:** Graph area expands; panels remain fixed-width

---

## 10. Onboarding (First Launch)

**First launch flow:**
1. Splash screen: LEBO logo + "Loading game data..." progress bar
2. Data fetch from community API (cached after first run)
3. Class selector appears
4. First-time tooltip overlay on the graph: "Click nodes to allocate. Use the Optimize button to get AI suggestions." — dismissable.

**API Key Setup (first launch):**
- Before first optimization, prompt: "Enter your Anthropic API key to enable AI optimization."
- Key stored in local app config (encrypted)
- Link to Anthropic console to get a key

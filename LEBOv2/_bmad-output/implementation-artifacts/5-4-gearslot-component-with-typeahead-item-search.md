# Story 5.4: GearSlot Component with Typeahead Item Search

Status: ready-for-dev

## Story

As a theory-crafter,
I want to type an item name in a gear slot and select from instant search results, with the item card pre-populating all known affixes at median tier,
so that I can quickly represent my actual equipped gear without manual data entry.

## Acceptance Criteria

1. **Given** a gear slot is in "empty" state
   **When** the player clicks the slot or its "Search items…" placeholder
   **Then** a Headless UI Combobox opens with `role="combobox"`, `aria-expanded="true"`, `aria-autocomplete="list"` (UX-DR4, NFR14)

2. **Given** the player types ≥1 character in the Combobox input
   **When** `searchItems` returns results
   **Then** up to 6 results appear in the dropdown within 50ms; each result shows item name and base type; the dropdown is scrollable if more than 6 results exist

3. **Given** the player selects an item from the dropdown (click or Enter)
   **When** the item is selected
   **Then** the GearSlot transitions to "populated-database" state: a card shows item name (14px / weight 600) and base type; the item's known affixes are listed below at their median tier values using the AffixTierControl component

4. **Given** a slot is in "populated-database" state
   **When** the player clicks the × button
   **Then** the slot returns to "empty" state; the selection is cleared from `useBuildStore`

5. **And** `GearSlot` is at `src/features/item-database/GearSlot.tsx`; the component has `role="group"` and `aria-label="{slotName} slot"` (UX-DR4)

6. **And** `GearSlot.test.tsx` passes vitest-axe with zero violations (UX-DR15)

7. **And** the right panel layout is updated to split into Gear Context (upper, independently scrollable) and Optimization (lower, pinned to bottom) sections as defined by UX-DR9

## Tasks / Subtasks

- [ ] Task 1: Modify `RightPanel.tsx` to add the Gear Context / Optimization split layout (AC: #7)
  - [ ] Replace the single `overflow-y-auto flex flex-col gap-4` content div with two sibling divs:
    - Upper: `<div className="overflow-y-auto flex-1 min-h-0 flex flex-col gap-2 p-4">` — Gear Context section
    - Lower: `<div className="shrink-0 flex flex-col gap-4 p-4 border-t">` — Optimization section (pinned)
  - [ ] Upper section renders: section label ("Gear") in `--color-text-muted` at 11px + 600 weight + uppercase, then one `<GearSlot>` per `GEAR_SLOTS` entry (11 slots)
  - [ ] Lower section renders: all existing optimization content (ScoreGauge, GoalSelector, OptimizeButton, model indicator, offline note, context note, SuggestionsList)
  - [ ] Collapsed state (`isCollapsed`) is unchanged — keep existing icon rail
  - [ ] Import `GearSlot` from `'../item-database/GearSlot'` and `GEAR_SLOTS` from `'../context-panel/gearData'`
  - [ ] Import `useGameDataStore` from `'../../shared/stores/gameDataStore'` to pass `itemDatabase` to GearSlot
  - [ ] Border on lower section: `borderColor: 'var(--color-bg-elevated)'`

- [ ] Task 2: Create `GearSlot.tsx` at `src/features/item-database/GearSlot.tsx` (AC: #1–#6)
  - [ ] Named export: `export function GearSlot({ slotId, slotName, itemDatabase }: GearSlotProps)`
  - [ ] Props interface: `{ slotId: string; slotName: string; itemDatabase: ItemDatabase | null }`
  - [ ] Imports: `Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption` from `'@headlessui/react'`; `AffixTierControl` from `'./AffixTierControl'`; types from `'../../shared/types/itemDatabase'`; `useBuildStore` from `'../../shared/stores/buildStore'`; `searchItems` from `'./itemSearch'`; `useEffect, useState, useMemo` from `'react'`
  - [ ] Local state:
    - `query: string` — Combobox input value (init `''`)
    - `selectedItem: SearchResult | null` — currently selected item (init `null`)
    - `affixTiers: Record<string, number>` — maps affixId → current tier (init `{}`)
  - [ ] Derived `activeBuildId` via `useBuildStore((s) => s.activeBuild?.id ?? null)` — used only for reset effect
  - [ ] `useEffect` on `activeBuildId`: reset `query → ''`, `selectedItem → null`, `affixTiers → {}` (clear on build switch)
  - [ ] `searchResults`: derived via `useMemo(() => { if (!itemDatabase || query.trim().length < 1) return []; return searchItems(query, itemDatabase).slice(0, 6) }, [query, itemDatabase])`
  - [ ] `resolvedAffixes`: derived via `useMemo(...)` when `selectedItem` changes — see Dev Notes for affix resolution logic
  - [ ] `handleSelect(item: SearchResult | null)`: set `selectedItem = item`, reset `query = ''`, set `affixTiers` to median tiers for all resolved affixes, then call `writeToStore(item, resolvedAffixesForItem)`
  - [ ] `handleClear()`: set `selectedItem = null`, `query = ''`, `affixTiers = {}`, then call `writeToStore(null, [])`
  - [ ] `handleTierChange(affixId: string, tier: number)`: update `affixTiers[affixId] = tier`, then call `writeToStore(selectedItem, resolvedAffixes)` with updated tiers
  - [ ] `writeToStore(item, affixes)`: call `useBuildStore.getState().updateContextGear(...)` — see Dev Notes for exact encoding
  - [ ] **Empty state JSX** (`selectedItem === null`): outer `role="group"` div + Combobox with `value={query}` and `onChange={setQuery}`, `onClose={() => {}}`, `immediate`. Render `ComboboxInput` with placeholder `"Search items…"`, `displayValue={() => query}`. Render `ComboboxOptions` when `searchResults.length > 0`: each `ComboboxOption` shows item name + base type badge. Select a result → `handleSelect(result)`. If `itemDatabase === null`: skip Combobox, render a small muted label `"Database unavailable"` with a plain text input for item name instead.
  - [ ] **Populated-database state JSX** (`selectedItem !== null`): item card with item name (14px, 600 weight, `--color-text-primary`) + base type label (12px, `--color-text-muted`); × clear button (`aria-label="Clear {slotName}"`); affix list — one row per resolved affix: affix name label (flex-grow, 13px, `--color-text-secondary`) + `<AffixTierControl>` component
  - [ ] Outer wrapper: `<div role="group" aria-label="{slotName} slot" className="flex flex-col gap-1 py-2 px-3" style={{ borderBottom: '1px solid var(--color-bg-elevated)' }}>`

- [ ] Task 3: Create `GearSlot.test.tsx` at `src/features/item-database/GearSlot.test.tsx` (AC: #6)
  - [ ] Mock `useBuildStore` — see Dev Notes for mock pattern
  - [ ] Mock `useGameDataStore` — see Dev Notes
  - [ ] Build a minimal `mockItemDatabase: ItemDatabase` with 2 base items + 1 unique item + 3 affix entries
  - [ ] Test: empty state renders Combobox input with placeholder "Search items…"
  - [ ] Test: typing ≥1 char shows matching results (up to 6), each with item name and base type
  - [ ] Test: selecting a result transitions to populated-database state showing item name, base type, and AffixTierControl rows
  - [ ] Test: clicking × returns to empty state and calls `updateContextGear`
  - [ ] Test: `itemDatabase = null` renders "Database unavailable" label
  - [ ] Test: `expect(await axe(container)).toHaveNoViolations()`

## Dev Notes

### Architecture decision: No GearItemV2 in this story

**Do NOT introduce `GearItemV2` or `AffixEntryV2` types.** Those are Story 6.1's job. GearSlot uses the **existing** `GearItem` type (`{ slotId: string; itemName: string; affixes: string[] }`). Story 6.1 will later formalize the schema and add the migration function.

For story 5.4, affix data is written to the store as human-readable strings: `"{affixName}: {minValue}–{maxValue}"` or `"{affixName}: {value}"` for single-value tiers. This gives the LLM meaningful affix context without schema changes.

**Affix tier persistence:** Tier choices are NOT persisted across app restarts in this story (the string encoding carries the value range, not the tier number itself). This is intentional and documented. Full round-trip tier persistence comes in Story 6.1.

### Affix resolution logic (`resolvedAffixes`)

When an item is selected, compute resolved affixes as follows:

```typescript
interface ResolvedAffix {
  affixId: string
  name: string
  affixEntry: AffixEntry   // full entry from itemDatabase.affixes
}
```

**For `SearchResult.type === 'base'`** (BaseItem):
- Find the `BaseItem` in `itemDatabase.baseItems` by `id === selectedItem.id`
- For each `affixId` in `baseItem.implicitAffixIds`:
  - Look up in `itemDatabase.affixes.find(a => a.id === affixId)`
  - If found, add to resolved affixes
- Note: Base items have no predetermined prefix/suffix affixes (those are random crafting outcomes). Only implicits are pre-populated.

**For `SearchResult.type === 'unique'`** (UniqueItem):
- Find the `UniqueItem` in `itemDatabase.uniqueItems` by `id === selectedItem.id`
- For each `{ affixId }` in `uniqueItem.affixes`:
  - Look up in `itemDatabase.affixes.find(a => a.id === affixId)`
  - If found, add to resolved affixes
  - If NOT found (affix data gap — known issue from deferred-work.md), skip silently

**Median tier calculation:**
```typescript
function medianTier(affixEntry: AffixEntry): number {
  return Math.ceil(affixEntry.tiers.length / 2)
}
```

### `writeToStore` encoding

```typescript
function writeToStore(item: SearchResult | null, resolved: ResolvedAffix[], tiers: Record<string, number>) {
  const allGear = useBuildStore.getState().activeBuild?.contextData.gear ?? []
  const otherSlots = allGear.filter(g => g.slotId !== slotId)
  
  if (!item) {
    useBuildStore.getState().updateContextGear([
      ...otherSlots,
      { slotId, itemName: '', affixes: [] }
    ])
    return
  }
  
  const affixStrings = resolved.map(r => {
    const tier = tiers[r.affixId] ?? medianTier(r.affixEntry)
    const tierData = r.affixEntry.tiers[tier - 1]
    const valueStr = tierData.minValue === tierData.maxValue
      ? String(tierData.minValue)
      : `${tierData.minValue}–${tierData.maxValue}`
    return `${r.name}: ${valueStr}`
  })
  
  useBuildStore.getState().updateContextGear([
    ...otherSlots,
    { slotId, itemName: item.name, affixes: affixStrings }
  ])
}
```

**Important**: call `useBuildStore.getState()` (not the hook) for imperative writes from event handlers — same pattern as `GearInput.tsx`.

### Headless UI Combobox pattern

Use `@headlessui/react` version already in `package.json`. The Combobox is **uncontrolled for display** but controlled for query:

```tsx
<Combobox value={query} onChange={(val) => {
  // val is the ComboboxOption value — a SearchResult
  handleSelect(val as SearchResult)
}} immediate>
  <ComboboxInput
    displayValue={() => query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder="Search items…"
    className="w-full text-xs px-2 py-1 rounded"
    style={{
      backgroundColor: 'var(--color-bg-base)',
      color: 'var(--color-text-primary)',
      border: '1px solid var(--color-bg-elevated)',
    }}
  />
  <ComboboxOptions className="absolute z-10 w-full max-h-40 overflow-y-auto rounded mt-1" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
    {searchResults.map(result => (
      <ComboboxOption key={result.id} value={result} className="px-2 py-1 text-xs cursor-pointer data-[focus]:bg-[var(--color-bg-hover)]">
        <span style={{ color: 'var(--color-text-primary)' }}>{result.name}</span>
        <span className="ml-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{result.baseType}</span>
      </ComboboxOption>
    ))}
  </ComboboxOptions>
</Combobox>
```

Wrap the Combobox in `<div className="relative">` for the dropdown positioning.

**Never debounce the typeahead** — search runs synchronously on the in-memory corpus (≤50ms guaranteed). Architecture rule 8.

### RightPanel split implementation

```tsx
{/* Upper: Gear Context — independently scrollable */}
<div className="overflow-y-auto flex-1 min-h-0 flex flex-col gap-0 pt-3 pb-1">
  <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
    Gear
  </p>
  {GEAR_SLOTS.map(({ slotId, label }) => (
    <GearSlot
      key={slotId}
      slotId={slotId}
      slotName={label}
      itemDatabase={itemDatabase}
    />
  ))}
</div>

{/* Lower: Optimization — pinned, never scrolls off */}
<div className="shrink-0 flex flex-col gap-4 p-4 overflow-y-auto border-t" style={{ borderColor: 'var(--color-bg-elevated)' }}>
  {/* existing optimization content */}
</div>
```

The outer expanded content div changes from `<div className="p-4 overflow-y-auto flex flex-col gap-4">` to `<div className="flex flex-col h-full overflow-hidden">`. The two child sections then handle scrolling independently.

### Handling the `isEmptyContext` banner in RightPanel

The existing `showContextNote` banner checks `activeBuild.contextData.gear.length === 0`. With GearSlot now calling `updateContextGear`, a slot cleared to `{ slotId, itemName: '', affixes: [] }` still has `gear.length === 11` (all 11 slot stubs). Update `isEmptyContext` to check `gear.every(g => g.itemName.trim() === '')` instead of `gear.length === 0`, so the context note still fires correctly for truly empty builds.

Also update `filledGearCount` in `ContextPanel.tsx` (currently `gear.filter(g => g.itemName.trim() !== '').length`) — this stays correct as-is since GearSlot writes `itemName: ''` for empty slots.

### Item database null path

If `itemDatabase` prop is `null` (load failed or still loading):
- Render a plain text input (not Combobox) with placeholder matching the slot name
- Show label `"Database unavailable"` in `--color-text-muted` below the input
- Do not call `searchItems` — no search
- Still write to store on input change (free-text fallback for display purposes)
- This satisfies the architecture failure recovery pattern from architecture.md

### Test mock pattern

```typescript
// In GearSlot.test.tsx
import { vi } from 'vitest'

// Mock the store — return stable function refs
const mockUpdateContextGear = vi.fn()
vi.mock('../../shared/stores/buildStore', () => ({
  useBuildStore: (selector: (s: any) => any) =>
    selector({ activeBuild: { id: 'build-1', contextData: { gear: [] } } }),
}))
// Add getState mock on the module:
// useBuildStore.getState = () => ({ activeBuild: { contextData: { gear: [] } }, updateContextGear: mockUpdateContextGear })

// In beforeEach: mockUpdateContextGear.mockClear()
```

Because `useBuildStore.getState()` is called imperatively in `writeToStore`, you need to attach `getState` to the mock function itself:
```typescript
import * as buildStoreModule from '../../shared/stores/buildStore'
vi.spyOn(buildStoreModule.useBuildStore, 'getState').mockReturnValue({
  activeBuild: { contextData: { gear: [] } },
  updateContextGear: mockUpdateContextGear,
} as any)
```

Alternatively, wrap `writeToStore` calls in tests using `userEvent` and assert on `mockUpdateContextGear` calls.

### AffixTierControl integration

AffixTierControl is a controlled component: it receives `currentTier` and `onChange`. In GearSlot's populated-database state:

```tsx
{resolvedAffixes.map(r => (
  <div key={r.affixId} className="flex items-center gap-2 px-1">
    <span
      className="flex-1 text-[13px] truncate"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {r.name}
    </span>
    <AffixTierControl
      affixEntry={r.affixEntry}
      currentTier={affixTiers[r.affixId] ?? medianTier(r.affixEntry)}
      onChange={(tier) => handleTierChange(r.affixId, tier)}
    />
  </div>
))}
```

### Files NOT to modify

- `src/features/context-panel/GearInput.tsx` — untouched in this story (story 5.5 handles free-text fallback and may remove it)
- `src/features/context-panel/ContextPanel.tsx` — untouched (keep existing Gear Disclosure section)
- `src/shared/types/build.ts` — no GearItemV2 in this story
- `src/shared/stores/buildStore.ts` — use existing `updateContextGear`
- `src/shared/stores/gameDataStore.ts` — `itemDatabase` already added in story 5-1

### Existing patterns to follow

- **Store writes from handlers**: use `useBuildStore.getState().updateContextGear(...)` — same as `GearInput.tsx:23`
- **Disclosure pattern**: ContextPanel.tsx uses Headless UI Disclosure for collapsible sections — GearSlot does NOT need Disclosure; tier controls show inline without expansion in this story
- **No barrel files**: import `GearSlot` directly: `import { GearSlot } from '../item-database/GearSlot'`
- **Named export only**: `export function GearSlot(...)` — no default export
- **Tailwind v4**: no `tailwind.config.js`; use `var(--color-*)` tokens via inline style or `text-[var(--color-text-primary)]` class syntax
- **No comments in code** unless WHY is non-obvious

### Known gaps / out-of-scope for this story

- Tier choices are not persisted across app restarts (String encoding; GearItemV2 is Story 6.1)
- The `+` custom affix button and affix picker Combobox are Story 5.5
- The "Free text mode" ghost link is Story 5.5
- `aria-activedescendant` on the Combobox input is managed by Headless UI automatically — no manual wiring needed
- If `baseItem.implicitAffixIds` is empty (very common for base items), the populated-database state shows the item card with NO affix rows — that is correct behavior; Story 5.5 adds the `+` button for custom affix addition

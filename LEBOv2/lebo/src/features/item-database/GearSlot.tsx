import { useEffect, useState, useMemo } from 'react'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/react'
import { AffixTierControl } from './AffixTierControl'
import type { ItemDatabase, AffixEntry, SearchResult } from '../../shared/types/itemDatabase'
import { useBuildStore } from '../../shared/stores/buildStore'
import { searchItems } from './itemSearch'

interface ResolvedAffix {
  affixId: string
  name: string
  affixEntry: AffixEntry
}

interface GearSlotProps {
  slotId: string
  slotName: string
  itemDatabase: ItemDatabase | null
}

function medianTier(affixEntry: AffixEntry): number {
  return Math.ceil(affixEntry.tiers.length / 2)
}

function resolveAffixes(item: SearchResult, itemDatabase: ItemDatabase): ResolvedAffix[] {
  if (item.type === 'base') {
    const baseItem = itemDatabase.baseItems.find((b) => b.id === item.id)
    if (!baseItem) return []
    return baseItem.implicitAffixIds.flatMap((affixId) => {
      const entry = itemDatabase.affixes.find((a) => a.id === affixId)
      return entry ? [{ affixId, name: entry.name, affixEntry: entry }] : []
    })
  } else {
    const uniqueItem = itemDatabase.uniqueItems.find((u) => u.id === item.id)
    if (!uniqueItem) return []
    return uniqueItem.affixes.flatMap(({ affixId }) => {
      const entry = itemDatabase.affixes.find((a) => a.id === affixId)
      return entry ? [{ affixId, name: entry.name, affixEntry: entry }] : []
    })
  }
}

function buildAffixStrings(
  resolved: ResolvedAffix[],
  tiers: Record<string, number>
): string[] {
  return resolved.map((r) => {
    const tier = tiers[r.affixId] ?? medianTier(r.affixEntry)
    const tierData = r.affixEntry.tiers[tier - 1]
    const valueStr =
      tierData.minValue === tierData.maxValue
        ? String(tierData.minValue)
        : `${tierData.minValue}–${tierData.maxValue}`
    return `${r.name}: ${valueStr}`
  })
}

export function GearSlot({ slotId, slotName, itemDatabase }: GearSlotProps) {
  const [query, setQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null)
  const [affixTiers, setAffixTiers] = useState<Record<string, number>>({})

  const activeBuildId = useBuildStore((s) => s.activeBuild?.id ?? null)

  useEffect(() => {
    setQuery('')
    setSelectedItem(null)
    setAffixTiers({})
  }, [activeBuildId])

  const searchResults = useMemo(() => {
    if (!itemDatabase || query.trim().length < 1) return []
    return searchItems(query, itemDatabase).slice(0, 6)
  }, [query, itemDatabase])

  const resolvedAffixes = useMemo<ResolvedAffix[]>(() => {
    if (!selectedItem || !itemDatabase) return []
    return resolveAffixes(selectedItem, itemDatabase)
  }, [selectedItem, itemDatabase])

  function writeToStore(
    item: SearchResult | null,
    resolved: ResolvedAffix[],
    tiers: Record<string, number>
  ) {
    const allGear = useBuildStore.getState().activeBuild?.contextData.gear ?? []
    const otherSlots = allGear.filter((g) => g.slotId !== slotId)

    if (!item) {
      useBuildStore.getState().updateContextGear([
        ...otherSlots,
        { slotId, itemName: '', affixes: [] },
      ])
      return
    }

    const affixStrings = buildAffixStrings(resolved, tiers)
    useBuildStore.getState().updateContextGear([
      ...otherSlots,
      { slotId, itemName: item.name, affixes: affixStrings },
    ])
  }

  function handleSelect(item: SearchResult | null) {
    if (!item) return
    setSelectedItem(item)
    setQuery('')
    const resolved = itemDatabase ? resolveAffixes(item, itemDatabase) : []
    const initialTiers: Record<string, number> = {}
    for (const r of resolved) {
      initialTiers[r.affixId] = medianTier(r.affixEntry)
    }
    setAffixTiers(initialTiers)
    writeToStore(item, resolved, initialTiers)
  }

  function handleClear() {
    setSelectedItem(null)
    setQuery('')
    setAffixTiers({})
    writeToStore(null, [], {})
  }

  function handleTierChange(affixId: string, tier: number) {
    const nextTiers = { ...affixTiers, [affixId]: tier }
    setAffixTiers(nextTiers)
    writeToStore(selectedItem, resolvedAffixes, nextTiers)
  }

  return (
    <div
      role="group"
      aria-label={`${slotName} slot`}
      className="flex flex-col gap-1 py-2 px-3"
      style={{ borderBottom: '1px solid var(--color-bg-elevated)' }}
    >
      {selectedItem === null ? (
        itemDatabase === null ? (
          <>
            <input
              type="text"
              placeholder={slotName}
              className="w-full text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: 'var(--color-bg-base)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-bg-elevated)',
              }}
            />
            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Database unavailable
            </span>
          </>
        ) : (
          <div className="relative">
            <Combobox
              value={query}
              onChange={(val) => {
                handleSelect(val as unknown as SearchResult)
              }}
              immediate
            >
              <div className="flex items-center gap-1">
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
                <ComboboxButton className="shrink-0 text-xs px-1" style={{ color: 'var(--color-text-muted)' }}>
                  ▾
                </ComboboxButton>
              </div>
              {searchResults.length > 0 && (
                <ComboboxOptions
                  className="absolute z-10 w-full max-h-40 overflow-y-auto rounded mt-1"
                  style={{ backgroundColor: 'var(--color-bg-elevated)' }}
                >
                  {searchResults.map((result) => (
                    <ComboboxOption
                      key={result.id}
                      value={result}
                      className="px-2 py-1 text-xs cursor-pointer data-[focus]:bg-[var(--color-bg-hover)]"
                    >
                      <span style={{ color: 'var(--color-text-primary)' }}>{result.name}</span>
                      <span
                        className="ml-2 text-[10px]"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {result.baseType}
                      </span>
                    </ComboboxOption>
                  ))}
                </ComboboxOptions>
              )}
            </Combobox>
          </div>
        )
      ) : (
        <>
          <div className="flex items-start justify-between gap-1">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span
                className="text-[14px] font-semibold truncate"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {selectedItem.name}
              </span>
              <span
                className="text-[12px]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {selectedItem.baseType}
              </span>
            </div>
            <button
              onClick={handleClear}
              aria-label={`Clear ${slotName}`}
              className="shrink-0 text-sm leading-none"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ×
            </button>
          </div>
          {resolvedAffixes.map((r) => (
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
        </>
      )}
    </div>
  )
}

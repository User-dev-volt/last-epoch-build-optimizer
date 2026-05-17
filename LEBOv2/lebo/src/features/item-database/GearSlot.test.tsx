import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { GearSlot } from './GearSlot'
import { useBuildStore } from '../../shared/stores/buildStore'
import type { ItemDatabase } from '../../shared/types/itemDatabase'
import type { BuildState } from '../../shared/types/build'

const mockItemDatabase: ItemDatabase = {
  baseItems: [
    {
      id: 'iron-helm',
      name: 'Iron Helm',
      baseType: 'Helmet',
      slot: 'helmet',
      implicitAffixIds: ['affix-armor'],
    },
    { id: 'iron-sword', name: 'Iron Sword', baseType: 'Sword', slot: 'mainhand', implicitAffixIds: [] },
    { id: 'iron-shield', name: 'Iron Shield', baseType: 'Shield', slot: 'offhand', implicitAffixIds: [] },
    { id: 'iron-boots', name: 'Iron Boots', baseType: 'Boots', slot: 'boots', implicitAffixIds: [] },
    { id: 'iron-gloves', name: 'Iron Gloves', baseType: 'Gloves', slot: 'gloves', implicitAffixIds: [] },
    { id: 'iron-belt', name: 'Iron Belt', baseType: 'Belt', slot: 'belt', implicitAffixIds: [] },
    { id: 'iron-ring', name: 'Iron Ring', baseType: 'Ring', slot: 'ring1', implicitAffixIds: [] },
    {
      id: 'void-boots',
      name: 'Void Boots',
      baseType: 'Boots',
      slot: 'boots',
      implicitAffixIds: [],
    },
  ],
  uniqueItems: [
    {
      id: 'solarum-plate',
      name: 'Solarum Plate',
      baseType: 'Body Armour',
      slot: 'body',
      affixes: [{ affixId: 'affix-life', fixedMinValue: 50, fixedMaxValue: 100 }],
    },
  ],
  affixes: [
    {
      id: 'affix-armor',
      name: 'Added Armor',
      type: 'implicit',
      itemSlots: ['helmet'],
      tiers: [
        { tier: 1, minValue: 10, maxValue: 20 },
        { tier: 2, minValue: 21, maxValue: 40 },
        { tier: 3, minValue: 41, maxValue: 60 },
      ],
    },
    {
      id: 'affix-life',
      name: 'Increased Health',
      type: 'prefix',
      itemSlots: ['body'],
      tiers: [
        { tier: 1, minValue: 10, maxValue: 20 },
        { tier: 2, minValue: 21, maxValue: 40 },
      ],
    },
    {
      id: 'affix-speed',
      name: 'Movement Speed',
      type: 'suffix',
      itemSlots: ['boots'],
      tiers: [{ tier: 1, minValue: 5, maxValue: 10 }],
    },
  ],
}

const mockBuild: BuildState = {
  schemaVersion: 1,
  id: 'build-1',
  name: 'Test Build',
  classId: 'acolyte',
  masteryId: 'lich',
  characterLevel: 1,
  budgetEnforced: false,
  nodeAllocations: {},
  skillNodeAllocations: {},
  activeSkillLevels: {},
  weaverAllocations: {},
  contextData: { gear: [], skills: [], idols: [] },
  isPersisted: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('GearSlot', () => {
  let initialBuildState: ReturnType<typeof useBuildStore.getState>

  beforeAll(() => {
    initialBuildState = useBuildStore.getState()
  })

  beforeEach(() => {
    useBuildStore.setState(initialBuildState, true)
    useBuildStore.getState().setActiveBuild(mockBuild)
  })

  it('empty state renders Combobox input with placeholder "Search items…"', () => {
    render(
      <GearSlot slotId="helmet" slotName="Helmet" itemDatabase={mockItemDatabase} />
    )
    expect(screen.getByPlaceholderText('Search items…')).toBeInTheDocument()
  })

  it('has role="group" and aria-label for the slot', () => {
    render(
      <GearSlot slotId="helmet" slotName="Helmet" itemDatabase={mockItemDatabase} />
    )
    expect(screen.getByRole('group', { name: 'Helmet slot' })).toBeInTheDocument()
  })

  it('typing ≥1 char shows matching results with item name and base type', async () => {
    render(
      <GearSlot slotId="helmet" slotName="Helmet" itemDatabase={mockItemDatabase} />
    )
    const input = screen.getByPlaceholderText('Search items…')
    await userEvent.type(input, 'Iron')

    await waitFor(() => {
      expect(screen.getByText('Iron Helm')).toBeInTheDocument()
    })
    expect(screen.getByText('Helmet')).toBeInTheDocument()
  })

  it('typing shows up to 6 results even when more match', async () => {
    render(
      <GearSlot slotId="helmet" slotName="Helmet" itemDatabase={mockItemDatabase} />
    )
    // 7 "Iron" items in mock — cap of 6 must trigger
    const input = screen.getByPlaceholderText('Search items…')
    await userEvent.type(input, 'Iron')

    await waitFor(() => {
      const options = screen.queryAllByRole('option')
      expect(options.length).toBe(6)
    })
  })

  it('selecting a result transitions to populated-database state', async () => {
    render(
      <GearSlot slotId="helmet" slotName="Helmet" itemDatabase={mockItemDatabase} />
    )
    const input = screen.getByPlaceholderText('Search items…')
    await userEvent.type(input, 'Iron')

    await waitFor(() => {
      expect(screen.getByText('Iron Helm')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Iron Helm'))

    await waitFor(() => {
      // Item name shown at 14px weight-600
      expect(screen.getByText('Iron Helm')).toBeInTheDocument()
      // Base type shown
      expect(screen.getByText('Helmet')).toBeInTheDocument()
      // AffixTierControl for the implicit affix
      expect(screen.getByRole('slider', { name: 'Added Armor tier' })).toBeInTheDocument()
    })
  })

  it('selecting an item writes to buildStore', async () => {
    render(
      <GearSlot slotId="helmet" slotName="Helmet" itemDatabase={mockItemDatabase} />
    )
    const input = screen.getByPlaceholderText('Search items…')
    await userEvent.type(input, 'Iron')

    await waitFor(() => expect(screen.getByText('Iron Helm')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Iron Helm'))

    await waitFor(() => {
      const gear = useBuildStore.getState().activeBuild!.contextData.gear
      const slot = gear.find((g) => g.slotId === 'helmet')
      expect(slot?.itemName).toBe('Iron Helm')
      expect(slot?.affixes.length).toBeGreaterThan(0)
    })
  })

  it('clicking × returns to empty state and writes cleared slot to store', async () => {
    render(
      <GearSlot slotId="helmet" slotName="Helmet" itemDatabase={mockItemDatabase} />
    )
    // Select an item first
    const input = screen.getByPlaceholderText('Search items…')
    await userEvent.type(input, 'Iron')
    await waitFor(() => expect(screen.getByText('Iron Helm')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Iron Helm'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Clear Helmet' })).toBeInTheDocument())

    // Clear it
    await userEvent.click(screen.getByRole('button', { name: 'Clear Helmet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search items…')).toBeInTheDocument()
    })

    const gear = useBuildStore.getState().activeBuild!.contextData.gear
    const slot = gear.find((g) => g.slotId === 'helmet')
    expect(slot?.itemName).toBe('')
    expect(slot?.affixes).toHaveLength(0)
  })

  it('itemDatabase = null renders "Database unavailable" label', () => {
    render(
      <GearSlot slotId="helmet" slotName="Helmet" itemDatabase={null} />
    )
    expect(screen.getByText('Database unavailable')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search items…')).toBeNull()
  })

  it('unique item affixes resolve and show AffixTierControl rows', async () => {
    render(
      <GearSlot slotId="body" slotName="Body" itemDatabase={mockItemDatabase} />
    )
    const input = screen.getByPlaceholderText('Search items…')
    await userEvent.type(input, 'Solar')

    await waitFor(() => expect(screen.getByText('Solarum Plate')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Solarum Plate'))

    await waitFor(() => {
      expect(screen.getByRole('slider', { name: 'Increased Health tier' })).toBeInTheDocument()
    })
  })

  it('base item with no implicit affixes shows item card with no affix rows', async () => {
    render(
      <GearSlot slotId="boots" slotName="Boots" itemDatabase={mockItemDatabase} />
    )
    const input = screen.getByPlaceholderText('Search items…')
    await userEvent.type(input, 'Void')

    await waitFor(() => expect(screen.getByText('Void Boots')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Void Boots'))

    await waitFor(() => {
      expect(screen.getByText('Void Boots')).toBeInTheDocument()
    })
    expect(screen.queryAllByRole('slider')).toHaveLength(0)
  })

  it('changing a tier slider updates the encoded affix string in buildStore', async () => {
    render(
      <GearSlot slotId="helmet" slotName="Helmet" itemDatabase={mockItemDatabase} />
    )
    const input = screen.getByPlaceholderText('Search items…')
    await userEvent.type(input, 'Iron')
    await waitFor(() => expect(screen.getByText('Iron Helm')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Iron Helm'))

    const slider = await screen.findByRole('slider', { name: 'Added Armor tier' })
    // medianTier for 3-tier affix = 2 (21–40); ArrowRight advances to tier 3 (41–60)
    await userEvent.type(slider, '{ArrowRight}')

    await waitFor(() => {
      const gear = useBuildStore.getState().activeBuild!.contextData.gear
      const slot = gear.find((g) => g.slotId === 'helmet')
      expect(slot?.affixes).toContain('Added Armor: 41–60')
    })
  })

  it('resets to empty state when active build changes', async () => {
    render(
      <GearSlot slotId="helmet" slotName="Helmet" itemDatabase={mockItemDatabase} />
    )
    const input = screen.getByPlaceholderText('Search items…')
    await userEvent.type(input, 'Iron')
    await waitFor(() => expect(screen.getByText('Iron Helm')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Iron Helm'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Clear Helmet' })).toBeInTheDocument())

    // Switch to a different build — triggers the useEffect reset
    const otherBuild = { ...mockBuild, id: 'build-2' }
    useBuildStore.getState().setActiveBuild(otherBuild)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search items…')).toBeInTheDocument()
    })
  })

  it('axe accessibility: zero violations in empty state', async () => {
    const { container } = render(
      <GearSlot slotId="helmet" slotName="Helmet" itemDatabase={mockItemDatabase} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('axe accessibility: zero violations in null database state', async () => {
    const { container } = render(
      <GearSlot slotId="helmet" slotName="Helmet" itemDatabase={null} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

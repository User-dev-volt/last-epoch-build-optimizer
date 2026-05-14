import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ItemDatabase } from '../../shared/types/itemDatabase'

vi.mock('../../shared/utils/invokeCommand', () => ({
  invokeCommand: vi.fn(),
}))

import { invokeCommand } from '../../shared/utils/invokeCommand'
import { loadItemDatabase } from './itemDatabaseLoader'
import { useGameDataStore } from '../../shared/stores/gameDataStore'

const mockInvoke = vi.mocked(invokeCommand)

const mockDb: ItemDatabase = {
  baseItems: [{ id: 'refuge-helmet', name: 'Refuge Helmet', baseType: 'Helmet', slot: 'helmet', implicitAffixIds: [] }],
  uniqueItems: [{ id: 'calamity', name: 'Calamity', baseType: 'Helmet', slot: 'helmet', affixes: [{ affixId: 'unique-calamity-0', fixedMinValue: 100, fixedMaxValue: 150 }] }],
  affixes: [{ id: 'affix-inevitable-prefix', name: 'Inevitable', type: 'prefix', itemSlots: [], tiers: [{ tier: 1, minValue: 4, maxValue: 4 }] }],
}

describe('loadItemDatabase', () => {
  const initialState = useGameDataStore.getState()

  beforeEach(() => {
    useGameDataStore.setState(initialState, true)
    mockInvoke.mockReset()
  })

  it('populates itemDatabase in store on successful load', async () => {
    mockInvoke.mockResolvedValueOnce(mockDb)

    await loadItemDatabase()

    expect(mockInvoke).toHaveBeenCalledWith('load_item_database')
    expect(useGameDataStore.getState().itemDatabase).toEqual(mockDb)
  })

  it('leaves itemDatabase null when invokeCommand throws', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('ITEM_DATA_ERROR: file not found'))

    await expect(loadItemDatabase()).rejects.toThrow()
    expect(useGameDataStore.getState().itemDatabase).toBeNull()
  })
})

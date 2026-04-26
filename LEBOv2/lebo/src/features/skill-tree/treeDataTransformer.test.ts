import { describe, it, expect } from 'vitest'
import { buildTreeData } from './treeDataTransformer'
import type { ClassData } from '../../shared/types/gameData'

const mockClassData: ClassData = {
  classId: 'sentinel',
  className: 'Sentinel',
  baseTree: {
    'base-root': {
      id: 'base-root',
      name: 'Root',
      pointCost: 1,
      maxPoints: 5,
      prerequisiteNodeIds: [],
      effectDescription: '+5 Strength per point',
      tags: ['PHYSICAL'],
      position: { x: 0, y: 0 },
      size: 'large',
    },
    'base-child': {
      id: 'base-child',
      name: 'Child',
      pointCost: 1,
      maxPoints: 4,
      prerequisiteNodeIds: ['base-root'],
      effectDescription: '+3 Dexterity per point',
      tags: ['PHYSICAL'],
      position: { x: 280, y: 0 },
      size: 'medium',
    },
  },
  masteries: {
    void_knight: {
      masteryId: 'void_knight',
      masteryName: 'Void Knight',
      nodes: {
        'vk-entry': {
          id: 'vk-entry',
          name: 'Entry',
          pointCost: 1,
          maxPoints: 1,
          prerequisiteNodeIds: [],
          effectDescription: 'Mastery entry',
          tags: ['MASTERY'],
          position: { x: 0, y: 0 },
          size: 'large',
        },
        'vk-void-blade': {
          id: 'vk-void-blade',
          name: 'Void Blade',
          pointCost: 1,
          maxPoints: 6,
          prerequisiteNodeIds: ['vk-entry'],
          effectDescription: '+5% Void Damage per point',
          tags: ['VOID'],
          position: { x: 280, y: 0 },
          size: 'medium',
        },
      },
    },
  },
}

describe('buildTreeData', () => {
  it('returns only base tree nodes when masteryId is null', () => {
    const result = buildTreeData(mockClassData, null, {})
    const ids = result.nodes.map((n) => n.id)
    expect(ids).toContain('base-root')
    expect(ids).toContain('base-child')
    expect(ids).not.toContain('vk-entry')
    expect(ids).not.toContain('vk-void-blade')
  })

  it('returns base + mastery nodes when masteryId is provided', () => {
    const result = buildTreeData(mockClassData, 'void_knight', {})
    const ids = result.nodes.map((n) => n.id)
    expect(ids).toContain('base-root')
    expect(ids).toContain('vk-entry')
    expect(ids).toContain('vk-void-blade')
    expect(result.nodes).toHaveLength(4)
  })

  it('applies MASTERY_Y_OFFSET to mastery node y coordinates', () => {
    const result = buildTreeData(mockClassData, 'void_knight', {})
    const vkEntry = result.nodes.find((n) => n.id === 'vk-entry')
    expect(vkEntry).toBeDefined()
    expect(vkEntry!.y).toBe(1600) // 0 + 1600
    const vkBlade = result.nodes.find((n) => n.id === 'vk-void-blade')
    expect(vkBlade!.y).toBe(1600) // 0 + 1600
  })

  it('does not apply offset to base tree node y coordinates', () => {
    const result = buildTreeData(mockClassData, null, {})
    const root = result.nodes.find((n) => n.id === 'base-root')
    expect(root!.y).toBe(0)
    const child = result.nodes.find((n) => n.id === 'base-child')
    expect(child!.y).toBe(0)
  })

  it('marks allocated nodes with state="allocated"', () => {
    const result = buildTreeData(mockClassData, null, { 'base-root': 3 })
    const root = result.nodes.find((n) => n.id === 'base-root')
    expect(root!.state).toBe('allocated')
  })

  it('marks unallocated root node (no prerequisites) with state="available"', () => {
    const result = buildTreeData(mockClassData, null, {})
    const root = result.nodes.find((n) => n.id === 'base-root')
    expect(root!.state).toBe('available')
  })

  it('reconstructs edges from prerequisiteNodeIds', () => {
    const result = buildTreeData(mockClassData, 'void_knight', {})
    expect(result.edges).toContainEqual({ fromId: 'base-root', toId: 'base-child' })
    expect(result.edges).toContainEqual({ fromId: 'vk-entry', toId: 'vk-void-blade' })
    expect(result.edges).not.toContainEqual({ fromId: 'base-root', toId: 'vk-entry' })
  })

  it('root node (no prerequisites) is available when not allocated', () => {
    const result = buildTreeData(mockClassData, null, {})
    const root = result.nodes.find((n) => n.id === 'base-root')
    expect(root!.state).toBe('available')
  })

  it('child node is locked when prerequisite is not allocated', () => {
    const result = buildTreeData(mockClassData, null, {})
    const child = result.nodes.find((n) => n.id === 'base-child')
    expect(child!.state).toBe('locked')
  })

  it('child node is available when prerequisite is allocated', () => {
    const result = buildTreeData(mockClassData, null, { 'base-root': 1 })
    const child = result.nodes.find((n) => n.id === 'base-child')
    expect(child!.state).toBe('available')
  })

  it('builds bidirectional connections for each node', () => {
    const result = buildTreeData(mockClassData, null, {})
    const root = result.nodes.find((n) => n.id === 'base-root')
    const child = result.nodes.find((n) => n.id === 'base-child')
    expect(root!.connections).toContain('base-child')
    expect(child!.connections).toContain('base-root')
  })
})

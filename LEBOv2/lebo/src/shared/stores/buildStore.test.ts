import { describe, it, expect, beforeEach } from 'vitest'
import { useBuildStore } from './buildStore'
import type { BuildState, BuildMeta } from '../types/build'
import type { GameNode } from '../types/gameData'

const initialState = useBuildStore.getState()

const mockBuild: BuildState = {
  schemaVersion: 1,
  id: 'build-1',
  name: 'Test Lich',
  classId: 'acolyte',
  masteryId: 'lich',
  nodeAllocations: { 'node-a': 1, 'node-b': 2 },
  contextData: { gear: [], skills: [], idols: [] },
  isPersisted: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const mockMeta: BuildMeta = {
  id: 'build-1',
  name: 'Test Lich',
  classId: 'acolyte',
  masteryId: 'lich',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('buildStore', () => {
  beforeEach(() => {
    useBuildStore.setState(initialState, true)
  })

  it('starts with null activeBuild and empty savedBuilds', () => {
    const s = useBuildStore.getState()
    expect(s.activeBuild).toBeNull()
    expect(s.savedBuilds).toHaveLength(0)
    expect(s.isImporting).toBe(false)
  })

  it('setActiveBuild stores the build', () => {
    useBuildStore.getState().setActiveBuild(mockBuild)
    expect(useBuildStore.getState().activeBuild).toEqual(mockBuild)
  })

  it('setActiveBuild clears the build with null', () => {
    useBuildStore.getState().setActiveBuild(mockBuild)
    useBuildStore.getState().setActiveBuild(null)
    expect(useBuildStore.getState().activeBuild).toBeNull()
  })

  it('setSavedBuilds replaces the full list', () => {
    useBuildStore.getState().setSavedBuilds([mockMeta])
    expect(useBuildStore.getState().savedBuilds).toHaveLength(1)
    expect(useBuildStore.getState().savedBuilds[0].id).toBe('build-1')
  })

  it('setSavedBuilds can clear the list', () => {
    useBuildStore.getState().setSavedBuilds([mockMeta])
    useBuildStore.getState().setSavedBuilds([])
    expect(useBuildStore.getState().savedBuilds).toHaveLength(0)
  })

  it('setIsImporting toggles the importing flag', () => {
    useBuildStore.getState().setIsImporting(true)
    expect(useBuildStore.getState().isImporting).toBe(true)
    useBuildStore.getState().setIsImporting(false)
    expect(useBuildStore.getState().isImporting).toBe(false)
  })

  it('starts with null selectedClassId and selectedMasteryId', () => {
    const s = useBuildStore.getState()
    expect(s.selectedClassId).toBeNull()
    expect(s.selectedMasteryId).toBeNull()
  })

  it('setSelectedClass sets classId and clears masteryId', () => {
    useBuildStore.getState().setSelectedMastery('void_knight')
    useBuildStore.getState().setSelectedClass('sentinel')
    const s = useBuildStore.getState()
    expect(s.selectedClassId).toBe('sentinel')
    expect(s.selectedMasteryId).toBeNull()
  })

  it('setSelectedClass clears activeBuild and undoStack', () => {
    useBuildStore.getState().setActiveBuild(mockBuild)
    useBuildStore.getState().setSelectedClass('mage')
    const s = useBuildStore.getState()
    expect(s.activeBuild).toBeNull()
    expect(s.undoStack).toHaveLength(0)
  })

  it('createBuild creates a BuildState with the given mastery name', () => {
    useBuildStore.getState().setSelectedClass('sentinel')
    useBuildStore.getState().setSelectedMastery('void_knight')
    useBuildStore.getState().createBuild('Void Knight')
    const s = useBuildStore.getState()
    expect(s.activeBuild).not.toBeNull()
    expect(s.activeBuild!.name).toBe('Void Knight')
    expect(s.activeBuild!.classId).toBe('sentinel')
    expect(s.activeBuild!.masteryId).toBe('void_knight')
    expect(s.activeBuild!.nodeAllocations).toEqual({})
    expect(s.activeBuild!.schemaVersion).toBe(1)
    expect(s.activeBuild!.isPersisted).toBe(false)
    expect(s.undoStack).toHaveLength(0)
  })

  it('createBuild is a no-op when class or mastery is not selected', () => {
    useBuildStore.getState().setSelectedClass('sentinel')
    // no mastery selected
    useBuildStore.getState().createBuild('Void Knight')
    expect(useBuildStore.getState().activeBuild).toBeNull()
  })

  it('createBuild is idempotent when same class and mastery already active', () => {
    useBuildStore.getState().setSelectedClass('sentinel')
    useBuildStore.getState().setSelectedMastery('void_knight')
    useBuildStore.getState().createBuild('Void Knight')
    const firstId = useBuildStore.getState().activeBuild!.id
    // Allocate a point so we can verify the build is not wiped
    useBuildStore.getState().setActiveBuild({
      ...useBuildStore.getState().activeBuild!,
      nodeAllocations: { 'node-a': 1 },
    })
    useBuildStore.getState().createBuild('Void Knight')
    const s = useBuildStore.getState()
    expect(s.activeBuild!.id).toBe(firstId)
    expect(s.activeBuild!.nodeAllocations['node-a']).toBe(1)
  })

  it('setActiveBuildPersisted sets isPersisted = true on activeBuild', () => {
    useBuildStore.getState().setActiveBuild({ ...mockBuild, isPersisted: false })
    useBuildStore.getState().setActiveBuildPersisted()
    expect(useBuildStore.getState().activeBuild!.isPersisted).toBe(true)
  })

  it('setActiveBuildPersisted is a no-op when activeBuild is null', () => {
    useBuildStore.getState().setActiveBuildPersisted()
    expect(useBuildStore.getState().activeBuild).toBeNull()
  })

  it('clearActiveBuild clears build, classId, masteryId, and undoStack', () => {
    useBuildStore.getState().setSelectedClass('sentinel')
    useBuildStore.getState().setSelectedMastery('void_knight')
    useBuildStore.getState().setActiveBuild(mockBuild)
    useBuildStore.getState().clearActiveBuild()
    const s = useBuildStore.getState()
    expect(s.activeBuild).toBeNull()
    expect(s.selectedClassId).toBeNull()
    expect(s.selectedMasteryId).toBeNull()
    expect(s.undoStack).toHaveLength(0)
  })

  it('setSelectedMastery sets masteryId without touching classId', () => {
    useBuildStore.getState().setSelectedClass('sentinel')
    useBuildStore.getState().setSelectedMastery('void_knight')
    const s = useBuildStore.getState()
    expect(s.selectedClassId).toBe('sentinel')
    expect(s.selectedMasteryId).toBe('void_knight')
  })
})

const rootNode: GameNode = {
  id: 'root',
  name: 'Root',
  pointCost: 1,
  maxPoints: 5,
  prerequisiteNodeIds: [],
  effectDescription: '+5 Str',
  tags: [],
  position: { x: 0, y: 0 },
  size: 'large',
}

const childNode: GameNode = {
  id: 'child',
  name: 'Child',
  pointCost: 1,
  maxPoints: 3,
  prerequisiteNodeIds: ['root'],
  effectDescription: '+3 Dex',
  tags: [],
  position: { x: 100, y: 0 },
  size: 'medium',
}

const allNodes: Record<string, GameNode> = { root: rootNode, child: childNode }

describe('buildStore — applyNodeChange', () => {
  beforeEach(() => {
    useBuildStore.setState(initialState, true)
    useBuildStore.getState().setSelectedClass('sentinel')
    useBuildStore.getState().setSelectedMastery('void_knight')
  })

  it('creates activeBuild on first allocation when activeBuild is null', () => {
    useBuildStore.getState().applyNodeChange('root', 1, rootNode, allNodes)
    const s = useBuildStore.getState()
    expect(s.activeBuild).not.toBeNull()
    expect(s.activeBuild!.classId).toBe('sentinel')
    expect(s.activeBuild!.nodeAllocations['root']).toBe(1)
  })

  it('allocates a root node (no prerequisites)', () => {
    const result = useBuildStore.getState().applyNodeChange('root', 1, rootNode, allNodes)
    expect(result.success).toBe(true)
    expect(useBuildStore.getState().activeBuild!.nodeAllocations['root']).toBe(1)
  })

  it('fails to allocate child node when prerequisite not met', () => {
    const result = useBuildStore.getState().applyNodeChange('child', 1, childNode, allNodes)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Prerequisite not met')
    expect(useBuildStore.getState().activeBuild).toBeNull()
  })

  it('allocates child node when prerequisite is met', () => {
    useBuildStore.getState().applyNodeChange('root', 1, rootNode, allNodes)
    const result = useBuildStore.getState().applyNodeChange('child', 1, childNode, allNodes)
    expect(result.success).toBe(true)
    expect(useBuildStore.getState().activeBuild!.nodeAllocations['child']).toBe(1)
  })

  it('deallocates a node with no dependents', () => {
    useBuildStore.getState().applyNodeChange('root', 1, rootNode, allNodes)
    const result = useBuildStore.getState().applyNodeChange('root', -1, rootNode, allNodes)
    expect(result.success).toBe(true)
    expect(useBuildStore.getState().activeBuild!.nodeAllocations['root']).toBeUndefined()
  })

  it('blocks deallocation when a dependent node is allocated', () => {
    useBuildStore.getState().applyNodeChange('root', 1, rootNode, allNodes)
    useBuildStore.getState().applyNodeChange('child', 1, childNode, allNodes)
    const result = useBuildStore.getState().applyNodeChange('root', -1, rootNode, allNodes)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Cannot remove/)
    expect(useBuildStore.getState().activeBuild!.nodeAllocations['root']).toBe(1)
  })

  it('undoNodeChange restores previous allocations', () => {
    useBuildStore.getState().applyNodeChange('root', 1, rootNode, allNodes)
    useBuildStore.getState().applyNodeChange('root', 1, rootNode, allNodes)
    useBuildStore.getState().undoNodeChange()
    expect(useBuildStore.getState().activeBuild!.nodeAllocations['root']).toBe(1)
  })

  it('undoNodeChange is a no-op when undoStack is empty', () => {
    useBuildStore.getState().applyNodeChange('root', 1, rootNode, allNodes)
    useBuildStore.getState().undoNodeChange()
    useBuildStore.getState().undoNodeChange()
    expect(useBuildStore.getState().activeBuild).not.toBeNull()
  })
})

describe('buildStore — updateContextGear', () => {
  beforeEach(() => {
    useBuildStore.setState(initialState, true)
  })

  it('updates contextData.gear on activeBuild', () => {
    useBuildStore.getState().setActiveBuild({
      schemaVersion: 1,
      id: 'build-1',
      name: 'Test',
      classId: 'sentinel',
      masteryId: 'void_knight',
      nodeAllocations: {},
      contextData: { gear: [], skills: [], idols: [] },
      isPersisted: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    })
    const gear = [{ slotId: 'helmet', itemName: 'Iron Helm', affixes: ['+10 HP'] }]
    useBuildStore.getState().updateContextGear(gear)
    expect(useBuildStore.getState().activeBuild!.contextData.gear).toEqual(gear)
  })

  it('is a no-op when activeBuild is null', () => {
    const gear = [{ slotId: 'helmet', itemName: 'Iron Helm', affixes: [] }]
    useBuildStore.getState().updateContextGear(gear)
    expect(useBuildStore.getState().activeBuild).toBeNull()
  })
})

describe('buildStore — updateContextSkills', () => {
  const activeBuildBase = {
    schemaVersion: 1 as const,
    id: 'build-1',
    name: 'Test',
    classId: 'sentinel',
    masteryId: 'void_knight',
    nodeAllocations: {},
    contextData: { gear: [], skills: [], idols: [] },
    isPersisted: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }

  beforeEach(() => {
    useBuildStore.setState(initialState, true)
  })

  it('updates contextData.skills on activeBuild', () => {
    useBuildStore.getState().setActiveBuild(activeBuildBase)
    const skills = [{ slotId: 'skill1', skillName: 'Void Cleave' }]
    useBuildStore.getState().updateContextSkills(skills)
    expect(useBuildStore.getState().activeBuild!.contextData.skills).toEqual(skills)
  })

  it('sets isPersisted: false and updates updatedAt', () => {
    useBuildStore.getState().setActiveBuild({ ...activeBuildBase, isPersisted: true })
    const before = useBuildStore.getState().activeBuild!.updatedAt
    const skills = [{ slotId: 'skill1', skillName: 'Smite' }]
    useBuildStore.getState().updateContextSkills(skills)
    const state = useBuildStore.getState().activeBuild!
    expect(state.isPersisted).toBe(false)
    expect(state.updatedAt).not.toBe(before)
  })

  it('is a no-op when activeBuild is null', () => {
    const skills = [{ slotId: 'skill1', skillName: 'Void Cleave' }]
    useBuildStore.getState().updateContextSkills(skills)
    expect(useBuildStore.getState().activeBuild).toBeNull()
  })
})

describe('buildStore — updateContextIdols', () => {
  const activeBuildBase = {
    schemaVersion: 1 as const,
    id: 'build-1',
    name: 'Test',
    classId: 'sentinel',
    masteryId: 'void_knight',
    nodeAllocations: {},
    contextData: { gear: [], skills: [], idols: [] },
    isPersisted: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }

  beforeEach(() => {
    useBuildStore.setState(initialState, true)
  })

  it('updates contextData.idols on activeBuild', () => {
    useBuildStore.getState().setActiveBuild(activeBuildBase)
    const idols = [{ slotId: 'idol1', idolType: 'Ornate Idol', modifiers: ['+50% Poison Damage'] }]
    useBuildStore.getState().updateContextIdols(idols)
    expect(useBuildStore.getState().activeBuild!.contextData.idols).toEqual(idols)
  })

  it('sets isPersisted: false and updates updatedAt', () => {
    useBuildStore.getState().setActiveBuild({ ...activeBuildBase, isPersisted: true })
    const before = useBuildStore.getState().activeBuild!.updatedAt
    const idols = [{ slotId: 'idol1', idolType: 'Grand Idol', modifiers: [] }]
    useBuildStore.getState().updateContextIdols(idols)
    const state = useBuildStore.getState().activeBuild!
    expect(state.isPersisted).toBe(false)
    expect(state.updatedAt).not.toBe(before)
  })

  it('is a no-op when activeBuild is null', () => {
    const idols = [{ slotId: 'idol1', idolType: 'Grand Idol', modifiers: [] }]
    useBuildStore.getState().updateContextIdols(idols)
    expect(useBuildStore.getState().activeBuild).toBeNull()
  })
})

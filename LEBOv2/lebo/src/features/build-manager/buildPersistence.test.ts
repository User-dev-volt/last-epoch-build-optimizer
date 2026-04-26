import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BuildState, BuildMeta } from '../../shared/types/build'

vi.mock('../../shared/utils/invokeCommand', () => ({
  invokeCommand: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { dismiss: vi.fn() }),
}))

import { invokeCommand } from '../../shared/utils/invokeCommand'
import {
  migrateBuildState,
  saveBuild,
  loadBuildsList,
  loadBuild,
  deleteBuild,
  renameBuild,
} from './buildPersistence'
import { useBuildStore } from '../../shared/stores/buildStore'

const mockInvoke = vi.mocked(invokeCommand)

const mockBuild: BuildState = {
  schemaVersion: 1,
  id: 'build-1',
  name: 'Void Knight',
  classId: 'sentinel',
  masteryId: 'void_knight',
  nodeAllocations: { 'node-a': 1 },
  contextData: { gear: [], skills: [], idols: [] },
  isPersisted: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const mockMeta: BuildMeta = {
  id: 'build-1',
  name: 'Void Knight',
  classId: 'sentinel',
  masteryId: 'void_knight',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const initialBuildState = useBuildStore.getState()

describe('migrateBuildState', () => {
  it('passes through a valid schemaVersion 1 object', () => {
    const raw = { ...mockBuild }
    const result = migrateBuildState(raw)
    expect(result.schemaVersion).toBe(1)
    expect(result.id).toBe('build-1')
    expect(result.name).toBe('Void Knight')
    expect(result.classId).toBe('sentinel')
    expect(result.masteryId).toBe('void_knight')
    expect(result.nodeAllocations).toEqual({ 'node-a': 1 })
    expect(result.isPersisted).toBe(true)
  })

  it('applies defaults for missing fields', () => {
    const raw = { id: 'x', name: 'Test' }
    const result = migrateBuildState(raw)
    expect(result.classId).toBe('')
    expect(result.masteryId).toBe('')
    expect(result.nodeAllocations).toEqual({})
    expect(result.contextData).toEqual({ gear: [], skills: [], idols: [] })
    expect(result.isPersisted).toBe(true)
  })

  it('throws for null input', () => {
    expect(() => migrateBuildState(null)).toThrow('STORAGE_ERROR')
  })

  it('throws for non-object input', () => {
    expect(() => migrateBuildState('invalid')).toThrow('STORAGE_ERROR')
  })

  it('always sets isPersisted = true (loaded from DB)', () => {
    const raw = { ...mockBuild, isPersisted: false }
    const result = migrateBuildState(raw)
    expect(result.isPersisted).toBe(true)
  })
})

describe('saveBuild', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    useBuildStore.setState(initialBuildState, true)
    mockInvoke.mockResolvedValue(undefined)
  })

  it('calls save_build command with correct args', async () => {
    await saveBuild(mockBuild)
    expect(mockInvoke).toHaveBeenCalledWith('save_build', expect.objectContaining({
      id: 'build-1',
      name: 'Void Knight',
      classId: 'sentinel',
      masteryId: 'void_knight',
      schemaVersion: 1,
      data: JSON.stringify(mockBuild),
      createdAt: mockBuild.createdAt,
      updatedAt: mockBuild.updatedAt,
    }))
  })

  it('sets activeBuild.isPersisted = true after save', async () => {
    useBuildStore.getState().setActiveBuild(mockBuild)
    await saveBuild(mockBuild)
    expect(useBuildStore.getState().activeBuild?.isPersisted).toBe(true)
  })

  it('adds new build to savedBuilds when not already in list', async () => {
    await saveBuild(mockBuild)
    const { savedBuilds } = useBuildStore.getState()
    expect(savedBuilds).toHaveLength(1)
    expect(savedBuilds[0].id).toBe('build-1')
  })

  it('updates existing entry in savedBuilds when build already saved', async () => {
    useBuildStore.getState().setSavedBuilds([mockMeta])
    const updatedBuild = { ...mockBuild, name: 'Renamed VK' }
    await saveBuild(updatedBuild)
    const { savedBuilds } = useBuildStore.getState()
    expect(savedBuilds).toHaveLength(1)
    expect(savedBuilds[0].name).toBe('Renamed VK')
  })
})

describe('loadBuildsList', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    useBuildStore.setState(initialBuildState, true)
  })

  it('calls load_builds_list and populates savedBuilds', async () => {
    mockInvoke.mockResolvedValue([mockMeta])
    await loadBuildsList()
    expect(useBuildStore.getState().savedBuilds).toHaveLength(1)
    expect(useBuildStore.getState().savedBuilds[0].id).toBe('build-1')
  })

  it('clears savedBuilds when list returns empty', async () => {
    useBuildStore.getState().setSavedBuilds([mockMeta])
    mockInvoke.mockResolvedValue([])
    await loadBuildsList()
    expect(useBuildStore.getState().savedBuilds).toHaveLength(0)
  })
})

describe('loadBuild', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    useBuildStore.setState(initialBuildState, true)
  })

  it('calls load_build with id and sets activeBuild', async () => {
    mockInvoke.mockResolvedValue(JSON.stringify(mockBuild))
    await loadBuild('build-1')
    expect(mockInvoke).toHaveBeenCalledWith('load_build', { id: 'build-1' })
    const s = useBuildStore.getState()
    expect(s.activeBuild?.id).toBe('build-1')
    expect(s.selectedClassId).toBe('sentinel')
    expect(s.selectedMasteryId).toBe('void_knight')
  })

  it('loaded build has isPersisted = true', async () => {
    mockInvoke.mockResolvedValue(JSON.stringify({ ...mockBuild, isPersisted: false }))
    await loadBuild('build-1')
    expect(useBuildStore.getState().activeBuild?.isPersisted).toBe(true)
  })
})

describe('deleteBuild', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    useBuildStore.setState(initialBuildState, true)
    mockInvoke.mockResolvedValue(undefined)
  })

  it('calls delete_build command and removes from savedBuilds', async () => {
    useBuildStore.getState().setSavedBuilds([mockMeta])
    await deleteBuild('build-1')
    expect(mockInvoke).toHaveBeenCalledWith('delete_build', { id: 'build-1' })
    expect(useBuildStore.getState().savedBuilds).toHaveLength(0)
  })

  it('clears activeBuild if deleted build was active', async () => {
    useBuildStore.getState().setActiveBuild(mockBuild)
    useBuildStore.getState().setSavedBuilds([mockMeta])
    await deleteBuild('build-1')
    expect(useBuildStore.getState().activeBuild).toBeNull()
  })

  it('does not clear activeBuild if a different build is active', async () => {
    const otherBuild = { ...mockBuild, id: 'build-2' }
    useBuildStore.getState().setActiveBuild(otherBuild)
    useBuildStore.getState().setSavedBuilds([mockMeta, { ...mockMeta, id: 'build-2', name: 'Other' }])
    await deleteBuild('build-1')
    expect(useBuildStore.getState().activeBuild?.id).toBe('build-2')
  })
})

describe('renameBuild', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    useBuildStore.setState(initialBuildState, true)
    mockInvoke.mockResolvedValue(undefined)
  })

  it('calls rename_build command and updates savedBuilds name', async () => {
    useBuildStore.getState().setSavedBuilds([mockMeta])
    await renameBuild('build-1', 'New Name')
    expect(mockInvoke).toHaveBeenCalledWith('rename_build', { id: 'build-1', newName: 'New Name' })
    expect(useBuildStore.getState().savedBuilds[0].name).toBe('New Name')
  })

  it('updates activeBuild name if rename target is active', async () => {
    useBuildStore.getState().setActiveBuild(mockBuild)
    useBuildStore.getState().setSavedBuilds([mockMeta])
    await renameBuild('build-1', 'Renamed')
    expect(useBuildStore.getState().activeBuild?.name).toBe('Renamed')
  })
})

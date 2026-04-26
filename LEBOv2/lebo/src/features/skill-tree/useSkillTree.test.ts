import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSkillTree } from './useSkillTree'
import { useBuildStore } from '../../shared/stores/buildStore'
import type { GameNode } from '../../shared/types/gameData'

const initialState = useBuildStore.getState()

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

const allNodes: Record<string, GameNode> = { root: rootNode }

describe('useSkillTree', () => {
  beforeEach(() => {
    useBuildStore.setState(initialState, true)
    useBuildStore.getState().setSelectedClass('sentinel')
    useBuildStore.getState().setSelectedMastery('void_knight')
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets hoveredNodeId on handleNodeHover', () => {
    const { result } = renderHook(() => useSkillTree(allNodes))
    act(() => result.current.handleNodeHover('root'))
    expect(result.current.hoveredNodeId).toBe('root')
  })

  it('clears hoveredNodeId and nodeError on handleNodeHover(null)', () => {
    const { result } = renderHook(() => useSkillTree(allNodes))
    act(() => result.current.handleNodeHover('root'))
    act(() => result.current.handleNodeHover(null))
    expect(result.current.hoveredNodeId).toBeNull()
    expect(result.current.nodeError).toBeNull()
  })

  it('nodeError auto-clears after 2000ms', () => {
    const childNode: GameNode = {
      id: 'child',
      name: 'Child',
      pointCost: 1,
      maxPoints: 1,
      prerequisiteNodeIds: ['root'],
      effectDescription: '+1',
      tags: [],
      position: { x: 100, y: 0 },
      size: 'small',
    }
    const nodes = { root: rootNode, child: childNode }
    const { result } = renderHook(() => useSkillTree(nodes))
    act(() => result.current.handleNodeClick('child'))
    expect(result.current.nodeError).not.toBeNull()
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.nodeError).toBeNull()
  })

  it('successful click does not set nodeError', () => {
    const { result } = renderHook(() => useSkillTree(allNodes))
    act(() => result.current.handleNodeClick('root'))
    expect(result.current.nodeError).toBeNull()
    expect(useBuildStore.getState().activeBuild!.nodeAllocations['root']).toBe(1)
  })

  it('handleKeyboardNavigate sets keyboardFocusedNodeId and keyboardPosition', () => {
    const { result } = renderHook(() => useSkillTree(allNodes))
    act(() => result.current.handleKeyboardNavigate('root', 120, 240))
    expect(result.current.keyboardFocusedNodeId).toBe('root')
    expect(result.current.keyboardPosition).toEqual({ x: 120, y: 240 })
  })

  it('handleKeyboardNavigate(null) clears keyboardFocusedNodeId', () => {
    const { result } = renderHook(() => useSkillTree(allNodes))
    act(() => result.current.handleKeyboardNavigate('root', 120, 240))
    act(() => result.current.handleKeyboardNavigate(null, 0, 0))
    expect(result.current.keyboardFocusedNodeId).toBeNull()
  })
})

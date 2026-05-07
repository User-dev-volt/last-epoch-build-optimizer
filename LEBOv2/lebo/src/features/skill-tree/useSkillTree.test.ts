import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSkillTree } from './useSkillTree'
import { useBuildStore } from '../../shared/stores/buildStore'
import type { TreeData } from '../../shared/types/treeData'

const initialState = useBuildStore.getState()

// root (maxPoints: 5, no prerequisites) → child (maxPoints: 1, requires root)
const mockTreeData: TreeData = {
  nodes: [
    { id: 'root', x: 0, y: 0, size: 'large', maxPoints: 5, connections: ['child'], state: 'available' },
    { id: 'child', x: 100, y: 0, size: 'small', maxPoints: 1, connections: ['root'], state: 'available' },
  ],
  edges: [{ fromId: 'root', toId: 'child' }],
}

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
    const { result } = renderHook(() => useSkillTree(mockTreeData))
    act(() => result.current.handleNodeHover('root'))
    expect(result.current.hoveredNodeId).toBe('root')
  })

  it('clears hoveredNodeId and nodeError on handleNodeHover(null)', () => {
    const { result } = renderHook(() => useSkillTree(mockTreeData))
    act(() => result.current.handleNodeHover('root'))
    act(() => result.current.handleNodeHover(null))
    expect(result.current.hoveredNodeId).toBeNull()
    expect(result.current.nodeError).toBeNull()
  })

  it('nodeError auto-clears after 2000ms', () => {
    const { result } = renderHook(() => useSkillTree(mockTreeData))
    // child requires root — clicking child without root allocated triggers prerequisite error
    act(() => result.current.handleNodeClick('child', 0))
    expect(result.current.nodeError).not.toBeNull()
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.nodeError).toBeNull()
  })

  it('successful left-click does not set nodeError', () => {
    const { result } = renderHook(() => useSkillTree(mockTreeData))
    act(() => result.current.handleNodeClick('root', 0))
    expect(result.current.nodeError).toBeNull()
    expect(useBuildStore.getState().activeBuild!.nodeAllocations['root']).toBe(1)
  })

  it('successive left-clicks add multiple points up to maxPoints', () => {
    const { result } = renderHook(() => useSkillTree(mockTreeData))
    act(() => result.current.handleNodeClick('root', 0))
    act(() => result.current.handleNodeClick('root', 0))
    act(() => result.current.handleNodeClick('root', 0))
    expect(useBuildStore.getState().activeBuild!.nodeAllocations['root']).toBe(3)
  })

  it('right-click removes one point', () => {
    const { result } = renderHook(() => useSkillTree(mockTreeData))
    act(() => result.current.handleNodeClick('root', 0))
    act(() => result.current.handleNodeClick('root', 0))
    act(() => result.current.handleNodeClick('root', 2))
    expect(useBuildStore.getState().activeBuild!.nodeAllocations['root']).toBe(1)
  })

  it('right-click on zero-point node does not set error', () => {
    const { result } = renderHook(() => useSkillTree(mockTreeData))
    act(() => result.current.handleNodeClick('root', 2))
    expect(result.current.nodeError).toBeNull()
  })

  it('handleKeyboardNavigate sets keyboardFocusedNodeId and keyboardPosition', () => {
    const { result } = renderHook(() => useSkillTree(mockTreeData))
    act(() => result.current.handleKeyboardNavigate('root', 120, 240))
    expect(result.current.keyboardFocusedNodeId).toBe('root')
    expect(result.current.keyboardPosition).toEqual({ x: 120, y: 240 })
  })

  it('handleKeyboardNavigate(null) clears keyboardFocusedNodeId', () => {
    const { result } = renderHook(() => useSkillTree(mockTreeData))
    act(() => result.current.handleKeyboardNavigate('root', 120, 240))
    act(() => result.current.handleKeyboardNavigate(null, 0, 0))
    expect(result.current.keyboardFocusedNodeId).toBeNull()
  })

  it('does nothing when treeData is null', () => {
    const { result } = renderHook(() => useSkillTree(null))
    act(() => result.current.handleNodeClick('root', 0))
    expect(useBuildStore.getState().activeBuild).toBeNull()
  })
})

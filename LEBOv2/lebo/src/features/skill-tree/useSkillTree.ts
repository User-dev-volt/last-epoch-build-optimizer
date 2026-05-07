import { useState, useEffect, useCallback } from 'react'
import type { TreeData } from '../../shared/types/treeData'
import { useBuildStore } from '../../shared/stores/buildStore'

const ERROR_DISPLAY_MS = 2000

export interface SkillTreeInteraction {
  hoveredNodeId: string | null
  mousePosition: { x: number; y: number }
  nodeError: { nodeId: string; message: string } | null
  keyboardFocusedNodeId: string | null
  keyboardPosition: { x: number; y: number }
  flashNodeIds: string[] | null
  handleNodeClick: (nodeId: string, button: 0 | 2) => void
  handleNodeHover: (nodeId: string | null) => void
  handleMouseMove: (e: React.MouseEvent) => void
  handleKeyboardNavigate: (nodeId: string | null, screenX: number, screenY: number) => void
}

export function useSkillTree(treeData: TreeData | null): SkillTreeInteraction {
  const applyNodeChange = useBuildStore((s) => s.applyNodeChange)

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [nodeError, setNodeError] = useState<{ nodeId: string; message: string } | null>(null)
  const [keyboardFocusedNodeId, setKeyboardFocusedNodeId] = useState<string | null>(null)
  const [keyboardPosition, setKeyboardPosition] = useState({ x: 0, y: 0 })
  const [flashNodeIds, setFlashNodeIds] = useState<string[] | null>(null)

  useEffect(() => {
    if (!nodeError) return
    const t = setTimeout(() => setNodeError(null), ERROR_DISPLAY_MS)
    return () => clearTimeout(t)
  }, [nodeError])

  const handleNodeClick = useCallback(
    (nodeId: string, button: 0 | 2) => {
      if (!treeData) return
      const delta: 1 | -1 = button === 2 ? -1 : 1
      const result = applyNodeChange(nodeId, delta, treeData)
      if (!result.success && result.error) {
        setNodeError({ nodeId, message: result.error })
        if (button === 2 && result.blockedByDependents && result.blockedByDependents.length > 0) {
          setFlashNodeIds([...result.blockedByDependents])
        } else {
          setFlashNodeIds([nodeId])
        }
      }
    },
    [treeData, applyNodeChange]
  )

  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId)
    if (nodeId === null) setNodeError(null)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY })
  }, [])

  const handleKeyboardNavigate = useCallback(
    (nodeId: string | null, screenX: number, screenY: number) => {
      setKeyboardFocusedNodeId(nodeId)
      if (nodeId !== null) setKeyboardPosition({ x: screenX, y: screenY })
    },
    []
  )

  return {
    hoveredNodeId,
    mousePosition,
    nodeError,
    keyboardFocusedNodeId,
    keyboardPosition,
    flashNodeIds,
    handleNodeClick,
    handleNodeHover,
    handleMouseMove,
    handleKeyboardNavigate,
  }
}

import { useState, useEffect, useCallback } from 'react'
import type { GameNode } from '../../shared/types/gameData'
import { useBuildStore } from '../../shared/stores/buildStore'

const EMPTY_ALLOCATED: Record<string, number> = {}
const ERROR_DISPLAY_MS = 2000

export interface SkillTreeInteraction {
  hoveredNodeId: string | null
  mousePosition: { x: number; y: number }
  nodeError: { nodeId: string; message: string } | null
  keyboardFocusedNodeId: string | null
  keyboardPosition: { x: number; y: number }
  handleNodeClick: (nodeId: string) => void
  handleNodeHover: (nodeId: string | null) => void
  handleMouseMove: (e: React.MouseEvent) => void
  handleKeyboardNavigate: (nodeId: string | null, screenX: number, screenY: number) => void
}

export function useSkillTree(allGameNodes: Record<string, GameNode>): SkillTreeInteraction {
  const applyNodeChange = useBuildStore((s) => s.applyNodeChange)
  const allocatedNodes = useBuildStore(
    (s) => s.activeBuild?.nodeAllocations ?? EMPTY_ALLOCATED
  )

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [nodeError, setNodeError] = useState<{ nodeId: string; message: string } | null>(null)
  const [keyboardFocusedNodeId, setKeyboardFocusedNodeId] = useState<string | null>(null)
  const [keyboardPosition, setKeyboardPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!nodeError) return
    const t = setTimeout(() => setNodeError(null), ERROR_DISPLAY_MS)
    return () => clearTimeout(t)
  }, [nodeError])

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const gameNode = allGameNodes[nodeId]
      if (!gameNode) return
      const currentPoints = allocatedNodes[nodeId] ?? 0
      const delta = currentPoints > 0 ? -1 : 1
      const result = applyNodeChange(nodeId, delta, gameNode, allGameNodes)
      if (!result.success && result.error) {
        setNodeError({ nodeId, message: result.error })
      }
    },
    [allGameNodes, allocatedNodes, applyNodeChange]
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
    handleNodeClick,
    handleNodeHover,
    handleMouseMove,
    handleKeyboardNavigate,
  }
}

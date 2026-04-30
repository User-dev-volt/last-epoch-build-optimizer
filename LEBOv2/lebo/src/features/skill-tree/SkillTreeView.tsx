import { useMemo, useEffect, useState } from 'react'
import type { GameNode } from '../../shared/types/gameData'
import type { ActiveSkill } from '../../shared/types/build'
import type { NodeChange } from '../../shared/types/optimization'
import type { HighlightedNodes } from './types'
import { useGameDataStore } from '../../shared/stores/gameDataStore'
import { useBuildStore } from '../../shared/stores/buildStore'
import { useOptimizationStore } from '../../shared/stores/optimizationStore'
import { buildTreeData } from './treeDataTransformer'
import { SkillTreeCanvas } from './SkillTreeCanvas'
import { EmptyTreeState } from './EmptyTreeState'
import { NodeTooltip } from './NodeTooltip'
import { SkillTreeTabBar } from './SkillTreeTabBar'
import { useSkillTree } from './useSkillTree'

const EMPTY_ALLOCATED: Record<string, number> = {}
const EMPTY_HIGHLIGHTED: HighlightedNodes = { glowing: new Set<string>(), dimmed: new Set<string>() }
const EMPTY_SKILLS: ActiveSkill[] = []

function computePreviewAllocations(
  base: Record<string, number>,
  nodeChange: NodeChange
): Record<string, number> {
  const result = { ...base }
  if (nodeChange.fromNodeId) {
    delete result[nodeChange.fromNodeId]
  }
  const currentTo = result[nodeChange.toNodeId] ?? 0
  const newTo = Math.max(0, currentTo + nodeChange.pointsChange)
  if (newTo === 0) delete result[nodeChange.toNodeId]
  else result[nodeChange.toNodeId] = newTo
  return result
}

function SkillTreeStubPanel({ skillName }: { skillName: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {skillName} skill tree — available in Epic 4
      </p>
    </div>
  )
}

export function SkillTreeView() {
  const gameData = useGameDataStore((s) => s.gameData)
  const isLoading = useGameDataStore((s) => s.isLoading)
  const selectedClassId = useBuildStore((s) => s.selectedClassId)
  const selectedMasteryId = useBuildStore((s) => s.selectedMasteryId)
  const activeBuild = useBuildStore((s) => s.activeBuild)
  const undoNodeChange = useBuildStore((s) => s.undoNodeChange)
  const activeSkills = useBuildStore(
    (s) => s.activeBuild?.contextData.skills ?? EMPTY_SKILLS
  )
  const activeBuildId = useBuildStore((s) => s.activeBuild?.id ?? null)
  const highlightedNodeIds = useOptimizationStore((s) => s.highlightedNodeIds)
  const previewSuggestionRank = useOptimizationStore((s) => s.previewSuggestionRank)
  const suggestions = useOptimizationStore((s) => s.suggestions)

  const [activeTabIndex, setActiveTabIndex] = useState(0)

  // Reset to passive tab when switching to a different build
  useEffect(() => {
    setActiveTabIndex(0)
  }, [activeBuildId])

  // Reset to passive tab if a skill was removed and the active tab is now out of bounds
  useEffect(() => {
    if (activeTabIndex >= 1 + activeSkills.length) {
      setActiveTabIndex(0)
    }
  }, [activeSkills.length, activeTabIndex])

  const classData = selectedClassId && gameData ? gameData.classes[selectedClassId] : null

  const allGameNodes = useMemo<Record<string, GameNode>>(() => {
    if (!classData) return {}
    const nodes: Record<string, GameNode> = { ...classData.baseTree }
    if (selectedMasteryId) {
      const mastery = classData.masteries[selectedMasteryId]
      if (mastery) Object.assign(nodes, mastery.nodes)
    }
    return nodes
  }, [classData, selectedMasteryId])

  const baseAllocatedNodes = activeBuild?.nodeAllocations ?? EMPTY_ALLOCATED

  const previewSuggestion = useMemo(
    () => suggestions.find((s) => s.rank === previewSuggestionRank) ?? null,
    [suggestions, previewSuggestionRank]
  )

  const previewAllocatedNodes = useMemo(
    () =>
      previewSuggestion !== null
        ? computePreviewAllocations(baseAllocatedNodes, previewSuggestion.nodeChange)
        : null,
    [previewSuggestion, baseAllocatedNodes]
  )

  const allocatedNodes = previewAllocatedNodes ?? baseAllocatedNodes

  const {
    hoveredNodeId,
    mousePosition,
    nodeError,
    keyboardFocusedNodeId,
    keyboardPosition,
    handleNodeClick,
    handleNodeRightClick,
    handleNodeHover,
    handleMouseMove,
    handleKeyboardNavigate,
  } = useSkillTree(allGameNodes)

  const treeData = useMemo(
    () =>
      classData && selectedMasteryId
        ? buildTreeData(classData, selectedMasteryId, allocatedNodes)
        : null,
    [classData, selectedMasteryId, allocatedNodes]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undoNodeChange()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoNodeChange])

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <p className="text-sm">Loading game data…</p>
      </div>
    )
  }

  const safeTabIndex = activeTabIndex >= 1 + activeSkills.length ? 0 : activeTabIndex
  const isPassiveTab = safeTabIndex === 0

  if (!selectedClassId || !selectedMasteryId || !gameData || !classData || !treeData) {
    return (
      <div id="skill-tree-canvas" className="flex flex-col h-full">
        <SkillTreeTabBar
          activeSkills={activeSkills}
          selectedIndex={safeTabIndex}
          onChange={setActiveTabIndex}
        />
        <div className="flex-1 min-h-0">
          {isPassiveTab ? (
            <EmptyTreeState />
          ) : (
            <SkillTreeStubPanel
              skillName={activeSkills[safeTabIndex - 1]?.skillName ?? ''}
            />
          )}
        </div>
      </div>
    )
  }

  const hoveredGameNode = hoveredNodeId ? allGameNodes[hoveredNodeId] : null
  const errorGameNode = nodeError ? allGameNodes[nodeError.nodeId] : null
  const keyboardGameNode =
    !hoveredNodeId && !nodeError && keyboardFocusedNodeId
      ? allGameNodes[keyboardFocusedNodeId]
      : null

  return (
    <div id="skill-tree-canvas" className="flex flex-col h-full">
      <SkillTreeTabBar
        activeSkills={activeSkills}
        selectedIndex={safeTabIndex}
        onChange={setActiveTabIndex}
      />

      <div className="flex-1 min-h-0 relative" onMouseMove={handleMouseMove} onMouseLeave={() => handleNodeHover(null)}>
        {isPassiveTab ? (
          <>
            <SkillTreeCanvas
              treeData={treeData}
              allocatedNodes={allocatedNodes}
              highlightedNodes={highlightedNodeIds ?? EMPTY_HIGHLIGHTED}
              onNodeClick={handleNodeClick}
              onNodeRightClick={handleNodeRightClick}
              onNodeHover={handleNodeHover}
              onKeyboardNavigate={handleKeyboardNavigate}
            />

            {hoveredGameNode && !nodeError && (
              <NodeTooltip
                gameNode={hoveredGameNode}
                allocatedPoints={allocatedNodes[hoveredNodeId!] ?? 0}
                position={mousePosition}
              />
            )}

            {nodeError && errorGameNode && (
              <NodeTooltip
                gameNode={errorGameNode}
                allocatedPoints={allocatedNodes[nodeError.nodeId] ?? 0}
                position={mousePosition}
                errorMessage={nodeError.message}
              />
            )}

            {keyboardGameNode && (
              <NodeTooltip
                gameNode={keyboardGameNode}
                allocatedPoints={allocatedNodes[keyboardFocusedNodeId!] ?? 0}
                position={keyboardPosition}
              />
            )}
          </>
        ) : (
          <SkillTreeStubPanel
            skillName={activeSkills[safeTabIndex - 1]?.skillName ?? ''}
          />
        )}
      </div>
    </div>
  )
}

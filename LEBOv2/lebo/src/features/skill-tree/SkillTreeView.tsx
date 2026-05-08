import { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import type { GameNode } from '../../shared/types/gameData'
import type { ActiveSkill } from '../../shared/types/build'
import type { NodeChange } from '../../shared/types/optimization'
import type { HighlightedNodes } from './types'
import { useGameDataStore } from '../../shared/stores/gameDataStore'
import { useBuildStore } from '../../shared/stores/buildStore'
import { useOptimizationStore } from '../../shared/stores/optimizationStore'
import { buildTreeData, buildSkillTreeData } from './treeDataTransformer'
import { SkillTreeCanvas } from './SkillTreeCanvas'
import { EmptyTreeState } from './EmptyTreeState'
import { NodeTooltip } from './NodeTooltip'
import { SkillTreeTabBar } from './SkillTreeTabBar'
import { useSkillTree } from './useSkillTree'
import { SkillPickerGrid } from '../skill-picker/SkillPickerGrid'
import { TreeControls } from './TreeControls'

const EMPTY_ALLOCATED: Record<string, number> = {}
const EMPTY_SKILL_ALLOC: Record<string, Record<string, number>> = {}
const EMPTY_SET = new Set<string>()
const EMPTY_HIGHLIGHTED: HighlightedNodes = {
  glowing: EMPTY_SET,
  dimmed: EMPTY_SET,
  previewRemoved: EMPTY_SET,
  previewAdded: EMPTY_SET,
  searchHighlighted: EMPTY_SET,
  searchDimmed: EMPTY_SET,
}
const EMPTY_SKILLS: ActiveSkill[] = []

type PickerState = {
  slotIndex: number
  anchorRect: DOMRect
  isPopover: boolean
}

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

export function SkillTreeView() {
  const gameData = useGameDataStore((s) => s.gameData)
  const isLoading = useGameDataStore((s) => s.isLoading)
  const selectedClassId = useBuildStore((s) => s.selectedClassId)
  const selectedMasteryId = useBuildStore((s) => s.selectedMasteryId)
  const activeBuild = useBuildStore((s) => s.activeBuild)
  const undoNodeChange = useBuildStore((s) => s.undoNodeChange)
  const assignSkillToSlot = useBuildStore((s) => s.assignSkillToSlot)
  const resetActiveTree = useBuildStore((s) => s.resetActiveTree)
  const activeSkills = useBuildStore(
    (s) => s.activeBuild?.contextData.skills ?? EMPTY_SKILLS
  )
  const skillNodeAllocations = useBuildStore(
    (s) => s.activeBuild?.skillNodeAllocations ?? EMPTY_SKILL_ALLOC
  )
  const activeBuildId = useBuildStore((s) => s.activeBuild?.id ?? null)
  const highlightedNodeIds = useOptimizationStore((s) => s.highlightedNodeIds)
  const previewSuggestionRank = useOptimizationStore((s) => s.previewSuggestionRank)
  const suggestions = useOptimizationStore((s) => s.suggestions)

  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const [pickerState, setPickerState] = useState<PickerState | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const emptySlotButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setActiveTabIndex(0)
    setPickerState(null)
  }, [activeBuildId])

  useEffect(() => {
    if (activeTabIndex > 5) {
      setActiveTabIndex(0)
    }
  }, [activeTabIndex])

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

  const nodeAllocations = previewAllocatedNodes ?? baseAllocatedNodes

  const highlightedNodes = useMemo<HighlightedNodes>(() => {
    // HighlightedNodeIds only has glowing/dimmed; spread EMPTY_HIGHLIGHTED first to fill all required fields
    const base: HighlightedNodes = { ...EMPTY_HIGHLIGHTED, ...(highlightedNodeIds ?? {}) }
    if (!previewSuggestion) {
      return { ...base, previewRemoved: EMPTY_SET, previewAdded: EMPTY_SET }
    }
    const previewRemoved = new Set<string>()
    const previewAdded = new Set<string>()
    if (previewSuggestion.nodeChange.fromNodeId) {
      previewRemoved.add(previewSuggestion.nodeChange.fromNodeId)
    }
    previewAdded.add(previewSuggestion.nodeChange.toNodeId)
    return { ...base, previewRemoved, previewAdded }
  }, [highlightedNodeIds, previewSuggestion])

  const treeData = useMemo(
    () =>
      classData && selectedMasteryId
        ? buildTreeData(classData, selectedMasteryId, nodeAllocations)
        : null,
    [classData, selectedMasteryId, nodeAllocations]
  )

  const safeTabIndex = activeTabIndex > 5 ? 0 : activeTabIndex
  const isPassiveTab = safeTabIndex === 0

  const slotId = isPassiveTab ? null : `slot-${safeTabIndex - 1}`
  const activeSkill = slotId ? activeSkills.find((s) => s.slotId === slotId) ?? null : null
  const skillNodes = activeSkill ? classData?.skillTrees[activeSkill.skillId] : undefined
  const slotAllocations = slotId ? (skillNodeAllocations[slotId] ?? EMPTY_ALLOCATED) : EMPTY_ALLOCATED

  // Moved before early returns so search memos (hooks) can reference it unconditionally
  const activeGameNodes = useMemo<Record<string, GameNode>>(
    () =>
      isPassiveTab
        ? allGameNodes
        : (activeSkill ? (classData?.skillTrees[activeSkill.skillId] ?? {}) : {}),
    [isPassiveTab, allGameNodes, activeSkill, classData]
  )

  const skillTreeData = useMemo(
    () => (skillNodes ? buildSkillTreeData(skillNodes, slotAllocations) : null),
    [skillNodes, slotAllocations]
  )

  const filteredSkills = useMemo(
    () =>
      classData?.skills.filter(
        (s) => s.masteryId === null || s.masteryId === selectedMasteryId
      ) ?? [],
    [classData, selectedMasteryId]
  )

  const activeTreeData = isPassiveTab ? treeData : skillTreeData

  const searchHighlighted = useMemo<Set<string>>(() => {
    if (!searchQuery || !activeTreeData) return EMPTY_SET
    const q = searchQuery.toLowerCase()
    return new Set(
      activeTreeData.nodes
        .filter((n) => (activeGameNodes[n.id]?.name ?? '').toLowerCase().includes(q))
        .map((n) => n.id)
    )
  }, [searchQuery, activeTreeData, activeGameNodes])

  const searchDimmed = useMemo<Set<string>>(() => {
    if (!searchQuery || !activeTreeData) return EMPTY_SET
    const q = searchQuery.toLowerCase()
    return new Set(
      activeTreeData.nodes
        .filter((n) => !(activeGameNodes[n.id]?.name ?? '').toLowerCase().includes(q))
        .map((n) => n.id)
    )
  }, [searchQuery, activeTreeData, activeGameNodes])

  const passiveHighlightedNodes = useMemo<HighlightedNodes>(
    () => ({ ...highlightedNodes, searchHighlighted, searchDimmed }),
    [highlightedNodes, searchHighlighted, searchDimmed]
  )

  const skillHighlightedNodes = useMemo<HighlightedNodes>(
    () => ({ ...EMPTY_HIGHLIGHTED, searchHighlighted, searchDimmed }),
    [searchHighlighted, searchDimmed]
  )

  const passiveInteraction = useSkillTree(treeData)
  const skillInteraction = useSkillTree(skillTreeData, slotId ?? undefined)

  const {
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
  } = isPassiveTab ? passiveInteraction : skillInteraction

  const handleTabChange = useCallback((index: number) => {
    setActiveTabIndex(index)
    setPickerState(null)
    setSearchQuery('')
  }, [])

  const handleReset = useCallback(() => {
    if (isPassiveTab) {
      resetActiveTree('passive')
    } else if (slotId) {
      resetActiveTree('skill', slotId)
    }
    setSearchQuery('')
  }, [isPassiveTab, slotId, resetActiveTree])

  const handleSkillTabClick = useCallback(
    (slotIndex: number, el: HTMLButtonElement) => {
      const sid = `slot-${slotIndex}`
      const hasSkill = activeSkills.some((s) => s.slotId === sid)
      setPickerState({ slotIndex, anchorRect: el.getBoundingClientRect(), isPopover: hasSkill })
      setActiveTabIndex(slotIndex + 1)
    },
    [activeSkills]
  )

  const handleSkillSelect = useCallback(
    (skillId: string) => {
      if (!pickerState || !classData) return
      const skillEntry = classData.skills.find((s) => s.skillId === skillId)
      if (!skillEntry) return
      const sid = `slot-${pickerState.slotIndex}`
      assignSkillToSlot(sid, skillEntry)
      setPickerState(null)
    },
    [pickerState, classData, assignSkillToSlot]
  )

  const openPickerForCurrentSlot = useCallback(() => {
    if (emptySlotButtonRef.current) {
      const sid = `slot-${safeTabIndex - 1}`
      const hasSkill = activeSkills.some((s) => s.slotId === sid)
      setPickerState({
        slotIndex: safeTabIndex - 1,
        anchorRect: emptySlotButtonRef.current.getBoundingClientRect(),
        isPopover: hasSkill,
      })
    }
  }, [safeTabIndex, activeSkills])

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

  // Passive tab: needs full tree to be ready
  if (isPassiveTab && (!selectedClassId || !selectedMasteryId || !gameData || !classData || !treeData)) {
    return (
      <div id="skill-tree-canvas" className="flex flex-col h-full">
        <SkillTreeTabBar
          activeSkills={activeSkills}
          selectedIndex={safeTabIndex}
          onChange={handleTabChange}
          onSkillTabClick={handleSkillTabClick}
        />
        <div className="flex-1 min-h-0">
          <EmptyTreeState />
        </div>
      </div>
    )
  }

  // Skill tab: can show even without full passive tree
  if (!isPassiveTab && (!selectedClassId || !selectedMasteryId || !gameData || !classData)) {
    return (
      <div id="skill-tree-canvas" className="flex flex-col h-full">
        <SkillTreeTabBar
          activeSkills={activeSkills}
          selectedIndex={safeTabIndex}
          onChange={handleTabChange}
          onSkillTabClick={handleSkillTabClick}
        />
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Select a class to continue</p>
        </div>
      </div>
    )
  }

  const activeAllocations = isPassiveTab ? nodeAllocations : slotAllocations

  const hoveredGameNode = hoveredNodeId ? activeGameNodes[hoveredNodeId] : null
  const errorGameNode = nodeError ? activeGameNodes[nodeError.nodeId] : null
  const keyboardGameNode =
    !hoveredNodeId && !nodeError && keyboardFocusedNodeId
      ? activeGameNodes[keyboardFocusedNodeId]
      : null

  function getPrerequisiteNames(gameNode: typeof hoveredGameNode): string[] {
    if (!gameNode || gameNode.prerequisiteNodeIds.length === 0) return []
    return gameNode.prerequisiteNodeIds.map((id) => activeGameNodes[id]?.name ?? id)
  }

  const isPickerFullPanel =
    !isPassiveTab &&
    pickerState !== null &&
    !pickerState.isPopover &&
    pickerState.slotIndex === safeTabIndex - 1

  const showControls = isPassiveTab
    ? treeData !== null
    : activeSkill !== null && skillTreeData !== null && !isPickerFullPanel

  return (
    <div id="skill-tree-canvas" className="flex flex-col h-full">
      <SkillTreeTabBar
        activeSkills={activeSkills}
        selectedIndex={safeTabIndex}
        onChange={setActiveTabIndex}
        onSkillTabClick={handleSkillTabClick}
      />

      {!isPassiveTab && activeSkill && (
        <div
          className="px-4 py-1.5 flex items-center gap-3 text-sm"
          style={{ borderBottom: '1px solid var(--color-bg-elevated)' }}
        >
          <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
            {activeSkill.skillName}
          </span>
          <span style={{ color: 'var(--color-text-muted)' }}>Level —</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {classData?.skills.find((s) => s.skillId === activeSkill.skillId)?.masteryGatePoints != null
              ? `Requires ${classData.skills.find((s) => s.skillId === activeSkill.skillId)!.masteryGatePoints} mastery points`
              : classData?.className
                ? `Available for ${classData.className}`
                : ''}
          </span>
        </div>
      )}

      {showControls && (
        <TreeControls
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onReset={handleReset}
        />
      )}

      <div className="flex-1 min-h-0 relative" onMouseMove={handleMouseMove} onMouseLeave={() => handleNodeHover(null)}>
        {isPassiveTab ? (
          <>
            <SkillTreeCanvas
              treeData={treeData!}
              nodeAllocations={nodeAllocations}
              highlightedNodes={passiveHighlightedNodes}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
              onKeyboardNavigate={handleKeyboardNavigate}
              flashNodeIds={flashNodeIds ?? undefined}
            />

            {hoveredGameNode && !nodeError && (
              <NodeTooltip
                gameNode={hoveredGameNode}
                allocatedPoints={nodeAllocations[hoveredNodeId!] ?? 0}
                position={mousePosition}
                prerequisiteNames={getPrerequisiteNames(hoveredGameNode)}
              />
            )}

            {nodeError && errorGameNode && (
              <NodeTooltip
                gameNode={errorGameNode}
                allocatedPoints={nodeAllocations[nodeError.nodeId] ?? 0}
                position={mousePosition}
                errorMessage={nodeError.message}
                prerequisiteNames={getPrerequisiteNames(errorGameNode)}
              />
            )}

            {keyboardGameNode && (
              <NodeTooltip
                gameNode={keyboardGameNode}
                allocatedPoints={nodeAllocations[keyboardFocusedNodeId!] ?? 0}
                position={keyboardPosition}
                prerequisiteNames={getPrerequisiteNames(keyboardGameNode)}
              />
            )}
          </>
        ) : isPickerFullPanel ? (
          <SkillPickerGrid
            baseClassName={classData?.className ?? ''}
            skills={filteredSkills}
            selectedSkillId={activeSkills.find((s) => s.slotId === `slot-${pickerState!.slotIndex}`)?.skillId ?? null}
            onSelect={handleSkillSelect}
            onClose={() => setPickerState(null)}
          />
        ) : activeSkill && skillTreeData ? (
          <>
            <SkillTreeCanvas
              treeData={skillTreeData}
              nodeAllocations={slotAllocations}
              highlightedNodes={skillHighlightedNodes}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
              onKeyboardNavigate={handleKeyboardNavigate}
              flashNodeIds={flashNodeIds ?? undefined}
            />

            {hoveredGameNode && !nodeError && (
              <NodeTooltip
                gameNode={hoveredGameNode}
                allocatedPoints={activeAllocations[hoveredNodeId!] ?? 0}
                position={mousePosition}
                prerequisiteNames={getPrerequisiteNames(hoveredGameNode)}
              />
            )}

            {nodeError && errorGameNode && (
              <NodeTooltip
                gameNode={errorGameNode}
                allocatedPoints={activeAllocations[nodeError.nodeId] ?? 0}
                position={mousePosition}
                errorMessage={nodeError.message}
                prerequisiteNames={getPrerequisiteNames(errorGameNode)}
              />
            )}

            {keyboardGameNode && (
              <NodeTooltip
                gameNode={keyboardGameNode}
                allocatedPoints={activeAllocations[keyboardFocusedNodeId!] ?? 0}
                position={keyboardPosition}
                prerequisiteNames={getPrerequisiteNames(keyboardGameNode)}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p style={{ color: 'var(--color-text-muted)' }}>No skill selected</p>
            <button
              ref={emptySlotButtonRef}
              style={{ color: 'var(--color-accent-gold)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={openPickerForCurrentSlot}
            >
              Select a skill
            </button>
          </div>
        )}
      </div>

      {pickerState?.isPopover && (
        <>
          <div
            aria-hidden="true"
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            onClick={() => setPickerState(null)}
          />
          <div
            style={{
              position: 'fixed',
              top: pickerState.anchorRect.bottom + 4,
              left: pickerState.anchorRect.left,
              zIndex: 50,
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-bg-elevated)',
              borderRadius: 4,
              maxHeight: '60vh',
              overflowY: 'auto',
            }}
          >
            <SkillPickerGrid
              baseClassName={classData?.className ?? ''}
              skills={filteredSkills}
              selectedSkillId={activeSkills.find((s) => s.slotId === `slot-${pickerState.slotIndex}`)?.skillId ?? null}
              onSelect={handleSkillSelect}
              onClose={() => setPickerState(null)}
            />
          </div>
        </>
      )}
    </div>
  )
}

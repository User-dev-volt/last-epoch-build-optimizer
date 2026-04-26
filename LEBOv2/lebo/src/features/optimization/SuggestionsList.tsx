import { useState } from 'react'
import { useOptimizationStore } from '../../shared/stores/optimizationStore'
import { useBuildStore } from '../../shared/stores/buildStore'
import { useGameDataStore } from '../../shared/stores/gameDataStore'
import { useAppStore } from '../../shared/stores/appStore'
import type { GameData, GameNode } from '../../shared/types/gameData'
import type { SuggestionResult } from '../../shared/types/optimization'
import { SuggestionCard } from './SuggestionCard'

function getNodeName(
  nodeId: string,
  gameData: GameData | null,
  classId: string,
  masteryId: string
): string {
  if (!gameData) return nodeId
  const classData = gameData.classes[classId]
  if (!classData) return nodeId
  return (
    classData.masteries[masteryId]?.nodes[nodeId]?.name ??
    classData.baseTree[nodeId]?.name ??
    nodeId
  )
}

function getAllGameNodes(
  gameData: GameData | null,
  classId: string,
  masteryId: string
): Record<string, GameNode> {
  if (!gameData) return {}
  const classData = gameData.classes[classId]
  if (!classData) return {}
  return {
    ...classData.baseTree,
    ...(classData.masteries[masteryId]?.nodes ?? {}),
  }
}

const GOAL_LABELS: Record<string, string> = {
  maximize_damage: 'Maximize Damage',
  maximize_survivability: 'Maximize Survivability',
  maximize_speed: 'Maximize Speed',
  balanced: 'Balanced',
}

function mapApplyError(err: string | undefined): string {
  if (!err) return 'Cannot apply: unknown error'
  if (err.includes('Prerequisite') || err.includes('prerequisite')) {
    return 'Cannot apply: prerequisite node not allocated'
  }
  if (err.includes('depend')) {
    return `Cannot apply: ${err}`
  }
  return `Cannot apply: ${err}`
}

export function SuggestionsList() {
  const suggestions = useOptimizationStore((s) => s.suggestions)
  const skippedSuggestions = useOptimizationStore((s) => s.skippedSuggestions)
  const appliedRanks = useOptimizationStore((s) => s.appliedRanks)
  const previewSuggestionRank = useOptimizationStore((s) => s.previewSuggestionRank)
  const isOptimizing = useOptimizationStore((s) => s.isOptimizing)
  const hasOptimizationCompleted = useOptimizationStore((s) => s.hasOptimizationCompleted)
  const goal = useOptimizationStore((s) => s.goal)
  const streamError = useOptimizationStore((s) => s.streamError)
  const setStreamError = useOptimizationStore((s) => s.setStreamError)
  const skipSuggestion = useOptimizationStore((s) => s.skipSuggestion)
  const setAppliedRank = useOptimizationStore((s) => s.setAppliedRank)
  const setPreviewSuggestionRank = useOptimizationStore((s) => s.setPreviewSuggestionRank)
  const setHighlightedNodeIds = useOptimizationStore((s) => s.setHighlightedNodeIds)

  const activeBuild = useBuildStore((s) => s.activeBuild)
  const applyNodeChange = useBuildStore((s) => s.applyNodeChange)
  const gameData = useGameDataStore((s) => s.gameData)

  const [applyErrors, setApplyErrors] = useState<Record<number, string>>({})

  const classId = activeBuild?.classId ?? ''
  const masteryId = activeBuild?.masteryId ?? ''

  const count = suggestions.length
  const countLabel = count === 1 ? '1 suggestion found' : `${count} suggestions found`

  function handleHoverEnter(suggestion: SuggestionResult) {
    setHighlightedNodeIds({
      glowing: new Set([suggestion.nodeChange.toNodeId]),
      dimmed: suggestion.nodeChange.fromNodeId
        ? new Set([suggestion.nodeChange.fromNodeId])
        : new Set(),
    })
  }

  function handleHoverLeave() {
    setHighlightedNodeIds(null)
  }

  function handlePreview(rank: number) {
    setPreviewSuggestionRank(rank === previewSuggestionRank ? null : rank)
  }

  function handleApply(suggestion: SuggestionResult) {
    const currentBuild = useBuildStore.getState().activeBuild
    if (!currentBuild) return

    const allGameNodes = getAllGameNodes(gameData, currentBuild.classId, currentBuild.masteryId)
    const { nodeChange } = suggestion
    const { rank } = suggestion

    let fromRemovedPoints: number | null = null

    if (nodeChange.fromNodeId) {
      const currentFromPoints = currentBuild.nodeAllocations[nodeChange.fromNodeId] ?? 0
      if (currentFromPoints > 0) {
        const fromGameNode = allGameNodes[nodeChange.fromNodeId]
        if (!fromGameNode) {
          setApplyErrors((prev) => ({ ...prev, [rank]: 'Cannot apply: source node not found in game data' }))
          return
        }
        const removeResult = applyNodeChange(nodeChange.fromNodeId, -currentFromPoints, fromGameNode, allGameNodes)
        if (!removeResult.success) {
          setApplyErrors((prev) => ({ ...prev, [rank]: mapApplyError(removeResult.error) }))
          return
        }
        fromRemovedPoints = currentFromPoints
      }
    }

    const toGameNode = allGameNodes[nodeChange.toNodeId]
    if (!toGameNode) {
      if (nodeChange.fromNodeId && fromRemovedPoints !== null) {
        const fromGameNode = allGameNodes[nodeChange.fromNodeId]
        if (fromGameNode) applyNodeChange(nodeChange.fromNodeId, fromRemovedPoints, fromGameNode, allGameNodes)
      }
      setApplyErrors((prev) => ({ ...prev, [rank]: 'Cannot apply: target node not found in game data' }))
      return
    }

    const result = applyNodeChange(nodeChange.toNodeId, nodeChange.pointsChange, toGameNode, allGameNodes)
    if (!result.success) {
      if (nodeChange.fromNodeId && fromRemovedPoints !== null) {
        const fromGameNode = allGameNodes[nodeChange.fromNodeId]
        if (fromGameNode) applyNodeChange(nodeChange.fromNodeId, fromRemovedPoints, fromGameNode, allGameNodes)
      }
      setApplyErrors((prev) => ({ ...prev, [rank]: mapApplyError(result.error) }))
      return
    }

    setAppliedRank(rank)
    if (previewSuggestionRank === rank) {
      setPreviewSuggestionRank(null)
    }
    setApplyErrors((prev) => {
      const next = { ...prev }
      delete next[rank]
      return next
    })
  }

  function applyPreview() {
    const previewSuggestion = suggestions.find((s) => s.rank === previewSuggestionRank)
    if (previewSuggestion) {
      handleApply(previewSuggestion)
    }
  }

  function renderCard(suggestion: SuggestionResult, allowInteraction: boolean) {
    return (
      <SuggestionCard
        key={`${suggestion.rank}-${suggestion.nodeChange.toNodeId}`}
        suggestion={suggestion}
        toNodeName={getNodeName(suggestion.nodeChange.toNodeId, gameData, classId, masteryId)}
        fromNodeName={
          suggestion.nodeChange.fromNodeId
            ? getNodeName(suggestion.nodeChange.fromNodeId, gameData, classId, masteryId)
            : undefined
        }
        isApplied={appliedRanks.includes(suggestion.rank)}
        applyError={applyErrors[suggestion.rank] ?? null}
        isPreviewActive={previewSuggestionRank === suggestion.rank}
        onApply={() => handleApply(suggestion)}
        onSkip={() => { if (allowInteraction) skipSuggestion(suggestion.rank) }}
        onPreview={() => { if (allowInteraction) handlePreview(suggestion.rank) }}
        onHoverEnter={() => handleHoverEnter(suggestion)}
        onHoverLeave={handleHoverLeave}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2" data-testid="suggestions-list">
      {previewSuggestionRank !== null && (
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 rounded text-xs"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            borderLeft: '2px solid var(--color-accent-gold)',
          }}
          data-testid="preview-banner"
        >
          <span style={{ color: 'var(--color-text-primary)' }}>
            Previewing suggestion #{previewSuggestionRank}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={applyPreview}
              data-testid="preview-apply-btn"
              className="text-xs px-2 py-0.5 rounded"
              style={{
                color: 'var(--color-data-positive)',
                border: '1px solid var(--color-data-positive)',
              }}
            >
              Apply
            </button>
            <button
              onClick={() => setPreviewSuggestionRank(null)}
              data-testid="preview-cancel-btn"
              className="text-xs px-2 py-0.5 rounded"
              style={{
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-bg-hover)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {streamError && (
        <div
          className="flex items-start gap-2 px-3 py-2 rounded text-xs"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            color: 'var(--color-data-negative)',
            borderLeft: '2px solid var(--color-data-negative)',
          }}
          data-testid="stream-error-banner"
        >
          <span className="flex-1">{streamError.message}</span>
          {streamError.type === 'AUTH_ERROR' && (
            <button
              onClick={() => useAppStore.getState().setCurrentView('settings')}
              data-testid="auth-error-settings-link"
              className="text-xs shrink-0 underline"
              style={{ color: 'var(--color-accent-gold)' }}
            >
              Go to Settings
            </button>
          )}
          <button
            onClick={() => setStreamError(null)}
            aria-label="Dismiss error"
            className="shrink-0 leading-none"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ×
          </button>
        </div>
      )}

      {isOptimizing && suggestions.length === 0 && !streamError && (
        <div className="flex flex-col gap-2" data-testid="suggestion-skeletons">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded px-3 py-2 animate-pulse"
              style={{ backgroundColor: 'var(--color-bg-elevated)', height: '64px' }}
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <p
          className="text-xs font-semibold"
          style={{ color: 'var(--color-text-muted)' }}
          data-testid="suggestions-count"
        >
          {countLabel}
        </p>
      )}

      {suggestions.map((suggestion) => renderCard(suggestion, true))}

      {suggestions.length === 0 && !isOptimizing && !streamError && (
        hasOptimizationCompleted ? (
          <p
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
            data-testid="suggestions-well-optimized"
          >
            {`Your build is well-optimized for ${GOAL_LABELS[goal] ?? goal}. Try a different goal or keep building!`}
          </p>
        ) : (
          <p
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
            data-testid="suggestions-empty-state"
          >
            Select an optimization goal and click Optimize to get AI-powered suggestions.
          </p>
        )
      )}

      {skippedSuggestions.length > 0 && (
        <details data-testid="skipped-section">
          <summary
            className="text-xs cursor-pointer"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Skipped ({skippedSuggestions.length})
          </summary>
          <div className="flex flex-col gap-2 mt-2">
            {skippedSuggestions.map((suggestion) => renderCard(suggestion, false))}
          </div>
        </details>
      )}
    </div>
  )
}

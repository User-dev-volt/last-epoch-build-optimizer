import { useState, useEffect } from 'react'
import { useAppStore } from '../../shared/stores/appStore'
import { useBuildStore } from '../../shared/stores/buildStore'
import { useOptimizationStore } from '../../shared/stores/optimizationStore'
import { useOptimizationStream } from '../../shared/stores/useOptimizationStream'
import { PanelCollapseToggle } from './PanelCollapseToggle'
import { ScoreGauge } from '../optimization/ScoreGauge'
import { GoalSelector } from '../optimization/GoalSelector'
import { OptimizeButton } from '../optimization/OptimizeButton'
import { SuggestionsList } from '../optimization/SuggestionsList'

export function RightPanel() {
  const isCollapsed = useAppStore((s) => s.activePanel.right === 'collapsed')
  const setPanelState = useAppStore((s) => s.setPanelState)
  const activeBuild = useBuildStore((s) => s.activeBuild)
  const scores = useOptimizationStore((s) => s.scores)
  const isOptimizing = useOptimizationStore((s) => s.isOptimizing)
  const previewSuggestionRank = useOptimizationStore((s) => s.previewSuggestionRank)
  const suggestions = useOptimizationStore((s) => s.suggestions)
  const { startOptimization } = useOptimizationStream()

  const previewScore =
    previewSuggestionRank !== null
      ? (suggestions.find((s) => s.rank === previewSuggestionRank)?.previewScore ?? null)
      : null

  const [isBannerDismissed, setIsBannerDismissed] = useState(false)

  // Reset banner when build changes so each new build shows the warning if needed
  useEffect(() => {
    setIsBannerDismissed(false)
  }, [activeBuild?.id])

  const isEmptyContext =
    !!activeBuild &&
    activeBuild.contextData.gear.length === 0 &&
    activeBuild.contextData.skills.length === 0 &&
    activeBuild.contextData.idols.length === 0

  const showContextNote = isEmptyContext && !isBannerDismissed

  return (
    <aside
      className="relative shrink-0 flex flex-col border-l overflow-hidden transition-[width] duration-200"
      style={{
        width: isCollapsed ? '48px' : '320px',
        backgroundColor: 'var(--color-bg-surface)',
        borderColor: 'var(--color-bg-elevated)',
      }}
      aria-label="Right panel"
    >
      <PanelCollapseToggle
        side="right"
        isCollapsed={isCollapsed}
        onToggle={() => setPanelState('right', isCollapsed ? 'expanded' : 'collapsed')}
      />

      {isCollapsed ? (
        <div className="flex flex-col items-center pt-3 gap-3 px-2">
          <span
            className="text-xs"
            title="Optimization"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ✦
          </span>
        </div>
      ) : (
        <div className="p-4 overflow-y-auto flex flex-col gap-4">
          {activeBuild ? (
            <>
              <ScoreGauge baselineScore={scores} previewScore={previewScore} />
              <GoalSelector />
            </>
          ) : (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Select a build to see scores
            </p>
          )}

          <OptimizeButton
            onOptimize={startOptimization}
            disabled={!activeBuild}
            isOptimizing={isOptimizing}
          />

          {showContextNote && (
            <div
              className="flex items-start gap-2 px-3 py-2 rounded text-xs"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                color: 'var(--color-text-muted)',
              }}
              data-testid="context-note"
            >
              <span className="flex-1">
                Add gear, skills, and idols in the context panel for more relevant suggestions.
              </span>
              <button
                onClick={() => setIsBannerDismissed(true)}
                aria-label="Dismiss"
                className="shrink-0 leading-none"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ×
              </button>
            </div>
          )}

          <SuggestionsList />
        </div>
      )}
    </aside>
  )
}

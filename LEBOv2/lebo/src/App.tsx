import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { initGameData } from './features/game-data/gameDataLoader'
import { loadBuildsOnStartup, saveBuild } from './features/build-manager/buildPersistence'
import { useAutoSave } from './features/build-manager/useAutoSave'
import { useConnectivity } from './shared/hooks/useConnectivity'
import { useUpdateCheck } from './shared/hooks/useUpdateCheck'
import { useBuildStore } from './shared/stores/buildStore'
import { useGameDataStore } from './shared/stores/gameDataStore'
import { useOptimizationStore } from './shared/stores/optimizationStore'
import { calculateScore } from './features/optimization/scoringEngine'
import { useAppStore } from './shared/stores/appStore'
import { AppHeader } from './features/layout/AppHeader'
import { StatusBar } from './features/layout/StatusBar'
import { LeftPanel } from './features/layout/LeftPanel'
import { RightPanel } from './features/layout/RightPanel'
import { CenterCanvas } from './features/layout/CenterCanvas'
import { Settings } from './features/settings/Settings'
import { ErrorBoundary } from './shared/components/ErrorBoundary'

const TOASTER_OPTS = {
  style: {
    background: 'var(--color-bg-elevated)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-bg-hover)',
    fontSize: '0.875rem',
  },
}

export function App() {
  useAutoSave()
  useConnectivity()
  useUpdateCheck()
  const currentView = useAppStore((s) => s.currentView)

  useEffect(() => {
    initGameData().catch(console.error)
    loadBuildsOnStartup().catch(console.error)
  }, [])

  useEffect(() => {
    return useBuildStore.subscribe((state, prev) => {
      if (state.activeBuild?.nodeAllocations === prev.activeBuild?.nodeAllocations) return
      if (!state.activeBuild) {
        useOptimizationStore.getState().setScores(null)
        return
      }
      const gameData = useGameDataStore.getState().gameData
      if (!gameData) {
        useOptimizationStore.getState().setScores(null)
        return
      }
      const scores = calculateScore(state.activeBuild, gameData)
      useOptimizationStore.getState().setScores(scores)
    })
  }, [])

  // Recalculate scores when game data loads after an active build is already present.
  // Without this, a saved build loaded before initGameData() resolves would show null scores
  // until the user manually modifies a node allocation.
  useEffect(() => {
    return useGameDataStore.subscribe((state, prev) => {
      if (!state.gameData || state.gameData === prev.gameData) return
      const { activeBuild } = useBuildStore.getState()
      if (!activeBuild) return
      const scores = calculateScore(activeBuild, state.gameData)
      useOptimizationStore.getState().setScores(scores)
    })
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        const { activeBuild } = useBuildStore.getState()
        if (activeBuild) {
          saveBuild(activeBuild).catch(console.error)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (currentView === 'settings') {
    return (
      <>
        <ErrorBoundary>
          <Settings />
        </ErrorBoundary>
        <Toaster position="bottom-center" toastOptions={TOASTER_OPTS} />
      </>
    )
  }

  return (
    <>
      <ErrorBoundary>
        <div
          className="flex flex-col overflow-hidden"
          style={{ height: '100dvh', minWidth: '1280px', minHeight: '720px' }}
        >
          {/* Skip links — UX-DR15 accessibility */}
          <a
            href="#skill-tree-canvas"
            className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:px-3 focus:py-2 focus:text-sm"
            style={{ backgroundColor: 'var(--color-accent-gold)', color: 'var(--color-bg-base)' }}
          >
            Skip to tree
          </a>
          <a
            href="#suggestion-panel"
            className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-16 focus:z-50 focus:px-3 focus:py-2 focus:text-sm"
            style={{ backgroundColor: 'var(--color-accent-gold)', color: 'var(--color-bg-base)' }}
          >
            Skip to suggestions
          </a>

          {/* ARIA live regions — UX-DR15 */}
          <div aria-live="polite" aria-atomic="true" className="sr-only" id="import-progress-region" />
          <div aria-live="polite" aria-atomic="true" className="sr-only" id="ai-status-region" />
          <div aria-live="assertive" aria-atomic="true" className="sr-only" id="critical-error-region" />

          <AppHeader />

          <div className="flex flex-1 overflow-hidden">
            <LeftPanel />
            <CenterCanvas />
            <RightPanel />
          </div>

          <StatusBar />
        </div>
      </ErrorBoundary>
      <Toaster position="bottom-center" toastOptions={TOASTER_OPTS} />
    </>
  )
}

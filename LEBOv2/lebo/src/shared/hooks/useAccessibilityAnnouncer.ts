import { useEffect } from 'react'
import { useOptimizationStore } from '../stores/optimizationStore'

function setRegion(id: string, text: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.textContent = ''
  requestAnimationFrame(() => {
    el.textContent = text
  })
}

export function useAccessibilityAnnouncer() {
  useEffect(() => {
    return useOptimizationStore.subscribe((state, prev) => {
      if (state.isOptimizing && !prev.isOptimizing) {
        setRegion('ai-status-region', 'Analyzing your build...')
      }
      if (state.hasOptimizationCompleted && !prev.hasOptimizationCompleted) {
        setRegion(
          'ai-status-region',
          `Optimization complete. ${state.suggestions.length} suggestions available`
        )
      }
      if (state.streamError && state.streamError !== prev.streamError) {
        const msg = state.streamError.message ?? 'An error occurred. Please try again.'
        setRegion('critical-error-region', msg)
      }
      if (!state.isOptimizing && prev.isOptimizing && !state.hasOptimizationCompleted) {
        setRegion('ai-status-region', '')
      }
    })
  }, [])
}

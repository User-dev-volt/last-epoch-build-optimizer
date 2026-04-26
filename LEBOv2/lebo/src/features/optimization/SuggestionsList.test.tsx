import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useOptimizationStore } from '../../shared/stores/optimizationStore'
import { useBuildStore } from '../../shared/stores/buildStore'
import { useGameDataStore } from '../../shared/stores/gameDataStore'

// Mock Tauri event to prevent side-effects
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(vi.fn())),
}))

import { SuggestionsList } from './SuggestionsList'
import type { SuggestionResult } from '../../shared/types/optimization'

const BASE_SCORE = { damage: 10, survivability: 10, speed: 10 }

function makeSuggestion(rank: number, toNodeId = `node-${rank}`): SuggestionResult {
  return {
    rank,
    nodeChange: { fromNodeId: null, toNodeId, pointsChange: 1 },
    explanation: 'Test',
    deltaDamage: rank,
    deltaSurvivability: 0,
    deltaSpeed: null,
    baselineScore: BASE_SCORE,
    previewScore: BASE_SCORE,
  }
}

const MOCK_BUILD = {
  id: 'build-1',
  name: 'Test Build',
  classId: 'sentinel',
  masteryId: 'void_knight',
  nodeAllocations: {},
  contextData: { gear: [], skills: [], idols: [] },
  isPersisted: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  schemaVersion: 1 as const,
}

describe('SuggestionsList', () => {
  const initialOptState = useOptimizationStore.getState()
  const initialBuildState = useBuildStore.getState()
  const initialGameDataState = useGameDataStore.getState()

  beforeEach(() => {
    useOptimizationStore.setState(initialOptState, true)
    useBuildStore.setState(initialBuildState, true)
    useGameDataStore.setState(initialGameDataState, true)
  })

  it('renders root with data-testid', () => {
    render(<SuggestionsList />)
    expect(screen.getByTestId('suggestions-list')).toBeInTheDocument()
  })

  it('shows empty state when no suggestions and not optimizing', () => {
    useOptimizationStore.setState({ suggestions: [], isOptimizing: false, streamError: null })
    render(<SuggestionsList />)
    expect(screen.getByTestId('suggestions-empty-state')).toBeInTheDocument()
    expect(screen.getByText(/Select an optimization goal/)).toBeInTheDocument()
  })

  it('does not show empty state when optimizing', () => {
    useOptimizationStore.setState({ suggestions: [], isOptimizing: true, streamError: null })
    render(<SuggestionsList />)
    expect(screen.queryByTestId('suggestions-empty-state')).toBeNull()
  })

  it('does not show empty state when streamError is present', () => {
    useOptimizationStore.setState({
      suggestions: [],
      isOptimizing: false,
      streamError: { message: 'Something broke', type: 'UNKNOWN' },
    })
    render(<SuggestionsList />)
    expect(screen.queryByTestId('suggestions-empty-state')).toBeNull()
  })

  it('shows skeleton when isOptimizing and no suggestions yet', () => {
    useOptimizationStore.setState({ suggestions: [], isOptimizing: true, streamError: null })
    render(<SuggestionsList />)
    expect(screen.getByTestId('suggestion-skeletons')).toBeInTheDocument()
  })

  it('hides skeleton once suggestions arrive', () => {
    useOptimizationStore.setState({
      suggestions: [makeSuggestion(1)],
      isOptimizing: true,
      streamError: null,
    })
    render(<SuggestionsList />)
    expect(screen.queryByTestId('suggestion-skeletons')).toBeNull()
  })

  it('shows count header when suggestions exist', () => {
    useOptimizationStore.setState({
      suggestions: [makeSuggestion(1), makeSuggestion(2), makeSuggestion(3)],
      isOptimizing: false,
      streamError: null,
    })
    render(<SuggestionsList />)
    expect(screen.getByTestId('suggestions-count')).toHaveTextContent('3 suggestions found')
  })

  it('uses singular "suggestion" when count is 1', () => {
    useOptimizationStore.setState({
      suggestions: [makeSuggestion(1)],
      isOptimizing: false,
      streamError: null,
    })
    render(<SuggestionsList />)
    expect(screen.getByTestId('suggestions-count')).toHaveTextContent('1 suggestion found')
  })

  it('does not show count header during skeleton phase', () => {
    useOptimizationStore.setState({ suggestions: [], isOptimizing: true, streamError: null })
    render(<SuggestionsList />)
    expect(screen.queryByTestId('suggestions-count')).toBeNull()
  })

  it('renders a SuggestionCard per suggestion', () => {
    useOptimizationStore.setState({
      suggestions: [makeSuggestion(1), makeSuggestion(2)],
      isOptimizing: false,
      streamError: null,
    })
    render(<SuggestionsList />)
    expect(screen.getByTestId('suggestion-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('suggestion-card-2')).toBeInTheDocument()
  })

  it('shows error banner when streamError is set', () => {
    useOptimizationStore.setState({
      suggestions: [],
      isOptimizing: false,
      streamError: { message: 'Could not reach AI engine.', type: 'NETWORK_ERROR' },
    })
    render(<SuggestionsList />)
    expect(screen.getByTestId('stream-error-banner')).toBeInTheDocument()
    expect(screen.getByText('Could not reach AI engine.')).toBeInTheDocument()
  })

  it('dismisses error banner when × button is clicked', () => {
    useOptimizationStore.setState({
      suggestions: [],
      isOptimizing: false,
      streamError: { message: 'Oops', type: 'UNKNOWN' },
    })
    render(<SuggestionsList />)
    expect(screen.getByTestId('stream-error-banner')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }))
    expect(useOptimizationStore.getState().streamError).toBeNull()
  })

  it('uses node name from gameData when available', () => {
    useBuildStore.setState({ activeBuild: MOCK_BUILD })
    useGameDataStore.setState({
      gameData: {
        manifest: {
          schemaVersion: 1,
          gameVersion: '1.0',
          dataVersion: '1.0',
          generatedAt: '2026-01-01',
          classes: ['sentinel'],
        },
        classes: {
          sentinel: {
            classId: 'sentinel',
            className: 'Sentinel',
            baseTree: {},
            masteries: {
              void_knight: {
                masteryId: 'void_knight',
                masteryName: 'Void Knight',
                nodes: {
                  'node-1': {
                    id: 'node-1',
                    name: 'Void Cleave',
                    pointCost: 1,
                    maxPoints: 5,
                    prerequisiteNodeIds: [],
                    effectDescription: '',
                    tags: [],
                    position: { x: 0, y: 0 },
                    size: 'small',
                  },
                },
              },
            },
          },
        },
      },
    })
    useOptimizationStore.setState({
      suggestions: [
        {
          rank: 1,
          nodeChange: { fromNodeId: null, toNodeId: 'node-1', pointsChange: 1 },
          explanation: '',
          deltaDamage: 1,
          deltaSurvivability: 0,
          deltaSpeed: null,
          baselineScore: BASE_SCORE,
          previewScore: BASE_SCORE,
        },
      ],
      isOptimizing: false,
      streamError: null,
    })
    render(<SuggestionsList />)
    expect(screen.getByTestId('suggestion-node-name')).toHaveTextContent('Void Cleave')
  })

  it('falls back to nodeId when gameData not available', () => {
    useGameDataStore.setState({ gameData: null })
    useOptimizationStore.setState({
      suggestions: [makeSuggestion(1, 'unknown-node-xyz')],
      isOptimizing: false,
      streamError: null,
    })
    render(<SuggestionsList />)
    expect(screen.getByTestId('suggestion-node-name')).toHaveTextContent('unknown-node-xyz')
  })

  // Story 3.5: interaction tests

  it('shows preview banner when previewSuggestionRank is set', () => {
    useOptimizationStore.setState({
      suggestions: [makeSuggestion(1)],
      isOptimizing: false,
      streamError: null,
      previewSuggestionRank: 1,
    })
    render(<SuggestionsList />)
    expect(screen.getByTestId('preview-banner')).toBeInTheDocument()
    expect(screen.getByTestId('preview-banner')).toHaveTextContent('Previewing suggestion #1')
  })

  it('hides preview banner when previewSuggestionRank is null', () => {
    useOptimizationStore.setState({
      suggestions: [makeSuggestion(1)],
      isOptimizing: false,
      streamError: null,
      previewSuggestionRank: null,
    })
    render(<SuggestionsList />)
    expect(screen.queryByTestId('preview-banner')).toBeNull()
  })

  it('preview cancel button clears previewSuggestionRank', () => {
    useOptimizationStore.setState({
      suggestions: [makeSuggestion(1)],
      isOptimizing: false,
      streamError: null,
      previewSuggestionRank: 1,
    })
    render(<SuggestionsList />)
    fireEvent.click(screen.getByTestId('preview-cancel-btn'))
    expect(useOptimizationStore.getState().previewSuggestionRank).toBeNull()
  })

  it('skip moves suggestion to skipped section', () => {
    useOptimizationStore.setState({
      suggestions: [makeSuggestion(1)],
      isOptimizing: false,
      streamError: null,
      skippedSuggestions: [],
    })
    render(<SuggestionsList />)
    fireEvent.click(screen.getByTestId('suggestion-skip-btn'))
    expect(useOptimizationStore.getState().skippedSuggestions).toHaveLength(1)
    expect(useOptimizationStore.getState().suggestions).toHaveLength(0)
  })

  it('skipped section hidden when no skipped suggestions', () => {
    useOptimizationStore.setState({
      suggestions: [makeSuggestion(1)],
      isOptimizing: false,
      streamError: null,
      skippedSuggestions: [],
    })
    render(<SuggestionsList />)
    expect(screen.queryByTestId('skipped-section')).toBeNull()
  })

  it('skipped section visible when skipped suggestions exist', () => {
    useOptimizationStore.setState({
      suggestions: [],
      isOptimizing: false,
      streamError: null,
      skippedSuggestions: [makeSuggestion(1)],
    })
    render(<SuggestionsList />)
    expect(screen.getByTestId('skipped-section')).toBeInTheDocument()
  })

  it('preview button toggles previewSuggestionRank for the card', () => {
    useOptimizationStore.setState({
      suggestions: [makeSuggestion(1)],
      isOptimizing: false,
      streamError: null,
      previewSuggestionRank: null,
    })
    render(<SuggestionsList />)
    fireEvent.click(screen.getByTestId('suggestion-preview-btn'))
    expect(useOptimizationStore.getState().previewSuggestionRank).toBe(1)
  })

  it('hover enter sets highlightedNodeIds with glowing toNodeId', () => {
    useOptimizationStore.setState({
      suggestions: [makeSuggestion(1, 'target-node')],
      isOptimizing: false,
      streamError: null,
    })
    render(<SuggestionsList />)
    fireEvent.mouseEnter(screen.getByTestId('suggestion-card-1'))
    const highlighted = useOptimizationStore.getState().highlightedNodeIds
    expect(highlighted?.glowing.has('target-node')).toBe(true)
  })

  it('hover leave clears highlightedNodeIds', () => {
    useOptimizationStore.setState({
      suggestions: [makeSuggestion(1, 'target-node')],
      isOptimizing: false,
      streamError: null,
    })
    render(<SuggestionsList />)
    fireEvent.mouseEnter(screen.getByTestId('suggestion-card-1'))
    fireEvent.mouseLeave(screen.getByTestId('suggestion-card-1'))
    expect(useOptimizationStore.getState().highlightedNodeIds).toBeNull()
  })

  // Story 3.6: differentiated empty states

  it('shows initial empty state when hasOptimizationCompleted is false', () => {
    useOptimizationStore.setState({
      suggestions: [],
      isOptimizing: false,
      streamError: null,
      hasOptimizationCompleted: false,
    })
    render(<SuggestionsList />)
    expect(screen.getByTestId('suggestions-empty-state')).toBeInTheDocument()
    expect(screen.getByText(/Select an optimization goal/)).toBeInTheDocument()
    expect(screen.queryByTestId('suggestions-well-optimized')).toBeNull()
  })

  it('shows well-optimized message when optimization completed with zero results', () => {
    useOptimizationStore.setState({
      suggestions: [],
      isOptimizing: false,
      streamError: null,
      hasOptimizationCompleted: true,
      goal: 'balanced',
    })
    render(<SuggestionsList />)
    expect(screen.getByTestId('suggestions-well-optimized')).toBeInTheDocument()
    expect(screen.getByText(/well-optimized for Balanced/)).toBeInTheDocument()
    expect(screen.queryByTestId('suggestions-empty-state')).toBeNull()
  })

  it('well-optimized message reflects the active goal label', () => {
    useOptimizationStore.setState({
      suggestions: [],
      isOptimizing: false,
      streamError: null,
      hasOptimizationCompleted: true,
      goal: 'maximize_damage',
    })
    render(<SuggestionsList />)
    expect(screen.getByText(/well-optimized for Maximize Damage/)).toBeInTheDocument()
  })
})

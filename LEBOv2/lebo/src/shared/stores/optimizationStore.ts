import { create } from 'zustand'
import type { OptimizationGoal, SuggestionResult, BuildScore } from '../types/optimization'
import type { AppError } from '../types/errors'

export interface HighlightedNodeIds {
  glowing: Set<string>
  dimmed: Set<string>
}

interface OptimizationStore {
  goal: OptimizationGoal
  suggestions: SuggestionResult[]
  skippedSuggestions: SuggestionResult[]
  appliedRanks: number[]
  previewSuggestionRank: number | null
  highlightedNodeIds: HighlightedNodeIds | null
  isOptimizing: boolean
  hasOptimizationCompleted: boolean
  scores: BuildScore | null
  streamError: AppError | null
  setGoal: (goal: OptimizationGoal) => void
  setSuggestions: (suggestions: SuggestionResult[]) => void
  addSuggestion: (suggestion: SuggestionResult) => void
  clearSuggestions: () => void
  setIsOptimizing: (optimizing: boolean) => void
  setHasOptimizationCompleted: (value: boolean) => void
  setScores: (scores: BuildScore | null) => void
  setStreamError: (error: AppError | null) => void
  skipSuggestion: (rank: number) => void
  setAppliedRank: (rank: number) => void
  setPreviewSuggestionRank: (rank: number | null) => void
  setHighlightedNodeIds: (nodes: HighlightedNodeIds | null) => void
}

export const useOptimizationStore = create<OptimizationStore>()((set) => ({
  goal: 'balanced',
  suggestions: [],
  skippedSuggestions: [],
  appliedRanks: [],
  previewSuggestionRank: null,
  highlightedNodeIds: null,
  isOptimizing: false,
  hasOptimizationCompleted: false,
  scores: null,
  streamError: null,
  setGoal: (goal) => set({ goal }),
  setSuggestions: (suggestions) => set({ suggestions }),
  addSuggestion: (suggestion) =>
    set((s) => ({ suggestions: [...s.suggestions, suggestion] })),
  clearSuggestions: () =>
    set({
      suggestions: [],
      skippedSuggestions: [],
      appliedRanks: [],
      previewSuggestionRank: null,
      highlightedNodeIds: null,
      streamError: null,
      hasOptimizationCompleted: false,
    }),
  setIsOptimizing: (optimizing) => set({ isOptimizing: optimizing }),
  setHasOptimizationCompleted: (value) => set({ hasOptimizationCompleted: value }),
  setScores: (scores) => set({ scores }),
  setStreamError: (error) => set({ streamError: error }),
  skipSuggestion: (rank) =>
    set((s) => {
      const suggestion = s.suggestions.find((sg) => sg.rank === rank)
      if (!suggestion) return {}
      return {
        suggestions: s.suggestions.filter((sg) => sg.rank !== rank),
        skippedSuggestions: [...s.skippedSuggestions, suggestion],
      }
    }),
  setAppliedRank: (rank) =>
    set((s) => ({ appliedRanks: [...s.appliedRanks, rank] })),
  setPreviewSuggestionRank: (rank) => set({ previewSuggestionRank: rank }),
  setHighlightedNodeIds: (nodes) => set({ highlightedNodeIds: nodes }),
}))

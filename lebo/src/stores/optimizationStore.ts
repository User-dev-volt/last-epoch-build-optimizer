import { create } from "zustand";
import type { OptimizationGoal, Suggestion } from "../lib/types";
import {
  startOptimization,
  onOptimizationChunk,
  onOptimizationComplete,
  onOptimizationError,
} from "../lib/tauri";
import type { UnlistenFn } from "@tauri-apps/api/event";

interface OptimizationStore {
  goal: OptimizationGoal;
  suggestions: Suggestion[];
  appliedIds: Set<string>;
  dismissedIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  overallAnalysis: string | null;
  selectedSuggestionId: string | null;

  setGoal: (goal: OptimizationGoal) => void;
  runOptimization: (payload: {
    passiveAllocations: Record<string, number>;
    equippedSkills: string[];
    masteryId: string;
  }) => Promise<void>;
  applySuggestion: (id: string) => void;
  dismissSuggestion: (id: string) => void;
  applyAll: () => Suggestion[];
  selectSuggestion: (id: string | null) => void;
  clearSuggestions: () => void;
}

export const useOptimizationStore = create<OptimizationStore>((set, get) => ({
  goal: "damage",
  suggestions: [],
  appliedIds: new Set(),
  dismissedIds: new Set(),
  isLoading: false,
  error: null,
  overallAnalysis: null,
  selectedSuggestionId: null,

  setGoal: (goal) => set({ goal }),

  runOptimization: async ({ passiveAllocations, equippedSkills, masteryId }) => {
    const { goal } = get();
    set({ isLoading: true, error: null, suggestions: [], appliedIds: new Set(), dismissedIds: new Set() });

    let accumulated = "";
    const unlisteners: UnlistenFn[] = [];

    const cleanup = () => unlisteners.forEach((fn) => fn());

    const chunkUnlisten = await onOptimizationChunk((delta) => {
      accumulated += delta;
      // Try to parse partial JSON — extract complete suggestion objects as they stream
      tryParseAccumulated(accumulated, (parsed) => {
        set({ suggestions: parsed.suggestions ?? [], overallAnalysis: parsed.overallAnalysis ?? null });
      });
    });
    unlisteners.push(chunkUnlisten);

    const completeUnlisten = await onOptimizationComplete(() => {
      cleanup();
      set({ isLoading: false });
    });
    unlisteners.push(completeUnlisten);

    const errorUnlisten = await onOptimizationError((message) => {
      cleanup();
      set({ isLoading: false, error: message });
    });
    unlisteners.push(errorUnlisten);

    try {
      await startOptimization({ passiveAllocations, equippedSkills, goal, masteryId });
    } catch (err) {
      cleanup();
      set({ isLoading: false, error: err instanceof Error ? err.message : "Optimization failed" });
    }
  },

  applySuggestion: (id) => {
    set((s) => ({ appliedIds: new Set([...s.appliedIds, id]) }));
  },

  dismissSuggestion: (id) => {
    set((s) => ({ dismissedIds: new Set([...s.dismissedIds, id]) }));
  },

  applyAll: () => {
    const { suggestions, appliedIds } = get();
    const toApply = suggestions.filter((s) => !appliedIds.has(s.id));
    set({ appliedIds: new Set(suggestions.map((s) => s.id)) });
    return toApply;
  },

  selectSuggestion: (id) => set({ selectedSuggestionId: id }),

  clearSuggestions: () =>
    set({ suggestions: [], appliedIds: new Set(), dismissedIds: new Set(), overallAnalysis: null }),
}));

// Best-effort partial JSON parser — extracts suggestions as they stream in
function tryParseAccumulated(
  text: string,
  cb: (parsed: { suggestions?: Suggestion[]; overallAnalysis?: string }) => void
) {
  try {
    const parsed = JSON.parse(text);
    cb(parsed);
  } catch {
    // Not complete JSON yet — try to extract any complete suggestion objects
    const match = text.match(/"suggestions"\s*:\s*(\[[\s\S]*?\])/);
    if (match) {
      try {
        const suggestions = JSON.parse(match[1]);
        cb({ suggestions });
      } catch {
        // Partial array — ignore
      }
    }
  }
}

import { create } from "zustand";
import type { BuildScores, PassiveTree } from "../lib/types";
import { computeScores } from "../engine/scoring";

interface ScoreStore {
  scores: BuildScores;
  masteryMax: BuildScores | null;
  recalculate: (
    allocations: Record<string, number>,
    tree: PassiveTree | undefined
  ) => void;
}

export const useScoreStore = create<ScoreStore>((set) => ({
  scores: { damage: 0, survivability: 0, speed: 0 },
  masteryMax: null,

  recalculate: (allocations, tree) => {
    if (!tree) {
      set({ scores: { damage: 0, survivability: 0, speed: 0 } });
      return;
    }
    const scores = computeScores(allocations, tree);
    set({ scores });
  },
}));

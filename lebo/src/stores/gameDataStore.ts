import { create } from "zustand";
import type { Class, Mastery, PassiveTree, Skill, SkillTree } from "../lib/types";
import { getAllGameData, fetchGameData, onGameDataProgress } from "../lib/tauri";

interface GameDataProgress {
  current: number;
  total: number;
  step: string;
}

interface GameDataStore {
  classes: Class[];
  isLoaded: boolean;
  isLoading: boolean;
  loadError: string | null;
  fetchProgress: GameDataProgress | null;

  // Selectors
  getClass: (id: string) => Class | undefined;
  getMastery: (id: string) => Mastery | undefined;
  getPassiveTree: (masteryId: string) => PassiveTree | undefined;
  getSkill: (id: string) => Skill | undefined;
  getSkillTree: (skillId: string) => SkillTree | undefined;
  getSkillsForMastery: (masteryId: string) => Skill[];

  // Actions
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useGameDataStore = create<GameDataStore>((set, get) => ({
  classes: [],
  isLoaded: false,
  isLoading: false,
  loadError: null,
  fetchProgress: null,

  getClass: (id) => get().classes.find((c) => c.id === id),

  getMastery: (id) => {
    for (const cls of get().classes) {
      const m = cls.masteries.find((m) => m.id === id);
      if (m) return m;
    }
    return undefined;
  },

  getPassiveTree: (masteryId) => get().getMastery(masteryId)?.passiveTree,

  getSkill: (id) => {
    for (const cls of get().classes) {
      for (const mastery of cls.masteries) {
        const skill = mastery.skills?.find((s) => s.id === id);
        if (skill) return skill;
      }
    }
    return undefined;
  },

  getSkillTree: (skillId) => get().getSkill(skillId)?.tree,

  getSkillsForMastery: (masteryId) => get().getMastery(masteryId)?.skills ?? [],

  initialize: async () => {
    const { isLoaded, isLoading } = get();
    if (isLoaded || isLoading) return;

    set({ isLoading: true, loadError: null });

    // Listen for progress events during initial fetch
    const unlisten = await onGameDataProgress((progress) => {
      set({ fetchProgress: progress });
    });

    try {
      // This will fetch from community API if cache is stale, else use SQLite
      await fetchGameData(false);
      const data = (await getAllGameData()) as { classes: Class[] };
      set({ classes: data.classes, isLoaded: true, isLoading: false, fetchProgress: null });
    } catch (err) {
      set({
        loadError: err instanceof Error ? err.message : "Failed to load game data",
        isLoading: false,
        fetchProgress: null,
      });
    } finally {
      unlisten();
    }
  },

  refresh: async () => {
    set({ isLoading: true, loadError: null, isLoaded: false });

    const unlisten = await onGameDataProgress((progress) => {
      set({ fetchProgress: progress });
    });

    try {
      await fetchGameData(true);
      const data = (await getAllGameData()) as { classes: Class[] };
      set({ classes: data.classes, isLoaded: true, isLoading: false, fetchProgress: null });
    } catch (err) {
      set({
        loadError: err instanceof Error ? err.message : "Failed to refresh game data",
        isLoading: false,
        fetchProgress: null,
      });
    } finally {
      unlisten();
    }
  },
}));

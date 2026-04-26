import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Build } from "../lib/types";

interface BuildSnapshot {
  passiveAllocations: Record<string, number>;
  skillAllocations: Record<string, Record<string, number>>;
}

interface BuildStore {
  classId: string | null;
  masteryId: string | null;
  passiveAllocations: Record<string, number>;
  skillAllocations: Record<string, Record<string, number>>;
  equippedSkills: string[];
  buildName: string;
  buildId: string | null;
  isDirty: boolean;

  // Undo/redo
  history: BuildSnapshot[];
  historyIndex: number;

  // Actions
  setClass: (classId: string) => void;
  setMastery: (masteryId: string) => void;
  allocateNode: (nodeId: string, points?: number) => void;
  deallocateNode: (nodeId: string) => void;
  setEquippedSkill: (slot: number, skillId: string | null) => void;
  resetTree: () => void;
  setBuildName: (name: string) => void;
  loadBuild: (build: Build) => void;
  markSaved: (id: string) => void;
  undo: () => void;
  redo: () => void;
}

const MAX_HISTORY = 50;

function snapshot(state: BuildStore): BuildSnapshot {
  return {
    passiveAllocations: { ...state.passiveAllocations },
    skillAllocations: Object.fromEntries(
      Object.entries(state.skillAllocations).map(([k, v]) => [k, { ...v }])
    ),
  };
}

export const useBuildStore = create<BuildStore>()(
  subscribeWithSelector((set, get) => ({
    classId: null,
    masteryId: null,
    passiveAllocations: {},
    skillAllocations: {},
    equippedSkills: [],
    buildName: "New Build",
    buildId: null,
    isDirty: false,
    history: [],
    historyIndex: -1,

    setClass: (classId) => {
      set({
        classId,
        masteryId: null,
        passiveAllocations: {},
        skillAllocations: {},
        equippedSkills: [],
        isDirty: false,
        history: [],
        historyIndex: -1,
      });
    },

    setMastery: (masteryId) => {
      set({
        masteryId,
        passiveAllocations: {},
        skillAllocations: {},
        equippedSkills: [],
        isDirty: true,
        history: [],
        historyIndex: -1,
      });
    },

    allocateNode: (nodeId, points = 1) => {
      const state = get();
      const current = state.passiveAllocations[nodeId] ?? 0;
      const snap = snapshot(state);

      set((s) => {
        const newHistory = s.history.slice(0, s.historyIndex + 1);
        if (newHistory.length >= MAX_HISTORY) newHistory.shift();
        return {
          passiveAllocations: { ...s.passiveAllocations, [nodeId]: current + points },
          isDirty: true,
          history: [...newHistory, snap],
          historyIndex: Math.min(newHistory.length, MAX_HISTORY - 1),
        };
      });
    },

    deallocateNode: (nodeId) => {
      const state = get();
      const snap = snapshot(state);

      set((s) => {
        const next = { ...s.passiveAllocations };
        delete next[nodeId];
        const newHistory = s.history.slice(0, s.historyIndex + 1);
        if (newHistory.length >= MAX_HISTORY) newHistory.shift();
        return {
          passiveAllocations: next,
          isDirty: true,
          history: [...newHistory, snap],
          historyIndex: Math.min(newHistory.length, MAX_HISTORY - 1),
        };
      });
    },

    setEquippedSkill: (slot, skillId) => {
      set((s) => {
        const next = [...s.equippedSkills];
        while (next.length <= slot) next.push("");
        if (skillId === null) {
          next.splice(slot, 1);
        } else {
          next[slot] = skillId;
        }
        return { equippedSkills: next, isDirty: true };
      });
    },

    resetTree: () => {
      const snap = snapshot(get());
      set((s) => {
        const newHistory = s.history.slice(0, s.historyIndex + 1);
        if (newHistory.length >= MAX_HISTORY) newHistory.shift();
        return {
          passiveAllocations: {},
          isDirty: true,
          history: [...newHistory, snap],
          historyIndex: Math.min(newHistory.length, MAX_HISTORY - 1),
        };
      });
    },

    setBuildName: (name) => set({ buildName: name, isDirty: true }),

    loadBuild: (build) => {
      set({
        classId: build.classId,
        masteryId: build.masteryId,
        passiveAllocations: build.passiveAllocations,
        skillAllocations: build.skillAllocations,
        equippedSkills: build.equippedSkills,
        buildName: build.name,
        buildId: build.id,
        isDirty: false,
        history: [],
        historyIndex: -1,
      });
    },

    markSaved: (id) => set({ buildId: id, isDirty: false }),

    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < 0) return;
      const snap = history[historyIndex];
      set({
        passiveAllocations: snap.passiveAllocations,
        skillAllocations: snap.skillAllocations,
        historyIndex: historyIndex - 1,
        isDirty: true,
      });
    },

    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex >= history.length - 1) return;
      const snap = history[historyIndex + 1];
      set({
        passiveAllocations: snap.passiveAllocations,
        skillAllocations: snap.skillAllocations,
        historyIndex: historyIndex + 1,
        isDirty: true,
      });
    },
  }))
);

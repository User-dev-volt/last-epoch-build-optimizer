import { create } from 'zustand'
import type { BuildState, BuildMeta, ApplyNodeResult, GearItem, ActiveSkill, IdolItem } from '../types/build'
import type { GameNode } from '../types/gameData'

const MAX_UNDO_STACK = 10

interface BuildStore {
  activeBuild: BuildState | null
  savedBuilds: BuildMeta[]
  isImporting: boolean
  selectedClassId: string | null
  selectedMasteryId: string | null
  undoStack: BuildState[]
  setActiveBuild: (build: BuildState | null) => void
  setSavedBuilds: (builds: BuildMeta[]) => void
  setIsImporting: (importing: boolean) => void
  setSelectedClass: (classId: string | null) => void
  setSelectedMastery: (masteryId: string | null) => void
  createBuild: (masteryName: string) => void
  setActiveBuildPersisted: () => void
  clearActiveBuild: () => void
  applyNodeChange: (
    nodeId: string,
    delta: number,
    gameNode: GameNode,
    allGameNodes: Record<string, GameNode>
  ) => ApplyNodeResult
  undoNodeChange: () => void
  updateContextGear: (gear: GearItem[]) => void
  updateContextSkills: (skills: ActiveSkill[]) => void
  updateContextIdols: (idols: IdolItem[]) => void
}

export const useBuildStore = create<BuildStore>()((set, get) => ({
  activeBuild: null,
  savedBuilds: [],
  isImporting: false,
  selectedClassId: null,
  selectedMasteryId: null,
  undoStack: [],
  setActiveBuild: (build) => set({ activeBuild: build }),
  setSavedBuilds: (builds) => set({ savedBuilds: builds }),
  setIsImporting: (importing) => set({ isImporting: importing }),
  setSelectedClass: (classId) => set({ selectedClassId: classId, selectedMasteryId: null, activeBuild: null, undoStack: [] }),
  setSelectedMastery: (masteryId) => set({ selectedMasteryId: masteryId }),
  setActiveBuildPersisted: () =>
    set((s) => s.activeBuild ? { activeBuild: { ...s.activeBuild, isPersisted: true } } : {}),
  clearActiveBuild: () =>
    set({ activeBuild: null, selectedClassId: null, selectedMasteryId: null, undoStack: [] }),
  createBuild: (masteryName) => {
    const { selectedClassId, selectedMasteryId, activeBuild } = get()
    if (!selectedClassId || !selectedMasteryId) return
    if (activeBuild?.classId === selectedClassId && activeBuild?.masteryId === selectedMasteryId) return
    const now = new Date().toISOString()
    set({
      activeBuild: {
        schemaVersion: 1,
        id: crypto.randomUUID(),
        name: masteryName,
        classId: selectedClassId,
        masteryId: selectedMasteryId,
        nodeAllocations: {},
        contextData: { gear: [], skills: [], idols: [] },
        isPersisted: false,
        createdAt: now,
        updatedAt: now,
      },
      undoStack: [],
    })
  },

  applyNodeChange: (nodeId, delta, gameNode, allGameNodes) => {
    const state = get()
    let activeBuild = state.activeBuild

    if (!activeBuild) {
      if (!state.selectedClassId || !state.selectedMasteryId) {
        return { success: false, error: 'No class/mastery selected' }
      }
      const now = new Date().toISOString()
      activeBuild = {
        schemaVersion: 1,
        id: crypto.randomUUID(),
        name: state.selectedMasteryId,
        classId: state.selectedClassId,
        masteryId: state.selectedMasteryId,
        nodeAllocations: {},
        contextData: { gear: [], skills: [], idols: [] },
        isPersisted: false,
        createdAt: now,
        updatedAt: now,
      }
    }

    const current = activeBuild.nodeAllocations[nodeId] ?? 0
    const newPoints = Math.max(0, Math.min(current + delta, gameNode.maxPoints))

    if (newPoints === current) {
      return { success: false }
    }

    if (delta > 0) {
      const prereqsMet = gameNode.prerequisiteNodeIds.every(
        (prereqId) => (activeBuild!.nodeAllocations[prereqId] ?? 0) > 0
      )
      if (!prereqsMet) {
        return { success: false, error: 'Prerequisite not met' }
      }
    }

    if (delta < 0 && newPoints === 0) {
      const dependents = Object.values(allGameNodes).filter(
        (n) =>
          n.prerequisiteNodeIds.includes(nodeId) &&
          (activeBuild!.nodeAllocations[n.id] ?? 0) > 0
      )
      if (dependents.length > 0) {
        return {
          success: false,
          error: `Cannot remove — ${dependents.length} node(s) depend on this`,
        }
      }
    }

    const newNodeAllocations = { ...activeBuild.nodeAllocations }
    if (newPoints === 0) {
      delete newNodeAllocations[nodeId]
    } else {
      newNodeAllocations[nodeId] = newPoints
    }

    const newActiveBuild: BuildState = {
      ...activeBuild,
      nodeAllocations: newNodeAllocations,
      updatedAt: new Date().toISOString(),
    }

    const newUndoStack = [...state.undoStack, activeBuild].slice(-MAX_UNDO_STACK)
    set({ activeBuild: newActiveBuild, undoStack: newUndoStack })
    return { success: true }
  },

  undoNodeChange: () => {
    const { undoStack } = get()
    if (undoStack.length === 0) return
    const previous = undoStack[undoStack.length - 1]
    set({ activeBuild: previous, undoStack: undoStack.slice(0, -1) })
  },

  updateContextGear: (gear) =>
    set((s) =>
      s.activeBuild
        ? {
            activeBuild: {
              ...s.activeBuild,
              contextData: { ...s.activeBuild.contextData, gear },
              isPersisted: false,
              updatedAt: new Date().toISOString(),
            },
          }
        : {}
    ),

  updateContextSkills: (skills) =>
    set((s) =>
      s.activeBuild
        ? {
            activeBuild: {
              ...s.activeBuild,
              contextData: { ...s.activeBuild.contextData, skills },
              isPersisted: false,
              updatedAt: new Date().toISOString(),
            },
          }
        : {}
    ),

  updateContextIdols: (idols) =>
    set((s) =>
      s.activeBuild
        ? {
            activeBuild: {
              ...s.activeBuild,
              contextData: { ...s.activeBuild.contextData, idols },
              isPersisted: false,
              updatedAt: new Date().toISOString(),
            },
          }
        : {}
    ),
}))

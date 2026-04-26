import { create } from 'zustand'
import type { GameData } from '../types/gameData'

interface GameDataStore {
  gameData: GameData | null
  dataVersion: string | null
  dataUpdatedAt: string | null
  isStale: boolean
  stalenessAcknowledged: boolean
  versionsBehind: number
  isLoading: boolean
  isUpdating: boolean
  setGameData: (data: GameData) => void
  setDataVersion: (version: string) => void
  setDataUpdatedAt: (date: string) => void
  setIsStale: (stale: boolean) => void
  acknowledgeStaleness: () => void
  setVersionsBehind: (n: number) => void
  setIsLoading: (loading: boolean) => void
  setIsUpdating: (updating: boolean) => void
}

export const useGameDataStore = create<GameDataStore>()((set) => ({
  gameData: null,
  dataVersion: null,
  dataUpdatedAt: null,
  isStale: false,
  stalenessAcknowledged: false,
  versionsBehind: 0,
  isLoading: false,
  isUpdating: false,
  setGameData: (data) => set({ gameData: data }),
  setDataVersion: (version) => set({ dataVersion: version }),
  setDataUpdatedAt: (date) => set({ dataUpdatedAt: date }),
  setIsStale: (stale) => set({ isStale: stale }),
  acknowledgeStaleness: () => set({ stalenessAcknowledged: true }),
  setVersionsBehind: (n) => set({ versionsBehind: n }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsUpdating: (updating) => set({ isUpdating: updating }),
}))

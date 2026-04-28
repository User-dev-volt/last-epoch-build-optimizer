import { create } from 'zustand'

export type PanelCollapseState = 'expanded' | 'collapsed'

interface PanelState {
  left: PanelCollapseState
  right: PanelCollapseState
}

interface AppStore {
  isOnline: boolean
  isOnlineChecked: boolean
  currentView: 'main' | 'settings'
  activePanel: PanelState
  isApiKeyConfigured: boolean | null
  setOnline: (online: boolean) => void
  setCurrentView: (view: 'main' | 'settings') => void
  setPanelState: (panel: 'left' | 'right', state: PanelCollapseState) => void
  setApiKeyConfigured: (v: boolean | null) => void
}

export const useAppStore = create<AppStore>()((set) => ({
  isOnline: false,
  isOnlineChecked: false,
  currentView: 'main',
  activePanel: { left: 'expanded', right: 'expanded' },
  isApiKeyConfigured: null,
  setOnline: (online) => set({ isOnline: online, isOnlineChecked: true }),
  setCurrentView: (view) => set({ currentView: view }),
  setPanelState: (panel, state) =>
    set((s) => ({ activePanel: { ...s.activePanel, [panel]: state } })),
  setApiKeyConfigured: (v) => set({ isApiKeyConfigured: v }),
}))

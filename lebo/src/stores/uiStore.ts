import { create } from "zustand";

type ActiveTab = "passive" | string; // 'passive' or a skillId

export interface Toast {
  id: string;
  message: string;
  type: "error" | "info";
}

interface UIStore {
  activeTab: ActiveTab;
  selectedNodeId: string | null;
  graphZoom: number;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  showApiKeyModal: boolean;
  showImportModal: boolean;
  showSaveModal: boolean;
  showLoadModal: boolean;
  showSettings: boolean;
  toasts: Toast[];

  setActiveTab: (tab: ActiveTab) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setGraphZoom: (zoom: number) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setShowApiKeyModal: (show: boolean) => void;
  setShowImportModal: (show: boolean) => void;
  setShowSaveModal: (show: boolean) => void;
  setShowLoadModal: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  addToast: (message: string, type?: "error" | "info") => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeTab: "passive",
  selectedNodeId: null,
  graphZoom: 1,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  showApiKeyModal: false,
  showImportModal: false,
  showSaveModal: false,
  showLoadModal: false,
  showSettings: false,
  toasts: [],

  setActiveTab: (tab) => set({ activeTab: tab, selectedNodeId: null }),
  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setGraphZoom: (zoom) => set({ graphZoom: Math.min(2.5, Math.max(0.3, zoom)) }),
  toggleLeftPanel: () => set((s) => ({ leftPanelCollapsed: !s.leftPanelCollapsed })),
  toggleRightPanel: () => set((s) => ({ rightPanelCollapsed: !s.rightPanelCollapsed })),
  setShowApiKeyModal: (show) => set({ showApiKeyModal: show }),
  setShowImportModal: (show) => set({ showImportModal: show }),
  setShowSaveModal: (show) => set({ showSaveModal: show }),
  setShowLoadModal: (show) => set({ showLoadModal: show }),
  setShowSettings: (show) => set({ showSettings: show }),

  addToast: (message, type = "error") => {
    const id = Math.random().toString(36).slice(2, 9);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 2500);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

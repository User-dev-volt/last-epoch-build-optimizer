import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGameDataStore } from "../../stores/gameDataStore";
import { useBuildStore } from "../../stores/buildStore";
import { useUIStore } from "../../stores/uiStore";
import { BuildScoresPanel } from "../panels/BuildScoresPanel";
import { SuggestionsPanel } from "../panels/SuggestionsPanel";
import { ContextBar } from "../panels/ContextBar";
import { SkillTreeGraph } from "../graph/SkillTreeGraph";
import { SaveModal } from "../ui/SaveModal";
import { LoadModal } from "../ui/LoadModal";

export function BuildScreen() {
  const { masteryId } = useParams<{ masteryId: string }>();
  const { getMastery, getSkill } = useGameDataStore();
  const { classId, equippedSkills, undo, redo } = useBuildStore();
  const {
    leftPanelCollapsed, rightPanelCollapsed,
    toggleLeftPanel, toggleRightPanel,
    activeTab, setActiveTab,
    toasts,
    showSaveModal, setShowSaveModal,
    showImportModal, setShowImportModal,
  } = useUIStore();
  const buildIsDirty = useBuildStore((s) => s.isDirty);
  const navigate = useNavigate();

  const mastery = masteryId ? getMastery(masteryId) : undefined;
  const className = mastery ? mastery.classId : classId ?? "";

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      if (e.key === "z") { e.preventDefault(); undo(); }
      if (e.key === "y") { e.preventDefault(); redo(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return (
    <div className="flex flex-col h-screen bg-lebo-base text-lebo-text-primary overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 h-12 bg-lebo-surface border-b border-lebo-border flex-shrink-0">
        <nav className="flex items-center gap-2 text-lebo-text-muted text-sm">
          <button onClick={() => navigate("/")} className="hover:text-lebo-gold transition-colors">
            Classes
          </button>
          <span>›</span>
          <button
            onClick={() => navigate(`/mastery/${className}`)}
            className="hover:text-lebo-gold transition-colors"
          >
            {className.charAt(0).toUpperCase() + className.slice(1)}
          </button>
          <span>›</span>
          <span className="text-lebo-text-primary">{mastery?.name ?? masteryId}</span>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 text-xs border border-lebo-border rounded hover:border-lebo-gold hover:text-lebo-gold transition-colors"
          >
            Load
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
              buildIsDirty
                ? "bg-lebo-gold text-lebo-base hover:bg-lebo-gold-bright"
                : "bg-lebo-surface border border-lebo-border text-lebo-text-secondary hover:border-lebo-gold hover:text-lebo-gold"
            }`}
          >
            Save{buildIsDirty ? " *" : ""}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Build Scores */}
        {!leftPanelCollapsed && (
          <aside className="w-48 flex-shrink-0 border-r border-lebo-border">
            <BuildScoresPanel />
          </aside>
        )}

        {/* Collapse toggle left */}
        <button
          onClick={toggleLeftPanel}
          className="w-4 flex items-center justify-center bg-lebo-surface border-r border-lebo-border hover:bg-lebo-surface-elevated text-lebo-text-muted hover:text-lebo-gold transition-colors text-xs flex-shrink-0"
          title={leftPanelCollapsed ? "Expand scores panel" : "Collapse scores panel"}
        >
          {leftPanelCollapsed ? "›" : "‹"}
        </button>

        {/* Center — Tab bar + Skill Tree Graph */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Tab bar */}
          <div className="flex items-end bg-lebo-surface border-b border-lebo-border flex-shrink-0 px-2 overflow-x-auto gap-0.5">
            <TreeTab
              label="Passive Tree"
              active={activeTab === "passive"}
              onClick={() => setActiveTab("passive")}
            />
            {Array.from({ length: 5 }).map((_, i) => {
              const skillId = equippedSkills[i] ?? "";
              const skill = skillId ? getSkill(skillId) : null;
              return (
                <TreeTab
                  key={i}
                  label={skill ? skill.name : `Skill ${i + 1}`}
                  active={activeTab === skillId && !!skillId}
                  disabled={!skillId}
                  onClick={() => skillId && setActiveTab(skillId)}
                />
              );
            })}
          </div>

          {/* Graph or skill placeholder */}
          {activeTab === "passive" ? (
            <SkillTreeGraph />
          ) : (
            <SkillTabPlaceholder skillId={activeTab} getSkill={getSkill} />
          )}
        </main>

        {/* Collapse toggle right */}
        <button
          onClick={toggleRightPanel}
          className="w-4 flex items-center justify-center bg-lebo-surface border-l border-lebo-border hover:bg-lebo-surface-elevated text-lebo-text-muted hover:text-lebo-gold transition-colors text-xs flex-shrink-0"
          title={rightPanelCollapsed ? "Expand suggestions panel" : "Collapse suggestions panel"}
        >
          {rightPanelCollapsed ? "‹" : "›"}
        </button>

        {/* Right panel — Suggestions */}
        {!rightPanelCollapsed && (
          <aside className="w-72 flex-shrink-0 border-l border-lebo-border">
            <SuggestionsPanel />
          </aside>
        )}
      </div>

      {/* Bottom — Context Bar */}
      <footer className="h-12 flex-shrink-0 border-t border-lebo-border">
        <ContextBar />
      </footer>

      {/* Modals */}
      {showSaveModal && <SaveModal />}
      {showImportModal && <LoadModal />}

      {/* Toast notifications */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded text-sm font-medium shadow-xl backdrop-blur-sm transition-all ${
              toast.type === "error"
                ? "bg-red-900/90 border border-red-700 text-red-200"
                : "bg-lebo-surface-elevated border border-lebo-border text-lebo-text-primary"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TreeTab({
  label, active, disabled, onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors ${
        active
          ? "border-lebo-gold text-lebo-gold"
          : disabled
          ? "border-transparent text-lebo-text-muted cursor-default opacity-40"
          : "border-transparent text-lebo-text-secondary hover:text-lebo-text-primary hover:border-lebo-border"
      }`}
    >
      {label}
    </button>
  );
}

function SkillTabPlaceholder({
  skillId,
  getSkill,
}: {
  skillId: string;
  getSkill: (id: string) => import("../../lib/types").Skill | undefined;
}) {
  const skill = getSkill(skillId);
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-lebo-text-muted gap-3">
      <div className="text-4xl opacity-20">⚡</div>
      <div className="text-sm font-medium text-lebo-text-secondary">
        {skill ? skill.name : "Unknown Skill"}
      </div>
      <div className="text-xs opacity-60">Skill tree coming in a future update</div>
    </div>
  );
}

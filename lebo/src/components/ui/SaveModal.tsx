import { useState } from "react";
import { useBuildStore } from "../../stores/buildStore";
import { useUIStore } from "../../stores/uiStore";
import { saveBuild, type SaveBuildPayload } from "../../lib/tauri";

export function SaveModal() {
  const { buildName, buildId, classId, masteryId, passiveAllocations, skillAllocations, equippedSkills, setBuildName, markSaved } =
    useBuildStore();
  const { setShowSaveModal, addToast } = useUIStore();

  const [nameInput, setNameInput] = useState(buildName);
  const [saving, setSaving] = useState(false);

  async function handleSave(overwrite: boolean) {
    if (!classId || !masteryId) return;
    setSaving(true);
    try {
      const payload: SaveBuildPayload = {
        name: nameInput.trim() || "Unnamed Build",
        classId,
        masteryId,
        passiveAllocations,
        skillAllocations,
        equippedSkills,
      };
      if (overwrite && buildId) payload.id = buildId;
      const id = await saveBuild(payload);
      setBuildName(nameInput.trim() || "Unnamed Build");
      markSaved(id);
      addToast("Build saved", "info");
      setShowSaveModal(false);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalOverlay onClose={() => setShowSaveModal(false)}>
      <div className="w-80">
        <h2 className="text-lebo-text-primary font-display text-base mb-4 tracking-wide">
          Save Build
        </h2>

        <label className="block text-lebo-text-muted text-xs uppercase tracking-widest mb-1.5">
          Build Name
        </label>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(true); }}
          autoFocus
          maxLength={60}
          placeholder="My Falconer Build"
          className="w-full bg-lebo-base border border-lebo-border rounded px-3 py-2 text-sm text-lebo-text-primary focus:border-lebo-gold focus:outline-none transition-colors"
        />

        <div className="flex gap-2 mt-4">
          {buildId ? (
            <>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex-1 py-2 bg-lebo-gold text-lebo-base rounded text-sm font-medium hover:bg-lebo-gold-bright transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex-1 py-2 border border-lebo-border rounded text-sm text-lebo-text-secondary hover:border-lebo-gold hover:text-lebo-gold transition-colors disabled:opacity-50"
              >
                Save As New
              </button>
            </>
          ) : (
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 py-2 bg-lebo-gold text-lebo-base rounded text-sm font-medium hover:bg-lebo-gold-bright transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Build"}
            </button>
          )}
          <button
            onClick={() => setShowSaveModal(false)}
            className="px-4 py-2 border border-lebo-border rounded text-sm text-lebo-text-muted hover:text-lebo-text-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

export function ModalOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-lebo-surface-elevated border border-lebo-border rounded-lg p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

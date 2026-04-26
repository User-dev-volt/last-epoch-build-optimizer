import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBuildStore } from "../../stores/buildStore";
import { useUIStore } from "../../stores/uiStore";
import { loadBuilds, loadBuild, deleteBuild } from "../../lib/tauri";
import type { Build, BuildSummary } from "../../lib/types";
import { ModalOverlay } from "./SaveModal";

type Tab = "saved" | "url";

export function LoadModal() {
  const { isDirty, loadBuild: applyBuild } = useBuildStore();
  const { setShowImportModal, addToast } = useUIStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("saved");
  const [builds, setBuilds] = useState<BuildSummary[]>([]);
  const [fetching, setFetching] = useState(true);
  const [confirmLoad, setConfirmLoad] = useState<BuildSummary | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadBuilds()
      .then(setBuilds)
      .catch(() => setBuilds([]))
      .finally(() => setFetching(false));
  }, []);

  async function doLoad(summary: BuildSummary) {
    try {
      const full = await loadBuild(summary.id) as Build;
      applyBuild(full);
      navigate(`/build/${full.masteryId}`);
      setShowImportModal(false);
    } catch {
      addToast("Failed to load build");
    }
  }

  function requestLoad(summary: BuildSummary) {
    if (isDirty) {
      setConfirmLoad(summary);
    } else {
      doLoad(summary);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteBuild(id);
      setBuilds((prev) => prev.filter((b) => b.id !== id));
      addToast("Build deleted", "info");
    } catch {
      addToast("Failed to delete build");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleUrlImport() {
    setUrlError(null);
    if (!urlInput.trim()) { setUrlError("Enter a URL or build code"); return; }
    setImporting(true);
    try {
      const { importBuildFromUrl } = await import("../../lib/tauri");
      const full = await importBuildFromUrl(urlInput.trim()) as Build;
      applyBuild(full);
      navigate(`/build/${full.masteryId}`);
      setShowImportModal(false);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Couldn't parse this build link. Check the URL and try again.");
    } finally {
      setImporting(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <>
      <ModalOverlay onClose={() => setShowImportModal(false)}>
        <div className="w-[480px]">
          <h2 className="text-lebo-text-primary font-display text-base mb-4 tracking-wide">
            Load Build
          </h2>

          {/* Tab switcher */}
          <div className="flex gap-0 border-b border-lebo-border mb-4">
            {(["saved", "url"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs capitalize border-b-2 transition-colors -mb-px ${
                  tab === t
                    ? "border-lebo-gold text-lebo-gold"
                    : "border-transparent text-lebo-text-muted hover:text-lebo-text-secondary"
                }`}
              >
                {t === "saved" ? "Saved Builds" : "From URL"}
              </button>
            ))}
          </div>

          {tab === "saved" && (
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
              {fetching && (
                <p className="text-lebo-text-muted text-xs py-4 text-center">Loading…</p>
              )}
              {!fetching && builds.length === 0 && (
                <p className="text-lebo-text-muted text-xs py-4 text-center">No saved builds yet.</p>
              )}
              {builds.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-lebo-surface cursor-pointer group"
                  onClick={() => requestLoad(b)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-lebo-text-primary truncate">{b.name}</div>
                    <div className="text-xs text-lebo-text-muted mt-0.5">
                      {b.className} › {b.masteryName} · {formatDate(b.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}
                    disabled={deletingId === b.id}
                    className="opacity-0 group-hover:opacity-100 text-lebo-text-muted hover:text-red-400 transition-all text-xs px-2 py-1"
                    title="Delete build"
                  >
                    {deletingId === b.id ? "…" : "✕"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "url" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-lebo-text-muted">
                Paste a lastepochtools.com build URL to import it.
              </p>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleUrlImport(); }}
                placeholder="https://lastepochtools.com/planner/..."
                autoFocus
                className="w-full bg-lebo-base border border-lebo-border rounded px-3 py-2 text-sm text-lebo-text-primary focus:border-lebo-gold focus:outline-none transition-colors"
              />
              {urlError && (
                <p className="text-xs text-red-400">{urlError}</p>
              )}
              <button
                onClick={handleUrlImport}
                disabled={importing}
                className="py-2 bg-lebo-gold text-lebo-base rounded text-sm font-medium hover:bg-lebo-gold-bright transition-colors disabled:opacity-50"
              >
                {importing ? "Importing…" : "Import Build"}
              </button>
            </div>
          )}

          <button
            onClick={() => setShowImportModal(false)}
            className="mt-4 w-full py-2 border border-lebo-border rounded text-sm text-lebo-text-muted hover:text-lebo-text-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      </ModalOverlay>

      {/* Unsaved changes confirmation */}
      {confirmLoad && (
        <ModalOverlay onClose={() => setConfirmLoad(null)}>
          <div className="w-72">
            <h3 className="text-lebo-text-primary text-sm font-medium mb-2">Unsaved Changes</h3>
            <p className="text-lebo-text-muted text-xs mb-4">
              You have unsaved changes. Load "{confirmLoad.name}" anyway?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { doLoad(confirmLoad); setConfirmLoad(null); }}
                className="flex-1 py-2 bg-lebo-gold text-lebo-base rounded text-sm font-medium hover:bg-lebo-gold-bright transition-colors"
              >
                Load Anyway
              </button>
              <button
                onClick={() => setConfirmLoad(null)}
                className="flex-1 py-2 border border-lebo-border rounded text-sm text-lebo-text-muted hover:text-lebo-text-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}

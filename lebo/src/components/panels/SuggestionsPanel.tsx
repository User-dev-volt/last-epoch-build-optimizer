import { useOptimizationStore } from "../../stores/optimizationStore";
import { useBuildStore } from "../../stores/buildStore";
import type { OptimizationGoal, Suggestion } from "../../lib/types";

const GOALS: { value: OptimizationGoal; label: string; key: string }[] = [
  { value: "damage", label: "Damage", key: "1" },
  { value: "survivability", label: "Survive", key: "2" },
  { value: "speed", label: "Speed", key: "3" },
  { value: "balanced", label: "Balanced", key: "4" },
];

export function SuggestionsPanel() {
  const {
    goal, setGoal,
    suggestions, appliedIds, dismissedIds,
    isLoading, error,
    selectedSuggestionId, selectSuggestion,
    applySuggestion, dismissSuggestion, applyAll,
    runOptimization,
  } = useOptimizationStore();

  const { passiveAllocations, equippedSkills, masteryId } = useBuildStore();

  const visibleSuggestions = suggestions.filter(
    (s) => !dismissedIds.has(s.id)
  );

  function handleOptimize() {
    if (!masteryId) return;
    runOptimization({ passiveAllocations, equippedSkills, masteryId });
  }

  const selectedSuggestion = suggestions.find((s) => s.id === selectedSuggestionId);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Goal selector + button */}
      <div className="p-3 border-b border-lebo-border flex flex-col gap-3">
        <div className="text-lebo-text-muted text-xs uppercase tracking-widest">Optimize For</div>
        <div className="flex gap-1">
          {GOALS.map((g) => (
            <button
              key={g.value}
              onClick={() => setGoal(g.value)}
              className={`flex-1 text-xs py-1.5 rounded transition-colors ${
                goal === g.value
                  ? "bg-lebo-gold text-lebo-base font-medium"
                  : "bg-lebo-surface-elevated text-lebo-text-secondary hover:text-lebo-text-primary border border-lebo-border"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleOptimize}
          disabled={isLoading || !masteryId}
          className="w-full py-2 bg-lebo-gold text-lebo-base text-sm font-medium rounded hover:bg-lebo-gold-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="inline-flex gap-0.5">
                {[0,1,2].map((i) => (
                  <span key={i} className="w-1 h-1 rounded-full bg-lebo-base animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </span>
              Analyzing...
            </>
          ) : (
            "▶ Optimize Build"
          )}
        </button>
      </div>

      {/* Suggestion detail view */}
      {selectedSuggestion && (
        <SuggestionDetail
          suggestion={selectedSuggestion}
          isApplied={appliedIds.has(selectedSuggestion.id)}
          onApply={() => {
            applySuggestion(selectedSuggestion.id);
            selectSuggestion(null);
          }}
          onDismiss={() => {
            dismissSuggestion(selectedSuggestion.id);
            selectSuggestion(null);
          }}
          onBack={() => selectSuggestion(null)}
        />
      )}

      {/* Suggestions list */}
      {!selectedSuggestion && (
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 m-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
              {error}
            </div>
          )}

          {!isLoading && !error && visibleSuggestions.length === 0 && suggestions.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-lebo-text-muted text-xs leading-relaxed">
                Select an optimization goal and click Optimize to get AI-powered suggestions.
              </p>
            </div>
          )}

          {!isLoading && !error && suggestions.length > 0 && visibleSuggestions.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-lebo-text-muted text-xs">
                Your build looks optimal for this goal.
              </p>
            </div>
          )}

          {visibleSuggestions.length > 0 && (
            <div className="p-3 flex flex-col gap-2">
              <div className="text-lebo-text-muted text-xs">
                {visibleSuggestions.length} suggestion{visibleSuggestions.length !== 1 ? "s" : ""} found
              </div>

              {visibleSuggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  isApplied={appliedIds.has(s.id)}
                  onSelect={() => selectSuggestion(s.id)}
                  onApply={() => applySuggestion(s.id)}
                />
              ))}

              {visibleSuggestions.some((s) => !appliedIds.has(s.id)) && (
                <button
                  onClick={() => {
                    const toApply = applyAll();
                    toApply.forEach((s) => {
                      useBuildStore.getState().allocateNode(s.nodeId);
                    });
                  }}
                  className="w-full py-2 text-xs border border-lebo-gold text-lebo-gold rounded hover:bg-lebo-gold hover:text-lebo-base transition-colors mt-1"
                >
                  Apply All Suggestions
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion, isApplied, onSelect, onApply,
}: {
  suggestion: Suggestion;
  isApplied: boolean;
  onSelect: () => void;
  onApply: () => void;
}) {
  const typeLabel = suggestion.type === "add" ? "ADD" : suggestion.type === "remove" ? "REMOVE" : "SWAP";
  const typeBg = suggestion.type === "add" ? "text-green-400" : suggestion.type === "remove" ? "text-red-400" : "text-yellow-400";

  return (
    <div
      className={`border rounded p-3 flex flex-col gap-2 cursor-pointer transition-all ${
        isApplied
          ? "border-lebo-border opacity-50"
          : "border-lebo-border hover:border-lebo-gold/50"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-lebo-gold text-lebo-base text-xs flex items-center justify-center font-mono flex-shrink-0">
            {suggestion.rank}
          </span>
          <span className={`text-xs font-medium ${typeBg}`}>{typeLabel}:</span>
          <span className="text-lebo-text-primary text-xs truncate">{suggestion.nodeId}</span>
        </div>
        {isApplied && <span className="text-green-400 text-xs">✓</span>}
      </div>

      <div className="flex gap-2 text-xs font-mono">
        <DeltaChip label="DMG" value={suggestion.scoreDelta.damage} />
        <DeltaChip label="SUR" value={suggestion.scoreDelta.survivability} />
        <DeltaChip label="SPD" value={suggestion.scoreDelta.speed} />
      </div>

      {!isApplied && (
        <button
          onClick={(e) => { e.stopPropagation(); onApply(); }}
          className="text-xs text-lebo-gold hover:text-lebo-gold-bright transition-colors text-right"
        >
          Apply →
        </button>
      )}
    </div>
  );
}

function DeltaChip({ label, value }: { label: string; value: number }) {
  const color = value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-lebo-text-muted";
  const prefix = value > 0 ? "+" : "";
  return (
    <span className={`${color}`}>
      {label} {prefix}{value}
    </span>
  );
}

function SuggestionDetail({
  suggestion, isApplied, onApply, onDismiss, onBack,
}: {
  suggestion: Suggestion;
  isApplied: boolean;
  onApply: () => void;
  onDismiss: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
      <button onClick={onBack} className="text-lebo-text-muted text-xs hover:text-lebo-gold transition-colors text-left">
        ← Back to suggestions
      </button>

      <div>
        <div className="text-xs text-lebo-text-muted uppercase tracking-widest mb-1">
          {suggestion.type.toUpperCase()}: Node
        </div>
        <div className="text-lebo-text-primary font-medium">{suggestion.nodeId}</div>
      </div>

      <div className="border-t border-lebo-border pt-3">
        <div className="text-lebo-text-muted text-xs uppercase tracking-widest mb-2">Score Impact</div>
        <div className="flex flex-col gap-1.5 font-mono text-xs">
          {[
            { label: "Damage", value: suggestion.scoreDelta.damage },
            { label: "Survivability", value: suggestion.scoreDelta.survivability },
            { label: "Speed", value: suggestion.scoreDelta.speed },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-lebo-text-secondary">{label}</span>
              <span className={value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-lebo-text-muted"}>
                {value > 0 ? "+" : ""}{value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-lebo-border pt-3">
        <div className="text-lebo-text-muted text-xs uppercase tracking-widest mb-2">Why This Change</div>
        <p className="text-lebo-text-secondary text-xs leading-relaxed">{suggestion.explanation}</p>
      </div>

      {!isApplied && (
        <div className="flex gap-2 mt-auto">
          <button
            onClick={onApply}
            className="flex-1 py-2 bg-lebo-gold text-lebo-base text-xs font-medium rounded hover:bg-lebo-gold-bright transition-colors"
          >
            Apply This Change
          </button>
          <button
            onClick={onDismiss}
            className="px-3 py-2 border border-lebo-border text-lebo-text-muted text-xs rounded hover:border-red-400/40 hover:text-red-400 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

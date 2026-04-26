import { useScoreStore } from "../../stores/scoreStore";
import { useBuildStore } from "../../stores/buildStore";
import { useGameDataStore } from "../../stores/gameDataStore";
import { totalAllocatedPoints } from "../../engine/graphUtils";

const TOTAL_PASSIVE_POINTS = 113; // Last Epoch passive point cap

export function BuildScoresPanel() {
  const scores = useScoreStore((s) => s.scores);
  const { passiveAllocations, masteryId } = useBuildStore();
  const { getMastery } = useGameDataStore();

  const mastery = masteryId ? getMastery(masteryId) : undefined;
  const used = totalAllocatedPoints(passiveAllocations);
  const remaining = TOTAL_PASSIVE_POINTS - used;

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      {/* Mastery label */}
      {mastery && (
        <div className="text-lebo-gold font-display text-sm tracking-wide truncate">
          {mastery.name}
        </div>
      )}

      {/* Score bars */}
      <div className="flex flex-col gap-4">
        <ScoreBar label="Damage" value={scores.damage} color="bg-lebo-score-damage" />
        <ScoreBar label="Survival" value={scores.survivability} color="bg-lebo-score-survival" />
        <ScoreBar label="Speed" value={scores.speed} color="bg-lebo-score-speed" />
      </div>

      {/* Divider */}
      <div className="border-t border-lebo-border" />

      {/* Point budget */}
      <div className="flex flex-col gap-1">
        <div className="text-lebo-text-muted text-xs uppercase tracking-widest">Points</div>
        <div className="font-mono text-lebo-text-primary text-2xl">{used}</div>
        <div className="text-lebo-text-secondary text-xs">
          <span className="text-lebo-gold">{remaining}</span> remaining
        </div>
        <div className="h-1 bg-lebo-surface-elevated rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-lebo-gold rounded-full transition-all duration-150"
            style={{ width: `${Math.min(100, (used / TOTAL_PASSIVE_POINTS) * 100)}%` }}
          />
        </div>
      </div>

      {/* Reset button */}
      <div className="mt-auto">
        <button
          onClick={() => useBuildStore.getState().resetTree()}
          className="w-full text-xs text-lebo-text-muted hover:text-red-400 transition-colors py-1 border border-lebo-border hover:border-red-400/40 rounded"
        >
          Reset Tree
        </button>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-lebo-text-muted text-xs uppercase tracking-widest">{label}</span>
        <span className="font-mono text-lebo-text-primary text-sm">{value}</span>
      </div>
      <div className="h-1.5 bg-lebo-surface-elevated rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

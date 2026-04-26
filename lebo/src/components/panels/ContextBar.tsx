import { useBuildStore } from "../../stores/buildStore";
import { useGameDataStore } from "../../stores/gameDataStore";

const MAX_SKILL_SLOTS = 5;

export function ContextBar() {
  const { equippedSkills, setEquippedSkill, masteryId } = useBuildStore();
  const { getSkillsForMastery } = useGameDataStore();

  const availableSkills = masteryId ? getSkillsForMastery(masteryId) : [];

  return (
    <div className="h-full flex items-center px-4 gap-4 bg-lebo-surface overflow-x-auto">
      <span className="text-lebo-text-muted text-xs uppercase tracking-widest flex-shrink-0">
        Skills
      </span>
      <div className="flex gap-2">
        {Array.from({ length: MAX_SKILL_SLOTS }).map((_, i) => {
          const skillId = equippedSkills[i] ?? "";
          return (
            <select
              key={i}
              value={skillId}
              onChange={(e) => setEquippedSkill(i, e.target.value || null)}
              className="bg-lebo-surface-elevated border border-lebo-border text-lebo-text-secondary text-xs rounded px-2 py-1 hover:border-lebo-gold/50 focus:border-lebo-gold focus:outline-none transition-colors min-w-[110px]"
            >
              <option value="">— Empty —</option>
              {availableSkills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          );
        })}
      </div>

      {/* Gear/Idols placeholder */}
      <div className="ml-auto flex gap-2 flex-shrink-0">
        <button className="text-xs text-lebo-text-muted hover:text-lebo-gold transition-colors px-2 py-1 border border-lebo-border rounded">
          Gear ▸
        </button>
        <button className="text-xs text-lebo-text-muted hover:text-lebo-gold transition-colors px-2 py-1 border border-lebo-border rounded">
          Idols ▸
        </button>
      </div>
    </div>
  );
}

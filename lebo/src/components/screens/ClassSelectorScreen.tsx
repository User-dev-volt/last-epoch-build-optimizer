import { useNavigate } from "react-router-dom";
import { useGameDataStore } from "../../stores/gameDataStore";
import { useBuildStore } from "../../stores/buildStore";

export function ClassSelectorScreen() {
  const { classes } = useGameDataStore();
  const setClass = useBuildStore((s) => s.setClass);
  const navigate = useNavigate();

  // Placeholder classes when game data isn't loaded yet
  const displayClasses = classes.length > 0 ? classes : PLACEHOLDER_CLASSES;

  function handleSelectClass(classId: string) {
    setClass(classId);
    navigate(`/mastery/${classId}`);
  }

  return (
    <div className="min-h-screen bg-lebo-base flex flex-col items-center justify-center gap-10 px-8">
      <div className="text-center">
        <h1 className="text-lebo-gold font-display text-4xl tracking-widest mb-2">LEBO</h1>
        <p className="text-lebo-text-secondary text-sm uppercase tracking-widest">
          Last Epoch Build Optimizer
        </p>
      </div>

      <div>
        <h2 className="text-lebo-text-secondary text-xs uppercase tracking-widest text-center mb-6">
          Select Your Class
        </h2>
        <div className="flex gap-4 flex-wrap justify-center">
          {displayClasses.map((cls) => (
            <button
              key={cls.id}
              onClick={() => handleSelectClass(cls.id)}
              className="group w-44 h-56 bg-lebo-surface border border-lebo-border rounded-lg flex flex-col items-center justify-center gap-3 p-4 transition-all duration-200 hover:border-lebo-gold hover:shadow-[0_0_20px_rgba(200,148,58,0.15)] hover:-translate-y-0.5"
            >
              {/* Class icon placeholder */}
              <div className="w-16 h-16 rounded-full bg-lebo-surface-elevated border border-lebo-border group-hover:border-lebo-gold-dim flex items-center justify-center transition-colors">
                <span className="text-lebo-gold font-display text-xl">
                  {cls.name[0]}
                </span>
              </div>
              <div className="text-center">
                <div className="text-lebo-text-primary font-display text-sm tracking-wide group-hover:text-lebo-gold transition-colors">
                  {cls.name}
                </div>
                <div className="text-lebo-text-muted text-xs mt-1">
                  {cls.masteries?.map((m) => m.name).join(" · ")}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Placeholder data for when game data hasn't been fetched yet
const PLACEHOLDER_CLASSES = [
  { id: "sentinel", name: "Sentinel", masteries: [{ name: "Void Knight" }, { name: "Forge Guard" }, { name: "Paladin" }] },
  { id: "mage", name: "Mage", masteries: [{ name: "Sorcerer" }, { name: "Spellblade" }, { name: "Runemaster" }] },
  { id: "primalist", name: "Primalist", masteries: [{ name: "Shaman" }, { name: "Druid" }, { name: "Beastmaster" }] },
  { id: "acolyte", name: "Acolyte", masteries: [{ name: "Lich" }, { name: "Necromancer" }, { name: "Warlock" }] },
  { id: "rogue", name: "Rogue", masteries: [{ name: "Bladedancer" }, { name: "Marksman" }, { name: "Falconer" }] },
] as const;

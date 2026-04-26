import { useNavigate, useParams } from "react-router-dom";
import { useGameDataStore } from "../../stores/gameDataStore";
import { useBuildStore } from "../../stores/buildStore";

export function MasterySelectorScreen() {
  const { classId } = useParams<{ classId: string }>();
  const { getClass } = useGameDataStore();
  const { setMastery, isDirty } = useBuildStore();
  const navigate = useNavigate();

  const cls = classId ? getClass(classId) : undefined;

  // Fall back to placeholder if game data not loaded
  const displayClass = cls ?? PLACEHOLDER_CLASSES.find((c) => c.id === classId);

  function handleSelectMastery(masteryId: string) {
    if (isDirty) {
      if (!confirm("You have unsaved changes. Switching mastery will reset the current tree. Continue?")) {
        return;
      }
    }
    setMastery(masteryId);
    navigate(`/build/${masteryId}`);
  }

  if (!displayClass) {
    return (
      <div className="flex items-center justify-center h-screen bg-lebo-base text-lebo-text-secondary">
        Class not found.{" "}
        <button onClick={() => navigate("/")} className="text-lebo-gold ml-2 underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-lebo-base flex flex-col items-center justify-center gap-10 px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-lebo-text-muted text-sm">
        <button onClick={() => navigate("/")} className="hover:text-lebo-gold transition-colors">
          Classes
        </button>
        <span>›</span>
        <span className="text-lebo-text-primary">{displayClass.name}</span>
      </nav>

      <div className="text-center">
        <h2 className="text-lebo-text-secondary text-xs uppercase tracking-widest mb-2">
          Choose Your Mastery
        </h2>
        <h1 className="text-lebo-gold font-display text-3xl tracking-wide">
          {displayClass.name}
        </h1>
      </div>

      <div className="flex gap-6 flex-wrap justify-center">
        {displayClass.masteries.map((mastery) => (
          <button
            key={mastery.id}
            onClick={() => handleSelectMastery(mastery.id)}
            className="group w-56 bg-lebo-surface border border-lebo-border rounded-lg flex flex-col gap-3 p-6 text-left transition-all duration-200 hover:border-lebo-gold hover:shadow-[0_0_24px_rgba(200,148,58,0.15)] hover:-translate-y-0.5"
          >
            <div className="text-lebo-gold font-display text-lg tracking-wide group-hover:text-lebo-gold-bright transition-colors">
              {mastery.name}
            </div>
            <p className="text-lebo-text-secondary text-xs leading-relaxed">
              {mastery.description || `Master the ${mastery.name} path.`}
            </p>
            {mastery.damageTypeTags && mastery.damageTypeTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {mastery.damageTypeTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-lebo-surface-elevated border border-lebo-border rounded text-lebo-text-muted text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

const PLACEHOLDER_CLASSES = [
  {
    id: "sentinel", name: "Sentinel",
    masteries: [
      { id: "void-knight", name: "Void Knight", description: "Harness the power of the void to shred enemies with temporal echoes and massive void damage.", damageTypeTags: ["Void", "Melee"] },
      { id: "forge-guard", name: "Forge Guard", description: "An iron-clad warrior who forges weapons from thin air and empowers them with elemental power.", damageTypeTags: ["Physical", "Fire", "Melee"] },
      { id: "paladin", name: "Paladin", description: "A holy warrior who calls down divine wrath and protects allies with sacred light.", damageTypeTags: ["Holy", "Melee", "Support"] },
    ],
  },
  {
    id: "mage", name: "Mage",
    masteries: [
      { id: "sorcerer", name: "Sorcerer", description: "Wields raw elemental magic to devastate entire screens with fire, lightning, and cold.", damageTypeTags: ["Fire", "Lightning", "Cold"] },
      { id: "spellblade", name: "Spellblade", description: "Channels spells directly through melee weapons, dealing massive hybrid damage.", damageTypeTags: ["Physical", "Elemental", "Melee"] },
      { id: "runemaster", name: "Runemaster", description: "Inscribes powerful runes to create layered spell combos and unique interaction chains.", damageTypeTags: ["Elemental", "Arcane"] },
    ],
  },
  {
    id: "primalist", name: "Primalist",
    masteries: [
      { id: "shaman", name: "Shaman", description: "Calls upon totems and storm magic to overwhelm enemies with lightning and cold.", damageTypeTags: ["Lightning", "Cold", "Summoner"] },
      { id: "druid", name: "Druid", description: "Shapeshifts into powerful animal forms to tear through enemies or protect allies.", damageTypeTags: ["Physical", "Poison", "Shapeshifter"] },
      { id: "beastmaster", name: "Beastmaster", description: "Commands a pack of powerful companions to hunt and tear apart foes.", damageTypeTags: ["Physical", "Summoner"] },
    ],
  },
  {
    id: "acolyte", name: "Acolyte",
    masteries: [
      { id: "lich", name: "Lich", description: "Sacrifices health to fuel devastating necrotic and void spells of immense power.", damageTypeTags: ["Necrotic", "Void", "DoT"] },
      { id: "necromancer", name: "Necromancer", description: "Raises armies of undead minions and poisons enemies with spreading necrotic ailments.", damageTypeTags: ["Necrotic", "Poison", "Summoner"] },
      { id: "warlock", name: "Warlock", description: "Curses enemies and channels dark pacts to amplify damage-over-time effects.", damageTypeTags: ["Fire", "Necrotic", "Chaos", "DoT"] },
    ],
  },
  {
    id: "rogue", name: "Rogue",
    masteries: [
      { id: "bladedancer", name: "Bladedancer", description: "A whirling dervish of blades who creates shadow echoes to multiply attacks.", damageTypeTags: ["Physical", "Melee", "Shadow"] },
      { id: "marksman", name: "Marksman", description: "Rains precision arrows from afar with devastating critical strikes and ailments.", damageTypeTags: ["Physical", "Fire", "Poison", "Ranged"] },
      { id: "falconer", name: "Falconer", description: "Partners with a trained falcon to coordinate devastating aerial strike combos.", damageTypeTags: ["Physical", "Ranged", "Summoner"] },
    ],
  },
];

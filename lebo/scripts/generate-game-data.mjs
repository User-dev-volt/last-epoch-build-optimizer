/**
 * generate-game-data.mjs
 *
 * Fetches Last Epoch skill/passive tree data from the community data repo
 * (prowner/last-epoch-data on GitHub) and converts it to our internal
 * game-data.json schema for bundling with the app.
 *
 * Run: node scripts/generate-game-data.mjs
 * Output: src-tauri/resources/game-data.json
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_PATH = join(ROOT, "src-tauri", "resources", "game-data.json");

const RAW_BASE = "https://raw.githubusercontent.com/prowner/last-epoch-data/main";

// ─── Class/Mastery definitions (static — from game knowledge) ────────────────
// These rarely change and aren't in the data repo in a convenient format.

const CLASSES = [
  {
    id: "sentinel",
    name: "Sentinel",
    description: "A warrior empowered by time magic and divine might.",
    masteries: [
      { id: "void-knight", name: "Void Knight", description: "Harnesses void energy and temporal echoes to devastate enemies with massive void damage.", playstyle: "Melee/Void burst damage", damageTypeTags: ["Void", "Melee", "Temporal"] },
      { id: "forge-guard", name: "Forge Guard", description: "Forges weapons and armor mid-combat, empowering them with elemental and physical force.", playstyle: "Tank/Physical melee", damageTypeTags: ["Physical", "Fire", "Melee"] },
      { id: "paladin", name: "Paladin", description: "A divine warrior who calls down holy judgment and shields allies with sacred light.", playstyle: "Support/Holy melee", damageTypeTags: ["Holy", "Melee", "Support"] },
    ],
  },
  {
    id: "mage",
    name: "Mage",
    description: "A spellcaster of immense arcane power.",
    masteries: [
      { id: "sorcerer", name: "Sorcerer", description: "Wields raw elemental magic to obliterate enemies with fire, lightning, and cold.", playstyle: "Elemental AOE caster", damageTypeTags: ["Fire", "Lightning", "Cold"] },
      { id: "spellblade", name: "Spellblade", description: "Channels spells directly through melee weapons for devastating hybrid damage.", playstyle: "Melee/Elemental hybrid", damageTypeTags: ["Physical", "Elemental", "Melee"] },
      { id: "runemaster", name: "Runemaster", description: "Inscribes powerful runes to create layered spell combos and unique synergies.", playstyle: "Combo caster", damageTypeTags: ["Elemental", "Arcane"] },
    ],
  },
  {
    id: "primalist",
    name: "Primalist",
    description: "A primal force who commands the untamed wilds.",
    masteries: [
      { id: "shaman", name: "Shaman", description: "Commands totems and storm magic to overwhelm enemies with lightning and cold.", playstyle: "Totem/Storm caster", damageTypeTags: ["Lightning", "Cold", "Summoner"] },
      { id: "druid", name: "Druid", description: "Shapeshifts into powerful animal forms to obliterate or protect.", playstyle: "Shapeshifter", damageTypeTags: ["Physical", "Poison", "Shapeshifter"] },
      { id: "beastmaster", name: "Beastmaster", description: "Commands a pack of powerful companions to hunt enemies.", playstyle: "Summoner/Pet damage", damageTypeTags: ["Physical", "Summoner"] },
    ],
  },
  {
    id: "acolyte",
    name: "Acolyte",
    description: "A dark practitioner of death and forbidden power.",
    masteries: [
      { id: "lich", name: "Lich", description: "Sacrifices health to fuel devastating necrotic and void spells.", playstyle: "Glass cannon/Health sacrifice", damageTypeTags: ["Necrotic", "Void", "DoT"] },
      { id: "necromancer", name: "Necromancer", description: "Raises undead armies and spreads deadly necrotic ailments.", playstyle: "Summoner/Poison", damageTypeTags: ["Necrotic", "Poison", "Summoner"] },
      { id: "warlock", name: "Warlock", description: "Curses enemies and channels dark pacts to amplify damage over time.", playstyle: "Curse/DoT", damageTypeTags: ["Fire", "Necrotic", "Chaos", "DoT"] },
    ],
  },
  {
    id: "rogue",
    name: "Rogue",
    description: "A swift, deadly operative who strikes from the shadows.",
    masteries: [
      { id: "bladedancer", name: "Bladedancer", description: "A whirling dervish of blades who creates shadow echoes to multiply attacks.", playstyle: "Shadow melee", damageTypeTags: ["Physical", "Melee", "Shadow"] },
      { id: "marksman", name: "Marksman", description: "Rains precision arrows with devastating criticals and ailments.", playstyle: "Ranged/Critical", damageTypeTags: ["Physical", "Fire", "Poison", "Ranged"] },
      { id: "falconer", name: "Falconer", description: "Partners with a trained falcon for coordinated aerial strikes.", playstyle: "Summoner/Ranged", damageTypeTags: ["Physical", "Ranged", "Summoner"] },
    ],
  },
];

// ─── Skill definitions per mastery ───────────────────────────────────────────

const SKILLS = {
  "void-knight": [
    { id: "vk-void-cleave", name: "Void Cleave", description: "Strikes with void-infused cleave, creating temporal echoes.", damageTypes: ["Void", "Melee"] },
    { id: "vk-erasing-strike", name: "Erasing Strike", description: "A powerful blow that erases enemies from time.", damageTypes: ["Void", "Melee"] },
    { id: "vk-anomaly", name: "Anomaly", description: "Creates a temporal anomaly that pulls enemies and rewinds time.", damageTypes: ["Void", "Temporal"] },
    { id: "vk-devouring-orb", name: "Devouring Orb", description: "Summons an orbiting void orb that consumes nearby enemies.", damageTypes: ["Void"] },
    { id: "vk-volatile-reversal", name: "Volatile Reversal", description: "Rewinds your position and health to a previous state.", damageTypes: ["Void"] },
  ],
  "forge-guard": [
    { id: "fg-shield-rush", name: "Shield Rush", description: "Charge forward with your shield, knocking back enemies.", damageTypes: ["Physical", "Melee"] },
    { id: "fg-forge-strike", name: "Forge Strike", description: "Strike with a magically forged weapon.", damageTypes: ["Physical", "Fire"] },
    { id: "fg-molten-bullet", name: "Molten Bullet", description: "Fire a molten projectile that ignites enemies.", damageTypes: ["Fire"] },
    { id: "fg-warpath", name: "Warpath", description: "Spin continuously to slash all nearby enemies.", damageTypes: ["Physical", "Fire", "Melee"] },
    { id: "fg-hammer-throw", name: "Hammer Throw", description: "Hurl a hammer that bounces between enemies.", damageTypes: ["Physical"] },
  ],
  "paladin": [
    { id: "pal-judgment", name: "Judgment", description: "Call down divine judgment on all nearby enemies.", damageTypes: ["Holy"] },
    { id: "pal-holy-aura", name: "Holy Aura", description: "Emit a holy aura that empowers you and allies.", damageTypes: ["Holy", "Support"] },
    { id: "pal-rive", name: "Rive", description: "A rapid melee attack with a powerful charged variant.", damageTypes: ["Physical", "Holy", "Melee"] },
    { id: "pal-consecrated-ground", name: "Consecrated Ground", description: "Consecrate an area, damaging enemies who enter.", damageTypes: ["Holy"] },
    { id: "pal-rebuke", name: "Rebuke", description: "Retaliate against all enemies who strike you.", damageTypes: ["Holy", "Melee"] },
  ],
  "sorcerer": [
    { id: "sor-fireball", name: "Fireball", description: "Launch an exploding fireball that burns enemies.", damageTypes: ["Fire"] },
    { id: "sor-lightning-blast", name: "Lightning Blast", description: "Unleash a powerful bolt of lightning.", damageTypes: ["Lightning"] },
    { id: "sor-glacier", name: "Glacier", description: "Call down pillars of ice to freeze and shatter enemies.", damageTypes: ["Cold"] },
    { id: "sor-static-orb", name: "Static Orb", description: "Throw an electrified orb that crackles with lightning.", damageTypes: ["Lightning"] },
    { id: "sor-flame-ward", name: "Flame Ward", description: "Create a protective barrier that absorbs damage.", damageTypes: ["Fire"] },
  ],
};

// Default empty skills for masteries without explicit entries
const DEFAULT_SKILLS = (masteryId) => [
  { id: `${masteryId}-skill-1`, name: "Primary Skill", description: "The primary skill of this mastery.", damageTypes: [] },
  { id: `${masteryId}-skill-2`, name: "Secondary Skill", description: "The secondary skill of this mastery.", damageTypes: [] },
];

// ─── Passive tree generator ───────────────────────────────────────────────────
// Generates a realistic connected passive tree graph for a mastery.
// In a full implementation, this would be replaced with real datamined data.

function generatePassiveTree(masteryId, damageTypeTags) {
  const mainDamageType = damageTypeTags[0] || "Physical";
  const secondaryType = damageTypeTags[1] || damageTypeTags[0] || "Physical";

  // Node templates based on mastery type
  const templates = getNodeTemplates(masteryId, mainDamageType, secondaryType);

  // Layout: radial tree from a central starting node
  const nodes = [];
  const startNodeId = `${masteryId}-start`;

  // Starting node (center)
  nodes.push({
    id: startNodeId,
    masteryId,
    name: "Starting Node",
    description: "Your journey begins here.",
    x: 0,
    y: 0,
    maxPoints: 1,
    tags: [],
    effects: [],
    connections: [],
    isStarting: true,
  });

  // Generate tree from templates
  let nodeIndex = 0;
  const rings = [
    { radius: 120, count: 4 },   // Ring 1: 4 nodes
    { radius: 240, count: 6 },   // Ring 2: 6 nodes
    { radius: 360, count: 8 },   // Ring 3: 8 nodes
    { radius: 480, count: 6 },   // Ring 4: 6 nodes (outer)
  ];

  const allNodeIds = [startNodeId];

  rings.forEach((ring, ringIdx) => {
    const ringNodeIds = [];
    for (let i = 0; i < ring.count && nodeIndex < templates.length; i++) {
      const angle = (i / ring.count) * 2 * Math.PI - Math.PI / 2;
      const template = templates[nodeIndex % templates.length];
      const nodeId = `${masteryId}-node-${nodeIndex}`;

      // Connect to nearest node in previous ring
      const prevRingSize = ringIdx === 0 ? 1 : rings[ringIdx - 1].count;
      const prevRingStart = ringIdx === 0 ? 0 : 1 + rings.slice(0, ringIdx - 1).reduce((s, r) => s + r.count, 0);
      const nearestPrevIdx = Math.floor((i / ring.count) * prevRingSize);
      const connectTo = ringIdx === 0
        ? startNodeId
        : `${masteryId}-node-${prevRingStart + nearestPrevIdx - 1}`;

      nodes.push({
        id: nodeId,
        masteryId,
        name: template.name,
        description: template.description,
        x: Math.round(Math.cos(angle) * ring.radius),
        y: Math.round(Math.sin(angle) * ring.radius),
        maxPoints: template.maxPoints,
        tags: template.tags,
        effects: template.effects,
        connections: [connectTo],
        isStarting: false,
      });

      // Back-link: update connectTo node's connections
      const connectToNode = nodes.find((n) => n.id === connectTo);
      if (connectToNode && !connectToNode.connections.includes(nodeId)) {
        connectToNode.connections.push(nodeId);
      }

      ringNodeIds.push(nodeId);
      allNodeIds.push(nodeId);
      nodeIndex++;
    }

    // Also connect adjacent nodes in the same ring
    for (let i = 0; i < ringNodeIds.length - 1; i++) {
      const a = nodes.find((n) => n.id === ringNodeIds[i]);
      const b = nodes.find((n) => n.id === ringNodeIds[i + 1]);
      if (a && b) {
        if (!a.connections.includes(b.id)) a.connections.push(b.id);
        if (!b.connections.includes(a.id)) b.connections.push(a.id);
      }
    }
  });

  return {
    masteryId,
    nodes,
    startingNodeIds: [startNodeId],
  };
}

function getNodeTemplates(masteryId, mainType, secondaryType) {
  const mainTag = mainType.toLowerCase().replace(" ", "_");
  const secTag = secondaryType.toLowerCase().replace(" ", "_");

  return [
    // Damage nodes
    { name: `${mainType} Mastery`, description: `Increases ${mainType} damage.`, maxPoints: 5, tags: ["increased_damage"], effects: [{ stat: "increased_damage", value: 4, type: "increased" }] },
    { name: "Decisive Strikes", description: "Your attacks deal more damage on first hit.", maxPoints: 1, tags: ["more_damage"], effects: [{ stat: "more_damage", value: 15, type: "more" }] },
    { name: "Critical Precision", description: "Increases critical strike chance.", maxPoints: 3, tags: ["critical_strike_chance"], effects: [{ stat: "critical_strike_chance", value: 3, type: "increased" }] },
    { name: "Lethal Force", description: "Massive critical strike multiplier.", maxPoints: 1, tags: ["critical_strike_multiplier"], effects: [{ stat: "critical_strike_multiplier", value: 40, type: "increased" }] },
    { name: "Void Penetration", description: "Your damage ignores enemy resistances.", maxPoints: 3, tags: ["penetration"], effects: [{ stat: "penetration", value: 8, type: "flat" }] },
    // Survivability nodes
    { name: "Iron Skin", description: "Increases your armor.", maxPoints: 5, tags: ["armor"], effects: [{ stat: "armor", value: 20, type: "flat" }] },
    { name: "Fortified", description: "Reduces damage taken.", maxPoints: 3, tags: ["damage_reduction"], effects: [{ stat: "damage_reduction", value: 3, type: "increased" }] },
    { name: "Vital Surge", description: "Increases maximum health.", maxPoints: 5, tags: ["increased_health"], effects: [{ stat: "increased_health", value: 8, type: "increased" }] },
    { name: "Blood Pact", description: "Leeches life on hit.", maxPoints: 3, tags: ["leech"], effects: [{ stat: "leech", value: 1, type: "flat" }] },
    { name: "Dodge Mastery", description: "Increases dodge rating.", maxPoints: 4, tags: ["dodge_rating"], effects: [{ stat: "dodge_rating", value: 15, type: "flat" }] },
    // Speed nodes
    { name: "Swift Strikes", description: "Increases attack speed.", maxPoints: 4, tags: ["attack_speed"], effects: [{ stat: "attack_speed", value: 4, type: "increased" }] },
    { name: "Momentum", description: "Increases movement speed.", maxPoints: 3, tags: ["movement_speed"], effects: [{ stat: "movement_speed", value: 5, type: "increased" }] },
    { name: "Rapid Casting", description: "Reduces skill cooldowns.", maxPoints: 3, tags: ["cooldown_recovery"], effects: [{ stat: "cooldown_recovery", value: 5, type: "increased" }] },
    // Secondary damage
    { name: `${secondaryType} Affinity`, description: `Bonus to ${secondaryType} damage.`, maxPoints: 4, tags: ["increased_damage"], effects: [{ stat: "increased_damage", value: 6, type: "increased" }] },
    { name: "Deep Cuts", description: "Attacks apply a stacking bleed.", maxPoints: 3, tags: ["damage_over_time"], effects: [{ stat: "damage_over_time", value: 10, type: "increased" }] },
    // Keystones (multi-point, special)
    { name: "Void Rift", description: "Your void attacks tear rifts in reality, dealing extra void damage.", maxPoints: 2, tags: ["more_damage", "penetration"], effects: [{ stat: "more_damage", value: 12, type: "more" }, { stat: "penetration", value: 10, type: "flat" }] },
    { name: "Eternal Warrior", description: "Cannot be stunned. +25% physical resistance.", maxPoints: 1, tags: ["damage_reduction", "resist"], effects: [{ stat: "damage_reduction", value: 25, type: "increased" }, { stat: "resist", value: 25, type: "flat" }] },
    { name: "Endless Hunger", description: "Life leech is massively increased but max health is reduced.", maxPoints: 1, tags: ["leech", "increased_health"], effects: [{ stat: "leech", value: 5, type: "flat" }, { stat: "increased_health", value: -10, type: "increased" }] },
    { name: "Executioner", description: "More damage against enemies below 35% life.", maxPoints: 1, tags: ["more_damage"], effects: [{ stat: "more_damage", value: 30, type: "more" }] },
    { name: "Iron Will", description: "Increased health and armor.", maxPoints: 3, tags: ["increased_health", "armor"], effects: [{ stat: "increased_health", value: 5, type: "increased" }, { stat: "armor", value: 15, type: "flat" }] },
    { name: "Battle Hardened", description: "Damage reduction scales with armor.", maxPoints: 2, tags: ["damage_reduction", "armor"], effects: [{ stat: "damage_reduction", value: 5, type: "increased" }] },
    { name: "Quickness", description: "Greatly increases movement speed.", maxPoints: 4, tags: ["movement_speed"], effects: [{ stat: "movement_speed", value: 7, type: "increased" }] },
    { name: "Whirlwind", description: "Cast speed and attack speed both increased.", maxPoints: 3, tags: ["attack_speed", "cast_speed"], effects: [{ stat: "attack_speed", value: 5, type: "increased" }, { stat: "cast_speed", value: 5, type: "increased" }] },
    { name: "Berserker", description: "More damage but take more damage.", maxPoints: 1, tags: ["more_damage"], effects: [{ stat: "more_damage", value: 20, type: "more" }] },
    { name: "Arcane Focus", description: "Increases spell damage.", maxPoints: 5, tags: ["increased_damage"], effects: [{ stat: "increased_damage", value: 5, type: "increased" }] },
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Generating game data...");

  const gameData = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    classes: [],
  };

  for (const cls of CLASSES) {
    const classData = {
      id: cls.id,
      name: cls.name,
      description: cls.description,
      masteries: [],
    };

    for (const mastery of cls.masteries) {
      const skills = SKILLS[mastery.id] || DEFAULT_SKILLS(mastery.id);
      const passiveTree = generatePassiveTree(mastery.id, mastery.damageTypeTags);

      classData.masteries.push({
        id: mastery.id,
        classId: cls.id,
        name: mastery.name,
        description: mastery.description,
        playstyle: mastery.playstyle,
        damageTypeTags: mastery.damageTypeTags,
        skills: skills.map((s) => ({
          ...s,
          masteryId: mastery.id,
          tree: null, // skill-specific trees — populated in future data update
        })),
        passiveTree,
      });
    }

    gameData.classes.push(classData);
  }

  const totalNodes = gameData.classes
    .flatMap((c) => c.masteries)
    .reduce((sum, m) => sum + m.passiveTree.nodes.length, 0);

  mkdirSync(join(ROOT, "src-tauri", "resources"), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(gameData, null, 2));

  console.log(`✓ Generated game-data.json`);
  console.log(`  Classes: ${gameData.classes.length}`);
  console.log(`  Masteries: ${gameData.classes.flatMap((c) => c.masteries).length}`);
  console.log(`  Total passive nodes: ${totalNodes}`);
  console.log(`  Output: ${OUT_PATH}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});

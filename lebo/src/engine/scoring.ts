import type { BuildScores, NodeEffect, PassiveNode, PassiveTree, StatType } from "../lib/types";

// ─── Tag → Dimension Mapping ──────────────────────────────────────────────────

const DAMAGE_STATS: StatType[] = [
  "increased_damage",
  "flat_damage",
  "more_damage",
  "critical_strike_chance",
  "critical_strike_multiplier",
  "penetration",
  "damage_over_time",
];

const SURVIVABILITY_STATS: StatType[] = [
  "increased_health",
  "flat_health",
  "armor",
  "damage_reduction",
  "dodge_rating",
  "block_chance",
  "resist",
  "leech",
];

const SPEED_STATS: StatType[] = [
  "movement_speed",
  "attack_speed",
  "cast_speed",
  "cooldown_recovery",
];

// ─── Effect Type Weights ──────────────────────────────────────────────────────
// 'more' multipliers are strongest, 'flat' is weakest
const EFFECT_TYPE_WEIGHT: Record<string, number> = {
  more: 3,
  increased: 2,
  flat: 1,
};

// ─── Stat Weights within each dimension ──────────────────────────────────────
const STAT_WEIGHT: Partial<Record<StatType, number>> = {
  more_damage: 3,
  critical_strike_multiplier: 2.5,
  penetration: 2,
  critical_strike_chance: 1.5,
  increased_damage: 1,
  flat_damage: 0.8,
  damage_over_time: 0.9,

  damage_reduction: 2.5,
  armor: 2,
  resist: 2,
  block_chance: 1.8,
  increased_health: 1.5,
  dodge_rating: 1.5,
  flat_health: 1,
  leech: 0.8,

  movement_speed: 3,
  attack_speed: 2,
  cast_speed: 2,
  cooldown_recovery: 1.5,
};

function effectScore(effect: NodeEffect): number {
  const statW = STAT_WEIGHT[effect.stat] ?? 1;
  const typeW = EFFECT_TYPE_WEIGHT[effect.type] ?? 1;
  return Math.abs(effect.value) * statW * typeW;
}

function dimensionScore(effects: NodeEffect[], stats: StatType[]): number {
  return effects
    .filter((e) => stats.includes(e.stat))
    .reduce((sum, e) => sum + effectScore(e), 0);
}

// ─── Mastery Maximum (theoretical) ───────────────────────────────────────────
// Cache per mastery so we only compute once
const masteryMaxCache = new Map<string, BuildScores>();

export function getMasteryMax(tree: PassiveTree): BuildScores {
  const cached = masteryMaxCache.get(tree.masteryId);
  if (cached) return cached;

  let damage = 0;
  let survivability = 0;
  let speed = 0;

  for (const node of tree.nodes) {
    const pts = node.maxPoints;
    const scaledEffects = node.effects.map((e) => ({ ...e, value: e.value * pts }));
    damage += dimensionScore(scaledEffects, DAMAGE_STATS);
    survivability += dimensionScore(scaledEffects, SURVIVABILITY_STATS);
    speed += dimensionScore(scaledEffects, SPEED_STATS);
  }

  // Avoid division by zero
  const max: BuildScores = {
    damage: damage || 1,
    survivability: survivability || 1,
    speed: speed || 1,
  };

  masteryMaxCache.set(tree.masteryId, max);
  return max;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeScores(
  allocations: Record<string, number>,
  tree: PassiveTree
): BuildScores {
  const nodeMap = new Map<string, PassiveNode>(tree.nodes.map((n) => [n.id, n]));
  const max = getMasteryMax(tree);

  let damage = 0;
  let survivability = 0;
  let speed = 0;

  for (const [nodeId, points] of Object.entries(allocations)) {
    const node = nodeMap.get(nodeId);
    if (!node || points <= 0) continue;
    const scaledEffects = node.effects.map((e) => ({ ...e, value: e.value * points }));
    damage += dimensionScore(scaledEffects, DAMAGE_STATS);
    survivability += dimensionScore(scaledEffects, SURVIVABILITY_STATS);
    speed += dimensionScore(scaledEffects, SPEED_STATS);
  }

  return {
    damage: Math.min(100, Math.round((damage / max.damage) * 100)),
    survivability: Math.min(100, Math.round((survivability / max.survivability) * 100)),
    speed: Math.min(100, Math.round((speed / max.speed) * 100)),
  };
}

export function clearMasteryMaxCache() {
  masteryMaxCache.clear();
}

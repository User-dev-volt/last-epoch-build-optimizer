// ─── Game Data Types ──────────────────────────────────────────────────────────

export type StatType =
  | "increased_damage"
  | "flat_damage"
  | "more_damage"
  | "critical_strike_chance"
  | "critical_strike_multiplier"
  | "penetration"
  | "damage_over_time"
  | "increased_health"
  | "flat_health"
  | "armor"
  | "damage_reduction"
  | "dodge_rating"
  | "block_chance"
  | "resist"
  | "leech"
  | "movement_speed"
  | "attack_speed"
  | "cast_speed"
  | "cooldown_recovery";

export type EffectType = "flat" | "increased" | "more";

export interface NodeEffect {
  stat: StatType;
  value: number;
  type: EffectType;
}

export interface PassiveNode {
  id: string;
  masteryId: string;
  name: string;
  description: string;
  x: number;
  y: number;
  maxPoints: number;
  tags: string[];
  effects: NodeEffect[];
  connections: string[]; // adjacent node IDs
}

export interface SkillNode {
  id: string;
  skillId: string;
  name: string;
  description: string;
  x: number;
  y: number;
  maxPoints: number;
  tags: string[];
  effects: NodeEffect[];
  connections: string[];
}

export interface PassiveTree {
  masteryId: string;
  nodes: PassiveNode[];
  startingNodeIds: string[];
}

export interface SkillTree {
  skillId: string;
  nodes: SkillNode[];
  startingNodeIds: string[];
}

export interface Skill {
  id: string;
  masteryId: string;
  name: string;
  description: string;
  damageTypes: string[];
  tree?: SkillTree;
}

export interface Mastery {
  id: string;
  classId: string;
  name: string;
  description: string;
  playstyle: string;
  damageTypeTags: string[];
  passiveTree?: PassiveTree;
  skills?: Skill[];
}

export interface Class {
  id: string;
  name: string;
  description: string;
  masteries: Mastery[];
}

// ─── Build Types ──────────────────────────────────────────────────────────────

export interface Build {
  id: string;
  name: string;
  classId: string;
  masteryId: string;
  passiveAllocations: Record<string, number>; // nodeId → pointsAllocated
  skillAllocations: Record<string, Record<string, number>>; // skillId → nodeId → points
  equippedSkills: string[]; // skillIds, up to 5
  createdAt: string;
  updatedAt: string;
}

export interface BuildSummary {
  id: string;
  name: string;
  classId: string;
  className: string;
  masteryId: string;
  masteryName: string;
  updatedAt: string;
}

// ─── Scoring Types ────────────────────────────────────────────────────────────

export interface BuildScores {
  damage: number;      // 0–100
  survivability: number;
  speed: number;
}

// ─── Optimization Types ───────────────────────────────────────────────────────

export type OptimizationGoal = "damage" | "survivability" | "speed" | "balanced";

export interface ScoreDelta {
  damage: number;
  survivability: number;
  speed: number;
}

export interface Suggestion {
  id: string;
  type: "add" | "remove" | "swap";
  nodeId: string;
  swapNodeId?: string;
  scoreDelta: ScoreDelta;
  explanation: string;
  rank: number;
}

export interface OptimizationResponse {
  suggestions: Suggestion[];
  overallAnalysis: string;
}

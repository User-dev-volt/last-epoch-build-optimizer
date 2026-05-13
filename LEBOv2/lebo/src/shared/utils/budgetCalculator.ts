// Last Epoch passive point formula: 1 point per level starting at level 3.
// Source: https://lastepoch.fandom.com/wiki/Passives (verified 2026-05)
// Quest-reward points (up to 15 additional) are excluded — they vary by playthrough completion.
export const MAX_CHARACTER_LEVEL = 100

export function calculatePassivePoints(level: number): number {
  return Math.max(0, level - 2)
}

export const MAX_PASSIVE_POINTS = calculatePassivePoints(MAX_CHARACTER_LEVEL)

// Last Epoch skill point formula: 1 point per level, 1–20.
// Source: https://lastepoch.fandom.com/wiki/Skills (confirmed 2026-05; 20 levels, 1 point each)
export const MAX_SKILL_LEVEL = 20

export function calculateSkillPoints(level: number): number {
  return level
}

export const MAX_SKILL_POINTS = calculateSkillPoints(MAX_SKILL_LEVEL)

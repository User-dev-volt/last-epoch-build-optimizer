// Approximation based on community data: passive points = level + 20
const PASSIVE_POINT_BONUS = 20
export const MAX_CHARACTER_LEVEL = 100

export function calculatePassivePoints(level: number): number {
  return level + PASSIVE_POINT_BONUS
}

// Stub for Story 3.2 — skill points per skill level
export function calculateSkillPoints(level: number): number {
  return level
}

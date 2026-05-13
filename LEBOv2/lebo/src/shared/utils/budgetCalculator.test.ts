import { describe, it, expect } from 'vitest'
import { calculatePassivePoints, calculateSkillPoints, MAX_PASSIVE_POINTS, MAX_CHARACTER_LEVEL } from './budgetCalculator'

describe('calculatePassivePoints', () => {
  it('level 1 → 0 (no points before level 3)', () => {
    expect(calculatePassivePoints(1)).toBe(0)
  })

  it('level 2 → 0 (first point granted at level 3)', () => {
    expect(calculatePassivePoints(2)).toBe(0)
  })

  it('level 3 → 1 (first passive point)', () => {
    expect(calculatePassivePoints(3)).toBe(1)
  })

  it('level 50 → 48', () => {
    expect(calculatePassivePoints(50)).toBe(48)
  })

  it('level 100 → 98', () => {
    expect(calculatePassivePoints(100)).toBe(98)
  })
})

describe('MAX_PASSIVE_POINTS', () => {
  it('equals calculatePassivePoints at MAX_CHARACTER_LEVEL', () => {
    expect(MAX_PASSIVE_POINTS).toBe(calculatePassivePoints(MAX_CHARACTER_LEVEL))
  })

  it('is 98 at level 100', () => {
    expect(MAX_PASSIVE_POINTS).toBe(98)
  })
})

describe('calculateSkillPoints', () => {
  it('level 1 → 1', () => {
    expect(calculateSkillPoints(1)).toBe(1)
  })

  it('level 20 → 20', () => {
    expect(calculateSkillPoints(20)).toBe(20)
  })
})

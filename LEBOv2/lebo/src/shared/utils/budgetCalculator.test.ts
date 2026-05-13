import { describe, it, expect } from 'vitest'
import { calculatePassivePoints, calculateSkillPoints } from './budgetCalculator'

describe('calculatePassivePoints', () => {
  it('level 1 → 21', () => {
    expect(calculatePassivePoints(1)).toBe(21)
  })

  it('level 50 → 70', () => {
    expect(calculatePassivePoints(50)).toBe(70)
  })

  it('level 100 → 120', () => {
    expect(calculatePassivePoints(100)).toBe(120)
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

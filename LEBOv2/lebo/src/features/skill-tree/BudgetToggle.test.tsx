import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { BudgetToggle } from './BudgetToggle'
import { useBuildStore } from '../../shared/stores/buildStore'

vi.mock('../../shared/stores/buildStore', () => ({
  useBuildStore: vi.fn(),
}))

const mockSetCharacterLevel = vi.fn()
const mockSetBudgetEnforced = vi.fn()

const baseStore = {
  activeBuild: {
    schemaVersion: 1 as const,
    id: 'build-1',
    name: 'Test',
    classId: 'sentinel',
    masteryId: 'void_knight',
    characterLevel: 10,
    budgetEnforced: false,
    nodeAllocations: {},
    skillNodeAllocations: {},
    contextData: { gear: [], skills: [], idols: [] },
    isPersisted: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  setCharacterLevel: mockSetCharacterLevel,
  setBudgetEnforced: mockSetBudgetEnforced,
}

describe('BudgetToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useBuildStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (s: typeof baseStore) => unknown) => selector(baseStore)
    )
  })

  it('renders level input with current characterLevel', () => {
    render(<BudgetToggle />)
    const input = screen.getByRole('spinbutton', { name: /character level/i })
    expect((input as HTMLInputElement).value).toBe('10')
  })

  it('renders the budget toggle switch', () => {
    render(<BudgetToggle />)
    const toggle = screen.getByRole('switch', { name: /enforce level budget/i })
    expect(toggle).toBeTruthy()
  })

  it('calls setCharacterLevel with clamped value on level input change', () => {
    render(<BudgetToggle />)
    const input = screen.getByRole('spinbutton', { name: /character level/i })
    fireEvent.change(input, { target: { value: '50' } })
    expect(mockSetCharacterLevel).toHaveBeenCalledWith(50)
  })

  it('clamps level to 100 when value exceeds max', () => {
    render(<BudgetToggle />)
    const input = screen.getByRole('spinbutton', { name: /character level/i })
    fireEvent.change(input, { target: { value: '150' } })
    expect(mockSetCharacterLevel).toHaveBeenCalledWith(100)
  })

  it('clamps level to 1 when value is below min', () => {
    render(<BudgetToggle />)
    const input = screen.getByRole('spinbutton', { name: /character level/i })
    fireEvent.change(input, { target: { value: '0' } })
    expect(mockSetCharacterLevel).toHaveBeenCalledWith(1)
  })

  it('calls setBudgetEnforced when switch is toggled', () => {
    render(<BudgetToggle />)
    const toggle = screen.getByRole('switch', { name: /enforce level budget/i })
    fireEvent.click(toggle)
    expect(mockSetBudgetEnforced).toHaveBeenCalledWith(true)
  })

  it('returns null when activeBuild is null', () => {
    ;(useBuildStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (s: typeof baseStore) => unknown) =>
        selector({ ...baseStore, activeBuild: null as unknown as typeof baseStore['activeBuild'] })
    )
    const { container } = render(<BudgetToggle />)
    expect(container.firstChild).toBeNull()
  })

  it('passes axe accessibility check', async () => {
    const { container } = render(<BudgetToggle />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

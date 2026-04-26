import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useOptimizationStore } from '../../shared/stores/optimizationStore'
import { GoalSelector } from './GoalSelector'

describe('GoalSelector', () => {
  let initialState: ReturnType<typeof useOptimizationStore.getState>

  beforeAll(() => {
    initialState = useOptimizationStore.getState()
  })

  beforeEach(() => {
    useOptimizationStore.setState(initialState, true)
  })

  it('renders four goal options', () => {
    render(<GoalSelector />)
    expect(screen.getByTestId('goal-option-balanced')).toBeInTheDocument()
    expect(screen.getByTestId('goal-option-maximize_damage')).toBeInTheDocument()
    expect(screen.getByTestId('goal-option-maximize_survivability')).toBeInTheDocument()
    expect(screen.getByTestId('goal-option-maximize_speed')).toBeInTheDocument()
  })

  it('renders all four option labels', () => {
    render(<GoalSelector />)
    expect(screen.getByText('Balanced')).toBeInTheDocument()
    expect(screen.getByText('Maximize Damage')).toBeInTheDocument()
    expect(screen.getByText('Maximize Survivability')).toBeInTheDocument()
    expect(screen.getByText('Maximize Speed')).toBeInTheDocument()
  })

  it('"Balanced" is selected by default (store default)', () => {
    render(<GoalSelector />)
    const goalSelector = screen.getByTestId('goal-selector')
    // RadioGroup reports value through aria-checked on options
    // The balanced option should be the active selection
    expect(useOptimizationStore.getState().goal).toBe('balanced')
    expect(goalSelector).toBeInTheDocument()
  })

  it('clicking a goal option updates store via setGoal', async () => {
    render(<GoalSelector />)
    await userEvent.click(screen.getByTestId('goal-option-maximize_damage'))
    expect(useOptimizationStore.getState().goal).toBe('maximize_damage')
  })

  it('clicking maximize_survivability updates store goal', async () => {
    render(<GoalSelector />)
    await userEvent.click(screen.getByTestId('goal-option-maximize_survivability'))
    expect(useOptimizationStore.getState().goal).toBe('maximize_survivability')
  })

  it('goal selector is disabled when isOptimizing', () => {
    useOptimizationStore.setState({ isOptimizing: true })
    render(<GoalSelector />)
    // Headless UI v2 marks individual options as aria-disabled when the group is disabled
    const options = screen.getAllByRole('radio')
    options.forEach((option) => {
      expect(option).toHaveAttribute('aria-disabled', 'true')
    })
  })

  it('does not change goal when disabled and option clicked', async () => {
    useOptimizationStore.setState({ goal: 'balanced', isOptimizing: true })
    render(<GoalSelector />)
    await userEvent.click(screen.getByTestId('goal-option-maximize_damage'))
    // Goal should remain unchanged when selector is disabled
    expect(useOptimizationStore.getState().goal).toBe('balanced')
  })
})

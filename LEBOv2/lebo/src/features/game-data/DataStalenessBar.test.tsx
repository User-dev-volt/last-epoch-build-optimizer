import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataStalenessBar } from './DataStalenessBar'
import { useGameDataStore } from '../../shared/stores/gameDataStore'
import { useOptimizationStore } from '../../shared/stores/optimizationStore'

vi.mock('./gameDataLoader', () => ({
  triggerDataUpdate: vi.fn(),
}))

import { triggerDataUpdate } from './gameDataLoader'

const mockTriggerDataUpdate = vi.mocked(triggerDataUpdate)

const initialGameDataState = useGameDataStore.getState()
const initialOptimizationState = useOptimizationStore.getState()

describe('DataStalenessBar', () => {
  beforeEach(() => {
    useGameDataStore.setState(initialGameDataState, true)
    useOptimizationStore.setState(initialOptimizationState, true)
    mockTriggerDataUpdate.mockReset()
    mockTriggerDataUpdate.mockResolvedValue(undefined)
  })

  it('does not render when isStale is false', () => {
    render(<DataStalenessBar />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not render when isStale=true but stalenessAcknowledged=true', () => {
    useGameDataStore.setState({ isStale: true, stalenessAcknowledged: true })
    render(<DataStalenessBar />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders amber banner with version count when isStale=true and not acknowledged', () => {
    useGameDataStore.setState({ isStale: true, stalenessAcknowledged: false, versionsBehind: 1 })
    render(<DataStalenessBar />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/1 version\(s\) behind/)).toBeInTheDocument()
    expect(screen.getByText('Update Now')).toBeInTheDocument()
    expect(screen.getByText('Continue with current data')).toBeInTheDocument()
  })

  it('"Update Now" is disabled and shows "Downloading…" when isUpdating=true', () => {
    useGameDataStore.setState({ isStale: true, stalenessAcknowledged: false, versionsBehind: 1, isUpdating: true })
    render(<DataStalenessBar />)
    const btn = screen.getByText('Downloading…')
    expect(btn).toBeDisabled()
  })

  it('"Update Now" is disabled when optimization is running', () => {
    useGameDataStore.setState({ isStale: true, stalenessAcknowledged: false, versionsBehind: 1 })
    useOptimizationStore.setState({ isOptimizing: true })
    render(<DataStalenessBar />)
    expect(screen.getByText('Update Now')).toBeDisabled()
  })

  it('"Continue with current data" calls acknowledgeStaleness', async () => {
    useGameDataStore.setState({ isStale: true, stalenessAcknowledged: false, versionsBehind: 1 })
    render(<DataStalenessBar />)
    await userEvent.click(screen.getByText('Continue with current data'))
    expect(useGameDataStore.getState().stalenessAcknowledged).toBe(true)
  })

  it('shows error message with Retry button when triggerDataUpdate rejects', async () => {
    mockTriggerDataUpdate.mockRejectedValue(new Error('Connection refused'))
    useGameDataStore.setState({ isStale: true, stalenessAcknowledged: false, versionsBehind: 1 })
    render(<DataStalenessBar />)
    await userEvent.click(screen.getByText('Update Now'))
    expect(await screen.findByText(/Update failed: Connection refused/)).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })
})

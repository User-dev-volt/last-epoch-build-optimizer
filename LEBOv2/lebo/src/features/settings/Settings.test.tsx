import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useAppStore } from '../../shared/stores/appStore'
import { Settings } from './Settings'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve(false)),
}))

describe('Settings', () => {
  const initialState = useAppStore.getState()

  beforeEach(() => {
    useAppStore.setState(initialState, true)
  })

  it('renders the Settings heading', () => {
    render(<Settings />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders the Back button', () => {
    render(<Settings />)
    expect(screen.getByTestId('settings-back-btn')).toBeInTheDocument()
    expect(screen.getByText('← Back')).toBeInTheDocument()
  })

  it('renders the Claude API Key section', () => {
    render(<Settings />)
    expect(screen.getByText('AI API Key')).toBeInTheDocument()
  })

  it('Back button calls setCurrentView("main")', () => {
    useAppStore.setState({ currentView: 'settings' })
    render(<Settings />)
    fireEvent.click(screen.getByTestId('settings-back-btn'))
    expect(useAppStore.getState().currentView).toBe('main')
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useAppStore } from '../../shared/stores/appStore'
import { Settings } from './Settings'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd: string) => {
    if (cmd === 'get_llm_provider') return Promise.resolve('claude')
    if (cmd === 'check_api_key_configured') return Promise.resolve(false)
    if (cmd === 'check_openrouter_configured') return Promise.resolve(false)
    if (cmd === 'get_model_preference') return Promise.resolve('free-first')
    return Promise.resolve(undefined)
  }),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
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

  it('renders the ProviderSelector (AI Provider section)', () => {
    render(<Settings />)
    expect(screen.getByTestId('provider-selector')).toBeInTheDocument()
  })

  it('renders the AI Provider heading', () => {
    render(<Settings />)
    expect(screen.getByText('AI Provider')).toBeInTheDocument()
  })

  it('Back button calls setCurrentView("main")', () => {
    useAppStore.setState({ currentView: 'settings' })
    render(<Settings />)
    fireEvent.click(screen.getByTestId('settings-back-btn'))
    expect(useAppStore.getState().currentView).toBe('main')
  })
})

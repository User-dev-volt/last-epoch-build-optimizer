import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAppStore } from '../../shared/stores/appStore'
import { ProviderSelector } from './ProviderSelector'

const mockInvoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

import toast from 'react-hot-toast'

describe('ProviderSelector', () => {
  const initialState = useAppStore.getState()

  beforeEach(() => {
    useAppStore.setState(initialState, true)
    vi.clearAllMocks()
    // Default: get_llm_provider → "claude", check_openrouter_configured → false
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_llm_provider') return Promise.resolve('claude')
      if (cmd === 'check_openrouter_configured') return Promise.resolve(false)
      if (cmd === 'get_model_preference') return Promise.resolve('free-first')
      return Promise.resolve(undefined)
    })
  })

  it('calls get_llm_provider on mount', async () => {
    render(<ProviderSelector />)
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('get_llm_provider', undefined)
    })
  })

  it('sets llmProvider in store from mount result', async () => {
    render(<ProviderSelector />)
    await waitFor(() => {
      expect(useAppStore.getState().llmProvider).toBe('claude')
    })
  })

  it('renders provider-selector control', async () => {
    render(<ProviderSelector />)
    expect(screen.getByTestId('provider-selector')).toBeInTheDocument()
    expect(screen.getByTestId('provider-claude')).toBeInTheDocument()
    expect(screen.getByTestId('provider-openrouter')).toBeInTheDocument()
  })

  it('shows AI Provider heading', () => {
    render(<ProviderSelector />)
    expect(screen.getByText('AI Provider')).toBeInTheDocument()
  })

  it('shows neither provider input during null loading state', () => {
    useAppStore.setState({ llmProvider: null })
    render(<ProviderSelector />)
    expect(screen.queryByTestId('api-key-input')).not.toBeInTheDocument()
    expect(screen.queryByTestId('openrouter-key-input')).not.toBeInTheDocument()
  })

  it('shows ApiKeyInput when Claude is selected', async () => {
    useAppStore.setState({ llmProvider: 'claude' })
    render(<ProviderSelector />)
    await waitFor(() => {
      expect(screen.getByTestId('api-key-input')).toBeInTheDocument()
    })
  })

  it('shows OpenRouterInput when OpenRouter is selected', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_llm_provider') return Promise.resolve('openrouter')
      if (cmd === 'check_openrouter_configured') return Promise.resolve(false)
      if (cmd === 'get_model_preference') return Promise.resolve('free-first')
      return Promise.resolve(undefined)
    })
    render(<ProviderSelector />)
    await waitFor(() => {
      expect(screen.getByTestId('openrouter-key-input')).toBeInTheDocument()
    })
  })

  it('switching to OpenRouter calls set_llm_provider and updates store', async () => {
    useAppStore.setState({ llmProvider: 'claude' })
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_llm_provider') return Promise.resolve('claude')
      if (cmd === 'set_llm_provider') return Promise.resolve(undefined)
      if (cmd === 'check_openrouter_configured') return Promise.resolve(false)
      if (cmd === 'get_model_preference') return Promise.resolve('free-first')
      return Promise.resolve(undefined)
    })
    render(<ProviderSelector />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('get_llm_provider', undefined))

    fireEvent.click(screen.getByTestId('provider-openrouter'))

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('set_llm_provider', { provider: 'openrouter' })
    })
    await waitFor(() => {
      expect(useAppStore.getState().llmProvider).toBe('openrouter')
    })
    expect(toast.success).toHaveBeenCalledWith('Switched to OpenRouter')
  })

  it('switching back to Claude calls set_llm_provider with "claude"', async () => {
    useAppStore.setState({ llmProvider: 'openrouter' })
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_llm_provider') return Promise.resolve('openrouter')
      if (cmd === 'set_llm_provider') return Promise.resolve(undefined)
      if (cmd === 'check_openrouter_configured') return Promise.resolve(false)
      if (cmd === 'get_model_preference') return Promise.resolve('free-first')
      return Promise.resolve(undefined)
    })
    render(<ProviderSelector />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('get_llm_provider', undefined))

    fireEvent.click(screen.getByTestId('provider-claude'))

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('set_llm_provider', { provider: 'claude' })
    })
    expect(toast.success).toHaveBeenCalledWith('Switched to Claude')
  })
})

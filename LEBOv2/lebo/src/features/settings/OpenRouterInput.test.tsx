import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OpenRouterInput } from './OpenRouterInput'

const mockInvoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

import toast from 'react-hot-toast'

describe('OpenRouterInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'check_openrouter_configured') return Promise.resolve(false)
      if (cmd === 'get_model_preference') return Promise.resolve('free-first')
      return Promise.resolve(undefined)
    })
  })

  it('calls check_openrouter_configured on mount', async () => {
    render(<OpenRouterInput />)
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('check_openrouter_configured', undefined)
    })
  })

  it('calls get_model_preference on mount', async () => {
    render(<OpenRouterInput />)
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('get_model_preference', undefined)
    })
  })

  it('key input is type=password (masked)', () => {
    render(<OpenRouterInput />)
    const input = screen.getByTestId('openrouter-key-input') as HTMLInputElement
    expect(input.type).toBe('password')
  })

  it('shows saved placeholder when configured', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'check_openrouter_configured') return Promise.resolve(true)
      if (cmd === 'get_model_preference') return Promise.resolve('free-first')
      return Promise.resolve(undefined)
    })
    render(<OpenRouterInput />)
    await waitFor(() => {
      const input = screen.getByTestId('openrouter-key-input') as HTMLInputElement
      expect(input.placeholder).toBe('OpenRouter API key saved ✓')
    })
  })

  it('Save button is disabled when key is empty and not configured', async () => {
    render(<OpenRouterInput />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled())
    expect(screen.getByTestId('save-openrouter-btn')).toBeDisabled()
  })

  it('Save button is enabled when key input has value', async () => {
    render(<OpenRouterInput />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled())
    fireEvent.change(screen.getByTestId('openrouter-key-input'), { target: { value: 'sk-or-test' } })
    expect(screen.getByTestId('save-openrouter-btn')).not.toBeDisabled()
  })

  it('Save button is enabled when already configured (no key input needed)', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'check_openrouter_configured') return Promise.resolve(true)
      if (cmd === 'get_model_preference') return Promise.resolve('free-first')
      return Promise.resolve(undefined)
    })
    render(<OpenRouterInput />)
    await waitFor(() => {
      expect(screen.getByTestId('save-openrouter-btn')).not.toBeDisabled()
    })
  })

  it('Save calls set_openrouter_api_key when key non-empty and set_model_preference', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'check_openrouter_configured') return Promise.resolve(false)
      if (cmd === 'get_model_preference') return Promise.resolve('free-first')
      if (cmd === 'set_openrouter_api_key') return Promise.resolve(undefined)
      if (cmd === 'set_model_preference') return Promise.resolve(undefined)
      return Promise.resolve(undefined)
    })
    render(<OpenRouterInput />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled())

    fireEvent.change(screen.getByTestId('openrouter-key-input'), { target: { value: 'sk-or-test' } })
    fireEvent.click(screen.getByTestId('save-openrouter-btn'))

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('set_openrouter_api_key', { key: 'sk-or-test' })
      expect(mockInvoke).toHaveBeenCalledWith('set_model_preference', { preference: 'free-first' })
    })
    expect(toast.success).toHaveBeenCalledWith('OpenRouter settings saved')
  })

  it('shows inline error on save failure', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'check_openrouter_configured') return Promise.resolve(false)
      if (cmd === 'get_model_preference') return Promise.resolve('free-first')
      if (cmd === 'set_openrouter_api_key') return Promise.reject({ type: 'STORAGE_ERROR', message: 'Vault locked' })
      return Promise.resolve(undefined)
    })
    render(<OpenRouterInput />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled())

    fireEvent.change(screen.getByTestId('openrouter-key-input'), { target: { value: 'sk-or-test' } })
    fireEvent.click(screen.getByTestId('save-openrouter-btn'))

    await waitFor(() => {
      expect(screen.getByText('Vault locked')).toBeInTheDocument()
    })
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('does not clear key field or set configured when model preference save fails', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'check_openrouter_configured') return Promise.resolve(false)
      if (cmd === 'get_model_preference') return Promise.resolve('free-first')
      if (cmd === 'set_openrouter_api_key') return Promise.resolve(undefined)
      if (cmd === 'set_model_preference') return Promise.reject({ type: 'STORAGE_ERROR', message: 'Vault full' })
      return Promise.resolve(undefined)
    })
    render(<OpenRouterInput />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled())

    fireEvent.change(screen.getByTestId('openrouter-key-input'), { target: { value: 'sk-or-test' } })
    fireEvent.click(screen.getByTestId('save-openrouter-btn'))

    await waitFor(() => {
      expect(screen.getByText('Vault full')).toBeInTheDocument()
    })
    const input = screen.getByTestId('openrouter-key-input') as HTMLInputElement
    expect(input.value).toBe('sk-or-test')
    expect(input.placeholder).toBe('sk-or-...')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('"free-first" radio is selected by default', async () => {
    render(<OpenRouterInput />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled())
    const radio = screen.getByTestId('model-preference-free-first') as HTMLInputElement
    expect(radio.checked).toBe(true)
  })

  it('"Always use this model" reveals model picker', async () => {
    render(<OpenRouterInput />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled())

    expect(screen.queryByTestId('model-picker')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('model-preference-always'))
    expect(screen.getByTestId('model-picker')).toBeInTheDocument()
  })

  it('saves selected model ID when "Always use this model" is chosen', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'check_openrouter_configured') return Promise.resolve(true)
      if (cmd === 'get_model_preference') return Promise.resolve('free-first')
      if (cmd === 'set_model_preference') return Promise.resolve(undefined)
      return Promise.resolve(undefined)
    })
    render(<OpenRouterInput />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled())

    fireEvent.click(screen.getByTestId('model-preference-always'))
    fireEvent.change(screen.getByTestId('model-picker'), {
      target: { value: 'google/gemini-2.0-flash-exp:free' },
    })
    fireEvent.click(screen.getByTestId('save-openrouter-btn'))

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('set_model_preference', {
        preference: 'google/gemini-2.0-flash-exp:free',
      })
    })
  })

  it('pre-selects "Always use this model" when saved preference is a model ID', async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'check_openrouter_configured') return Promise.resolve(true)
      if (cmd === 'get_model_preference') return Promise.resolve('meta-llama/llama-3.3-70b-instruct:free')
      return Promise.resolve(undefined)
    })
    render(<OpenRouterInput />)
    await waitFor(() => {
      const radio = screen.getByTestId('model-preference-always') as HTMLInputElement
      expect(radio.checked).toBe(true)
    })
    const picker = screen.getByTestId('model-picker') as HTMLSelectElement
    expect(picker.value).toBe('meta-llama/llama-3.3-70b-instruct:free')
  })
})

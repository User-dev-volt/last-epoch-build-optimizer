import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAppStore } from '../../shared/stores/appStore'
import { ApiKeyInput } from './ApiKeyInput'

const mockInvoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

import toast from 'react-hot-toast'

describe('ApiKeyInput', () => {
  const initialState = useAppStore.getState()

  beforeEach(() => {
    useAppStore.setState(initialState, true)
    vi.clearAllMocks()
    mockInvoke.mockResolvedValue(false)
  })

  it('calls check_api_key_configured on mount', async () => {
    render(<ApiKeyInput />)
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('check_api_key_configured', undefined)
    })
  })

  it('sets isApiKeyConfigured from mount check result', async () => {
    mockInvoke.mockResolvedValueOnce(true)
    render(<ApiKeyInput />)
    await waitFor(() => {
      expect(useAppStore.getState().isApiKeyConfigured).toBe(true)
    })
  })

  it('Save Key button is disabled when input is empty', async () => {
    render(<ApiKeyInput />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled())
    const btn = screen.getByTestId('save-key-btn')
    expect(btn).toBeDisabled()
  })

  it('Save Key button is enabled when input has value', async () => {
    render(<ApiKeyInput />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled())
    fireEvent.change(screen.getByTestId('api-key-input'), { target: { value: 'sk-ant-test' } })
    expect(screen.getByTestId('save-key-btn')).not.toBeDisabled()
  })

  it('on save success: calls set_api_key, shows toast, clears input, updates isApiKeyConfigured', async () => {
    mockInvoke.mockResolvedValueOnce(false) // check_api_key_configured
    mockInvoke.mockResolvedValueOnce(undefined) // set_api_key
    render(<ApiKeyInput />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('check_api_key_configured', undefined))

    fireEvent.change(screen.getByTestId('api-key-input'), { target: { value: 'sk-ant-test' } })
    fireEvent.click(screen.getByTestId('save-key-btn'))

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('set_api_key', { key: 'sk-ant-test' })
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('API key saved securely')
      expect(useAppStore.getState().isApiKeyConfigured).toBe(true)
      expect((screen.getByTestId('api-key-input') as HTMLInputElement).value).toBe('')
    })
  })

  it('on save error: shows inline error, not toast', async () => {
    mockInvoke.mockResolvedValueOnce(false) // check_api_key_configured
    mockInvoke.mockRejectedValueOnce({ type: 'STORAGE_ERROR', message: 'Vault locked' })
    render(<ApiKeyInput />)
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('check_api_key_configured', undefined))

    fireEvent.change(screen.getByTestId('api-key-input'), { target: { value: 'sk-ant-test' } })
    fireEvent.click(screen.getByTestId('save-key-btn'))

    await waitFor(() => {
      expect(screen.getByText('Vault locked')).toBeInTheDocument()
      expect(toast.success).not.toHaveBeenCalled()
    })
  })

  it('shows saved placeholder when isApiKeyConfigured is true', async () => {
    mockInvoke.mockResolvedValueOnce(true)
    render(<ApiKeyInput />)
    await waitFor(() => expect(useAppStore.getState().isApiKeyConfigured).toBe(true))
    const input = screen.getByTestId('api-key-input') as HTMLInputElement
    expect(input.placeholder).toBe('Claude API key saved ✓')
  })
})

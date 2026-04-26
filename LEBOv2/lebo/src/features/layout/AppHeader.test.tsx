import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useAppStore } from '../../shared/stores/appStore'
import { AppHeader } from './AppHeader'

describe('AppHeader', () => {
  const initialState = useAppStore.getState()

  beforeEach(() => {
    useAppStore.setState({ ...initialState, currentView: 'main' }, true)
  })

  it('renders the app name', () => {
    render(<AppHeader />)
    expect(screen.getByText('LEBOv2')).toBeInTheDocument()
  })

  it('renders the full product title', () => {
    render(<AppHeader />)
    expect(screen.getByText('Last Epoch Build Optimizer')).toBeInTheDocument()
  })

  it('renders a header landmark', () => {
    render(<AppHeader />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('shows Settings button when currentView is "main"', () => {
    useAppStore.setState({ currentView: 'main' })
    render(<AppHeader />)
    expect(screen.getByTestId('settings-button')).toBeInTheDocument()
  })

  it('hides Settings button when currentView is "settings"', () => {
    useAppStore.setState({ currentView: 'settings' })
    render(<AppHeader />)
    expect(screen.queryByTestId('settings-button')).toBeNull()
  })

  it('Settings button navigates to settings view on click', () => {
    useAppStore.setState({ currentView: 'main' })
    render(<AppHeader />)
    fireEvent.click(screen.getByTestId('settings-button'))
    expect(useAppStore.getState().currentView).toBe('settings')
  })
})

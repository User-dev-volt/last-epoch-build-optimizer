import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppHeader } from './AppHeader'

describe('AppHeader', () => {
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
})

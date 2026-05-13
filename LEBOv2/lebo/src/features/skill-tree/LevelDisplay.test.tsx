import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { LevelDisplay } from './LevelDisplay'

describe('LevelDisplay', () => {
  it('renders the character level with Lv. prefix', () => {
    render(<LevelDisplay characterLevel={42} />)
    expect(screen.getByText('Lv. 42')).toBeTruthy()
  })

  it('renders level 1', () => {
    render(<LevelDisplay characterLevel={1} />)
    expect(screen.getByText('Lv. 1')).toBeTruthy()
  })

  it('renders level 100', () => {
    render(<LevelDisplay characterLevel={100} />)
    expect(screen.getByText('Lv. 100')).toBeTruthy()
  })

  it('passes axe accessibility check', async () => {
    const { container } = render(<LevelDisplay characterLevel={50} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

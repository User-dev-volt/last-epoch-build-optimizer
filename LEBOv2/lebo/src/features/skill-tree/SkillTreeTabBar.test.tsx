import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SkillTreeTabBar } from './SkillTreeTabBar'
import type { ActiveSkill } from '../../shared/types/build'

const twoSkills: ActiveSkill[] = [
  { slotId: 'slot-1', skillName: 'Judgement' },
  { slotId: 'slot-2', skillName: 'Volatile Reversal' },
]

describe('SkillTreeTabBar', () => {
  it('renders only Passive Tree tab when activeSkills is empty', () => {
    render(<SkillTreeTabBar activeSkills={[]} selectedIndex={0} onChange={() => {}} />)
    expect(screen.getByText('Passive Tree')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Judgement/ })).toBeNull()
  })

  it('renders Passive Tree plus one tab per active skill', () => {
    render(<SkillTreeTabBar activeSkills={twoSkills} selectedIndex={0} onChange={() => {}} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(screen.getByText('Judgement')).toBeInTheDocument()
    expect(screen.getByText('Volatile Reversal')).toBeInTheDocument()
  })

  it('marks the tab at selectedIndex as aria-selected', () => {
    render(<SkillTreeTabBar activeSkills={twoSkills} selectedIndex={1} onChange={() => {}} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0].getAttribute('aria-selected')).toBe('false')
    expect(tabs[1].getAttribute('aria-selected')).toBe('true')
    expect(tabs[2].getAttribute('aria-selected')).toBe('false')
  })

  it('calls onChange with the clicked tab index', async () => {
    const onChange = vi.fn()
    render(<SkillTreeTabBar activeSkills={twoSkills} selectedIndex={0} onChange={onChange} />)
    await userEvent.click(screen.getByText('Judgement'))
    expect(onChange).toHaveBeenCalledWith(1)
  })
})

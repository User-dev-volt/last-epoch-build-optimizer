import { describe, it, expect, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SkillInput } from './SkillInput'
import { useBuildStore } from '../../shared/stores/buildStore'
import type { BuildState } from '../../shared/types/build'

const mockBuild: BuildState = {
  schemaVersion: 1,
  id: 'build-1',
  name: 'Test Lich',
  classId: 'acolyte',
  masteryId: 'lich',
  nodeAllocations: {},
  contextData: { gear: [], skills: [], idols: [] },
  isPersisted: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const initialState = useBuildStore.getState()

describe('SkillInput', () => {
  beforeEach(() => {
    useBuildStore.setState(initialState, true)
    useBuildStore.getState().setActiveBuild(mockBuild)
  })

  it('renders all 5 skill slots', () => {
    render(<SkillInput />)
    const slotIds = ['skill1', 'skill2', 'skill3', 'skill4', 'skill5']
    for (const slotId of slotIds) {
      expect(screen.getByTestId(`skill-slot-${slotId}`)).toBeInTheDocument()
    }
  })

  it('skill name input updates the store', async () => {
    render(<SkillInput />)
    const nameInput = screen.getByTestId('skill-name-skill1')
    await userEvent.type(nameInput, 'Void Cleave')
    const skills = useBuildStore.getState().activeBuild!.contextData.skills
    const slot = skills.find((s) => s.slotId === 'skill1')
    expect(slot?.skillName).toBe('Void Cleave')
  })

  it('slot data is preserved when store is pre-populated', () => {
    useBuildStore.getState().setActiveBuild({
      ...mockBuild,
      contextData: {
        gear: [],
        skills: [{ slotId: 'skill2', skillName: 'Smite' }],
        idols: [],
      },
    })
    render(<SkillInput />)
    const nameInput = screen.getByTestId('skill-name-skill2') as HTMLInputElement
    expect(nameInput.value).toBe('Smite')
  })

  it('empty skill name stores an empty string', async () => {
    useBuildStore.getState().setActiveBuild({
      ...mockBuild,
      contextData: {
        gear: [],
        skills: [{ slotId: 'skill1', skillName: 'Void Cleave' }],
        idols: [],
      },
    })
    render(<SkillInput />)
    const nameInput = screen.getByTestId('skill-name-skill1')
    await userEvent.clear(nameInput)
    const skills = useBuildStore.getState().activeBuild!.contextData.skills
    const slot = skills.find((s) => s.slotId === 'skill1')
    expect(slot?.skillName).toBe('')
  })

  it('pending input clears when activeBuildId changes', async () => {
    render(<SkillInput />)
    const nameInput = screen.getByTestId('skill-name-skill1') as HTMLInputElement
    await userEvent.type(nameInput, 'Void Cleave')

    const newBuild: BuildState = { ...mockBuild, id: 'build-2', contextData: { gear: [], skills: [], idols: [] } }
    act(() => { useBuildStore.getState().setActiveBuild(newBuild) })

    expect((screen.getByTestId('skill-name-skill1') as HTMLInputElement).value).toBe('')
  })
})

import { useBuildStore } from '../../shared/stores/buildStore'
import type { ActiveSkill } from '../../shared/types/build'
import { SKILL_SLOTS } from './skillData'

export function SkillInput() {
  const skills = useBuildStore((s) => s.activeBuild?.contextData.skills ?? [])

  function getSlot(slotId: string): ActiveSkill {
    return skills.find((s) => s.slotId === slotId) ?? { slotId, skillName: '' }
  }

  function handleNameChange(slotId: string, skillName: string) {
    const updated = SKILL_SLOTS.map(({ slotId: id }) =>
      id === slotId ? { ...getSlot(id), skillName } : getSlot(id)
    )
    useBuildStore.getState().updateContextSkills(updated)
  }

  return (
    <div className="flex flex-col gap-3 px-1 pt-1">
      {SKILL_SLOTS.map(({ slotId, label }) => {
        const slot = getSlot(slotId)
        return (
          <div key={slotId} data-testid={`skill-slot-${slotId}`} className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {label}
            </span>
            <input
              type="text"
              data-testid={`skill-name-${slotId}`}
              placeholder="Add skill…"
              value={slot.skillName}
              onChange={(e) => handleNameChange(slotId, e.target.value)}
              className="w-full text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: 'var(--color-bg-base)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-bg-elevated)',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

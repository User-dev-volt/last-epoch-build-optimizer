import { Switch } from '@headlessui/react'
import { useBuildStore } from '../../shared/stores/buildStore'

export function BudgetToggle() {
  const characterLevel = useBuildStore((s) => s.activeBuild?.characterLevel ?? 1)
  const budgetEnforced = useBuildStore((s) => s.activeBuild?.budgetEnforced ?? false)
  const activeBuild = useBuildStore((s) => s.activeBuild)
  const setCharacterLevel = useBuildStore((s) => s.setCharacterLevel)
  const setBudgetEnforced = useBuildStore((s) => s.setBudgetEnforced)

  if (!activeBuild) return null

  function handleLevelChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseInt(e.target.value, 10)
    const clamped = Math.max(1, Math.min(100, isNaN(raw) ? 1 : raw))
    setCharacterLevel(clamped)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)', fontSize: 13 }}>
        Level
        <input
          type="number"
          min={1}
          max={100}
          value={characterLevel}
          onChange={handleLevelChange}
          style={{
            width: 56,
            height: 28,
            padding: '0 6px',
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-bg-elevated)',
            borderRadius: 4,
            color: 'var(--color-text-primary)',
            fontSize: 13,
          }}
          aria-label="Character level"
        />
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer' }}>
        <Switch
          checked={budgetEnforced}
          onChange={setBudgetEnforced}
          aria-label="Enforce level budget"
          style={{
            width: 36,
            height: 20,
            borderRadius: 10,
            backgroundColor: budgetEnforced ? 'var(--color-accent-gold)' : 'var(--color-bg-elevated)',
            border: '1px solid',
            borderColor: budgetEnforced ? 'var(--color-accent-gold)' : 'var(--color-bg-elevated)',
            cursor: 'pointer',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: 'block',
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: 'var(--color-text-primary)',
              position: 'absolute',
              top: 2,
              left: budgetEnforced ? 18 : 2,
              transition: 'left 0.15s ease',
            }}
          />
        </Switch>
        Enforce Level Budget
      </label>
    </div>
  )
}

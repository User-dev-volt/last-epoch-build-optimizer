import { Radio, RadioGroup } from '@headlessui/react'
import { useOptimizationStore } from '../../shared/stores/optimizationStore'
import type { OptimizationGoal } from '../../shared/types/optimization'

interface GoalOption {
  value: OptimizationGoal
  label: string
}

const GOALS: GoalOption[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'maximize_damage', label: 'Maximize Damage' },
  { value: 'maximize_survivability', label: 'Maximize Survivability' },
  { value: 'maximize_speed', label: 'Maximize Speed' },
]

export function GoalSelector() {
  const goal = useOptimizationStore((s) => s.goal)
  const setGoal = useOptimizationStore((s) => s.setGoal)
  const isOptimizing = useOptimizationStore((s) => s.isOptimizing)

  return (
    <div className="flex flex-col gap-2">
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}
      >
        Optimization Goal
      </p>

      <RadioGroup
        value={goal}
        onChange={setGoal}
        disabled={isOptimizing}
        aria-label="Optimization goal"
        className="flex flex-col gap-1"
        data-testid="goal-selector"
      >
        {GOALS.map(({ value, label }) => (
          <Radio
            key={value}
            value={value}
            data-testid={`goal-option-${value}`}
            className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer focus:outline-none"
          >
            {({ checked, disabled }: { checked: boolean; disabled: boolean }) => (
              <span
                className="flex items-center gap-2 w-full text-sm"
                style={{
                  color: checked
                    ? 'var(--color-accent-gold)'
                    : 'var(--color-text-secondary)',
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                <span
                  className="w-3 h-3 rounded-full border shrink-0 flex items-center justify-center"
                  style={{
                    borderColor: checked
                      ? 'var(--color-accent-gold)'
                      : 'var(--color-text-muted)',
                  }}
                >
                  {checked && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: 'var(--color-accent-gold)' }}
                    />
                  )}
                </span>
                {label}
              </span>
            )}
          </Radio>
        ))}
      </RadioGroup>
    </div>
  )
}

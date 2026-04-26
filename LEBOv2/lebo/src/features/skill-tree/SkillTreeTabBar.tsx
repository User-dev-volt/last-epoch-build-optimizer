import { TabGroup, TabList, Tab } from '@headlessui/react'
import type { ActiveSkill } from '../../shared/types/build'

interface SkillTreeTabBarProps {
  activeSkills: ActiveSkill[]
  selectedIndex: number
  onChange: (index: number) => void
}

export function SkillTreeTabBar({ activeSkills, selectedIndex, onChange }: SkillTreeTabBarProps) {
  const tabs = [
    { id: '__passive__', label: 'Passive Tree' },
    ...activeSkills.map((s) => ({ id: s.slotId, label: s.skillName })),
  ]

  return (
    <TabGroup selectedIndex={selectedIndex} onChange={onChange}>
      <TabList
        className="flex"
        style={{ borderBottom: '1px solid var(--color-bg-elevated)' }}
      >
        {tabs.map((tab, i) => {
          const selected = selectedIndex === i
          return (
            <Tab
              key={tab.id}
              className="px-4 py-2 text-sm focus:outline-none transition-colors"
              style={{
                color: selected ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                fontWeight: selected ? 600 : 400,
                borderBottom: selected
                  ? '2px solid var(--color-accent-gold)'
                  : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </Tab>
          )
        })}
      </TabList>
    </TabGroup>
  )
}

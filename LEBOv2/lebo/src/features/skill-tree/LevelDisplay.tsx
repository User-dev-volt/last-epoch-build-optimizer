interface LevelDisplayProps {
  characterLevel: number
}

export function LevelDisplay({ characterLevel }: LevelDisplayProps) {
  return (
    <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
      Lv. {characterLevel}
    </span>
  )
}

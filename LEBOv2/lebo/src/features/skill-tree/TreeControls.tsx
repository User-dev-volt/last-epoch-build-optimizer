import { useState } from 'react'

interface TreeControlsProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onReset: () => void
  onFit?: () => void
}

export function TreeControls({ searchQuery, onSearchChange, onReset, onFit }: TreeControlsProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: '4px 12px',
        height: 36,
        borderBottom: '1px solid var(--color-bg-elevated)',
      }}
    >
      <button
        type="button"
        onClick={onReset}
        style={{
          height: 28,
          background: 'transparent',
          border: '1px solid var(--color-accent-gold-soft)',
          borderRadius: 4,
          padding: '0 8px',
          fontSize: 12,
          color: 'var(--color-accent-gold-soft)',
          cursor: 'pointer',
        }}
      >
        Reset
      </button>

      {onFit && (
        <button
          type="button"
          aria-label="Fit tree to view"
          onClick={onFit}
          style={{
            height: 28,
            background: 'transparent',
            border: '1px solid var(--color-bg-elevated)',
            borderRadius: 4,
            padding: '0 8px',
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Fit
        </button>
      )}

      <div style={{ position: 'relative', width: 200, marginLeft: 'auto' }}>
        <input
          type="text"
          aria-label="Search skill tree nodes"
          placeholder="Search nodes…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onSearchChange('')
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            height: 28,
            paddingLeft: 8,
            paddingRight: searchQuery ? 24 : 8,
            fontSize: 12,
            background: 'var(--color-bg-elevated)',
            border: `1px solid ${focused ? 'var(--color-accent-gold)' : 'var(--color-bg-elevated)'}`,
            borderRadius: 4,
            color: 'var(--color-text-primary)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onSearchChange('')}
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

import { useAppStore } from '../../shared/stores/appStore'

function expandAndFocus(setPanelState: (panel: 'left' | 'right', state: 'expanded' | 'collapsed') => void, targetId: string) {
  setPanelState('left', 'expanded')
  // Wait for the 200ms panel expand transition before focusing
  setTimeout(() => {
    document.getElementById(targetId)?.focus()
  }, 220)
}

export function EmptyTreeState() {
  const setPanelState = useAppStore((s) => s.setPanelState)

  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{
        background:
          'radial-gradient(ellipse at center, var(--color-bg-elevated) 0%, var(--color-bg-base) 70%)',
      }}
    >
      <p
        className="text-lg font-semibold mb-6"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Import a build or start fresh
      </p>

      <div className="flex gap-4">
        <button
          type="button"
          className="px-5 py-2 text-sm font-medium rounded"
          style={{
            border: '1px solid var(--color-accent-gold)',
            color: 'var(--color-accent-gold)',
            backgroundColor: 'transparent',
          }}
          onClick={() => expandAndFocus(setPanelState, 'build-import-input')}
        >
          Paste Build Code
        </button>

        <button
          type="button"
          className="px-5 py-2 text-sm font-medium rounded"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-bg-elevated)',
          }}
          onClick={() => expandAndFocus(setPanelState, 'class-selector-btn')}
        >
          Create New Build
        </button>
      </div>
    </div>
  )
}

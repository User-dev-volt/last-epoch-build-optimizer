import { useAppStore } from '../../shared/stores/appStore'

export function EmptyTreeState() {
  const setPanelState = useAppStore((s) => s.setPanelState)

  function handleCreateNewBuild() {
    setPanelState('left', 'expanded')
  }

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
          onClick={() => {}}
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
          onClick={handleCreateNewBuild}
        >
          Create New Build
        </button>
      </div>
    </div>
  )
}

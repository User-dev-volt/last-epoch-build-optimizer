import { useAppStore } from '../../shared/stores/appStore'
import { ApiKeyInput } from './ApiKeyInput'

export function Settings() {
  const setCurrentView = useAppStore((s) => s.setCurrentView)

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', backgroundColor: 'var(--color-bg-base)' }}
    >
      <header
        className="h-10 flex items-center px-4 border-b shrink-0"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-bg-elevated)',
        }}
      >
        <button
          onClick={() => setCurrentView('main')}
          data-testid="settings-back-btn"
          className="text-xs mr-4"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-label="Back to main view"
        >
          ← Back
        </button>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Settings
        </span>
      </header>
      <div className="flex-1 overflow-y-auto p-6 max-w-lg">
        <ApiKeyInput />
      </div>
    </div>
  )
}

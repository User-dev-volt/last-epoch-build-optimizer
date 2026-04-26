import { useAppStore } from '../../shared/stores/appStore'

export function AppHeader() {
  const currentView = useAppStore((s) => s.currentView)
  const setCurrentView = useAppStore((s) => s.setCurrentView)

  return (
    <header
      className="h-10 flex items-center px-4 border-b border-bg-elevated shrink-0"
      style={{ backgroundColor: 'var(--color-bg-elevated)' }}
    >
      <span className="font-semibold text-sm tracking-wide" style={{ color: 'var(--color-accent-gold)' }}>
        LEBOv2
      </span>
      <span className="ml-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        Last Epoch Build Optimizer
      </span>
      {currentView !== 'settings' && (
        <button
          onClick={() => setCurrentView('settings')}
          data-testid="settings-button"
          className="ml-auto text-xs px-3 py-1 rounded"
          style={{
            backgroundColor: 'var(--color-bg-hover)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Settings
        </button>
      )}
    </header>
  )
}

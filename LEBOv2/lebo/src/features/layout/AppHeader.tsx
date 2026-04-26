export function AppHeader() {
  return (
    <header className="h-10 flex items-center px-4 border-b border-bg-elevated shrink-0"
      style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
      <span className="font-semibold text-sm tracking-wide"
        style={{ color: 'var(--color-accent-gold)' }}>
        LEBOv2
      </span>
      <span className="ml-2 text-xs"
        style={{ color: 'var(--color-text-secondary)' }}>
        Last Epoch Build Optimizer
      </span>
    </header>
  )
}

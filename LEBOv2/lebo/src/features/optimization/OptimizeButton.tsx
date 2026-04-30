interface OptimizeButtonProps {
  onOptimize: () => void
  disabled: boolean
  isOptimizing: boolean
}

export function OptimizeButton({ onOptimize, disabled, isOptimizing }: OptimizeButtonProps) {
  const isInteractive = !disabled && !isOptimizing

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={isInteractive ? onOptimize : undefined}
        disabled={disabled || isOptimizing}
        aria-disabled={disabled || isOptimizing ? 'true' : 'false'}
        aria-busy={isOptimizing ? 'true' : 'false'}
        aria-label={isOptimizing ? 'Analyzing build...' : 'Optimize build'}
        id="optimize-button"
        data-testid="optimize-button"
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-opacity"
        style={{
          backgroundColor: disabled
            ? 'var(--color-bg-elevated)'
            : 'var(--color-accent-gold)',
          color: disabled ? 'var(--color-text-muted)' : 'var(--color-bg-base)',
          opacity: disabled ? 0.5 : 1,
          cursor: !isInteractive ? 'not-allowed' : 'pointer',
        }}
      >
        {isOptimizing ? (
          <>
            <span>Analyzing...</span>
            <div
              className="flex items-end gap-0.5"
              style={{ height: '12px' }}
              data-testid="optimize-loading-indicator"
            >
              {([0, 150, 300] as const).map((delay) => (
                <div
                  key={delay}
                  className="w-0.5 rounded-full animate-pulse"
                  style={{
                    height: delay === 150 ? '12px' : '8px',
                    backgroundColor: 'var(--color-bg-base)',
                    animationDelay: `${delay}ms`,
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          'Optimize'
        )}
      </button>

      {isOptimizing && (
        <p
          className="text-xs text-center"
          style={{ color: 'var(--color-text-muted)' }}
        >
          This usually takes 20–30 seconds
        </p>
      )}
    </div>
  )
}

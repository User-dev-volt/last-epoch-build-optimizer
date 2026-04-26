import { useState } from 'react'
import { useGameDataStore } from '../../shared/stores/gameDataStore'
import { useOptimizationStore } from '../../shared/stores/optimizationStore'
import { triggerDataUpdate } from './gameDataLoader'

export function DataStalenessBar() {
  const isStale = useGameDataStore((s) => s.isStale)
  const stalenessAcknowledged = useGameDataStore((s) => s.stalenessAcknowledged)
  const versionsBehind = useGameDataStore((s) => s.versionsBehind)
  const isUpdating = useGameDataStore((s) => s.isUpdating)
  const acknowledgeStaleness = useGameDataStore((s) => s.acknowledgeStaleness)
  const isOptimizing = useOptimizationStore((s) => s.isOptimizing)
  const [updateError, setUpdateError] = useState<string | null>(null)

  if (!isStale || stalenessAcknowledged) return null

  async function handleUpdate() {
    setUpdateError(null)
    try {
      await triggerDataUpdate()
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const updateBlocked = isUpdating || isOptimizing

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-center justify-between px-4 py-2 text-sm shrink-0"
      style={{ backgroundColor: 'var(--color-accent-gold)', color: 'var(--color-bg-base)' }}
    >
      <span>
        {updateError ? (
          <>Update failed: {updateError}</>
        ) : (
          <>
            Game data is {versionsBehind} version(s) behind. Suggestions may be inaccurate.
          </>
        )}
      </span>
      <span className="flex items-center gap-2">
        {updateError ? (
          <button
            onClick={handleUpdate}
            className="font-semibold underline"
            style={{ color: 'var(--color-bg-base)' }}
          >
            Retry
          </button>
        ) : (
          <button
            onClick={handleUpdate}
            disabled={updateBlocked}
            className="font-semibold underline disabled:opacity-50"
            style={{ color: 'var(--color-bg-base)' }}
          >
            {isUpdating ? 'Downloading…' : 'Update Now'}
          </button>
        )}
        <button
          onClick={acknowledgeStaleness}
          className="opacity-75 hover:opacity-100"
          style={{ color: 'var(--color-bg-base)' }}
          aria-label="Continue with current data"
        >
          Continue with current data
        </button>
      </span>
    </div>
  )
}

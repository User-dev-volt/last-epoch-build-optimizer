import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { invokeCommand } from '../../shared/utils/invokeCommand'
import { useAppStore } from '../../shared/stores/appStore'
import type { AppError } from '../../shared/types/errors'

export function ApiKeyInput() {
  const isApiKeyConfigured = useAppStore((s) => s.isApiKeyConfigured)
  const setApiKeyConfigured = useAppStore((s) => s.setApiKeyConfigured)

  const [localKeyValue, setLocalKeyValue] = useState('')
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    invokeCommand<boolean>('check_api_key_configured')
      .then((result) => setApiKeyConfigured(result))
      .catch(() => setApiKeyConfigured(false))
  }, [setApiKeyConfigured])

  async function handleSave() {
    if (!localKeyValue) return
    setInlineError(null)
    setIsSaving(true)
    try {
      await invokeCommand('set_api_key', { key: localKeyValue })
      setApiKeyConfigured(true)
      setLocalKeyValue('')
      toast.success('API key saved securely')
    } catch (err) {
      const appErr = err as AppError
      setInlineError(appErr.message ?? 'Failed to save API key')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        AI API Key
      </h2>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="api-key-field"
          className="text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Claude API Key
        </label>
        <input
          id="api-key-field"
          type="password"
          data-testid="api-key-input"
          value={localKeyValue}
          onChange={(e) => setLocalKeyValue(e.target.value)}
          placeholder={isApiKeyConfigured ? 'Claude API key saved ✓' : 'sk-ant-api03-...'}
          className="rounded px-3 py-2 text-sm w-full"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-bg-hover)',
          }}
        />
        {inlineError && (
          <span className="text-xs mt-1" style={{ color: 'var(--color-data-negative)' }}>
            {inlineError}
          </span>
        )}
      </div>
      <button
        onClick={handleSave}
        data-testid="save-key-btn"
        disabled={!localKeyValue || isSaving}
        className="px-4 py-2 rounded text-sm font-semibold w-fit"
        style={
          !localKeyValue || isSaving
            ? {
                backgroundColor: 'var(--color-bg-elevated)',
                color: 'var(--color-text-muted)',
                opacity: 0.5,
              }
            : {
                backgroundColor: 'var(--color-accent-gold)',
                color: 'var(--color-bg-base)',
              }
        }
      >
        Save Key
      </button>
    </div>
  )
}

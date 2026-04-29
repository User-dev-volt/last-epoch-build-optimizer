import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { invokeCommand } from '../../shared/utils/invokeCommand'
import type { AppError } from '../../shared/types/errors'

const MODELS = [
  { label: 'Gemini 2.0 Flash (free)', value: 'google/gemini-2.0-flash-exp:free' },
  { label: 'Llama 3.3 70B (free)', value: 'meta-llama/llama-3.3-70b-instruct:free' },
  { label: 'Mistral 7B (free)', value: 'mistralai/mistral-7b-instruct:free' },
  { label: 'Gemma 2 27B (free)', value: 'google/gemma-2-27b-it:free' },
]

export function OpenRouterInput() {
  const [isConfigured, setIsConfigured] = useState(false)
  const [keyValue, setKeyValue] = useState('')
  const [modelMode, setModelMode] = useState<'free-first' | 'always'>('free-first')
  const [selectedModel, setSelectedModel] = useState(MODELS[0].value)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    invokeCommand<boolean>('check_openrouter_configured')
      .then((configured) => setIsConfigured(configured))
      .catch(() => setIsConfigured(false))

    invokeCommand<string>('get_model_preference')
      .then((pref) => {
        if (pref === 'free-first') {
          setModelMode('free-first')
        } else {
          setModelMode('always')
          // If the saved model ID is no longer in MODELS (removed or renamed), fall back to first entry.
          const isKnown = MODELS.some((m) => m.value === pref)
          setSelectedModel(isKnown ? pref : MODELS[0].value)
        }
      })
      .catch(() => {
        setModelMode('free-first')
      })
  }, [])

  async function handleSave() {
    setInlineError(null)
    setIsSaving(true)
    const keyProvided = keyValue.trim().length > 0
    try {
      if (keyProvided) {
        await invokeCommand('set_openrouter_api_key', { key: keyValue })
      }
      const preference = modelMode === 'free-first' ? 'free-first' : selectedModel
      await invokeCommand('set_model_preference', { preference })
      // Mutate UI state only after both saves succeed
      if (keyProvided) {
        setIsConfigured(true)
        setKeyValue('')
      }
      toast.success('OpenRouter settings saved')
    } catch (err) {
      const appErr = err as AppError
      setInlineError(appErr.message ?? 'Failed to save OpenRouter settings')
    } finally {
      setIsSaving(false)
    }
  }

  const saveDisabled = isSaving || (!keyValue.trim() && !isConfigured)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="openrouter-key-field"
          className="text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          OpenRouter API Key
        </label>
        <input
          id="openrouter-key-field"
          type="password"
          data-testid="openrouter-key-input"
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value)}
          placeholder={isConfigured ? 'OpenRouter API key saved ✓' : 'sk-or-...'}
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

      <div className="flex flex-col gap-2">
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Model Preference
        </span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            data-testid="model-preference-free-first"
            name="model-preference"
            checked={modelMode === 'free-first'}
            onChange={() => setModelMode('free-first')}
          />
          <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
            Auto-select best free model
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            data-testid="model-preference-always"
            name="model-preference"
            checked={modelMode === 'always'}
            onChange={() => setModelMode('always')}
          />
          <span className="text-xs" style={{ color: 'var(--color-text-primary)' }}>
            Pin to a specific model
          </span>
        </label>

        {modelMode === 'always' && (
          <select
            data-testid="model-picker"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="rounded px-3 py-2 text-sm w-full"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-bg-hover)',
            }}
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        onClick={handleSave}
        data-testid="save-openrouter-btn"
        disabled={saveDisabled}
        className="px-4 py-2 rounded text-sm font-semibold w-fit"
        style={
          saveDisabled
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
        Save
      </button>
    </div>
  )
}

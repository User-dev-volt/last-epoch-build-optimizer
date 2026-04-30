import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { invokeCommand } from '../../shared/utils/invokeCommand'
import { useAppStore } from '../../shared/stores/appStore'
import { ApiKeyInput } from './ApiKeyInput'
import { OpenRouterInput } from './OpenRouterInput'

export function ProviderSelector() {
  const llmProvider = useAppStore((s) => s.llmProvider)
  const setLlmProvider = useAppStore((s) => s.setLlmProvider)
  const claudeRef = useRef<HTMLButtonElement>(null)
  const openrouterRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    invokeCommand<string>('get_llm_provider')
      .then((p) => setLlmProvider(p as 'claude' | 'openrouter'))
      .catch(() => setLlmProvider('claude'))
  }, [])

  async function handleProviderChange(provider: 'claude' | 'openrouter') {
    if (llmProvider === provider) return
    const prevProvider = llmProvider
    setLlmProvider(provider)
    // Restore focus after DOM update (ApiKeyInput ↔ OpenRouterInput swap)
    requestAnimationFrame(() => {
      if (provider === 'claude') claudeRef.current?.focus()
      else openrouterRef.current?.focus()
    })
    try {
      await invokeCommand('set_llm_provider', { provider })
      toast.success(provider === 'claude' ? 'Switched to Claude' : 'Switched to OpenRouter')
    } catch {
      setLlmProvider(prevProvider)
      toast.error('Failed to save provider selection')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        AI Provider
      </h2>

      <div
        data-testid="provider-selector"
        role="group"
        aria-label="AI provider"
        className="flex gap-2"
      >
        <button
          ref={claudeRef}
          data-testid="provider-claude"
          type="button"
          aria-pressed={llmProvider === 'claude'}
          onClick={() => handleProviderChange('claude')}
          className="px-3 py-1.5 rounded text-xs font-medium"
          style={
            llmProvider === 'claude'
              ? { backgroundColor: 'var(--color-accent-gold)', color: 'var(--color-bg-base)' }
              : { backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-bg-hover)' }
          }
        >
          Claude (Anthropic)
        </button>
        <button
          ref={openrouterRef}
          data-testid="provider-openrouter"
          type="button"
          aria-pressed={llmProvider === 'openrouter'}
          onClick={() => handleProviderChange('openrouter')}
          className="px-3 py-1.5 rounded text-xs font-medium"
          style={
            llmProvider === 'openrouter'
              ? { backgroundColor: 'var(--color-accent-gold)', color: 'var(--color-bg-base)' }
              : { backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-bg-hover)' }
          }
        >
          OpenRouter
        </button>
      </div>

      {llmProvider === null ? null : llmProvider === 'openrouter' ? <OpenRouterInput /> : <ApiKeyInput />}
    </div>
  )
}

import { useEffect, useRef } from 'react'
import type { SkillTreeCanvasProps, RendererCallbacks, RendererInstance } from './types'
import { initRenderer } from './pixiRenderer'

export function SkillTreeCanvas({
  treeData,
  allocatedNodes,
  highlightedNodes,
  onNodeClick,
  onNodeHover,
  onKeyboardNavigate,
}: SkillTreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<RendererInstance | null>(null)
  const callbacksRef = useRef<RendererCallbacks>({ onNodeClick, onNodeHover })
  const dataRef = useRef({ treeData, allocatedNodes, highlightedNodes })
  const focusedIndexRef = useRef(-1)
  // Chains init promises so React StrictMode's double-mount never runs two concurrent app.init() calls
  const initChainRef = useRef<Promise<unknown>>(Promise.resolve())

  // Keep both refs current after every render
  useEffect(() => {
    callbacksRef.current = { onNodeClick, onNodeHover }
    dataRef.current = { treeData, allocatedNodes, highlightedNodes }
  })

  // Mount/unmount: init renderer + ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    let renderer: RendererInstance | null = null
    let resizeObserver: ResizeObserver | null = null
    let cancelled = false

    // Wait for any previous init (from StrictMode's first mount) to finish before starting
    const prevChain = initChainRef.current
    const thisChain = prevChain
      .then(async () => {
        if (cancelled) return undefined
        return initRenderer(canvas, callbacksRef)
      })
      .then((r) => {
        if (!r) return
        if (cancelled) {
          r.destroy()
          return
        }
        renderer = r
        rendererRef.current = r

        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect
            r.resize(width, height)
          }
        })
        resizeObserver.observe(container)

        const { width, height } = container.getBoundingClientRect()
        r.resize(width, height)
        const { treeData: td, allocatedNodes: an, highlightedNodes: hn } = dataRef.current
        r.renderTree(td, an, hn)
      })
      .catch((err) => {
        console.error('[SkillTreeCanvas] initRenderer failed:', err)
      })

    initChainRef.current = thisChain

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      renderer?.destroy()
      rendererRef.current = null
    }
  }, [])

  // Re-render whenever tree data changes
  useEffect(() => {
    rendererRef.current?.renderTree(treeData, allocatedNodes, highlightedNodes)
  }, [treeData, allocatedNodes, highlightedNodes])

  function fireNodeFocus(idx: number) {
    const node = treeData.nodes[idx]
    if (!node || !rendererRef.current || !containerRef.current) return
    const { x: panX, y: panY, scale } = rendererRef.current.getViewport()
    const rect = containerRef.current.getBoundingClientRect()
    onKeyboardNavigate(node.id, rect.left + panX + node.x * scale, rect.top + panY + node.y * scale)
  }

  function handleFocus() {
    if (focusedIndexRef.current === -1 && treeData.nodes.length > 0) {
      const firstUnlocked = treeData.nodes.findIndex((n) => n.state !== 'locked')
      focusedIndexRef.current = firstUnlocked >= 0 ? firstUnlocked : 0
      fireNodeFocus(focusedIndexRef.current)
    }
  }

  function handleBlur() {
    focusedIndexRef.current = -1
    onKeyboardNavigate(null, 0, 0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const nodes = treeData.nodes
    if (nodes.length === 0) return

    if (e.key === 'Escape') {
      focusedIndexRef.current = -1
      onKeyboardNavigate(null, 0, 0)
      return
    }

    if (e.key === 'Enter' || e.key === ' ') {
      const focused = nodes[focusedIndexRef.current]
      if (focused) {
        e.preventDefault()
        onNodeClick(focused.id)
      }
      return
    }

    let newIndex = focusedIndexRef.current < 0 ? 0 : focusedIndexRef.current
    if (e.key === 'Tab') {
      e.preventDefault()
      newIndex = e.shiftKey
        ? (newIndex - 1 + nodes.length) % nodes.length
        : (newIndex + 1) % nodes.length
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      newIndex = (newIndex + 1) % nodes.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      newIndex = (newIndex - 1 + nodes.length) % nodes.length
    } else {
      return
    }

    focusedIndexRef.current = newIndex
    fireNodeFocus(newIndex)
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
      tabIndex={0}
      aria-label="Passive skill tree — use arrow keys or Tab to navigate nodes, Enter or Space to allocate"
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}

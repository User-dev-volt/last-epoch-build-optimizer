import { useEffect, useRef, useState, useMemo } from 'react'
import type { SkillTreeCanvasProps, RendererCallbacks, RendererInstance } from './types'
import { initRenderer, NODE_RADIUS } from './pixiRenderer'
import { useReducedMotion } from '../../shared/hooks/useReducedMotion'

type NodeButton = { id: string; screenX: number; screenY: number; r: number }

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
  const treeDataRef = useRef(treeData)
  const bfsOrderRef = useRef<string[]>([])
  const focusedNodeIdRef = useRef<string | null>(null)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const lastViewportRef = useRef({ x: 0, y: 0, scale: 1 })
  // Chains init promises so React StrictMode's double-mount never runs two concurrent app.init() calls
  const initChainRef = useRef<Promise<unknown>>(Promise.resolve())

  const [nodeButtons, setNodeButtons] = useState<NodeButton[]>([])
  const reducedMotion = useReducedMotion()

  // BFS order derived from directed edges (fromId → toId); roots are nodes with no incoming edge
  const bfsOrder = useMemo(() => {
    const children = new Map<string, string[]>()
    const hasParent = new Set<string>()
    for (const edge of treeData.edges) {
      if (!children.has(edge.fromId)) children.set(edge.fromId, [])
      children.get(edge.fromId)!.push(edge.toId)
      hasParent.add(edge.toId)
    }
    const roots = treeData.nodes.filter((n) => !hasParent.has(n.id)).map((n) => n.id)
    const visited = new Set<string>()
    const order: string[] = []
    const queue = [...roots]
    while (queue.length > 0) {
      const id = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      order.push(id)
      for (const child of children.get(id) ?? []) {
        if (!visited.has(child)) queue.push(child)
      }
    }
    // Append isolated nodes not reachable from any root
    for (const node of treeData.nodes) {
      if (!visited.has(node.id)) order.push(node.id)
    }
    return order
  }, [treeData])

  // Keep refs current after every render
  useEffect(() => {
    callbacksRef.current = { onNodeClick, onNodeHover }
    dataRef.current = { treeData, allocatedNodes, highlightedNodes }
    treeDataRef.current = treeData
    bfsOrderRef.current = bfsOrder
  })

  // Adjacency map built from TreeNode.connections (already bidirectional per node)
  const connectionMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const node of treeData.nodes) {
      map.set(node.id, node.connections)
    }
    return map
  }, [treeData])

  function syncButtonPositions() {
    const r = rendererRef.current
    const container = containerRef.current
    if (!r || !container) return
    const vp = r.getViewport()
    const last = lastViewportRef.current
    if (vp.x === last.x && vp.y === last.y && vp.scale === last.scale) return
    lastViewportRef.current = vp
    const { width, height } = container.getBoundingClientRect()
    const { x: panX, y: panY, scale } = vp
    const nodeMap = new Map(treeDataRef.current.nodes.map((n) => [n.id, n]))
    const visibleIds = new Set<string>()
    for (const n of treeDataRef.current.nodes) {
      const sx = panX + n.x * scale
      const sy = panY + n.y * scale
      if (sx > -50 && sx < width + 50 && sy > -50 && sy < height + 50) visibleIds.add(n.id)
    }
    // Preserve BFS graph order (root → children → grandchildren) for Tab traversal
    const buttons: NodeButton[] = []
    for (const id of bfsOrderRef.current) {
      if (!visibleIds.has(id)) continue
      const n = nodeMap.get(id)!
      buttons.push({
        id,
        screenX: panX + n.x * scale,
        screenY: panY + n.y * scale,
        r: NODE_RADIUS[n.size] * scale,
      })
    }
    setNodeButtons(buttons)
  }

  // Mount/unmount: init renderer + ResizeObserver + ticker
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    let renderer: RendererInstance | null = null
    let resizeObserver: ResizeObserver | null = null
    let unsubTicker: (() => void) | null = null
    let cancelled = false

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

        syncButtonPositions()
        unsubTicker = r.addTickerListener(syncButtonPositions)
      })
      .catch((err) => {
        console.error('[SkillTreeCanvas] initRenderer failed:', err)
      })

    initChainRef.current = thisChain

    return () => {
      cancelled = true
      unsubTicker?.()
      resizeObserver?.disconnect()
      renderer?.destroy()
      rendererRef.current = null
    }
  }, [])

  // Re-render whenever tree data changes
  useEffect(() => {
    rendererRef.current?.renderTree(treeData, allocatedNodes, highlightedNodes)
  }, [treeData, allocatedNodes, highlightedNodes])

  // Propagate reduced motion preference to renderer
  useEffect(() => {
    rendererRef.current?.setReducedMotion(reducedMotion)
  }, [reducedMotion])

  function handleNodeKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onNodeClick(id)
      return
    }

    if (e.key === 'Escape') {
      e.currentTarget.blur()
      onKeyboardNavigate(null, 0, 0)
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      if (nodeButtons.length < 2) return
      const currentIdx = nodeButtons.findIndex((btn) => btn.id === id)
      if (currentIdx === -1) return
      const nextIdx = e.shiftKey
        ? (currentIdx - 1 + nodeButtons.length) % nodeButtons.length
        : (currentIdx + 1) % nodeButtons.length
      const nextId = nodeButtons[nextIdx]?.id
      if (nextId && nextId !== id) buttonRefs.current.get(nextId)?.focus()
      return
    }

    const arrowAngles: Record<string, number> = {
      ArrowRight: 0,
      ArrowDown: Math.PI / 2,
      ArrowLeft: Math.PI,
      ArrowUp: -Math.PI / 2,
    }
    const targetAngle = arrowAngles[e.key]
    if (targetAngle === undefined) return
    e.preventDefault()

    const connections = connectionMap.get(id) ?? []
    if (connections.length === 0) return
    const currentBtn = nodeButtons.find((b) => b.id === id)
    if (!currentBtn) return

    const buttonDataMap = new Map(nodeButtons.map((b) => [b.id, b]))
    let bestId: string | null = null
    let bestDiff = Infinity

    for (const connId of connections) {
      const connBtn = buttonDataMap.get(connId)
      if (!connBtn) continue
      const angle = Math.atan2(
        connBtn.screenY - currentBtn.screenY,
        connBtn.screenX - currentBtn.screenX
      )
      const diff = Math.abs(((angle - targetAngle) + Math.PI) % (2 * Math.PI) - Math.PI)
      if (diff < bestDiff) {
        bestDiff = diff
        bestId = connId
      }
    }

    if (bestId) buttonRefs.current.get(bestId)?.focus()
  }

  return (
    <div
      ref={containerRef}
      id="skill-tree-canvas"
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        aria-hidden="true"
      />
      {/* Invisible button overlay — keyboard nav; pointer-events:none so mouse clicks reach PixiJS canvas */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {nodeButtons.map(({ id, screenX, screenY, r }, index) => {
          const node = treeData.nodes.find((n) => n.id === id)
          return (
            <button
              key={id}
              ref={(el) => {
                if (el) buttonRefs.current.set(id, el)
                else buttonRefs.current.delete(id)
              }}
              aria-label={`${id} — ${node?.state ?? 'unknown'}`}
              className="sr-only focus:not-sr-only focus:absolute focus:outline focus:outline-2 focus:outline-[var(--color-accent-gold)] focus:rounded-full"
              style={{
                left: screenX - r,
                top: screenY - r,
                width: r * 2,
                height: r * 2,
                pointerEvents: 'auto',
              }}
              tabIndex={index === 0 ? 0 : -1}
              onKeyDown={(e) => handleNodeKeyDown(e, id)}
              onFocus={() => {
                focusedNodeIdRef.current = id
                const n = treeDataRef.current.nodes.find((n) => n.id === id)
                if (n && containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect()
                  onKeyboardNavigate(id, rect.left + screenX, rect.top + screenY)
                }
              }}
              onBlur={() => {
                focusedNodeIdRef.current = null
                onKeyboardNavigate(null, 0, 0)
              }}
              onClick={() => onNodeClick(id)}
            />
          )
        })}
      </div>
    </div>
  )
}

import { Application, Circle, Container, Graphics } from 'pixi.js'
import type { TreeData, RendererCallbacks, RendererInstance } from './types'

// PixiJS v8's logPrettyShaderError calls .split() on getShaderSource/getShaderInfoLog results,
// which throws if WebGL returns null (valid per spec). Patch before any Application init.
;(function patchWebGLNullInfoLogs() {
  const patch = (proto: WebGLRenderingContext) => {
    const origShaderSource = proto.getShaderSource
    ;(proto as unknown as Record<string, unknown>).getShaderSource = function (
      this: WebGLRenderingContext,
      shader: WebGLShader
    ) {
      return origShaderSource.call(this, shader) ?? ''
    }
    const origShader = proto.getShaderInfoLog
    ;(proto as unknown as Record<string, unknown>).getShaderInfoLog = function (
      this: WebGLRenderingContext,
      shader: WebGLShader
    ) {
      return origShader.call(this, shader) ?? ''
    }
    const origProgram = proto.getProgramInfoLog
    ;(proto as unknown as Record<string, unknown>).getProgramInfoLog = function (
      this: WebGLRenderingContext,
      program: WebGLProgram
    ) {
      return origProgram.call(this, program) ?? ''
    }
  }
  if (typeof WebGLRenderingContext !== 'undefined') {
    patch(WebGLRenderingContext.prototype)
  }
  if (typeof WebGL2RenderingContext !== 'undefined') {
    patch(WebGL2RenderingContext.prototype as unknown as WebGLRenderingContext)
  }
})()

export const NODE_RADIUS = { small: 12, medium: 18, large: 26 }

function drawAllocated(g: Graphics, x: number, y: number, r: number) {
  g.circle(x, y, r).fill(0xc9a84c)
  g.circle(x, y, r).stroke({ color: 0xd4b96a, width: 2 })
}

function drawAvailable(g: Graphics, x: number, y: number, r: number) {
  g.circle(x, y, r).fill(0x141417)
  g.circle(x, y, r).stroke({ color: 0x4a7a9e, width: 3 })
}

function drawLocked(g: Graphics, x: number, y: number, r: number) {
  g.circle(x, y, r).fill(0x2a2a35)
  const o = r * 0.5
  g.moveTo(x - o, y - o).lineTo(x + o, y + o).stroke({ color: 0x5a5050, width: 2 })
  g.moveTo(x + o, y - o).lineTo(x - o, y + o).stroke({ color: 0x5a5050, width: 2 })
}

function drawSuggested(g: Graphics, x: number, y: number, r: number, reducedMotion = false) {
  if (!reducedMotion) {
    g.circle(x, y, r + 6).fill({ color: 0x7b68ee, alpha: 0.25 })
  }
  g.circle(x, y, r).fill(0x141417)
  g.circle(x, y, r).stroke({ color: 0x7b68ee, width: 3 })
}

function drawDimmed(g: Graphics, x: number, y: number, r: number) {
  g.circle(x, y, r).fill({ color: 0x2a2a35, alpha: 0.6 })
  g.circle(x, y, r).stroke({ color: 0x5a5070, width: 1 })
}

export async function initRenderer(
  canvas: HTMLCanvasElement,
  callbacksRef: { current: RendererCallbacks }
): Promise<RendererInstance> {
  const app = new Application()
  await app.init({
    canvas,
    background: 0x0a0a0b,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  })

  // Prevent browser context menu on right-click so right-click node removal works
  app.canvas.addEventListener('contextmenu', (e) => e.preventDefault())

  const worldContainer = new Container()
  app.stage.addChild(worldContainer)

  const edgeGraphics = new Graphics()
  const lockedGraphics = new Graphics()
  const availableGraphics = new Graphics()
  const allocatedGraphics = new Graphics()
  const suggestedGraphics = new Graphics()
  const dimmedGraphics = new Graphics()
  // Pure interaction layer — no rendering, just hitArea containers
  const hitAreaContainer = new Container()

  worldContainer.addChild(
    edgeGraphics,
    lockedGraphics,
    availableGraphics,
    allocatedGraphics,
    dimmedGraphics,
    suggestedGraphics,
    hitAreaContainer
  )

  worldContainer.scale.set(0.6)

  // Pan
  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen

  let dragging = false
  let dragOrigin = { x: 0, y: 0 }
  let panOrigin = { x: 0, y: 0 }

  app.stage.on('pointerdown', (e) => {
    dragging = true
    dragOrigin = { x: e.global.x, y: e.global.y }
    panOrigin = { x: worldContainer.x, y: worldContainer.y }
  })
  app.stage.on('pointermove', (e) => {
    if (!dragging) return
    worldContainer.x = panOrigin.x + (e.global.x - dragOrigin.x)
    worldContainer.y = panOrigin.y + (e.global.y - dragOrigin.y)
  })
  app.stage.on('pointerup', () => {
    dragging = false
  })
  app.stage.on('pointerupoutside', () => {
    dragging = false
  })

  // Zoom toward cursor
  const MIN_ZOOM = 0.3
  const MAX_ZOOM = 1.5

  app.canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, worldContainer.scale.x * factor))

      const cursorWorldX = (e.offsetX - worldContainer.x) / worldContainer.scale.x
      const cursorWorldY = (e.offsetY - worldContainer.y) / worldContainer.scale.y
      worldContainer.scale.set(newScale)
      worldContainer.x = e.offsetX - cursorWorldX * newScale
      worldContainer.y = e.offsetY - cursorWorldY * newScale
    },
    { passive: false }
  )

  function renderTree(
    data: TreeData,
    allocatedNodes: Record<string, number>,
    highlightedNodes: import('./types').HighlightedNodes
  ) {
    edgeGraphics.clear()
    lockedGraphics.clear()
    availableGraphics.clear()
    allocatedGraphics.clear()
    suggestedGraphics.clear()
    dimmedGraphics.clear()
    hitAreaContainer.removeChildren()

    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]))

    // Draw all edges as a single multi-segment path → one stroke call (vs 1205 individual strokes)
    for (const edge of data.edges) {
      const from = nodeMap.get(edge.fromId)
      const to = nodeMap.get(edge.toId)
      if (from && to) {
        edgeGraphics.moveTo(from.x, from.y).lineTo(to.x, to.y)
      }
    }
    if (data.edges.length > 0) {
      edgeGraphics.stroke({ color: 0x3a3a45, width: 1.5 })
    }

    for (const node of data.nodes) {
      const r = NODE_RADIUS[node.size]
      const isAllocated = allocatedNodes[node.id] !== undefined
      const isGlowing = highlightedNodes.glowing.has(node.id)
      const isDimmed = highlightedNodes.dimmed.has(node.id) && !isGlowing

      if (isAllocated || node.state === 'allocated') {
        drawAllocated(allocatedGraphics, node.x, node.y, r)
      } else if (isGlowing || node.state === 'suggested') {
        drawSuggested(suggestedGraphics, node.x, node.y, r, reducedMotionEnabled)
      } else if (isDimmed) {
        drawDimmed(dimmedGraphics, node.x, node.y, r)
      } else if (node.state === 'locked') {
        drawLocked(lockedGraphics, node.x, node.y, r)
      } else {
        drawAvailable(availableGraphics, node.x, node.y, r)
      }

      // Invisible hit area: Container + Circle hitArea — no GPU draw calls
      const hit = new Container()
      hit.eventMode = 'static'
      hit.cursor = 'pointer'
      hit.hitArea = new Circle(node.x, node.y, r + 4)
      hit.on('pointerover', () => callbacksRef.current.onNodeHover(node.id))
      hit.on('pointerout', () => callbacksRef.current.onNodeHover(null))
      hit.on('pointerdown', (e) => {
        e.stopPropagation()
        if (e.button === 2) {
          callbacksRef.current.onNodeRightClick(node.id)
        } else {
          callbacksRef.current.onNodeClick(node.id)
        }
      })
      hitAreaContainer.addChild(hit)
    }
  }

  let reducedMotionEnabled = false

  let initialCentered = false

  function setReducedMotion(enabled: boolean) {
    reducedMotionEnabled = enabled
  }

  function resize(w: number, h: number) {
    app.renderer.resize(w, h)
    app.stage.hitArea = app.screen
    if (!initialCentered && w > 0 && h > 0) {
      worldContainer.x = w / 2
      worldContainer.y = h / 2
      initialCentered = true
    }
  }

  function destroy() {
    // false = do not remove canvas from DOM; React owns the canvas element's lifecycle
    app.destroy(false, { children: true })
  }

  function getViewport() {
    return { x: worldContainer.x, y: worldContainer.y, scale: worldContainer.scale.x }
  }

  function addTickerListener(fn: () => void): () => void {
    const cb = () => fn()
    app.ticker.add(cb)
    return () => app.ticker.remove(cb)
  }

  return { renderTree, resize, destroy, getViewport, addTickerListener, setReducedMotion }
}

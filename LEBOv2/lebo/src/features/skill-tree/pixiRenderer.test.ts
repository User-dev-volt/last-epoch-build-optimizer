import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initRenderer } from './pixiRenderer'
import type { TreeData, RendererCallbacks } from './types'
import { mockTreeData } from './mockTreeData'

// Use vi.hoisted so these refs are available inside the vi.mock factory
const { mockApp, mockRendererResize, mockAppDestroy } = vi.hoisted(() => {
  const mockRendererResize = vi.fn()
  const mockAppDestroy = vi.fn()
  return {
    mockRendererResize,
    mockAppDestroy,
    mockApp: {
      init: vi.fn().mockResolvedValue(undefined),
      stage: {
        addChild: vi.fn(),
        on: vi.fn(),
        eventMode: '',
        hitArea: null as unknown,
        screen: { width: 800, height: 600 },
      },
      screen: { width: 800, height: 600 },
      canvas: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
      renderer: { resize: mockRendererResize },
      ticker: { FPS: 60, add: vi.fn() },
      destroy: mockAppDestroy,
    },
  }
})

// Stub PixiJS — all rendering is tested at the interface / call level
vi.mock('pixi.js', () => {
  // Regular functions (not arrow) are callable as constructors.
  // Returning an explicit object from a constructor makes `new Foo()` use that object.
  function Application() {
    return mockApp
  }

  function makeContainer() {
    return {
      addChild: vi.fn(),
      removeChildren: vi.fn().mockReturnValue([]),
      x: 0,
      y: 0,
      scale: { set: vi.fn(), x: 0.6, y: 0.6 },
      eventMode: '',
      cursor: '',
      hitArea: null as unknown,
      on: vi.fn(),
    }
  }

  function makeGraphics() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: Record<string, any> = { eventMode: '', cursor: '' }
    g.rect = vi.fn().mockReturnValue(g)
    g.circle = vi.fn().mockReturnValue(g)
    g.fill = vi.fn().mockReturnValue(g)
    g.stroke = vi.fn().mockReturnValue(g)
    g.moveTo = vi.fn().mockReturnValue(g)
    g.lineTo = vi.fn().mockReturnValue(g)
    g.clear = vi.fn().mockReturnValue(g)
    g.on = vi.fn()
    return g
  }

  function Container() {
    return makeContainer()
  }
  function Graphics() {
    return makeGraphics()
  }
  function Text() {
    return { text: '', position: { set: vi.fn() } }
  }

  function Circle(this: unknown, x: number, y: number, r: number) {
    return { x, y, radius: r, type: 'circle' }
  }

  return { Application, Container, Graphics, Text, Circle }
})

function makeCallbacksRef(): { current: RendererCallbacks } {
  return { current: { onNodeClick: vi.fn(), onNodeRightClick: vi.fn(), onNodeHover: vi.fn() } }
}

function makeCanvas(): HTMLCanvasElement {
  return document.createElement('canvas')
}

const emptyTree: TreeData = { nodes: [], edges: [] }

describe('initRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Restore the resolved-value implementation that clearAllMocks preserves
    mockApp.init.mockResolvedValue(undefined)
  })

  it('returns an object with renderTree, resize, and destroy methods', async () => {
    const renderer = await initRenderer(makeCanvas(), makeCallbacksRef())
    expect(typeof renderer.renderTree).toBe('function')
    expect(typeof renderer.resize).toBe('function')
    expect(typeof renderer.destroy).toBe('function')
  })

  it('renderTree does not throw with empty TreeData (0 nodes, 0 edges)', async () => {
    const renderer = await initRenderer(makeCanvas(), makeCallbacksRef())
    expect(() => renderer.renderTree(emptyTree, {}, { glowing: new Set(), dimmed: new Set() })).not.toThrow()
  })

  it('renderTree does not throw with 800-node mock tree', async () => {
    const renderer = await initRenderer(makeCanvas(), makeCallbacksRef())
    expect(() => renderer.renderTree(mockTreeData, {}, { glowing: new Set(), dimmed: new Set() })).not.toThrow()
  })

  it('resize calls app.renderer.resize with correct args', async () => {
    const renderer = await initRenderer(makeCanvas(), makeCallbacksRef())
    renderer.resize(800, 600)
    expect(mockRendererResize).toHaveBeenCalledWith(800, 600)
  })

  it('destroy calls app.destroy', async () => {
    const renderer = await initRenderer(makeCanvas(), makeCallbacksRef())
    renderer.destroy()
    expect(mockAppDestroy).toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SkillTreeCanvas } from './SkillTreeCanvas'
import type { RendererInstance, TreeData } from './types'

// Mock initRenderer so no real PixiJS/WebGL is needed
const mockGetViewport = vi.fn(() => ({ x: 100, y: 100, scale: 1 }))
const mockAddTickerListener = vi.fn((fn: () => void) => {
  // Immediately invoke once so syncButtonPositions runs and nodeButtons state is populated
  fn()
  return () => {}
})
const mockRenderTree = vi.fn()
const mockResize = vi.fn()
const mockDestroy = vi.fn()

const mockSetReducedMotion = vi.fn()

const mockRenderer: RendererInstance = {
  renderTree: mockRenderTree,
  resize: mockResize,
  destroy: mockDestroy,
  getViewport: mockGetViewport,
  addTickerListener: mockAddTickerListener,
  setReducedMotion: mockSetReducedMotion,
}

vi.mock('./pixiRenderer', () => ({
  NODE_RADIUS: { small: 12, medium: 18, large: 26 },
  initRenderer: vi.fn(() => Promise.resolve(mockRenderer)),
}))

// Two connected nodes placed in viewport
const TWO_NODE_TREE: TreeData = {
  nodes: [
    { id: 'node-a', x: 0, y: 0, size: 'medium', state: 'available', connections: ['node-b'] },
    { id: 'node-b', x: 50, y: 0, size: 'medium', state: 'available', connections: ['node-a'] },
  ],
  edges: [{ fromId: 'node-a', toId: 'node-b' }],
}

const DEFAULT_PROPS = {
  treeData: TWO_NODE_TREE,
  allocatedNodes: {},
  highlightedNodes: { glowing: new Set<string>(), dimmed: new Set<string>() },
  onNodeClick: vi.fn(),
  onNodeHover: vi.fn(),
  onKeyboardNavigate: vi.fn(),
}

// getBoundingClientRect needs to return non-zero dimensions so viewport filter passes
beforeEach(() => {
  vi.clearAllMocks()
  // Default viewport: x=100, y=100, scale=1 → node-a at (100,100), node-b at (150,100)
  mockGetViewport.mockReturnValue({ x: 100, y: 100, scale: 1 })
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 800,
    height: 600,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => {},
  }))
})

async function renderCanvas(props = DEFAULT_PROPS) {
  let result: ReturnType<typeof render>
  await act(async () => {
    result = render(<SkillTreeCanvas {...props} />)
    // Wait for the async initRenderer promise chain to resolve
    await new Promise((r) => setTimeout(r, 0))
  })
  return result!
}

describe('SkillTreeCanvas keyboard overlay', () => {
  it('renders invisible buttons for visible nodes', async () => {
    await renderCanvas()
    // After syncButtonPositions, buttons should exist for node-a and node-b
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('Tab on first button moves focus to second button', async () => {
    await renderCanvas()
    const buttons = screen.getAllByRole('button')
    const first = buttons[0]
    const second = buttons[1]
    first.focus()
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: false })
    expect(document.activeElement).toBe(second)
  })

  it('Enter on focused button fires onNodeClick', async () => {
    const onNodeClick = vi.fn()
    await renderCanvas({ ...DEFAULT_PROPS, onNodeClick })
    const buttons = screen.getAllByRole('button')
    fireEvent.keyDown(buttons[0], { key: 'Enter' })
    expect(onNodeClick).toHaveBeenCalledTimes(1)
  })

  it('Escape on focused button fires onKeyboardNavigate(null, 0, 0)', async () => {
    const onKeyboardNavigate = vi.fn()
    await renderCanvas({ ...DEFAULT_PROPS, onKeyboardNavigate })
    const buttons = screen.getAllByRole('button')
    fireEvent.keyDown(buttons[0], { key: 'Escape' })
    expect(onKeyboardNavigate).toHaveBeenCalledWith(null, 0, 0)
  })

  it('ArrowRight moves focus to connected node to the right', async () => {
    const onKeyboardNavigate = vi.fn()
    await renderCanvas({ ...DEFAULT_PROPS, onKeyboardNavigate })
    const buttons = screen.getAllByRole('button')
    // node-a is at screenX=100, node-b is at screenX=150 (to the right)
    const nodeABtn = buttons.find((b) => b.getAttribute('aria-label')?.startsWith('node-a'))
    const nodeBBtn = buttons.find((b) => b.getAttribute('aria-label')?.startsWith('node-b'))
    expect(nodeABtn).toBeTruthy()
    expect(nodeBBtn).toBeTruthy()
    nodeABtn!.focus()
    fireEvent.keyDown(nodeABtn!, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(nodeBBtn)
  })

  it('onFocus fires onKeyboardNavigate with nodeId and screen coords', async () => {
    const onKeyboardNavigate = vi.fn()
    await renderCanvas({ ...DEFAULT_PROPS, onKeyboardNavigate })
    const buttons = screen.getAllByRole('button')
    fireEvent.focus(buttons[0])
    expect(onKeyboardNavigate).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Number),
      expect.any(Number)
    )
  })
})

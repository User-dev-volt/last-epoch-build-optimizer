export type NodeSize = 'small' | 'medium' | 'large'
export type NodeState = 'allocated' | 'available' | 'locked' | 'suggested'

export interface HighlightedNodes {
  glowing: Set<string>
  dimmed: Set<string>
}

export interface TreeNode {
  id: string
  x: number
  y: number
  size: NodeSize
  connections: string[]
  state: NodeState
}

export interface TreeEdge {
  fromId: string
  toId: string
}

export interface TreeData {
  nodes: TreeNode[]
  edges: TreeEdge[]
}

export interface RendererCallbacks {
  onNodeClick: (nodeId: string) => void
  onNodeHover: (nodeId: string | null) => void
}

export interface RendererInstance {
  renderTree(
    data: TreeData,
    allocatedNodes: Record<string, number>,
    highlightedNodes: HighlightedNodes
  ): void
  resize(w: number, h: number): void
  destroy(): void
  getViewport(): { x: number; y: number; scale: number }
}

export interface SkillTreeCanvasProps {
  treeData: TreeData
  allocatedNodes: Record<string, number>
  highlightedNodes: HighlightedNodes
  onNodeClick: (nodeId: string) => void
  onNodeHover: (nodeId: string | null) => void
  onKeyboardNavigate: (nodeId: string | null, screenX: number, screenY: number) => void
}

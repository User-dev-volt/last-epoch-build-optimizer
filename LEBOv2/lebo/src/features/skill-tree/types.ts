import type { TreeData, HighlightedNodes } from '../../shared/types/treeData'

export type { NodeSize, NodeState, HighlightedNodes, TreeNode, TreeEdge, TreeData } from '../../shared/types/treeData'

export interface RendererCallbacks {
  onNodeClick: (nodeId: string, button: 0 | 2) => void
  onNodeHover: (nodeId: string | null) => void
}

export interface RendererInstance {
  renderTree(
    data: TreeData,
    nodeAllocations: Record<string, number>,
    highlightedNodes: HighlightedNodes
  ): void
  resize(w: number, h: number): void
  destroy(): void
  getViewport(): { x: number; y: number; scale: number }
  addTickerListener(fn: () => void): () => void
  setReducedMotion(enabled: boolean): void
}

export interface SkillTreeCanvasProps {
  treeData: TreeData
  nodeAllocations: Record<string, number>
  highlightedNodes: HighlightedNodes
  onNodeClick: (nodeId: string, button: 0 | 2) => void
  onNodeHover: (nodeId: string | null) => void
  onKeyboardNavigate: (nodeId: string | null, screenX: number, screenY: number) => void
}

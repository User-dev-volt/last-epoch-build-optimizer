import type { PassiveNode, PassiveTree } from "../lib/types";

type AdjacencyMap = Map<string, string[]>;

function buildAdjacency(nodes: PassiveNode[]): AdjacencyMap {
  const adj: AdjacencyMap = new Map();
  for (const node of nodes) {
    adj.set(node.id, node.connections);
  }
  return adj;
}

/**
 * Returns true if nodeId can be reached from any starting node
 * by traversing only already-allocated nodes (plus the starting nodes themselves).
 */
export function isNodeReachable(
  nodeId: string,
  allocations: Record<string, number>,
  tree: PassiveTree
): boolean {
  const adj = buildAdjacency(tree.nodes);
  const startingIds = new Set(tree.startingNodeIds);

  // Starting nodes are always reachable
  if (startingIds.has(nodeId)) return true;

  // BFS from all starting nodes through allocated nodes
  const visited = new Set<string>();
  const queue = [...tree.startingNodeIds];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const neighbors = adj.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      if (neighbor === nodeId) return true;
      // Can traverse through allocated nodes
      if (allocations[neighbor] && allocations[neighbor] > 0) {
        queue.push(neighbor);
      } else {
        // It's adjacent but not allocated — can still reach nodeId if neighbor === nodeId
        // (handled above), but can't traverse further through it
        if (neighbor === nodeId) return true;
      }
    }
  }

  return visited.has(nodeId);
}

/**
 * Returns true if nodeId can be deallocated without disconnecting
 * any other allocated node from the starting nodes.
 */
export function canDeallocate(
  nodeId: string,
  allocations: Record<string, number>,
  tree: PassiveTree
): boolean {
  // Simulate removing this node
  const newAllocations = { ...allocations };
  delete newAllocations[nodeId];

  const adj = buildAdjacency(tree.nodes);
  const startingIds = new Set(tree.startingNodeIds);

  // BFS from starting nodes through remaining allocated nodes
  const reachable = new Set<string>();
  const queue = [...tree.startingNodeIds];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);

    const neighbors = adj.get(current) ?? [];
    for (const neighbor of neighbors) {
      if (reachable.has(neighbor)) continue;
      if (startingIds.has(neighbor) || newAllocations[neighbor] > 0) {
        queue.push(neighbor);
      }
    }
  }

  // Check all remaining allocated nodes are still reachable
  for (const [id, pts] of Object.entries(newAllocations)) {
    if (pts > 0 && !reachable.has(id) && !startingIds.has(id)) {
      return false;
    }
  }

  return true;
}

/**
 * Returns total allocated points for passive tree.
 */
export function totalAllocatedPoints(allocations: Record<string, number>): number {
  return Object.values(allocations).reduce((sum, pts) => sum + pts, 0);
}

/**
 * Returns set of reachable (but unallocated) node IDs — nodes adjacent to
 * any allocated or starting node.
 */
export function getReachableNodes(
  allocations: Record<string, number>,
  tree: PassiveTree
): Set<string> {
  const adj = buildAdjacency(tree.nodes);
  const startingIds = new Set(tree.startingNodeIds);
  const reachable = new Set<string>();

  const frontier = new Set<string>([...tree.startingNodeIds, ...Object.keys(allocations)]);

  for (const nodeId of frontier) {
    const neighbors = adj.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!allocations[neighbor] && !startingIds.has(neighbor)) {
        reachable.add(neighbor);
      }
    }
  }

  return reachable;
}

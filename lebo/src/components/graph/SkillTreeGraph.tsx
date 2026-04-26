import { useEffect, useRef, useState, useCallback } from "react";
import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { useGameDataStore } from "../../stores/gameDataStore";
import { useBuildStore } from "../../stores/buildStore";
import { useUIStore } from "../../stores/uiStore";
import { useOptimizationStore } from "../../stores/optimizationStore";
import { isNodeReachable, canDeallocate, totalAllocatedPoints } from "../../engine/graphUtils";
import type { PassiveNode, PassiveTree } from "../../lib/types";

const MAX_PASSIVE_POINTS = 113;

// ─── Design system colors ─────────────────────────────────────────────────────
const C = {
  bg:                  0x0d0e12,
  edgeDefault:         0x2a2d38,
  edgeAllocated:       0xc8943a,
  nodeAllocated:       0xc8943a,
  nodeAllocatedBorder: 0xe8b050,
  nodeAvailable:       0x1e3048,
  nodeAvailableBorder: 0x3a5070,
  nodeLocked:          0x181a1e,
  nodeLockedBorder:    0x2a2d38,
  nodeSelected:        0xe8b050,
  nodeSuggested:       0x4ae870,
  textPrimary:         0xe8e4dc,
};

const NODE_RADIUS = 14;
const KEYSTONE_RADIUS = 20;

export function SkillTreeGraph() {
  const canvasRef   = useRef<HTMLDivElement>(null);
  const appRef      = useRef<Application | null>(null);
  const containerRef = useRef<Container | null>(null);
  const [pixiReady, setPixiReady] = useState(false);

  const [tooltip, setTooltip] = useState<{
    x: number; y: number; node: PassiveNode;
  } | null>(null);

  const { getPassiveTree } = useGameDataStore();
  const { masteryId, passiveAllocations, allocateNode, deallocateNode } = useBuildStore();
  const { selectedNodeId, setSelectedNode, addToast } = useUIStore();
  const { suggestions } = useOptimizationStore();

  const tree     = masteryId ? getPassiveTree(masteryId) : undefined;
  const suggestedIds = new Set(suggestions.map((s) => s.nodeId));

  // ─── Init Pixi once ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    let cancelled = false;
    let initDone  = false; // tracks whether app.init() resolved
    const app = new Application();

    app.init({
      background: C.bg,
      resizeTo: el,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      // Cleanup already ran before init finished — destroy here now that it's safe
      if (cancelled) { app.destroy(true, { children: true }); return; }

      initDone = true;

      el.appendChild(app.canvas);
      appRef.current = app;

      const gc = new Container();
      app.stage.addChild(gc);
      containerRef.current = gc;

      // ── Zoom ──
      app.canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.12 : -0.12;
        gc.scale.set(Math.min(2.5, Math.max(0.3, gc.scale.x + delta)));
      }, { passive: false });

      // ── Pan ──
      let dragging = false;
      let ox = 0, oy = 0, cx = 0, cy = 0;
      app.canvas.addEventListener("pointerdown", (e) => {
        dragging = true;
        ox = e.clientX; oy = e.clientY;
        cx = gc.x;      cy = gc.y;
      });
      app.canvas.addEventListener("pointermove", (e) => {
        if (dragging) {
          gc.x = cx + (e.clientX - ox);
          gc.y = cy + (e.clientY - oy);
        }
      });
      app.canvas.addEventListener("pointerup",    () => { dragging = false; });
      app.canvas.addEventListener("pointerleave", () => { dragging = false; });

      setPixiReady(true);
    });

    return () => {
      cancelled = true;
      setPixiReady(false);
      appRef.current = null;
      containerRef.current = null;
      // Only destroy if init already completed — otherwise .then() handles it
      if (initDone) app.destroy(true, { children: true });
    };
  }, []); // run once

  // ─── Render tree whenever pixi or data changes ───────────────────────────
  const fitTree = useCallback(() => {
    const gc  = containerRef.current;
    const app = appRef.current;
    if (!gc || !app || gc.children.length === 0) return;
    const b = gc.getLocalBounds();
    gc.scale.set(1);
    gc.x = app.renderer.width  / 2 - (b.x + b.width  / 2);
    gc.y = app.renderer.height / 2 - (b.y + b.height / 2);
  }, []);

  useEffect(() => {
    const gc = containerRef.current;
    if (!gc || !tree || !pixiReady) return;

    gc.removeChildren();

    drawTree(gc, tree, passiveAllocations, selectedNodeId, suggestedIds, {
      onNodeClick: (node) => {
        setSelectedNode(node.id === selectedNodeId ? null : node.id);
      },
      onNodeDoubleClick: (node) => {
        const pts = passiveAllocations[node.id] ?? 0;
        if (pts > 0) {
          if (canDeallocate(node.id, passiveAllocations, tree)) {
            deallocateNode(node.id);
          } else {
            addToast("Cannot remove — would disconnect the tree");
          }
        } else {
          const used = totalAllocatedPoints(passiveAllocations);
          if (used >= MAX_PASSIVE_POINTS) {
            addToast("Out of points — 113 maximum reached");
          } else if (isNodeReachable(node.id, passiveAllocations, tree)) {
            allocateNode(node.id);
          } else {
            addToast("Node not reachable — allocate connecting nodes first");
          }
        }
      },
      onNodeHover: (node, sx, sy) => {
        setTooltip(node ? { x: sx, y: sy, node } : null);
      },
    });

    // Center only on first tree load (when no allocations yet)
    if (Object.keys(passiveAllocations).length === 0) fitTree();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixiReady, tree, passiveAllocations, selectedNodeId, suggestions.length]);

  // ─── Empty states ────────────────────────────────────────────────────────
  if (!masteryId) {
    return <Placeholder text="Select a mastery to view its skill tree." />;
  }
  if (!tree) {
    return <Placeholder text="Loading skill tree data…" />;
  }

  return (
    <div className="relative w-full h-full">
      {/* Pixi canvas mount point */}
      <div ref={canvasRef} className="w-full h-full" />

      {/* Node tooltip */}
      {tooltip && (
        <NodeTooltip
          node={tooltip.node}
          allocated={passiveAllocations[tooltip.node.id] ?? 0}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}

      {/* Zoom controls */}
      <ZoomControls onFit={fitTree} containerRef={containerRef} />
    </div>
  );
}

// ─── Drawing ──────────────────────────────────────────────────────────────────

function drawTree(
  gc: Container,
  tree: PassiveTree,
  allocations: Record<string, number>,
  selectedId: string | null,
  suggestedIds: Set<string>,
  cb: {
    onNodeClick: (n: PassiveNode) => void;
    onNodeDoubleClick: (n: PassiveNode) => void;
    onNodeHover: (n: PassiveNode | null, x: number, y: number) => void;
  }
) {
  const nodeMap = new Map(tree.nodes.map((n) => [n.id, n]));

  const edgeLayer       = new Container();
  const nodeLayer       = new Container();
  const suggestionLayer = new Container();
  gc.addChild(edgeLayer, nodeLayer, suggestionLayer);

  // ── Edges ──
  const drawnEdges = new Set<string>();
  for (const node of tree.nodes) {
    for (const toId of node.connections) {
      const key = [node.id, toId].sort().join("--");
      if (drawnEdges.has(key)) continue;
      drawnEdges.add(key);

      const to = nodeMap.get(toId);
      if (!to) continue;

      const bothAlloc = (allocations[node.id] ?? 0) > 0 && (allocations[toId] ?? 0) > 0;
      const g = new Graphics();
      g.moveTo(node.x, node.y);
      g.lineTo(to.x,   to.y);
      g.stroke({ color: bothAlloc ? C.edgeAllocated : C.edgeDefault, width: bothAlloc ? 2 : 1, alpha: 0.6 });
      edgeLayer.addChild(g);
    }
  }

  // ── Nodes ──
  for (const node of tree.nodes) {
    const alloc     = allocations[node.id] ?? 0;
    const isAlloc   = alloc > 0;
    const isSel     = node.id === selectedId;
    const isSugg    = suggestedIds.has(node.id);
    const r         = node.maxPoints > 1 ? KEYSTONE_RADIUS : NODE_RADIUS;

    // Suggestion glow
    if (isSugg && !isAlloc) {
      const glow = new Graphics();
      glow.circle(node.x, node.y, r + 7);
      glow.fill({ color: C.nodeSuggested, alpha: 0.2 });
      suggestionLayer.addChild(glow);
    }

    const fill   = isAlloc ? C.nodeAllocated  : C.nodeAvailable;
    const border = isAlloc ? C.nodeAllocatedBorder
                 : isSel   ? C.nodeSelected
                 : isSugg  ? C.nodeSuggested
                 :            C.nodeAvailableBorder;
    const bw = (isSel || isSugg) ? 2 : 1;

    const g = new Graphics();
    g.circle(node.x, node.y, r);
    g.fill({ color: fill });
    g.stroke({ color: border, width: bw });

    // Label for keystones
    if (node.maxPoints > 1) {
      const style = new TextStyle({ fontSize: 8, fill: C.textPrimary, fontFamily: "Inter,sans-serif" });
      const lbl = new Text({ text: node.name.slice(0, 14), style });
      lbl.anchor.set(0.5);
      lbl.x = node.x;
      lbl.y = node.y + r + 9;
      nodeLayer.addChild(lbl);
    }

    // Interaction
    g.eventMode = "static";
    g.cursor    = "pointer";

    let lastClick = 0;
    g.on("pointerdown", (e) => {
      e.stopPropagation();
      const now = Date.now();
      if (now - lastClick < 280) cb.onNodeDoubleClick(node);
      else                        cb.onNodeClick(node);
      lastClick = now;
    });
    g.on("pointerenter", (e) => cb.onNodeHover(node, e.global.x, e.global.y));
    g.on("pointerleave", ()  => cb.onNodeHover(null, 0, 0));

    nodeLayer.addChild(g);
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Placeholder({ text }: { text: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center text-lebo-text-muted text-sm">
      {text}
    </div>
  );
}

function ZoomControls({
  onFit,
  containerRef,
}: {
  onFit: () => void;
  containerRef: React.RefObject<Container | null>;
}) {
  const adjust = (delta: number) => {
    const gc = containerRef.current;
    if (!gc) return;
    gc.scale.set(Math.min(2.5, Math.max(0.3, gc.scale.x + delta)));
  };

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1">
      {[
        { label: "+", action: () => adjust(+0.2) },
        { label: "fit", action: onFit },
        { label: "−", action: () => adjust(-0.2) },
      ].map(({ label, action }) => (
        <button
          key={label}
          onClick={action}
          className="w-8 h-8 bg-lebo-surface border border-lebo-border rounded text-lebo-text-secondary hover:text-lebo-gold hover:border-lebo-gold transition-colors text-sm"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function NodeTooltip({
  node, allocated, x, y,
}: {
  node: PassiveNode; allocated: number; x: number; y: number;
}) {
  // Keep tooltip inside viewport
  const left = Math.min(x + 14, window.innerWidth - 220);
  const top  = Math.max(y - 8,  8);

  return (
    <div
      className="absolute z-20 pointer-events-none bg-lebo-surface-elevated border border-lebo-border rounded p-3 w-52 text-xs shadow-xl"
      style={{ left, top }}
    >
      <div className="text-lebo-text-primary font-medium mb-1">{node.name}</div>
      <p  className="text-lebo-text-secondary leading-relaxed">{node.description}</p>
      <div className="mt-2 pt-2 border-t border-lebo-border flex justify-between text-lebo-text-muted">
        <span>{node.maxPoints} pt{node.maxPoints !== 1 ? "s" : ""}</span>
        {allocated > 0 && <span className="text-lebo-gold">✓ Allocated</span>}
      </div>
    </div>
  );
}

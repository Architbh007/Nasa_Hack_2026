"use client";

import { useEffect, useMemo, useRef } from "react";
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from "react-force-graph-2d";
import { FUEL_PHASE_COLOR } from "@/lib/chart-colors";
import type { GraphLink, GraphNode } from "@/lib/graph";
import type { EdgeLabel } from "@/lib/similarity";
import { EDGE_COLOR, EDGE_DASH, EDGE_DIM, HIGHLIGHT } from "@/lib/graph-style";

type N = NodeObject<GraphNode>;
type L = LinkObject<GraphNode, GraphLink>;

/** Gentle pull toward the origin so disconnected clusters stay in view. */
function gravityForce(strength: number) {
  let nodes: N[] = [];
  const force = (alpha: number) => {
    for (const n of nodes) {
      n.vx = (n.vx ?? 0) - (n.x ?? 0) * strength * alpha;
      n.vy = (n.vy ?? 0) - (n.y ?? 0) * strength * alpha;
    }
  };
  force.initialize = (ns: N[]) => {
    nodes = ns;
  };
  return force;
}

const endpointId = (end: L["source"]): string =>
  typeof end === "object" && end !== null ? String((end as N).id) : String(end);

export function ForceGraphCanvas({
  nodes,
  links,
  width,
  height,
  highlightNodes,
  highlightEdges,
  selectedEdgeId,
  selectedNodeId,
  onLinkClick,
  onNodeClick,
  onBackgroundClick,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
  width: number;
  height: number;
  highlightNodes: ReadonlySet<string>;
  highlightEdges: ReadonlySet<string>;
  selectedEdgeId: string | null;
  selectedNodeId: string | null;
  onLinkClick: (link: GraphLink) => void;
  onNodeClick: (node: GraphNode) => void;
  onBackgroundClick: () => void;
}) {
  const ref = useRef<ForceGraphMethods<N, L> | undefined>(undefined);
  const fitted = useRef(false);

  // force-graph mutates node and link objects, so give it its own copies.
  // Node copies persist across threshold changes so the layout stays put.
  const nodeCopies = useMemo(() => nodes.map((n) => ({ ...n })), [nodes]);
  const graphData = useMemo(
    () => ({ nodes: nodeCopies, links: links.map((l) => ({ ...l })) }),
    [nodeCopies, links]
  );

  useEffect(() => {
    const charge = ref.current?.d3Force("charge");
    if (charge && typeof charge.strength === "function") charge.strength(-220);
    const link = ref.current?.d3Force("link");
    if (link && typeof link.distance === "function") {
      link.distance((l: L) => 60 + (1 - Number(l.score ?? 0.5)) * 120);
    }
    ref.current?.d3Force("gravity", gravityForce(0.08));
    ref.current?.d3ReheatSimulation();
  }, [graphData]);

  // Frame the graph on mount, and frame the highlighted nodes when an insight opens.
  const focusKey = [...highlightNodes].sort().join(",");
  useEffect(() => {
    const t = window.setTimeout(() => {
      const focus = focusKey ? new Set(focusKey.split(",")) : null;
      ref.current?.zoomToFit(500, focus ? 90 : 40, focus ? (n) => focus.has(String(n.id)) : undefined);
      fitted.current = true;
    }, 120);
    return () => window.clearTimeout(t);
  }, [focusKey, width, height]);

  const anyHighlight = highlightNodes.size > 0 || selectedNodeId !== null || selectedEdgeId !== null;
  const nodeIsLit = (id: string) =>
    !anyHighlight || highlightNodes.has(id) || id === selectedNodeId;

  return (
    <ForceGraph2D<GraphNode, GraphLink>
      ref={ref}
      graphData={graphData}
      width={width}
      height={height}
      backgroundColor="rgba(0,0,0,0)"
      nodeRelSize={4}
      nodeVal={(n) => 1.5 + (n.avgRelevance ?? 0) ** 2 * 0.9}
      nodeLabel={(n) => `${n.acronym} · ${n.name}`}
      linkLabel={(l) => `${l.label} · similarity ${Number(l.score).toFixed(2)}`}
      linkColor={(l) => (highlightEdges.has(String(l.id)) || l.id === selectedEdgeId ? HIGHLIGHT : anyHighlight ? EDGE_DIM : EDGE_COLOR)}
      linkWidth={(l) => (l.id === selectedEdgeId ? 4 : highlightEdges.has(String(l.id)) ? 3 : 0.6 + Number(l.score) * 3)}
      linkLineDash={(l) => EDGE_DASH[l.label as EdgeLabel] ?? null}
      linkHoverPrecision={6}
      warmupTicks={120}
      cooldownTicks={120}
      onEngineStop={() => {
        if (!fitted.current) ref.current?.zoomToFit(400, 40);
      }}
      onLinkClick={(l) =>
        onLinkClick({
          ...(l as GraphLink),
          source: endpointId(l.source),
          target: endpointId(l.target),
        })
      }
      onNodeClick={(n) => onNodeClick(n as GraphNode)}
      onBackgroundClick={onBackgroundClick}
      nodeCanvasObject={(n, ctx, scale) => {
        const id = String(n.id);
        const r = Math.sqrt(1.5 + (n.avgRelevance ?? 0) ** 2 * 0.9) * 4;
        const lit = nodeIsLit(id);
        ctx.globalAlpha = lit ? 1 : 0.25;
        ctx.beginPath();
        ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, 2 * Math.PI);
        ctx.fillStyle = FUEL_PHASE_COLOR[n.fuelPhase as GraphNode["fuelPhase"]];
        ctx.fill();
        ctx.lineWidth = id === selectedNodeId || highlightNodes.has(id) ? 2.5 / scale + 1 : 1.5 / scale;
        ctx.strokeStyle = id === selectedNodeId || highlightNodes.has(id) ? HIGHLIGHT : "#0a101c";
        ctx.stroke();
        const fontSize = Math.max(10 / scale, 3.2);
        ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#e6ebf4";
        ctx.fillText(String(n.acronym), n.x ?? 0, (n.y ?? 0) + r + 2 / scale);
        ctx.globalAlpha = 1;
      }}
      nodePointerAreaPaint={(n, color, ctx) => {
        const r = Math.sqrt(1.5 + (n.avgRelevance ?? 0) ** 2 * 0.9) * 4 + 3;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, 2 * Math.PI);
        ctx.fill();
      }}
    />
  );
}

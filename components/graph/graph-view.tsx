"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Lightbulb, MousePointerClick } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge, DataLevelBadge } from "@/components/common/badges";
import { EdgeExplanation } from "@/components/graph/edge-explanation";
import { EDGE_COLOR_SOLID, EDGE_DASH } from "@/lib/graph-style";
import { CATEGORY_COLOR } from "@/lib/chart-colors";
import { CATEGORY_LABEL } from "@/lib/constants";
import { formatO2Range, formatPressureRange } from "@/lib/format";
import {
  buildLinks,
  buildNodes,
  DEFAULT_THRESHOLD,
  INSIGHTS,
  type GraphLink,
  type Insight,
} from "@/lib/graph";
import { CATEGORIES, type Investigation } from "@/lib/schema";
import { similarity, SIMILARITY_KEYS, SIMILARITY_LABEL, type EdgeLabel } from "@/lib/similarity";
import { cn } from "@/lib/utils";

const ForceGraphCanvas = dynamic(
  () => import("@/components/graph/force-graph-canvas").then((m) => m.ForceGraphCanvas),
  { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-lg" /> }
);

const GRAPH_HEIGHT = 620;
const EDGE_LABELS: readonly EdgeLabel[] = ["PSI-listed relation", "shared hardware", "same project", "shared material"];

function DashSample({ dash }: { dash: number[] | null }) {
  return (
    <svg width="28" height="8" aria-hidden>
      <line x1="0" y1="4" x2="28" y2="4" stroke={EDGE_COLOR_SOLID} strokeWidth="2" strokeDasharray={dash ? dash.join(" ") : undefined} />
    </svg>
  );
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.floor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

function EdgeDetail({ link, byId }: { link: GraphLink; byId: ReadonlyMap<string, Investigation> }) {
  const a = byId.get(link.source);
  const b = byId.get(link.target);
  if (!a || !b) return null;
  const s = similarity(a, b);
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">Selected link</p>
        <p className="text-base font-medium">
          <Link href={`/explore?id=${a.id}`} className="hover:underline">{a.acronym}</Link>
          <span className="text-muted-foreground"> ↔ </span>
          <Link href={`/explore?id=${b.id}`} className="hover:underline">{b.acronym}</Link>
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">{link.label}</Badge>
          <span className="tabular text-xs text-muted-foreground">similarity {s.score.toFixed(2)}</span>
        </div>
      </div>
      <EdgeExplanation source={link.source} target={link.target} />
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="py-1 text-left font-normal">Component</th>
            <th className="py-1 text-right font-normal">Score</th>
            <th className="py-1 pl-3 text-left font-normal">Shared</th>
          </tr>
        </thead>
        <tbody>
          {SIMILARITY_KEYS.map((k) => {
            const c = s.components[k];
            return (
              <tr key={k} className="border-t border-border/60 align-top">
                <td className="py-1.5">{SIMILARITY_LABEL[k]}</td>
                <td className="tabular py-1.5 text-right">{c.jaccard === null ? "–" : c.jaccard.toFixed(2)}</td>
                <td className="py-1.5 pl-3 text-muted-foreground">{c.shared.length ? c.shared.join(", ") : "none"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NodeDetail({ inv, degree }: { inv: Investigation; degree: number }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">Selected investigation</p>
        <p className="text-base font-medium">{inv.acronym}</p>
        <p className="text-sm text-muted-foreground">{inv.name}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <CategoryBadge category={inv.category} />
        <DataLevelBadge level={inv.dataLevel} />
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div><dt className="text-muted-foreground">O2 in runs</dt><dd className="tabular">{formatO2Range(inv)}</dd></div>
        <div><dt className="text-muted-foreground">Pressure in runs</dt><dd className="tabular">{formatPressureRange(inv)}</dd></div>
        <div className="col-span-2"><dt className="text-muted-foreground">Hardware</dt><dd>{inv.hardware.map((h) => h.name).join("; ") || "Not listed"}</dd></div>
        <div><dt className="text-muted-foreground">Links shown</dt><dd className="tabular">{degree}</dd></div>
      </dl>
      <Link href={`/explore?id=${inv.id}`} className="inline-block text-sm text-link hover:underline">
        Open full record →
      </Link>
    </div>
  );
}

/** Threshold and selected edge that make an insight's links visible. */
function insightView(ins: Insight, allLinks: readonly GraphLink[], threshold: number) {
  const edges = allLinks.filter((l) => ins.edgeIds.includes(l.id));
  const minScore = Math.min(...edges.map((e) => e.score));
  return {
    threshold: Number.isFinite(minScore) && minScore < threshold ? Math.floor(minScore * 100) / 100 : threshold,
    edge: edges.find((e) => e.id === ins.edgeIds[0]) ?? edges[0] ?? null,
  };
}

export function GraphView({ investigations }: { investigations: Investigation[] }) {
  const allLinks = useMemo(() => buildLinks(investigations, 0), [investigations]);
  // ?insight=daft-same opens a callout on load (used by the demo script).
  const searchParams = useSearchParams();
  const [initial] = useState(() => {
    const ins = INSIGHTS.find((i) => i.id === searchParams.get("insight")) ?? null;
    return ins
      ? { insight: ins, ...insightView(ins, allLinks, DEFAULT_THRESHOLD) }
      : { insight: null, threshold: DEFAULT_THRESHOLD, edge: null };
  });

  const [threshold, setThreshold] = useState(initial.threshold);
  const [selectedEdge, setSelectedEdge] = useState<GraphLink | null>(initial.edge);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [insight, setInsight] = useState<Insight | null>(initial.insight);
  const { ref, width } = useWidth<HTMLDivElement>();

  const byId = useMemo(() => new Map(investigations.map((i) => [i.id, i])), [investigations]);
  const nodes = useMemo(() => buildNodes(investigations), [investigations]);
  const links = useMemo(() => buildLinks(investigations, threshold), [investigations, threshold]);

  const highlightNodes = useMemo(() => new Set(insight?.nodeIds ?? []), [insight]);
  const highlightEdges = useMemo(() => new Set(insight?.edgeIds ?? []), [insight]);

  const openInsight = (ins: Insight) => {
    const view = insightView(ins, allLinks, threshold);
    setThreshold(view.threshold);
    setInsight(ins);
    setSelectedNodeId(null);
    setSelectedEdge(view.edge);
  };

  const labelCounts = useMemo(() => {
    const m = new Map<EdgeLabel, number>();
    for (const l of links) m.set(l.label, (m.get(l.label) ?? 0) + 1);
    return m;
  }, [links]);

  const selectedInv = selectedNodeId ? byId.get(selectedNodeId) : undefined;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="gap-3 overflow-hidden">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-64 flex-1 items-center gap-3">
            <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Similarity ≥</span>
            <Slider
              min={0.1}
              max={0.9}
              step={0.01}
              value={[threshold]}
              onValueChange={(v) => setThreshold(v[0] ?? threshold)}
              aria-label="Similarity threshold"
              className="max-w-xs"
            />
            <span className="tabular w-10 text-sm">{threshold.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground">{links.length} links</span>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {CATEGORIES.map((c) => (
              <li key={c} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[c] }} aria-hidden />
                {CATEGORY_LABEL[c]}
              </li>
            ))}
          </ul>
        </CardHeader>
        <CardContent className="space-y-3">
          <div ref={ref} style={{ height: GRAPH_HEIGHT }} className="dark relative rounded-lg border border-border bg-[#0a101c]">
            <ForceGraphCanvas
              nodes={nodes}
              links={links}
              width={width}
              height={GRAPH_HEIGHT}
              highlightNodes={highlightNodes}
              highlightEdges={highlightEdges}
              selectedEdgeId={selectedEdge?.id ?? null}
              selectedNodeId={selectedNodeId}
              onLinkClick={(l) => {
                setSelectedEdge(l);
                setSelectedNodeId(null);
                setInsight(null);
              }}
              onNodeClick={(n) => {
                setSelectedNodeId(n.id);
                setSelectedEdge(null);
                setInsight(null);
              }}
              onBackgroundClick={() => {
                setSelectedNodeId(null);
                setSelectedEdge(null);
                setInsight(null);
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            {EDGE_LABELS.map((l) => (
              <span key={l} className="flex items-center gap-1.5">
                <DashSample dash={EDGE_DASH[l]} />
                <span>{l}</span>
                <span className="tabular">({labelCounts.get(l) ?? 0})</span>
              </span>
            ))}
            <span>Node size = run-level tests held. Line width = similarity. Category colours are the team&apos;s classification.</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="pt-0">
            {selectedEdge ? (
              <EdgeDetail link={selectedEdge} byId={byId} />
            ) : selectedInv ? (
              <NodeDetail inv={selectedInv} degree={links.filter((l) => l.source === selectedInv.id || l.target === selectedInv.id).length} />
            ) : (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <MousePointerClick className="mt-0.5 size-4 shrink-0" aria-hidden />
                Click a link to see what two investigations share and get an SI explanation. Click a node for its summary.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="size-4 text-warning" aria-hidden /> Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {INSIGHTS.map((ins) => (
              <button
                key={ins.id}
                type="button"
                onClick={() => openInsight(ins)}
                aria-pressed={insight?.id === ins.id}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  insight?.id === ins.id ? "border-primary/60 bg-primary/10" : "border-border bg-background/40 hover:border-primary/40"
                )}
              >
                <p className="text-sm font-medium">{ins.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ins.body}</p>
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground/80">Source: {ins.source}</p>
                <p className="mt-2 text-xs text-link">Highlight in graph →</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

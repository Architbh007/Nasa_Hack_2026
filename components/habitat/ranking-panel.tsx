"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChartLegend } from "@/components/charts/chart-parts";
import { CategoryBadge } from "@/components/common/badges";
import { SERIES_COLORS } from "@/lib/chart-colors";
import {
  DEFAULT_RANKING_WEIGHTS,
  RANKING_COMPONENTS,
  RANKING_LABEL,
  type RankedInvestigation,
  type RankingComponentKey,
  type RankingWeights,
} from "@/lib/ranking";
import { cn } from "@/lib/utils";

const COMPONENT_COLOR: Record<RankingComponentKey, string> = {
  rangeOverlap: SERIES_COLORS[0],
  categoryMatch: SERIES_COLORS[1],
  flowMatch: SERIES_COLORS[2],
  evidenceLevel: SERIES_COLORS[3],
};

const COMPONENT_HELP: Record<RankingComponentKey, string> = {
  rangeOverlap: "1 if the O2/pressure span of its real runs contains your point, decaying with distance; 0 without run data",
  categoryMatch: "1 for the same fuel category with a matching material, 0.75 same category, 0.1 other category",
  flowMatch: "How well the recorded airflow range matches your airflow setting; 0.5 when airflow is not recorded",
  evidenceLevel: "Run tables score 0.6 plus up to 0.4 for run count; summaries 0.2 to 0.4; description only 0",
};

function SegmentedScore({ r }: { r: RankedInvestigation }) {
  return (
    <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-[3px] bg-muted/60" aria-hidden>
      {r.components.map((c) =>
        c.contribution > 0.0005 ? (
          <span key={c.key} style={{ width: `${c.contribution * 100}%`, backgroundColor: COMPONENT_COLOR[c.key] }} />
        ) : null
      )}
    </div>
  );
}

function RankedRow({ r, rank }: { r: RankedInvestigation; rank: number }) {
  const [open, setOpen] = useState(false);
  const inv = r.investigation;
  return (
    <li className="rounded-lg border border-border bg-background/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_3rem_1rem] items-center gap-3 px-3 py-2.5 text-left"
      >
        <span className="tabular text-xs text-muted-foreground">{rank}</span>
        <span className="min-w-0 space-y-1.5">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{inv.acronym}</span>
            <CategoryBadge category={inv.category} className="text-[11px] text-muted-foreground" />
          </span>
          <SegmentedScore r={r} />
        </span>
        <span className="tabular text-right text-sm font-semibold">{(r.score * 100).toFixed(0)}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border px-3 py-3">
          <p className="text-xs text-muted-foreground">{inv.name}</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="py-1 text-left font-normal">Component</th>
                <th className="py-1 text-right font-normal">Value</th>
                <th className="py-1 text-right font-normal">Weight</th>
                <th className="py-1 text-right font-normal">Points</th>
              </tr>
            </thead>
            <tbody>
              {r.components.map((c) => (
                <tr key={c.key} className="border-t border-border/50 align-top">
                  <td className="py-1.5 pr-2">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-sm" style={{ backgroundColor: COMPONENT_COLOR[c.key] }} aria-hidden />
                      {c.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{c.detail}</span>
                  </td>
                  <td className="tabular py-1.5 text-right">{c.value.toFixed(2)}</td>
                  <td className="tabular py-1.5 text-right">{c.weight.toFixed(2)}</td>
                  <td className="tabular py-1.5 text-right">{(c.contribution * 100).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link href={`/explore?id=${inv.id}`} className="inline-block text-xs text-link hover:underline">
            Open {inv.acronym} in Explorer →
          </Link>
        </div>
      )}
    </li>
  );
}

export function RankingPanel({
  ranked,
  weights,
  onWeights,
  limit = 8,
}: {
  ranked: readonly RankedInvestigation[];
  weights: RankingWeights;
  onWeights: (w: RankingWeights) => void;
  limit?: number;
}) {
  const total = RANKING_COMPONENTS.reduce((s, k) => s + weights[k], 0);
  const changed = RANKING_COMPONENTS.some((k) => weights[k] !== DEFAULT_RANKING_WEIGHTS[k]);
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Score weights</p>
          {changed && (
            <Button variant="ghost" size="xs" onClick={() => onWeights(DEFAULT_RANKING_WEIGHTS)}>
              <RotateCcw /> Reset
            </Button>
          )}
        </div>
        {RANKING_COMPONENTS.map((k) => (
          <div key={k} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5" title={COMPONENT_HELP[k]}>
                <span className="size-2 rounded-sm" style={{ backgroundColor: COMPONENT_COLOR[k] }} aria-hidden />
                {RANKING_LABEL[k]}
              </span>
              <span className="tabular text-muted-foreground">{total > 0 ? Math.round((weights[k] / total) * 100) : 0}%</span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[weights[k]]}
              onValueChange={(v) => onWeights({ ...weights, [k]: v[0] ?? weights[k] })}
              aria-label={`${RANKING_LABEL[k]} weight`}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">{COMPONENT_HELP[k]}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <ChartLegend
          items={RANKING_COMPONENTS.map((k) => ({ key: k, label: RANKING_LABEL[k], color: COMPONENT_COLOR[k], shape: "square" as const }))}
        />
        <ol className="space-y-2">
          {ranked.slice(0, limit).map((r, i) => (
            <RankedRow key={r.investigation.id} r={r} rank={i + 1} />
          ))}
        </ol>
        <p className="text-[11px] text-muted-foreground">Score = weighted mean of the four components (0–100). Expand a row to see each component.</p>
      </div>
    </div>
  );
}

"use client";

import { useMemo, type ReactNode } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  type TooltipContentProps,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartLegend, TooltipCard } from "@/components/charts/chart-parts";
import { CategoryBadge, DataLevelBadge, PillarBadges } from "@/components/common/badges";
import { CHART_INK, SERIES_COLORS, SERIES_SHAPES } from "@/lib/chart-colors";
import { OUTCOME_LABEL } from "@/lib/constants";
import { formatFlowRange, formatO2Range, formatPressureRange, formatYears } from "@/lib/format";
import type { Investigation, Run } from "@/lib/schema";
import { metricLabel, metricValue, primaryMetric } from "@/lib/test-metrics";
import { CompareSiSlot } from "@/components/explore/compare-si-slot";
import { niceDomain, tickCountFor } from "@/lib/chart-utils";

type Selected = { inv: Investigation; runs: readonly Run[]; color: string; shape: (typeof SERIES_SHAPES)[number] };

type OverlayPoint = { x: number; y: number; run: Run; acronym: string };

function OverlayTooltip({ active, payload, yLabel }: TooltipContentProps & { yLabel: string }) {
  const first = payload?.[0];
  if (!active || !first) return null;
  const p = first.payload as OverlayPoint;
  return (
    <TooltipCard
      title={`${p.acronym} · ${p.run.id}`}
      rows={[
        ["O2", `${p.x}%`],
        [yLabel, String(p.y)],
        ["Outcome", OUTCOME_LABEL[p.run.outcome]],
      ]}
    />
  );
}

function Overlay({ series, y, yLabel }: { series: Selected[]; y: (r: Run) => number | null; yLabel: string }) {
  const xDomain = niceDomain(series.flatMap((s) => s.runs.flatMap((r) => (r.o2Percent === null ? [] : [r.o2Percent]))));
  return (
    <div className="space-y-2">
      <ChartLegend items={series.map((s) => ({ key: s.inv.id, label: s.inv.acronym, color: s.color, shape: s.shape }))} />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, bottom: 22, left: 4 }}>
            <CartesianGrid stroke={CHART_INK.grid} />
            <XAxis
              type="number"
              dataKey="x"
              domain={xDomain}
              allowDecimals={false}
              tickCount={tickCountFor(xDomain)}
              tick={{ fill: CHART_INK.tick, fontSize: 11 }}
              stroke={CHART_INK.axis}
              label={{ value: "O2 concentration (%)", position: "insideBottom", offset: -12, fill: CHART_INK.label, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              tick={{ fill: CHART_INK.tick, fontSize: 11 }}
              stroke={CHART_INK.axis}
              width={44}
              label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 8, fill: CHART_INK.label, fontSize: 11, style: { textAnchor: "middle" } }}
            />
            <ZAxis range={[48, 48]} />
            <Tooltip content={(props) => <OverlayTooltip {...props} yLabel={yLabel} />} />
            {series.map((s) => (
              <Scatter
                key={s.inv.id}
                name={s.inv.acronym}
                data={s.runs
                  .map((r) => ({ x: r.o2Percent, y: y(r), run: r, acronym: s.inv.acronym }))
                  .filter((p): p is OverlayPoint => p.x !== null && p.y !== null)}
                fill={s.color}
                shape={s.shape}
                fillOpacity={0.85}
                stroke={CHART_INK.surface}
                strokeWidth={1.2}
                isAnimationActive={false}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CompareTable({ series }: { series: Selected[] }) {
  const rows: Array<[string, (s: Selected) => ReactNode]> = [
    ["PSI accession", (s) => s.inv.accession ?? "Published paper"],
    ["Platform", (s) => s.inv.platform || "Not listed"],
    ["Years (PSI)", (s) => formatYears(s.inv)],
    ["Category (team)", (s) => <CategoryBadge category={s.inv.category} />],
    ["Data held", (s) => <DataLevelBadge level={s.inv.dataLevel} />],
    ["Fuels as written", (s) => s.inv.fuels.slice(0, 8).join(", ") || "Not listed"],
    ["Hardware (PSI)", (s) => s.inv.hardware.map((h) => h.name).join("; ") || "Not listed"],
    ["O2 in runs", (s) => formatO2Range(s.inv)],
    ["Pressure in runs", (s) => formatPressureRange(s.inv)],
    ["Flow in runs", (s) => formatFlowRange(s.inv)],
    ["Pillars (team)", (s) => <PillarBadges pillars={s.inv.teamAssessment.safetyPillars} />],
    ["Run-level tests", (s) => String(s.runs.length)],
  ];
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="w-32 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Attribute</th>
            {series.map((s) => (
              <th key={s.inv.id} className="px-3 py-2 text-left text-xs font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                  {s.inv.acronym}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, render]) => (
            <tr key={label} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 align-top text-xs text-muted-foreground">{label}</td>
              {series.map((s) => (
                <td key={s.inv.id} className="tabular px-3 py-2 align-top text-xs">
                  {render(s)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CompareDialog({
  open,
  onOpenChange,
  investigations,
  runsByInvestigation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investigations: readonly Investigation[];
  runsByInvestigation: ReadonlyMap<string, readonly Run[]>;
}) {
  const series: Selected[] = useMemo(
    () =>
      investigations.map((inv, i) => ({
        inv,
        runs: runsByInvestigation.get(inv.id) ?? [],
        color: SERIES_COLORS[i % SERIES_COLORS.length] as string,
        shape: SERIES_SHAPES[i % SERIES_SHAPES.length] as (typeof SERIES_SHAPES)[number],
      })),
    [investigations, runsByInvestigation]
  );

  const sharedMetric: string | null = useMemo(() => {
    const metrics = series.map((s) => primaryMetric(s.runs));
    const first = metrics[0];
    return first && metrics.every((m) => m === first) ? first : null;
  }, [series]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Compare {series.map((s) => s.inv.acronym).join(" · ")}</DialogTitle>
          <DialogDescription>PSI records, tested conditions from real runs and what each one holds, side by side.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 px-6 py-5">
            <CompareSiSlot ids={series.map((s) => s.inv.id)} />
            <div>
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Real runs</h3>
                <Tabs defaultValue={sharedMetric ? "metric" : "conditions"}>
                  <TabsList>
                    <TabsTrigger value="conditions">Tested conditions</TabsTrigger>
                    <TabsTrigger value="metric" disabled={!sharedMetric}>
                      {sharedMetric ? metricLabel(sharedMetric) : "No shared metric"}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="conditions">
                    <Overlay series={series} y={(r) => r.pressurePsi} yLabel="Recorded pressure (psi)" />
                  </TabsContent>
                  {sharedMetric && (
                    <TabsContent value="metric">
                      <Overlay series={series} y={(r) => metricValue(r, sharedMetric)} yLabel={metricLabel(sharedMetric)} />
                    </TabsContent>
                  )}
                </Tabs>
              </section>
            </div>
            <CompareTable series={series} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

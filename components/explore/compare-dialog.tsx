"use client";

import { useMemo, type ReactNode } from "react";
import {
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
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
import { FuelPhaseBadge, PillarBadges } from "@/components/common/badges";
import { CHART_INK, SERIES_COLORS, SERIES_SHAPES } from "@/lib/chart-colors";
import { HABITAT_LABEL } from "@/lib/constants";
import { formatFlowRange, formatO2Range, formatPressureRange, GRAVITY_LEVEL_LABEL, percent } from "@/lib/format";
import { HABITAT_KEYS, type Investigation, type TestRun } from "@/lib/schema";
import { ignitionRate, METRIC_LABEL, metricValue, primaryMetric, type MetricKey } from "@/lib/test-metrics";
import { CompareSiSlot } from "@/components/explore/compare-si-slot";
import { niceDomain, tickCountFor } from "@/lib/chart-utils";

type Selected = { inv: Investigation; tests: readonly TestRun[]; color: string; shape: (typeof SERIES_SHAPES)[number] };

type OverlayPoint = { x: number; y: number; test: TestRun; acronym: string };

function OverlayTooltip({ active, payload, yLabel }: TooltipContentProps & { yLabel: string }) {
  const first = payload?.[0];
  if (!active || !first) return null;
  const p = first.payload as OverlayPoint;
  return (
    <TooltipCard
      title={`${p.acronym} · ${p.test.testId}`}
      rows={[
        ["O2", `${p.x}%`],
        [yLabel, String(p.y)],
        ["Outcome", p.test.outcome],
      ]}
    />
  );
}

function Overlay({ series, y, yLabel }: { series: Selected[]; y: (t: TestRun) => number | null; yLabel: string }) {
  const xDomain = niceDomain(series.flatMap((s) => s.tests.map((t) => t.o2Percent)));
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
                data={s.tests
                  .map((t) => ({ x: t.o2Percent, y: y(t), test: t, acronym: s.inv.acronym }))
                  .filter((p): p is OverlayPoint => p.y !== null)}
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

function RelevanceRadar({ series }: { series: Selected[] }) {
  const data = HABITAT_KEYS.map((h) => {
    const row: Record<string, string | number> = { habitat: HABITAT_LABEL[h] };
    for (const s of series) row[s.inv.id] = s.inv.habitatRelevance[h].score;
    return row;
  });
  return (
    <div className="space-y-2">
      <ChartLegend items={series.map((s) => ({ key: s.inv.id, label: s.inv.acronym, color: s.color, line: true }))} />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke={CHART_INK.grid} />
            <PolarAngleAxis dataKey="habitat" tick={{ fill: CHART_INK.label, fontSize: 12 }} />
            <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fill: CHART_INK.tick, fontSize: 10 }} axisLine={false} angle={45} />
            {series.map((s) => (
              <Radar
                key={s.inv.id}
                name={s.inv.acronym}
                dataKey={s.inv.id}
                stroke={s.color}
                strokeWidth={2}
                fill={s.color}
                fillOpacity={0.1}
                dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            ))}
            <Tooltip
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={String(label ?? "")}
                    rows={payload.map((p) => [String(p.name ?? ""), `${String(p.value)}/5`] as [string, string])}
                  />
                ) : null
              }
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CompareTable({ series }: { series: Selected[] }) {
  const rows: Array<[string, (s: Selected) => ReactNode]> = [
    ["Project", (s) => s.inv.project],
    ["Fuel phase", (s) => <FuelPhaseBadge phase={s.inv.fuelPhase} />],
    ["Fuels", (s) => s.inv.fuels.join(", ")],
    ["Hardware", (s) => s.inv.hardware.join(", ")],
    ["O2 range", (s) => formatO2Range(s.inv)],
    ["Pressure", (s) => formatPressureRange(s.inv)],
    ["Flow", (s) => formatFlowRange(s.inv)],
    ["Gravity", (s) => GRAVITY_LEVEL_LABEL[s.inv.gravityLevel]],
    ["Safety pillars", (s) => <PillarBadges pillars={s.inv.safetyPillars} />],
    ["Runs · ignited", (s) => `${s.tests.length} · ${percent(ignitionRate(s.tests))}`],
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
  testsByInvestigation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investigations: readonly Investigation[];
  testsByInvestigation: ReadonlyMap<string, readonly TestRun[]>;
}) {
  const series: Selected[] = useMemo(
    () =>
      investigations.map((inv, i) => ({
        inv,
        tests: testsByInvestigation.get(inv.id) ?? [],
        color: SERIES_COLORS[i % SERIES_COLORS.length] as string,
        shape: SERIES_SHAPES[i % SERIES_SHAPES.length] as (typeof SERIES_SHAPES)[number],
      })),
    [investigations, testsByInvestigation]
  );

  const sharedMetric: MetricKey | null = useMemo(() => {
    const metrics = series.map((s) => primaryMetric(s.tests));
    const first = metrics[0];
    return first && metrics.every((m) => m === first) ? first : null;
  }, [series]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Compare {series.map((s) => s.inv.acronym).join(" · ")}</DialogTitle>
          <DialogDescription>Habitat relevance, tested conditions and outcomes side by side.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 px-6 py-5">
            <CompareSiSlot ids={series.map((s) => s.inv.id)} />
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Habitat relevance (0–5)</h3>
                <RelevanceRadar series={series} />
              </section>
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Test runs</h3>
                <Tabs defaultValue={sharedMetric ? "metric" : "conditions"}>
                  <TabsList>
                    <TabsTrigger value="conditions">Tested conditions</TabsTrigger>
                    <TabsTrigger value="metric" disabled={!sharedMetric}>
                      {sharedMetric ? METRIC_LABEL[sharedMetric].replace(/ \(.*\)$/, "") : "No shared metric"}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="conditions">
                    <Overlay series={series} y={(t) => t.pressurePsi} yLabel="Pressure (psi)" />
                  </TabsContent>
                  {sharedMetric && (
                    <TabsContent value="metric">
                      <Overlay series={series} y={(t) => metricValue(t, sharedMetric)} yLabel={METRIC_LABEL[sharedMetric]} />
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

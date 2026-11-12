"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { ChartLegend, TooltipCard } from "@/components/charts/chart-parts";
import { CHART_INK, SERIES_COLORS } from "@/lib/chart-colors";
import { PILLAR_LABEL } from "@/lib/constants";
import { SAFETY_PILLARS, type SafetyPillar } from "@/lib/schema";
import type { ScenarioCardData } from "@/components/scenarios/types";

const PILLAR_COLOR: Record<SafetyPillar, string> = {
  prevention: SERIES_COLORS[0],
  detection: SERIES_COLORS[1],
  suppression: SERIES_COLORS[2],
};

type Row = { label: string; overall: number; ignition: number } & Record<SafetyPillar, number>;

function ReadinessTooltip({ active, payload }: TooltipContentProps) {
  const first = payload?.[0];
  if (!active || !first) return null;
  const r = first.payload as Row;
  return (
    <TooltipCard
      title={r.label}
      rows={[
        ...SAFETY_PILLARS.map((p) => [PILLAR_LABEL[p], `${r[p]}/100`] as [string, string]),
        ["Overall readiness", `${r.overall}/100`],
        ["Fabric ignition (model)", `${r.ignition}%`],
      ]}
    />
  );
}

export function ReadinessChart({ data }: { data: readonly ScenarioCardData[] }) {
  const rows: Row[] = data.map((d) => ({
    label: d.label,
    overall: d.overall,
    ignition: Math.round(d.ignitionProbability * 100),
    ...(Object.fromEntries(d.pillars.map((p) => [p.pillar, p.score])) as Record<SafetyPillar, number>),
  }));
  return (
    <figure className="space-y-2">
      <ChartLegend items={SAFETY_PILLARS.map((p) => ({ key: p, label: `${PILLAR_LABEL[p]} coverage`, color: PILLAR_COLOR[p], shape: "square" as const }))} />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid stroke={CHART_INK.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: CHART_INK.label, fontSize: 11 }} stroke={CHART_INK.axis} interval={0} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fill: CHART_INK.tick, fontSize: 11 }} stroke={CHART_INK.axis} width={34} />
            <Tooltip cursor={{ fill: "rgba(148,163,184,0.06)" }} content={(props) => <ReadinessTooltip {...props} />} />
            {SAFETY_PILLARS.map((p) => (
              <Bar key={p} dataKey={p} name={PILLAR_LABEL[p]} fill={PILLAR_COLOR[p]} maxBarSize={22} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-[11px] text-muted-foreground">
        Coverage = mean evidence strength (range overlap, fabric match, airflow match) of the two best records carrying each pillar, 0–100.
        Records whose tested range does not bracket the atmosphere count at 75%.
      </figcaption>
    </figure>
  );
}

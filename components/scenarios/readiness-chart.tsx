"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { ChartLegend, TooltipCard } from "@/components/charts/chart-parts";
import { CATEGORY_COLOR, CHART_INK } from "@/lib/chart-colors";
import { CATEGORY_LABEL } from "@/lib/constants";
import { FUEL_CATEGORIES, type FuelCategory } from "@/lib/habitat";
import type { ScenarioCardData } from "@/components/scenarios/types";

type Row = { label: string } & Record<FuelCategory, number>;

/** Only the closest band is charted: real runs within run distance 0.6 of the preset. */
function ReadinessTooltip({ active, payload }: TooltipContentProps) {
  const first = payload?.[0];
  if (!active || !first) return null;
  const r = first.payload as Row;
  return <TooltipCard title={r.label} rows={FUEL_CATEGORIES.map((c) => [CATEGORY_LABEL[c], `${r[c]} runs`] as [string, string])} />;
}

export function ReadinessChart({ data }: { data: readonly ScenarioCardData[] }) {
  const rows: Row[] = data.map((d) => {
    const close = d.bands.slice(0, 2);
    return {
      label: d.label,
      ...(Object.fromEntries(FUEL_CATEGORIES.map((c) => [c, close.reduce((n, b) => n + b[c], 0)])) as Record<FuelCategory, number>),
    };
  });
  return (
    <figure className="space-y-2">
      <ChartLegend items={FUEL_CATEGORIES.map((c) => ({ key: c, label: CATEGORY_LABEL[c], color: CATEGORY_COLOR[c], shape: "square" as const }))} />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid stroke={CHART_INK.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: CHART_INK.label, fontSize: 11 }} stroke={CHART_INK.axis} interval={0} />
            <YAxis allowDecimals={false} tick={{ fill: CHART_INK.tick, fontSize: 11 }} stroke={CHART_INK.axis} width={40} />
            <Tooltip cursor={{ fill: "rgba(148,163,184,0.06)" }} content={(props) => <ReadinessTooltip {...props} />} />
            {FUEL_CATEGORIES.map((c) => (
              <Bar key={c} dataKey={c} name={CATEGORY_LABEL[c]} fill={CATEGORY_COLOR[c]} maxBarSize={22} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-[11px] text-muted-foreground">
        Real runs within run distance 0.6 of each preset, where 10% O2 counts the same as 3 psi (about ±6% O2 or ±1.8 psi). Runs
        with pressure not recorded are placed at the cited ISS nominal.
      </figcaption>
    </figure>
  );
}

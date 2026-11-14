"use client";

import { useMemo } from "react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, type TooltipContentProps } from "recharts";
import { CHART_INK, OUTCOME_GROUP, OUTCOME_GROUP_ORDER, OUTCOME_GROUP_STYLE, type OutcomeGroup } from "@/lib/chart-colors";
import { OUTCOME_LABEL } from "@/lib/constants";
import { formatRunO2, formatRunPressure, num } from "@/lib/format";
import type { Run } from "@/lib/schema";
import { metricLabel, metricValue, primaryMetric } from "@/lib/test-metrics";
import { ChartLegend, EmptyChart, TooltipCard } from "@/components/charts/chart-parts";
import { niceDomain, tickCountFor } from "@/lib/chart-utils";

type Point = { x: number; y: number; run: Run };
/** "pressurePsi" plots recorded (or paper) pressure; anything else is a key of Run.metrics. */
type YKey = string;

const yOf = (r: Run, key: YKey) => (key === "pressurePsi" ? r.pressurePsi : metricValue(r, key));
const yLabel = (key: YKey) => (key === "pressurePsi" ? "Pressure (psi)" : metricLabel(key));

function ScatterTooltip({ active, payload, yKey }: TooltipContentProps & { yKey: YKey }) {
  const first = payload?.[0];
  if (!active || !first) return null;
  const { run: r, y } = first.payload as Point;
  return (
    <TooltipCard
      title={r.id}
      rows={[
        ["Outcome", `${OUTCOME_LABEL[r.outcome]}${r.outcomeBasis === "notes-keyword" ? " (from notes)" : ""}`],
        ["Material", r.material ?? "Not recorded"],
        ["O2", formatRunO2(r)],
        ["Pressure", formatRunPressure(r)],
        ...(yKey === "pressurePsi" ? [] : ([[yLabel(yKey), num(y, 3)]] as Array<[string, string]>)),
      ]}
      footer={r.source.ref}
    />
  );
}

/** O2 (x) against the investigation's most informative measured value (y), coloured and shaped by recorded outcome. */
export function TestScatter({ runs, height = 240 }: { runs: readonly Run[]; height?: number }) {
  const metric = primaryMetric(runs);
  const yKey: YKey = metric ?? "pressurePsi";

  const groups = useMemo(() => {
    const g = new Map<OutcomeGroup, Point[]>();
    for (const r of runs) {
      const y = yOf(r, yKey);
      if (r.o2Percent === null || y === null) continue;
      const key = OUTCOME_GROUP[r.outcome];
      g.set(key, [...(g.get(key) ?? []), { x: r.o2Percent, y, run: r }]);
    }
    return g;
  }, [runs, yKey]);

  const plotted = [...groups.values()].reduce((s, arr) => s + arr.length, 0);
  if (plotted === 0) {
    return <EmptyChart height={height} message="These runs do not record O2 together with a measured value, so they cannot be plotted." />;
  }

  const xDomain = niceDomain([...groups.values()].flat().map((p) => p.x));
  const present = OUTCOME_GROUP_ORDER.filter((k) => groups.has(k));

  return (
    <figure className="space-y-2">
      <ChartLegend
        items={present.map((k) => ({
          key: k,
          label: `${OUTCOME_GROUP_STYLE[k].label} (${groups.get(k)?.length ?? 0})`,
          color: OUTCOME_GROUP_STYLE[k].color,
          shape: OUTCOME_GROUP_STYLE[k].shape,
        }))}
      />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, bottom: 22, left: 4 }}>
            <CartesianGrid stroke={CHART_INK.grid} strokeWidth={1} />
            <XAxis
              type="number"
              dataKey="x"
              name="O2"
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
              name={yLabel(yKey)}
              tick={{ fill: CHART_INK.tick, fontSize: 11 }}
              stroke={CHART_INK.axis}
              width={44}
              label={{ value: yLabel(yKey), angle: -90, position: "insideLeft", offset: 8, fill: CHART_INK.label, fontSize: 11, style: { textAnchor: "middle" } }}
            />
            <ZAxis range={[56, 56]} />
            <Tooltip cursor={{ stroke: CHART_INK.axis, strokeDasharray: "3 3" }} content={(props) => <ScatterTooltip {...props} yKey={yKey} />} />
            {present.map((k) => (
              <Scatter
                key={k}
                name={OUTCOME_GROUP_STYLE[k].label}
                data={groups.get(k)}
                fill={OUTCOME_GROUP_STYLE[k].color}
                shape={OUTCOME_GROUP_STYLE[k].shape}
                stroke={CHART_INK.surface}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-[11px] text-muted-foreground">
        {plotted} of {runs.length} runs plotted
        {runs.length - plotted > 0 && ` · ${runs.length - plotted} lack O2 or ${yKey === "pressurePsi" ? "a recorded pressure" : "this measurement"}`}
      </figcaption>
    </figure>
  );
}

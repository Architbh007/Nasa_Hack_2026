"use client";

import { useMemo } from "react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, type TooltipContentProps } from "recharts";
import { ChartLegend, EmptyChart, TooltipCard } from "@/components/charts/chart-parts";
import { CHART_INK, OUTCOME_GROUP, OUTCOME_GROUP_ORDER, OUTCOME_GROUP_STYLE, type OutcomeGroup } from "@/lib/chart-colors";
import { niceDomain, tickCountFor } from "@/lib/chart-utils";
import { OUTCOME_LABEL } from "@/lib/constants";
import type { FlowPoint } from "@/lib/crew-response";
import { formatRange, num } from "@/lib/format";

type Point = { x: number; y: number; run: FlowPoint };

function FlowTooltip({ active, payload }: TooltipContentProps) {
  const first = payload?.[0];
  if (!active || !first) return null;
  const { run: r } = first.payload as Point;
  return (
    <TooltipCard
      title={r.id}
      rows={[
        ["Material", r.material ?? "Not recorded"],
        ["O2", `${num(r.o2Percent)}%`],
        ["Airflow in the run", formatRange(r.flowMinCmS, r.flowMaxCmS, " cm/s")],
        ["Outcome", `${OUTCOME_LABEL[r.outcome]}${r.outcomeBasis === "notes-keyword" ? " (from notes)" : ""}`],
      ]}
      footer={r.sourceRef}
    />
  );
}

/** Solid-fuel runs by O2 (x) and the highest airflow recorded in the run (y), marked by recorded outcome. */
export function FlowMap({ points, height = 320 }: { points: readonly FlowPoint[]; height?: number }) {
  const groups = useMemo(() => {
    const g = new Map<OutcomeGroup, Point[]>();
    for (const run of points) {
      const key = OUTCOME_GROUP[run.outcome];
      g.set(key, [...(g.get(key) ?? []), { x: run.o2Percent, y: run.flowMaxCmS, run }]);
    }
    return g;
  }, [points]);

  if (points.length === 0) {
    return <EmptyChart height={height} message="No solid-fuel run records both O2 and an airflow speed." />;
  }

  const xDomain = niceDomain(points.map((p) => p.o2Percent));
  const yDomain = niceDomain(points.map((p) => p.flowMaxCmS), 10, [0, 60]);
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
              name="Airflow"
              domain={yDomain}
              allowDecimals={false}
              tickCount={tickCountFor(yDomain, 10)}
              tick={{ fill: CHART_INK.tick, fontSize: 11 }}
              stroke={CHART_INK.axis}
              width={44}
              label={{
                value: "Highest airflow in the run (cm/s)",
                angle: -90,
                position: "insideLeft",
                offset: 8,
                fill: CHART_INK.label,
                fontSize: 11,
                style: { textAnchor: "middle" },
              }}
            />
            <ZAxis range={[48, 48]} />
            <Tooltip cursor={{ stroke: CHART_INK.axis, strokeDasharray: "3 3" }} content={(props) => <FlowTooltip {...props} />} />
            {present.map((k) => (
              <Scatter
                key={k}
                name={OUTCOME_GROUP_STYLE[k].label}
                data={groups.get(k)}
                fill={OUTCOME_GROUP_STYLE[k].color}
                fillOpacity={0.85}
                shape={OUTCOME_GROUP_STYLE[k].shape}
                stroke={CHART_INK.surface}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-[11px] leading-relaxed text-muted-foreground">
        {points.length} solid-fuel runs record both O2 and an airflow speed. Each mark is one run at the highest airflow it records; hover
        for the full range. Outcomes are the dataset&apos;s recorded outcomes, many of them read from notes.
      </figcaption>
    </figure>
  );
}

"use client";

import { useMemo } from "react";
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
  CHART_INK,
  OUTCOME_GROUP,
  OUTCOME_GROUP_ORDER,
  OUTCOME_GROUP_STYLE,
  type OutcomeGroup,
} from "@/lib/chart-colors";
import { OUTCOME_LABEL } from "@/lib/constants";
import type { TestRun } from "@/lib/schema";
import { METRIC_LABEL, METRIC_UNIT, metricValue, primaryMetric, type MetricKey } from "@/lib/test-metrics";
import { ChartLegend, EmptyChart, TooltipCard } from "@/components/charts/chart-parts";
import { niceDomain, tickCountFor } from "@/lib/chart-utils";

type Point = { x: number; y: number; test: TestRun };

function ScatterTooltip({ active, payload, metric }: TooltipContentProps & { metric: MetricKey }) {
  const first = payload?.[0];
  if (!active || !first) return null;
  const p = first.payload as Point;
  const t = p.test;
  const measured = t[metric];
  return (
    <TooltipCard
      title={t.testId}
      rows={[
        ["Outcome", OUTCOME_LABEL[t.outcome]],
        ["O2", `${t.o2Percent}%`],
        ["Pressure", `${t.pressurePsi} psi`],
        ["Flow", t.flowCmS === null ? "quiescent" : `${t.flowCmS} cm/s`],
        ["Fuel", t.fuel],
        [METRIC_LABEL[metric].replace(/ \(.*\)$/, ""), measured === null ? "none" : `${measured} ${METRIC_UNIT[metric]}`],
        ...(t.diluent ? ([["Diluent", `${t.diluentPercent}% ${t.diluent}`]] as Array<[string, string]>) : []),
      ]}
      footer={t.gravityLevel === "normal" ? "1 g ground reference run" : undefined}
    />
  );
}

/**
 * O2 (x) against the investigation's most informative outcome metric (y),
 * colored and shaped by outcome group.
 */
export function TestScatter({
  tests,
  metric: metricProp,
  height = 240,
}: {
  tests: readonly TestRun[];
  metric?: MetricKey | null;
  height?: number;
}) {
  const metric = metricProp === undefined ? primaryMetric(tests) : metricProp;

  const groups = useMemo(() => {
    const g = new Map<OutcomeGroup, Point[]>();
    if (!metric) return g;
    for (const t of tests) {
      const y = metricValue(t, metric);
      if (y === null) continue;
      const key = OUTCOME_GROUP[t.outcome];
      const arr = g.get(key) ?? [];
      arr.push({ x: t.o2Percent, y, test: t });
      g.set(key, arr);
    }
    return g;
  }, [tests, metric]);

  if (!metric) {
    return (
      <EmptyChart
        height={height}
        message="No combustion metric was recorded for these runs (for example, dust-injection or particle-counting tests)."
      />
    );
  }

  const plotted = [...groups.values()].reduce((s, arr) => s + arr.length, 0);
  const xDomain = niceDomain([...groups.values()].flat().map((p) => p.x));
  const omitted = tests.length - plotted;
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
              name={METRIC_LABEL[metric]}
              tick={{ fill: CHART_INK.tick, fontSize: 11 }}
              stroke={CHART_INK.axis}
              width={44}
              label={{ value: METRIC_LABEL[metric], angle: -90, position: "insideLeft", offset: 8, fill: CHART_INK.label, fontSize: 11, style: { textAnchor: "middle" } }}
            />
            <ZAxis range={[56, 56]} />
            <Tooltip
              cursor={{ stroke: CHART_INK.axis, strokeDasharray: "3 3" }}
              content={(props) => <ScatterTooltip {...props} metric={metric} />}
            />
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
        {plotted} runs plotted
        {metric === "flameSpreadRateMmS" && " · runs without a sustained flame are shown at 0 mm/s"}
        {omitted > 0 && ` · ${omitted} runs without this measurement not shown`}
      </figcaption>
    </figure>
  );
}

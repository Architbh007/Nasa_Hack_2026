"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  type TooltipContentProps,
} from "recharts";
import { ChartLegend, TooltipCard, type LegendItem } from "@/components/charts/chart-parts";
import { CHART_INK, OUTCOME_GROUP, OUTCOME_GROUP_ORDER, OUTCOME_GROUP_STYLE, type OutcomeGroup } from "@/lib/chart-colors";
import { CATEGORY_LABEL, OUTCOME_LABEL, PRESSURE_SLIDER } from "@/lib/constants";
import { formatRunFlow, formatRunO2, formatRunPressure, num } from "@/lib/format";
import { placeRuns, type PlacedRun } from "@/lib/metrics";
import type { Category, Run, Scenario } from "@/lib/schema";

const Y_DOMAIN: [number, number] = [PRESSURE_SLIDER.min, PRESSURE_SLIDER.max];
const PO2_CURVES = [
  { psi: 2.0, label: "2.0 psi" },
  { psi: 3.09, label: "3.1 psi (sea level)" },
] as const;
const CURVE_COLOR = "#7c8aa3";
const USER_COLOR = "#ff7a3d";

type RunPoint = { x: number; y: number; placed: PlacedRun };

function curvePoints(pO2: number, xMax: number) {
  const pts: Array<{ x: number; y: number }> = [];
  for (let x = 10; x <= xMax; x += 0.5) {
    const y = (pO2 * 100) / x;
    if (y >= Y_DOMAIN[0] - 0.01 && y <= Y_DOMAIN[1] + 0.01) pts.push({ x, y });
  }
  return pts;
}

function RunTooltip({ active, payload }: TooltipContentProps) {
  const entry = payload?.find((p) => (p.payload as Partial<RunPoint> | undefined)?.placed);
  if (!active || !entry) return null;
  const { run: r } = (entry.payload as RunPoint).placed;
  return (
    <TooltipCard
      title={r.id}
      rows={[
        ["Outcome", `${OUTCOME_LABEL[r.outcome]}${r.outcomeBasis === "notes-keyword" ? " (from notes)" : ""}`],
        ["Material", r.material ?? "Not recorded"],
        ["O2", formatRunO2(r)],
        ["Pressure", formatRunPressure(r)],
        ["Flow", formatRunFlow(r)],
        ["Source", r.dataSource === "published" ? "Published NASA paper" : r.source.file],
      ]}
    />
  );
}

export function FlammabilityMap({
  runs,
  category,
  scenarios,
  point,
  highlightIds,
  height = 440,
}: {
  runs: readonly Run[];
  category: Category;
  scenarios: readonly Scenario[];
  point: { o2Percent: number; pressurePsi: number };
  /** Runs to ring (the nearest real runs). */
  highlightIds: readonly string[];
  height?: number;
}) {
  const placed = useMemo(() => placeRuns(runs), [runs]);
  const xMax = Math.max(45, Math.ceil((point.o2Percent + 5) / 5) * 5);
  const xTicks = useMemo(() => Array.from({ length: Math.floor((xMax - 10) / 5) + 1 }, (_, i) => 10 + i * 5), [xMax]);

  const series = useMemo(() => {
    const m = new Map<string, { group: OutcomeGroup; assumed: boolean; data: RunPoint[] }>();
    for (const p of placed) {
      const group = OUTCOME_GROUP[p.run.outcome];
      const key = `${group}|${p.assumedPressure}`;
      const s = m.get(key) ?? { group, assumed: p.assumedPressure, data: [] };
      s.data.push({ x: p.o2Percent, y: p.pressurePsi, placed: p });
      m.set(key, s);
    }
    return [...m.values()].sort((a, b) => OUTCOME_GROUP_ORDER.indexOf(a.group) - OUTCOME_GROUP_ORDER.indexOf(b.group));
  }, [placed]);

  const highlighted = useMemo(() => placed.filter((p) => highlightIds.includes(p.run.id)), [placed, highlightIds]);
  const offChart = placed.filter((p) => p.pressurePsi > Y_DOMAIN[1] || p.pressurePsi < Y_DOMAIN[0] || p.o2Percent > xMax).length;
  const notPlaceable = runs.length - placed.length;
  const assumedCount = placed.filter((p) => p.assumedPressure).length;
  const curves = useMemo(() => PO2_CURVES.map((c) => ({ ...c, data: curvePoints(c.psi, xMax) })), [xMax]);
  const presets = scenarios.filter((s) => s.o2Percent <= xMax);

  const counts = new Map<OutcomeGroup, number>();
  for (const s of series) counts.set(s.group, (counts.get(s.group) ?? 0) + s.data.length);
  const legend: LegendItem[] = OUTCOME_GROUP_ORDER.filter((g) => counts.has(g)).map((g) => ({
    key: g,
    label: `${OUTCOME_GROUP_STYLE[g].label} (${counts.get(g)})`,
    color: OUTCOME_GROUP_STYLE[g].color,
    shape: OUTCOME_GROUP_STYLE[g].shape,
  }));
  legend.push({ key: "po2", label: "Constant O2 partial pressure", color: CURVE_COLOR, line: true, dashed: true });
  legend.push({ key: "you", label: "Your cabin", color: USER_COLOR, shape: "circle" });

  return (
    <figure className="space-y-2">
      <ChartLegend items={legend} />
      <div
        style={{ height }}
        role="img"
        aria-label={`Scatter of ${placed.length} real ${CATEGORY_LABEL[category].toLowerCase()} runs by oxygen concentration and pressure, with the selected cabin at ${point.o2Percent}% O2 and ${point.pressurePsi} psi`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 16, right: 24, bottom: 26, left: 6 }}>
            <CartesianGrid stroke={CHART_INK.grid} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[10, xMax]}
              ticks={xTicks}
              allowDataOverflow
              tick={{ fill: CHART_INK.tick, fontSize: 11 }}
              stroke={CHART_INK.axis}
              label={{ value: "O2 concentration (%)", position: "insideBottom", offset: -14, fill: CHART_INK.label, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={Y_DOMAIN}
              ticks={[3, 5, 7, 9, 11, 13, 15]}
              allowDataOverflow
              tick={{ fill: CHART_INK.tick, fontSize: 11 }}
              stroke={CHART_INK.axis}
              width={40}
              label={{ value: "Total pressure (psi)", angle: -90, position: "insideLeft", offset: 10, fill: CHART_INK.label, fontSize: 11, style: { textAnchor: "middle" } }}
            />
            <ZAxis range={[40, 40]} />
            {curves.map((c) => (
              <Line
                key={c.psi}
                data={c.data}
                dataKey="y"
                type="monotone"
                dot={false}
                activeDot={false}
                stroke={CURVE_COLOR}
                strokeWidth={1.25}
                strokeDasharray="5 4"
                isAnimationActive={false}
                legendType="none"
              />
            ))}
            {series.map((s) => {
              const style = OUTCOME_GROUP_STYLE[s.group];
              return (
                <Scatter
                  key={`${s.group}-${s.assumed}`}
                  name={style.label}
                  data={s.data}
                  shape={style.shape}
                  fill={s.assumed ? "none" : style.color}
                  stroke={s.assumed ? style.color : CHART_INK.surface}
                  strokeWidth={s.assumed ? 1.5 : 1}
                  fillOpacity={0.85}
                  isAnimationActive={false}
                />
              );
            })}
            {highlighted.map((p) => (
              <ReferenceDot key={p.run.id} x={p.o2Percent} y={p.pressurePsi} r={8} fill="none" stroke="#e6ebf4" strokeWidth={1.5} ifOverflow="hidden" />
            ))}
            {presets.map((s) => (
              <ReferenceDot
                key={s.id}
                x={s.o2Percent}
                y={s.pressurePsi}
                r={5}
                fill="none"
                stroke="#8d9ab0"
                strokeDasharray="2 2"
                label={{ value: s.label, position: "top", fill: "#a9b4c6", fontSize: 10, offset: 8 }}
              />
            ))}
            <ReferenceDot
              x={point.o2Percent}
              y={point.pressurePsi}
              r={9}
              fill={USER_COLOR}
              stroke={CHART_INK.surface}
              strokeWidth={3}
              label={{ value: "Your cabin", position: "right", fill: "#ffd2bd", fontSize: 11, fontWeight: 600, offset: 12 }}
            />
            <Tooltip shared={false} cursor={false} content={(props) => <RunTooltip {...props} />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-[11px] leading-relaxed text-muted-foreground">
        {placed.length} real {CATEGORY_LABEL[category].toLowerCase()} runs with O2 and pressure
        {offChart > 0 && ` (${offChart} outside this view, e.g. above ${Y_DOMAIN[1]} psi)`}
        {notPlaceable > 0 && `; ${notPlaceable} more lack O2 or pressure and cannot be placed`}. Colour is the outcome the source records.
        {assumedCount > 0 && ` Hollow markers (${assumedCount}): pressure not recorded, placed at the cited ISS nominal ${num(14.7)} psi.`}{" "}
        Rings mark the nearest runs. Dashed curves join points with equal O2 partial pressure.
      </figcaption>
    </figure>
  );
}

"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
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
import { CHART_INK, IGNITION_STYLE } from "@/lib/chart-colors";
import { FUEL_PHASE_LABEL, OUTCOME_LABEL, PRESSURE_SLIDER, SYNTHETIC_SOLID_GAP } from "@/lib/constants";
import type { FuelPhase, Scenario, TestRun } from "@/lib/schema";

const X_DOMAIN: [number, number] = [10, 100];
const Y_DOMAIN: [number, number] = [PRESSURE_SLIDER.min, PRESSURE_SLIDER.max];
const PO2_CURVES = [
  { psi: 2.0, label: "2.0 psi" },
  { psi: 3.09, label: "3.1 psi (sea level)" },
  { psi: 4.3, label: "4.3 psi" },
] as const;
const CURVE_COLOR = "#7c8aa3";
/** Curve labels sit where the chart is empty for every fuel phase. */
const CURVE_LABEL_X = 62;
type LabelPosition = "top" | "left" | "right" | "bottom";
/** Hand-placed preset label positions so neighbouring presets do not collide. */
const PRESET_LABEL_POSITION: Record<string, LabelPosition> = {
  "earth-sea-level": "top",
  "iss-cabin": "top",
  spacesuit: "left",
  "lunar-base": "left",
  "pressurized-rover": "top",
  "mars-transit": "left",
};
const GAP_COLOR = "#fab219";
const USER_COLOR = "#ff7a3d";

type RunPoint = { x: number; y: number; test: TestRun };

function curvePoints(pO2: number) {
  const pts: Array<{ x: number; y: number }> = [];
  for (let x = X_DOMAIN[0]; x <= X_DOMAIN[1]; x += 0.5) {
    const y = (pO2 * 100) / x;
    if (y >= Y_DOMAIN[0] - 0.01 && y <= Y_DOMAIN[1] + 0.01) pts.push({ x, y });
  }
  return pts;
}

function RunTooltip({ active, payload }: TooltipContentProps) {
  const entry = payload?.find((p) => (p.payload as Partial<RunPoint> | undefined)?.test);
  if (!active || !entry) return null;
  const { test: t } = entry.payload as RunPoint;
  return (
    <TooltipCard
      title={t.testId}
      rows={[
        ["Outcome", OUTCOME_LABEL[t.outcome]],
        ["O2", `${t.o2Percent}%`],
        ["Pressure", `${t.pressurePsi} psi`],
        ["pO2", `${((t.o2Percent / 100) * t.pressurePsi).toFixed(2)} psi`],
        ["Flow", t.flowCmS === null ? "quiescent" : `${t.flowCmS} cm/s`],
        ["Fuel", t.fuel],
      ]}
    />
  );
}

export function FlammabilityMap({
  runs,
  fuelPhase,
  scenarios,
  point,
  showSyntheticGap,
  height = 440,
}: {
  runs: readonly TestRun[];
  fuelPhase: FuelPhase;
  scenarios: readonly Scenario[];
  point: { o2Percent: number; pressurePsi: number };
  showSyntheticGap: boolean;
  height?: number;
}) {
  const { ignited, notIgnited } = useMemo(() => {
    const a: RunPoint[] = [];
    const b: RunPoint[] = [];
    for (const t of runs) (t.ignited ? a : b).push({ x: t.o2Percent, y: t.pressurePsi, test: t });
    return { ignited: a, notIgnited: b };
  }, [runs]);

  const curves = useMemo(() => PO2_CURVES.map((c) => ({ ...c, data: curvePoints(c.psi) })), []);

  // Presets sharing a point (Earth sea level and ISS) get one combined label.
  const presetMarkers = useMemo(() => {
    const m = new Map<string, { x: number; y: number; labels: string[]; position: LabelPosition }>();
    for (const s of scenarios) {
      const key = `${s.o2Percent}|${s.pressurePsi}`;
      const entry = m.get(key) ?? {
        x: s.o2Percent,
        y: s.pressurePsi,
        labels: [],
        position: PRESET_LABEL_POSITION[s.id] ?? (s.o2Percent > 85 ? "left" : "top"),
      };
      entry.labels.push(s.label);
      m.set(key, entry);
    }
    return [...m.values()];
  }, [scenarios]);

  const legend: LegendItem[] = [
    { key: "ign", label: `${IGNITION_STYLE.ignited.label} (${ignited.length})`, color: IGNITION_STYLE.ignited.color, shape: IGNITION_STYLE.ignited.shape },
    { key: "no", label: `${IGNITION_STYLE.notIgnited.label} (${notIgnited.length})`, color: IGNITION_STYLE.notIgnited.color, shape: IGNITION_STYLE.notIgnited.shape },
    { key: "po2", label: "Constant O2 partial pressure", color: CURVE_COLOR, line: true, dashed: true },
    { key: "you", label: "Your cabin", color: USER_COLOR, shape: "circle" },
  ];
  if (showSyntheticGap) legend.push({ key: "gap", label: "Untested gap", color: GAP_COLOR, shape: "square" });

  return (
    <figure className="space-y-2">
      <ChartLegend items={legend} />
      <div style={{ height }} role="img" aria-label={`Scatter of ${runs.length} ${FUEL_PHASE_LABEL[fuelPhase].toLowerCase()}-fuel test runs by oxygen concentration and pressure, with the selected cabin condition at ${point.o2Percent}% O2 and ${point.pressurePsi} psi`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 16, right: 24, bottom: 26, left: 6 }}>
            <CartesianGrid stroke={CHART_INK.grid} />
            <XAxis
              type="number"
              dataKey="x"
              domain={X_DOMAIN}
              ticks={[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
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
            {showSyntheticGap && (
              <ReferenceArea
                x1={SYNTHETIC_SOLID_GAP.o2Min}
                x2={SYNTHETIC_SOLID_GAP.o2Max}
                y1={Y_DOMAIN[0]}
                y2={SYNTHETIC_SOLID_GAP.pressureMaxPsi}
                fill={GAP_COLOR}
                fillOpacity={0.12}
                stroke={GAP_COLOR}
                strokeOpacity={0.6}
                strokeDasharray="4 3"
                label={{ value: "Untested", position: "insideBottom", fill: GAP_COLOR, fontSize: 11, offset: 8 }}
              />
            )}
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
            {curves.map((c) => (
              <ReferenceDot
                key={`l-${c.psi}`}
                x={CURVE_LABEL_X}
                y={(c.psi * 100) / CURVE_LABEL_X}
                r={0}
                label={{ value: `pO2 ${c.label}`, position: "top", fill: CURVE_COLOR, fontSize: 10, offset: 10 }}
              />
            ))}
            <Scatter
              name="Did not ignite"
              data={notIgnited}
              fill={IGNITION_STYLE.notIgnited.color}
              shape={IGNITION_STYLE.notIgnited.shape}
              fillOpacity={0.8}
              isAnimationActive={false}
            />
            <Scatter
              name="Ignited"
              data={ignited}
              fill={IGNITION_STYLE.ignited.color}
              shape={IGNITION_STYLE.ignited.shape}
              fillOpacity={0.8}
              stroke={CHART_INK.surface}
              strokeWidth={1}
              isAnimationActive={false}
            />
            {presetMarkers.map((p) => (
              <ReferenceDot
                key={`${p.x}-${p.y}`}
                x={p.x}
                y={p.y}
                r={6}
                fill="none"
                stroke="#e6ebf4"
                strokeWidth={1.5}
                label={{ value: p.labels.join(" / "), position: p.position, fill: "#c9d2e0", fontSize: 10, offset: 9 }}
              />
            ))}
            <ReferenceDot
              x={point.o2Percent}
              y={point.pressurePsi}
              r={9}
              fill={USER_COLOR}
              stroke={CHART_INK.surface}
              strokeWidth={3}
              label={{ value: "Your cabin", position: point.o2Percent > 85 ? "left" : "right", fill: "#ffd2bd", fontSize: 11, fontWeight: 600, offset: 12 }}
            />
            <Tooltip shared={false} cursor={false} content={(props) => <RunTooltip {...props} />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-[11px] leading-relaxed text-muted-foreground">
        {runs.length} {FUEL_PHASE_LABEL[fuelPhase].toLowerCase()}-fuel ignition runs. Smoke and dust runs are excluded because they were not ignition attempts.
        Dashed curves join points with equal O2 partial pressure: moving down a curve keeps pO2 constant while O2 concentration rises.
      </figcaption>
    </figure>
  );
}

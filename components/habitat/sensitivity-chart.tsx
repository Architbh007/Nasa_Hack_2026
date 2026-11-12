"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { ChartLegend, TooltipCard } from "@/components/charts/chart-parts";
import { CHART_INK } from "@/lib/chart-colors";
import { sensitivityCurve, type HabitatInputs, type SensitivityPoint } from "@/lib/habitat";
import type { ModelArtifact } from "@/lib/model";

const CURRENT = "#ff7a3d";
const REFERENCE = "#7c8aa3";

function SensTooltip({ active, payload, pressure }: TooltipContentProps & { pressure: number }) {
  const first = payload?.[0];
  if (!active || !first) return null;
  const p = first.payload as SensitivityPoint;
  return (
    <TooltipCard
      title={`${p.o2}% O2`}
      rows={[
        [`At ${pressure.toFixed(1)} psi`, `${(p.probability * 100).toFixed(0)}%`],
        ["At 14.7 psi", `${(p.earthPressure * 100).toFixed(0)}%`],
      ]}
    />
  );
}

export function SensitivityChart({ model, inputs, currentProbability }: { model: ModelArtifact; inputs: HabitatInputs; currentProbability: number }) {
  const to = Math.max(50, Math.min(100, Math.ceil((inputs.o2Percent + 5) / 5) * 5));
  const data = useMemo(() => sensitivityCurve(model, inputs, { from: 15, to, step: 0.5 }), [model, inputs, to]);
  const ticks = Array.from({ length: Math.floor((to - 15) / 5) + 1 }, (_, i) => 15 + i * 5);
  return (
    <figure className="space-y-2">
      <ChartLegend
        items={[
          { key: "cur", label: `At ${inputs.pressurePsi.toFixed(1)} psi (your cabin)`, color: CURRENT, line: true },
          { key: "ref", label: "At 14.7 psi (sea level)", color: REFERENCE, line: true, dashed: true },
        ]}
      />
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, bottom: 22, left: 0 }}>
            <CartesianGrid stroke={CHART_INK.grid} vertical={false} />
            <XAxis
              type="number"
              dataKey="o2"
              domain={[15, to]}
              ticks={ticks}
              tick={{ fill: CHART_INK.tick, fontSize: 11 }}
              stroke={CHART_INK.axis}
              label={{ value: "O2 concentration (%)", position: "insideBottom", offset: -12, fill: CHART_INK.label, fontSize: 11 }}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
              tick={{ fill: CHART_INK.tick, fontSize: 11 }}
              stroke={CHART_INK.axis}
              width={42}
            />
            <Tooltip content={(props) => <SensTooltip {...props} pressure={inputs.pressurePsi} />} cursor={{ stroke: CHART_INK.axis }} />
            <Line dataKey="earthPressure" stroke={REFERENCE} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            <Line dataKey="probability" stroke={CURRENT} strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceDot
              x={Math.round(inputs.o2Percent * 2) / 2}
              y={currentProbability}
              r={6}
              fill={CURRENT}
              stroke={CHART_INK.surface}
              strokeWidth={2}
              label={{
                value: `${(currentProbability * 100).toFixed(0)}%`,
                position: currentProbability > 0.8 ? "bottom" : "top",
                fill: "#ffd2bd",
                fontSize: 11,
                offset: 10,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="text-[11px] text-muted-foreground">
        Model sweep with material, airflow and pressure held at your settings. Trained on synthetic data; treat as a relative trend, not a certified limit.
      </figcaption>
    </figure>
  );
}

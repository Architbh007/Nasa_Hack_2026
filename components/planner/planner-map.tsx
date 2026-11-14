"use client";

import { useId, useMemo } from "react";
import { OUTCOME_GROUP, OUTCOME_GROUP_STYLE } from "@/lib/chart-colors";
import { GRID_O2, GRID_PRESSURE } from "@/lib/flammability-grid";
import { placeRuns } from "@/lib/metrics";
import { gridCellStatuses, onChart, type ExperimentPlan, type Verdict } from "@/lib/planner";
import type { Run } from "@/lib/schema";

const W = 640;
const H = 430;
const PAD = { left: 50, right: 16, top: 16, bottom: 44 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;
const x = (o2: number) => PAD.left + ((o2 - GRID_O2.min) / (GRID_O2.max - GRID_O2.min)) * plotW;
const y = (psi: number) => PAD.top + (1 - (psi - GRID_PRESSURE.min) / (GRID_PRESSURE.max - GRID_PRESSURE.min)) * plotH;

const CELL_FILL: Record<Verdict, { fill: string; opacity: number }> = {
  tested: { fill: "#3fcf8e", opacity: 0.2 },
  near: { fill: "#8d9ab0", opacity: 0.16 },
  untested: { fill: "#000000", opacity: 0 },
};

/**
 * The plan on the O2–pressure chart: grid squares shaded by coverage (before or after the plan),
 * real runs coloured by recorded outcome, mission targets as rings, and the numbered test path.
 */
export function PlannerMap({
  plan,
  runs,
  view,
  selected,
  onSelect,
}: {
  plan: ExperimentPlan;
  runs: readonly Run[];
  view: "before" | "after";
  selected: number | null;
  onSelect: (index: number | null) => void;
}) {
  const stripeId = useId().replace(/:/g, "");
  const arrowId = `${stripeId}-arrow`;
  const placed = useMemo(() => placeRuns(runs), [runs]);
  const cells = useMemo(() => {
    const real = placed.map((p) => ({ o2Percent: p.o2Percent, pressurePsi: p.pressurePsi }));
    const points = view === "after" ? [...real, ...plan.tests.map((t) => ({ o2Percent: t.o2Percent, pressurePsi: t.pressurePsi }))] : real;
    return gridCellStatuses(points);
  }, [placed, plan.tests, view]);

  const testById = new Map(plan.tests.map((t) => [t.index, t]));
  const runById = new Map(placed.map((p) => [p.run.id, p]));
  const anchorOf = (t: ExperimentPlan["tests"][number]) => {
    if (!t.stepsFrom) return null;
    if (t.stepsFrom.kind === "test") {
      const prev = testById.get(t.stepsFrom.index);
      return prev ? { o2Percent: prev.o2Percent, pressurePsi: prev.pressurePsi } : null;
    }
    const r = runById.get(t.stepsFrom.runId);
    return r ? { o2Percent: r.o2Percent, pressurePsi: r.pressurePsi } : null;
  };

  const o2Ticks = [15, 21, 27, 33, 39, 45, 51];
  const pTicks = [3, 5, 7, 9, 11, 13, 15];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Experiment plan map, ${view === "after" ? "after" : "before"} the plan. ${plan.tests.length} proposed tests: ${plan.tests
        .map((t) => `test ${t.index} at ${t.o2Percent}% oxygen and ${t.pressurePsi} psi`)
        .join("; ")}.`}
    >
      <defs>
        <pattern id={stripeId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="1.6" height="6" fill="#9a9fa9" fillOpacity="0.16" />
        </pattern>
        <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#ff7a3d" />
        </marker>
      </defs>

      {/* Coverage squares */}
      {cells.map((c) => {
        const style = CELL_FILL[c.status];
        const rx = x(c.o2Min);
        const ry = y(c.pMax);
        const w = x(c.o2Max) - rx;
        const h = y(c.pMin) - ry;
        return (
          <g key={`${c.o2Min}-${c.pMin}`} className="fs-cell">
            <rect x={rx + 0.75} y={ry + 0.75} width={w - 1.5} height={h - 1.5} rx={3} fill={style.fill} fillOpacity={style.opacity} />
            {c.status === "untested" && <rect x={rx + 0.75} y={ry + 0.75} width={w - 1.5} height={h - 1.5} rx={3} fill={`url(#${stripeId})`} />}
          </g>
        );
      })}

      {/* Real runs */}
      {placed.filter(onChart).map((p) => {
        const style = OUTCOME_GROUP_STYLE[OUTCOME_GROUP[p.run.outcome]];
        return (
          <circle
            key={p.run.id}
            cx={x(p.o2Percent)}
            cy={y(p.pressurePsi)}
            r={2.6}
            fill={p.assumedPressure ? "none" : style.color}
            stroke={style.color}
            strokeWidth={p.assumedPressure ? 1 : 0}
            fillOpacity={0.85}
          >
            <title>{`${p.run.id}: ${p.o2Percent}% O2, ${p.pressurePsi} psi, ${style.label.toLowerCase()}`}</title>
          </circle>
        );
      })}

      {/* Mission targets */}
      {plan.targets
        .filter((t) => !t.offChart)
        .map((t) => (
          <g key={t.target.id} pointerEvents="none">
            <circle cx={x(t.target.o2Percent)} cy={y(t.target.pressurePsi)} r={11} fill="none" stroke="#f5f5f7" strokeWidth={1.5} strokeDasharray="3 3" />
            <text
              x={x(t.target.o2Percent) + 15}
              y={y(t.target.pressurePsi) - 12}
              fontSize={11}
              fill="#f5f5f7"
              stroke="#000"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {t.target.label}
            </text>
          </g>
        ))}

      {/* The plan: arrows from the evidence each test builds on, then numbered tests */}
      {view === "after" && (
        <g>
          {plan.tests.map((t) => {
            const a = anchorOf(t);
            if (!a) return null;
            const x1 = x(a.o2Percent);
            const y1 = y(a.pressurePsi);
            const x2 = x(t.o2Percent);
            const y2 = y(t.pressurePsi);
            const len = Math.hypot(x2 - x1, y2 - y1);
            if (len < 14) return null;
            const ux = (x2 - x1) / len;
            const uy = (y2 - y1) / len;
            return (
              <line
                key={`a${t.index}`}
                x1={x1 + ux * 3}
                y1={y1 + uy * 3}
                x2={x2 - ux * 11}
                y2={y2 - uy * 11}
                stroke="#ff7a3d"
                strokeWidth={selected === t.index ? 2.2 : 1.4}
                strokeOpacity={selected === null || selected === t.index ? 0.95 : 0.35}
                markerEnd={`url(#${arrowId})`}
              />
            );
          })}
          {plan.tests.map((t) => {
            const active = selected === t.index;
            return (
              <g
                key={`t${t.index}`}
                className="cursor-pointer"
                onMouseEnter={() => onSelect(t.index)}
                onMouseLeave={() => onSelect(null)}
                onClick={() => document.getElementById(`test-${t.index}`)?.scrollIntoView({ block: "center" })}
              >
                <circle
                  cx={x(t.o2Percent)}
                  cy={y(t.pressurePsi)}
                  r={active ? 11 : 9}
                  fill="#ff7a3d"
                  stroke="#000"
                  strokeWidth={2}
                  style={{ transition: "r 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
                />
                <text x={x(t.o2Percent)} y={y(t.pressurePsi) + 3.8} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1a0a03">
                  {t.index}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* Axes */}
      {o2Ticks.map((t) => (
        <text key={`o${t}`} x={x(t)} y={H - PAD.bottom + 18} textAnchor="middle" fontSize={11} fill="#a1a1a6">
          {t}
        </text>
      ))}
      {pTicks.map((t) => (
        <text key={`p${t}`} x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#a1a1a6">
          {t}
        </text>
      ))}
      <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle" fontSize={11.5} fill="#c7c7cc">
        Oxygen in the cabin air (%)
      </text>
      <text x={14} y={PAD.top + plotH / 2} textAnchor="middle" fontSize={11.5} fill="#c7c7cc" transform={`rotate(-90 14 ${PAD.top + plotH / 2})`}>
        Cabin pressure (psi)
      </text>
    </svg>
  );
}

"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { MATERIAL_LABEL } from "@/lib/constants";
import {
  buildFlammabilityGrid,
  cellAt,
  evidenceRuns,
  GRID_O2,
  GRID_PRESSURE,
  LEVEL_LABEL,
  nearestEvidence,
  onGrid,
  type CellLevel,
  type GridCell,
} from "@/lib/flammability-grid";
import type { HabitatInputs } from "@/lib/habitat";
import type { ModelArtifact } from "@/lib/model";
import { MATERIAL_CLASSES, type Investigation, type MaterialClass, type Scenario, type TestRun } from "@/lib/schema";
import { cn } from "@/lib/utils";

/** Colour-blind-safe trio from the app's validated chart palette. */
export const LEVEL_COLOR: Record<CellLevel, string> = {
  unlikely: "#3987e5",
  possible: "#c98500",
  likely: "#d95926",
};
const UNTESTED_STRIPE = "#9a9fa9";
const CABIN = "#ffffff";

const CELL = 40;
const PAD = { left: 52, right: 12, top: 12, bottom: 44 };

const MATERIAL_SHORT: Record<MaterialClass, string> = {
  fabric: "Fabric",
  plastic: "Plastic",
  foam: "Foam",
  "wire-insulation": "Wire",
  "liquid-fuel": "Liquid",
  "gas-leak": "Gas leak",
};

const pct = (p: number) => `${Math.round(p * 100)}%`;

type LabelPlace = "above-right" | "above-left" | "below-right" | "below-left";
/** Hand-placed preset labels so neighbours (Mars transit and the rover share 10.2 psi) don't collide. */
const LABEL_PLACE: Record<string, LabelPlace> = {
  "mars-transit": "above-left",
  "pressurized-rover": "below-right",
  "lunar-base": "below-right",
};

function Swatch({ color, striped, label }: { color: string; striped?: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block size-3 rounded-[3px] border border-white/10"
        style={{
          background: striped
            ? `repeating-linear-gradient(135deg, ${UNTESTED_STRIPE}99 0 2px, transparent 2px 5px), ${color}55`
            : color,
        }}
      />
      {label}
    </span>
  );
}

function CellDetails({
  cell,
  runs,
  acronym,
  materialTested,
  materialClass,
  isCabin,
}: {
  cell: GridCell;
  runs: readonly TestRun[];
  acronym: (id: string) => string;
  materialTested: boolean;
  materialClass: MaterialClass;
  isCabin: boolean;
}) {
  const near = nearestEvidence(runs, { o2Percent: (cell.o2Min + cell.o2Max) / 2, pressurePsi: (cell.pMin + cell.pMax) / 2 }, 5);
  return (
    <div className="space-y-3 text-sm" aria-live="polite">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {isCabin ? "Your cabin's square" : "Selected square"}
        </p>
        <p className="tabular font-medium">
          {cell.o2Min}–{cell.o2Max}% O2 · {cell.pMin}–{cell.pMax} psi
        </p>
      </div>

      {materialTested ? (
        <>
          <div className="flex items-center gap-3">
            <span className="h-9 w-2 rounded-full" style={{ background: LEVEL_COLOR[cell.level] }} aria-hidden />
            <div>
              <p className="tabular text-2xl font-semibold leading-none">{pct(cell.probability)}</p>
              <p className="text-xs text-muted-foreground">
                predicted chance of ignition · {LEVEL_LABEL[cell.level].toLowerCase()}
              </p>
            </div>
          </div>
          <p className={cn("rounded-md px-2.5 py-1.5 text-xs", cell.tested ? "bg-secondary" : "bg-warning/10 text-warning")}>
            {cell.tested
              ? `Tested: ${cell.runs.length} ${MATERIAL_LABEL[materialClass].toLowerCase()} run${cell.runs.length === 1 ? "" : "s"} in this square, ${cell.ignited} ignited.`
              : "Untested: no runs of this material in this square. The colour is the model's extrapolation."}
          </p>
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Nearest test runs (evidence)</p>
            <ul className="space-y-1">
              {near.map(({ test }) => (
                <li key={test.testId} className="flex items-center justify-between gap-2 text-xs">
                  <Link href={`/explore?id=${test.investigationId}`} className="rounded bg-link/10 px-1.5 py-0.5 font-medium text-link hover:bg-link/20">
                    {acronym(test.investigationId)}
                  </Link>
                  <span className="tabular text-muted-foreground">
                    {test.o2Percent.toFixed(1)}% · {test.pressurePsi.toFixed(1)} psi
                  </span>
                  <span className={cn("w-20 text-right", test.ignited ? "text-[#ec835a]" : "text-muted-foreground")}>
                    {test.ignited ? "ignited" : "no ignition"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p className="rounded-md bg-warning/10 px-2.5 py-2 text-xs leading-relaxed text-warning">
          {MATERIAL_LABEL[materialClass]} was never part of an ignition study in this dataset. It only appears in smoke-detection
          experiments, where samples were heated but never lit. No colour here can be backed by data.
        </p>
      )}
    </div>
  );
}

export function FlammabilityGrid({
  inputs,
  model,
  investigations,
  tests,
  scenarios,
  onMove,
  onMaterial,
}: {
  inputs: HabitatInputs;
  model: ModelArtifact;
  investigations: readonly Investigation[];
  tests: readonly TestRun[];
  scenarios: readonly Scenario[];
  onMove: (o2Percent: number, pressurePsi: number) => void;
  onMaterial: (m: MaterialClass) => void;
}) {
  const patternId = useId().replace(/:/g, "");
  const grid = useMemo(
    () => buildFlammabilityGrid(model, investigations, tests, { materialClass: inputs.materialClass, airflow: inputs.airflow }),
    [model, investigations, tests, inputs.materialClass, inputs.airflow]
  );
  const runs = useMemo(() => evidenceRuns(inputs.materialClass, investigations, tests), [inputs.materialClass, investigations, tests]);
  const acronymById = useMemo(() => new Map(investigations.map((i) => [i.id, i.acronym] as const)), [investigations]);
  const acronym = (id: string) => acronymById.get(id) ?? id;

  const cabinCell = cellAt(grid, inputs.o2Percent, inputs.pressurePsi);
  const [focus, setFocus] = useState<{ col: number; row: number } | null>(null);
  const focused = focus ? (grid.cells[focus.row * grid.columns + focus.col] ?? null) : null;
  const shown = focused ?? cabinCell;

  const width = PAD.left + grid.columns * CELL + PAD.right;
  const height = PAD.top + grid.rows * CELL + PAD.bottom;
  const x = (o2: number) => PAD.left + ((o2 - GRID_O2.min) / GRID_O2.step) * CELL;
  const y = (p: number) => PAD.top + grid.rows * CELL - ((p - GRID_PRESSURE.min) / GRID_PRESSURE.step) * CELL;

  // Presets sharing a position (Earth sea level and ISS) get one combined label.
  const presetMarks = useMemo(() => {
    const m = new Map<string, { o2: number; p: number; labels: string[]; place: LabelPlace }>();
    for (const s of scenarios) {
      if (!onGrid(s.o2Percent, s.pressurePsi)) continue;
      const key = `${s.o2Percent}/${s.pressurePsi}`;
      const e = m.get(key) ?? { o2: s.o2Percent, p: s.pressurePsi, labels: [], place: LABEL_PLACE[s.id] ?? "above-right" };
      e.labels.push(s.label);
      m.set(key, e);
    }
    return [...m.values()];
  }, [scenarios]);
  const offChartPresets = scenarios.filter((s) => !onGrid(s.o2Percent, s.pressurePsi));

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const start = focus ?? (cabinCell ? { col: cabinCell.col, row: cabinCell.row } : { col: 0, row: 0 });
    const delta: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    const d = delta[e.key];
    if (d) {
      e.preventDefault();
      setFocus({
        col: Math.min(grid.columns - 1, Math.max(0, start.col + d[0])),
        row: Math.min(grid.rows - 1, Math.max(0, start.row + d[1])),
      });
    } else if ((e.key === "Enter" || e.key === " ") && focused) {
      e.preventDefault();
      onMove((focused.o2Min + focused.o2Max) / 2, (focused.pMin + focused.pMax) / 2);
    } else if (e.key === "Escape") {
      setFocus(null);
    }
  };

  const o2Ticks = Array.from({ length: grid.columns / 2 + 1 }, (_, i) => GRID_O2.min + i * GRID_O2.step * 2);
  const pTicks = Array.from({ length: grid.rows / 2 + 1 }, (_, i) => GRID_PRESSURE.min + i * GRID_PRESSURE.step * 2);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Compare material</span>
        <div role="radiogroup" aria-label="Material" className="flex flex-wrap gap-1 rounded-lg border border-border bg-background/40 p-1">
          {MATERIAL_CLASSES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={inputs.materialClass === m}
              onClick={() => onMaterial(m)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                inputs.materialClass === m ? "bg-secondary text-foreground ring-1 ring-primary/40" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {MATERIAL_SHORT[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
        <figure className="min-w-0 space-y-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-auto w-full touch-manipulation rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            role="img"
            tabIndex={0}
            aria-label={`Flammability grid for ${MATERIAL_LABEL[inputs.materialClass].toLowerCase()}: oxygen ${GRID_O2.min} to ${GRID_O2.max} percent across, pressure ${GRID_PRESSURE.min} to ${GRID_PRESSURE.max} psi up. ${
              cabinCell
                ? `Your cabin's square: ${pct(cabinCell.probability)} predicted ignition, ${cabinCell.tested ? "tested" : "untested"}.`
                : "Your cabin is off this chart."
            } Use arrow keys to inspect squares and Enter to move your cabin there.`}
            onKeyDown={onKeyDown}
            onMouseLeave={() => setFocus(null)}
          >
            <defs>
              <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="2.2" height="6" fill={UNTESTED_STRIPE} fillOpacity="0.55" />
              </pattern>
            </defs>

            {grid.cells.map((c) => {
              const cx = x(c.o2Min);
              const cy = y(c.pMax);
              const fill = grid.materialTested ? LEVEL_COLOR[c.level] : "#40434a";
              const solid = grid.materialTested && c.tested;
              return (
                <g
                  key={`${c.col}-${c.row}`}
                  onMouseEnter={() => setFocus({ col: c.col, row: c.row })}
                  onClick={() => onMove((c.o2Min + c.o2Max) / 2, (c.pMin + c.pMax) / 2)}
                  className="cursor-pointer"
                >
                  <rect x={cx + 1} y={cy + 1} width={CELL - 2} height={CELL - 2} rx={4} fill={fill} fillOpacity={solid ? 0.92 : 0.3} />
                  {!solid && <rect x={cx + 1} y={cy + 1} width={CELL - 2} height={CELL - 2} rx={4} fill={`url(#${patternId})`} />}
                  {focused === c && <rect x={cx + 1} y={cy + 1} width={CELL - 2} height={CELL - 2} rx={4} fill="none" stroke="#e8e9ec" strokeWidth={1.5} strokeDasharray="3 2" />}
                </g>
              );
            })}

            {cabinCell && (
              <rect x={x(cabinCell.o2Min) + 0.5} y={y(cabinCell.pMax) + 0.5} width={CELL - 1} height={CELL - 1} rx={5} fill="none" stroke={CABIN} strokeWidth={2.5} pointerEvents="none" />
            )}

            {presetMarks.map((m) => (
              <g key={m.labels.join("+")} pointerEvents="none">
                <rect x={x(m.o2) - 4} y={y(m.p) - 4} width={8} height={8} transform={`rotate(45 ${x(m.o2)} ${y(m.p)})`} fill="#0c0d10" stroke="#e8e9ec" strokeWidth={1.4} />
                <text
                  x={x(m.o2) + (m.place.endsWith("left") ? -8 : 8)}
                  y={y(m.p) + (m.place.startsWith("below") || m.p > 14 ? 14 : -7)}
                  textAnchor={m.place.endsWith("left") ? "end" : "start"}
                  fontSize={10.5}
                  fill="#e8e9ec"
                  stroke="#0c0d10"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {m.labels.join(" · ")}
                </text>
              </g>
            ))}

            {onGrid(inputs.o2Percent, inputs.pressurePsi) && (
              <circle cx={x(inputs.o2Percent)} cy={y(inputs.pressurePsi)} r={5.5} fill="#ff7a3d" stroke={CABIN} strokeWidth={2} pointerEvents="none" />
            )}

            {o2Ticks.map((t) => (
              <text key={`o${t}`} x={x(t)} y={PAD.top + grid.rows * CELL + 16} textAnchor="middle" fontSize={11} fill="#9a9fa9">
                {t}
              </text>
            ))}
            {pTicks.map((t) => (
              <text key={`p${t}`} x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#9a9fa9">
                {t}
              </text>
            ))}
            <text x={PAD.left + (grid.columns * CELL) / 2} y={height - 6} textAnchor="middle" fontSize={11.5} fill="#b4b8c0">
              Oxygen in the cabin air (%)
            </text>
            <text
              x={14}
              y={PAD.top + (grid.rows * CELL) / 2}
              textAnchor="middle"
              fontSize={11.5}
              fill="#b4b8c0"
              transform={`rotate(-90 14 ${PAD.top + (grid.rows * CELL) / 2})`}
            >
              Cabin pressure (psi)
            </text>
          </svg>
          <figcaption className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            <Swatch color={LEVEL_COLOR.unlikely} label="Fire unlikely (<33%)" />
            <Swatch color={LEVEL_COLOR.possible} label="In between" />
            <Swatch color={LEVEL_COLOR.likely} label="Fire likely (>67%)" />
            <Swatch color="#62666e" striped label="Striped = untested (model guess)" />
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="inline-block size-3 rounded-full border-2 border-white bg-[#ff7a3d]" /> Your cabin
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="inline-block size-2 rotate-45 border border-white bg-background" /> Preset
            </span>
          </figcaption>
        </figure>

        <div className="min-w-0 space-y-3 rounded-lg border border-border bg-background/40 p-4">
          {shown ? (
            <CellDetails
              cell={shown}
              runs={runs}
              acronym={acronym}
              materialTested={grid.materialTested}
              materialClass={inputs.materialClass}
              isCabin={shown === cabinCell}
            />
          ) : (
            <p className="rounded-md bg-warning/10 px-2.5 py-2 text-xs leading-relaxed text-warning">
              Your cabin ({inputs.o2Percent.toFixed(1)}% O2 at {inputs.pressurePsi.toFixed(1)} psi) is off this chart, above{" "}
              {GRID_O2.max}% oxygen. Fire risk there is very high and almost nothing has been tested. Hover a square to inspect it.
            </p>
          )}
          <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
            Click a square to move your cabin there. Colours come from the ignition model trained on{" "}
            {model.trainedOn.testCount} synthetic test runs; stripes mark squares with no {MATERIAL_LABEL[inputs.materialClass].toLowerCase()}{" "}
            tests inside them.
            {offChartPresets.length > 0 && (
              <> Off chart: {offChartPresets.map((s) => `${s.label} (${s.o2Percent}% O2, ${s.pressurePsi} psi)`).join(", ")}.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

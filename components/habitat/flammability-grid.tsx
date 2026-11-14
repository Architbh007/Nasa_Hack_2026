"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { MATERIAL_CATEGORY, MATERIAL_LABEL, OUTCOME_LABEL } from "@/lib/constants";
import {
  buildFlammabilityGrid,
  cellAt,
  coverageSummary,
  gapShade,
  GRID_O2,
  GRID_PRESSURE,
  nearestEvidence,
  onGrid,
  scopeRuns,
  TONE_LABEL,
  type CellTone,
  type GridCell,
  type GridScope,
} from "@/lib/flammability-grid";
import type { HabitatInputs } from "@/lib/habitat";
import { MATERIAL_CLASSES, type Investigation, type MaterialClass, type Run, type Scenario } from "@/lib/schema";
import { cn } from "@/lib/utils";

/** Colour-blind-safe palette from the app's validated chart colours: what the real runs in a square recorded. */
export const TONE_COLOR: Record<CellTone, string> = {
  burned: "#d95926",
  extinguished: "#3987e5",
  mixed: "#c98500",
  unstated: "#3b4658",
};
const NEAR_FILL = "#8d9ab0";
/** Untested squares are shaded from pale (just outside tested air) to dark (far from any real run). */
const GAP_FILL = "#0b0d12";
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

const scopeLabelOf = (scope: GridScope) => (scope === "all-solids" ? "solid-fuel" : MATERIAL_LABEL[scope].toLowerCase());

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
  evidence,
  acronym,
  materialTested,
  scopeLabel,
  isCabin,
}: {
  cell: GridCell;
  evidence: readonly Run[];
  acronym: (id: string) => string;
  materialTested: boolean;
  scopeLabel: string;
  isCabin: boolean;
}) {
  const near = nearestEvidence(evidence, { o2Percent: (cell.o2Min + cell.o2Max) / 2, pressurePsi: (cell.pMin + cell.pMax) / 2 }, 5);
  const counts = Object.entries(cell.counts) as Array<[keyof typeof OUTCOME_LABEL, number]>;
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
          {cell.status === "tested" && cell.tone ? (
            <div className="flex items-center gap-3">
              <span className="h-9 w-2 shrink-0 rounded-full" style={{ background: TONE_COLOR[cell.tone] }} aria-hidden />
              <div>
                <p className="tabular text-2xl font-semibold leading-none">
                  {cell.runs.length} real run{cell.runs.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted-foreground">{TONE_LABEL[cell.tone]}</p>
              </div>
            </div>
          ) : null}
          <p className={cn("rounded-md px-2.5 py-1.5 text-xs", cell.status === "tested" ? "bg-secondary" : "bg-warning/10 text-warning")}>
            {cell.status === "tested"
              ? `Tested: ${counts.map(([o, k]) => `${k} ${OUTCOME_LABEL[o].toLowerCase()}`).join(", ")}.`
              : cell.status === "near"
                ? `Not tested in this square, but a real ${scopeLabel} run lies close by (see the nearest runs below).`
                : `Untested: no real ${scopeLabel} run in or near this square.`}
          </p>
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Nearest real runs (evidence)</p>
            <ul className="space-y-1">
              {near.map(({ run, o2Percent, pressurePsi, assumedPressure }) => (
                <li key={run.id} className="flex items-center justify-between gap-2 text-xs">
                  <Link href={`/explore?id=${run.investigationId}`} className="rounded bg-link/10 px-1.5 py-0.5 font-medium text-link hover:bg-link/20">
                    {acronym(run.investigationId)}
                  </Link>
                  <span className="tabular text-muted-foreground" title={assumedPressure ? "Pressure not recorded; placed at the cited ISS nominal" : undefined}>
                    {o2Percent.toFixed(1)}% · {pressurePsi.toFixed(1)} psi{assumedPressure ? "*" : ""}
                  </span>
                  <span className={cn("w-24 text-right", run.outcome === "burned" ? "text-[#ec835a]" : "text-muted-foreground")}>
                    {OUTCOME_LABEL[run.outcome]}
                  </span>
                </li>
              ))}
            </ul>
            {cell.status !== "tested" && near[0] && (
              <p className="text-[11px] text-muted-foreground">
                The closest real run is {Math.abs(near[0].dO2).toFixed(1)} points of O2 {near[0].dO2 >= 0 ? "above" : "below"} and{" "}
                {Math.abs(near[0].dPsi).toFixed(1)} psi {near[0].dPsi >= 0 ? "above" : "below"} the centre of this square.
              </p>
            )}
            {near.some((n) => n.assumedPressure) && (
              <p className="text-[11px] text-muted-foreground">* Pressure was not recorded; the run is placed at the cited ISS nominal 14.7 psi.</p>
            )}
          </div>
        </>
      ) : (
        <p className="rounded-md bg-warning/10 px-2.5 py-2 text-xs leading-relaxed text-warning">
          No real {scopeLabel} run with a recorded oxygen level and pressure exists in the data we hold
          (it only appears in smoke or detection studies, or not at all). Nothing here can be backed by a run.
        </p>
      )}
    </div>
  );
}

export function FlammabilityGrid({
  inputs,
  investigations,
  runs,
  scenarios,
  onMove,
  onMaterial,
}: {
  inputs: HabitatInputs;
  investigations: readonly Investigation[];
  runs: readonly Run[];
  scenarios: readonly Scenario[];
  onMove: (o2Percent: number, pressurePsi: number) => void;
  onMaterial: (m: MaterialClass) => void;
}) {
  const patternId = useId().replace(/:/g, "");
  // "All solids" is the default view for a solid material: it draws every solid-fuel run, including those with no material class recorded.
  const solidMaterial = MATERIAL_CATEGORY[inputs.materialClass] === "solid";
  const [allSolids, setAllSolids] = useState(true);
  const [materialSeen, setMaterialSeen] = useState(inputs.materialClass);
  if (materialSeen !== inputs.materialClass) {
    // A material picked from the controls (not the pills below) narrows the grid to that material.
    setMaterialSeen(inputs.materialClass);
    setAllSolids(false);
  }
  const scope: GridScope = allSolids && solidMaterial ? "all-solids" : inputs.materialClass;
  const scopeLabel = scopeLabelOf(scope);
  const pickAllSolids = () => {
    if (!solidMaterial) {
      setMaterialSeen("fabric");
      onMaterial("fabric");
    }
    setAllSolids(true);
  };
  const pickMaterial = (m: MaterialClass) => {
    setAllSolids(false);
    onMaterial(m);
  };

  const grid = useMemo(() => buildFlammabilityGrid(runs, { scope }), [runs, scope]);
  const evidence = useMemo(() => scopeRuns(scope, runs), [scope, runs]);
  const summary = useMemo(() => coverageSummary(grid, evidence, inputs), [grid, evidence, inputs]);
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
          <button
            type="button"
            role="radio"
            aria-checked={scope === "all-solids"}
            onClick={pickAllSolids}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs transition-colors",
              scope === "all-solids" ? "bg-secondary text-foreground ring-1 ring-primary/40" : "text-muted-foreground hover:text-foreground"
            )}
          >
            All solids
          </button>
          {MATERIAL_CLASSES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={scope === m}
              onClick={() => pickMaterial(m)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                scope === m ? "bg-secondary text-foreground ring-1 ring-primary/40" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {MATERIAL_SHORT[m]}
            </button>
          ))}
        </div>
      </div>

      <p className="rounded-lg border border-border bg-background/40 px-3.5 py-2.5 text-sm leading-relaxed" aria-live="polite">
        <span className="tabular font-semibold">
          {summary.tested} of {summary.total}
        </span>{" "}
        squares in this window hold a real {scopeLabel} run, and {summary.near} more have one close by.{" "}
        {summary.nearest ? (
          <>
            The run nearest your cabin ({acronym(summary.nearest.run.investigationId)}) is{" "}
            <span className="tabular font-medium">
              {Math.abs(summary.nearest.dO2).toFixed(1)} points of O2 {summary.nearest.dO2 >= 0 ? "above" : "below"} and{" "}
              {Math.abs(summary.nearest.dPsi).toFixed(1)} psi {summary.nearest.dPsi >= 0 ? "above" : "below"}
            </span>{" "}
            your air.
          </>
        ) : (
          <>No real {scopeLabel} run exists for this material, so none can sit near your cabin.</>
        )}
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
        <figure className="min-w-0 space-y-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-auto w-full touch-manipulation rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            role="img"
            tabIndex={0}
            aria-label={`Coverage grid for ${scopeLabel} runs: oxygen ${GRID_O2.min} to ${GRID_O2.max} percent across, pressure ${GRID_PRESSURE.min} to ${GRID_PRESSURE.max} psi up. ${
              cabinCell
                ? `Your cabin's square: ${cabinCell.status === "tested" ? `${cabinCell.runs.length} real runs` : cabinCell.status === "near" ? "no run inside, one nearby" : "untested"}.`
                : "Your cabin is off this chart."
            } Use arrow keys to inspect squares and Enter to move your cabin there.`}
            onKeyDown={onKeyDown}
            onMouseLeave={() => setFocus(null)}
          >
            <defs>
              <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="2.2" height="6" fill={UNTESTED_STRIPE} fillOpacity="0.4" />
              </pattern>
            </defs>

            {grid.cells.map((c) => {
              const cx = x(c.o2Min);
              const cy = y(c.pMax);
              const gap = c.status === "untested" || !grid.materialTested;
              const fill = !grid.materialTested ? "#40434a" : c.status === "tested" && c.tone ? TONE_COLOR[c.tone] : gap ? GAP_FILL : NEAR_FILL;
              const solid = grid.materialTested && c.status === "tested";
              const striped = gap;
              // Pale just outside tested air, dark far from any real run.
              const opacity = solid ? 0.92 : gap ? 0.1 + 0.62 * gapShade(grid.materialTested ? c.nearestDistance : null) : 0.3;
              return (
                <g
                  key={`${c.col}-${c.row}`}
                  onMouseEnter={() => setFocus({ col: c.col, row: c.row })}
                  onClick={() => onMove((c.o2Min + c.o2Max) / 2, (c.pMin + c.pMax) / 2)}
                  className="cursor-pointer"
                >
                  <rect x={cx + 1} y={cy + 1} width={CELL - 2} height={CELL - 2} rx={4} fill={fill} fillOpacity={opacity} />
                  {striped && <rect x={cx + 1} y={cy + 1} width={CELL - 2} height={CELL - 2} rx={4} fill={`url(#${patternId})`} />}
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
            <Swatch color={TONE_COLOR.burned} label="Burned" />
            <Swatch color={TONE_COLOR.extinguished} label="Went out or never lit" />
            <Swatch color={TONE_COLOR.mixed} label="Mixed or other" />
            <Swatch color={TONE_COLOR.unstated} label="Run, outcome not stated" />
            <Swatch color={NEAR_FILL} label="No run inside, one nearby" />
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-3 w-14 rounded-[3px] border border-white/10"
                style={{ background: `linear-gradient(90deg, ${GAP_FILL}1f, ${GAP_FILL}b8), repeating-linear-gradient(135deg, ${UNTESTED_STRIPE}66 0 2px, transparent 2px 5px)` }}
              />
              Striped = untested: pale is just outside tested air, dark is far from any real run
            </span>
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
              evidence={evidence}
              acronym={acronym}
              materialTested={grid.materialTested}
              scopeLabel={scopeLabel}
              isCabin={shown === cabinCell}
            />
          ) : (
            <p className="rounded-md bg-warning/10 px-2.5 py-2 text-xs leading-relaxed text-warning">
              Your cabin ({inputs.o2Percent.toFixed(1)}% O2 at {inputs.pressurePsi.toFixed(1)} psi) is off this chart ({GRID_O2.min}–{GRID_O2.max}% O2,{" "}
              {GRID_PRESSURE.min}–{GRID_PRESSURE.max} psi). The verdict tiles above still compare it with every real run. Hover a square to inspect it.
            </p>
          )}
          <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
            Click a square to move your cabin there. Each colour shows only what the real {scopeLabel} runs inside that
            square recorded ({grid.evidenceRunCount} runs in the data; no prediction is made). Stripes mark squares with no run in or near them; the darker the square, the further it is from any real run (a bigger gap, not a riskier cabin).
            {grid.offChartRunCount > 0 && <> {grid.offChartRunCount} placeable runs lie outside this window.</>}
            {offChartPresets.length > 0 && (
              <> Off chart: {offChartPresets.map((s) => `${s.label} (${s.o2Percent}% O2, ${s.pressurePsi} psi)`).join(", ")}.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

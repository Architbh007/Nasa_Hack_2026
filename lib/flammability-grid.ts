import { MATERIAL_CATEGORY } from "@/lib/constants";
import { nearestRuns, NEAR_DISTANCE, placeRuns, runDistance, type NearRun, type PlacedRun } from "@/lib/metrics";
import type { MaterialClass, Outcome, Run } from "@/lib/schema";

/**
 * The square "flammability grid" on the habitat page: O2 % across, total pressure up.
 * Each square is described only by the real runs that fall inside it, or near it.
 * There is no model and no probability: a square is "tested" (real runs inside it, coloured
 * by what they recorded), "near" (no run inside, but one close by) or "untested".
 */

/** 12 x 12 square: the O2 band where cabin design decisions are made. Runs outside it are counted but not drawn. */
export const GRID_O2 = { min: 15, max: 51, step: 3 } as const;
export const GRID_PRESSURE = { min: 3, max: 15, step: 1 } as const;

export type CellStatus = "tested" | "near" | "untested";

/** What the runs in a tested square recorded. "mixed" covers burned and extinguished together, cool flames and disruptions. */
export type CellTone = "burned" | "extinguished" | "mixed" | "unstated";

export const TONE_LABEL: Record<CellTone, string> = {
  burned: "Burned in every run that stated an outcome",
  extinguished: "Flame went out or never lit in every run that stated an outcome",
  mixed: "Mixed or other recorded outcomes",
  unstated: "Runs here, but the source states no outcome",
};

export type GridCell = {
  col: number;
  row: number;
  o2Min: number;
  o2Max: number;
  pMin: number;
  pMax: number;
  status: CellStatus;
  tone: CellTone | null;
  /** Real runs inside this square (placed at their measured, paper or cited-nominal pressure). */
  runs: PlacedRun[];
  counts: Partial<Record<Outcome, number>>;
  /** Run distance from the square's centre to the nearest run (null when the material has no placeable runs). */
  nearestDistance: number | null;
};

export type FlammabilityGrid = {
  materialClass: MaterialClass;
  /** False when no real run exists for this material (for example foam, wire insulation, gas). */
  materialTested: boolean;
  evidenceRunCount: number;
  /** Placeable runs that fall outside the drawn O2 and pressure window. */
  offChartRunCount: number;
  columns: number;
  rows: number;
  cells: GridCell[];
};

/**
 * Real runs that are evidence for a material: the same material class for solids,
 * the same fuel category for liquids and gases.
 */
export function evidenceRuns(materialClass: MaterialClass, runs: readonly Run[]): Run[] {
  const category = MATERIAL_CATEGORY[materialClass];
  return runs.filter((r) => r.category === category && (category !== "solid" || r.materialClass === materialClass));
}

const inside = (v: number, lo: number, hi: number, last: boolean) => v >= lo && (last ? v <= hi : v < hi);

const DOWN: ReadonlySet<Outcome> = new Set<Outcome>(["extinguished", "blowoff", "no-ignition"]);

export function toneOf(counts: Partial<Record<Outcome, number>>): CellTone {
  const known = (Object.entries(counts) as Array<[Outcome, number]>).filter(([o, n]) => o !== "unknown" && n > 0);
  if (known.length === 0) return "unstated";
  if (known.every(([o]) => o === "burned")) return "burned";
  if (known.every(([o]) => DOWN.has(o))) return "extinguished";
  return "mixed";
}

export function buildFlammabilityGrid(runs: readonly Run[], opts: { materialClass: MaterialClass }): FlammabilityGrid {
  const evidence = evidenceRuns(opts.materialClass, runs);
  const placed = placeRuns(evidence);
  const columns = Math.round((GRID_O2.max - GRID_O2.min) / GRID_O2.step);
  const rows = Math.round((GRID_PRESSURE.max - GRID_PRESSURE.min) / GRID_PRESSURE.step);
  const cells: GridCell[] = [];
  let drawn = 0;
  for (let row = 0; row < rows; row++) {
    const pMin = GRID_PRESSURE.min + row * GRID_PRESSURE.step;
    const pMax = pMin + GRID_PRESSURE.step;
    for (let col = 0; col < columns; col++) {
      const o2Min = GRID_O2.min + col * GRID_O2.step;
      const o2Max = o2Min + GRID_O2.step;
      const inCell = placed.filter((p) => inside(p.o2Percent, o2Min, o2Max, col === columns - 1) && inside(p.pressurePsi, pMin, pMax, row === rows - 1));
      drawn += inCell.length;
      const counts: Partial<Record<Outcome, number>> = {};
      for (const p of inCell) counts[p.run.outcome] = (counts[p.run.outcome] ?? 0) + 1;
      const centre = { o2Percent: (o2Min + o2Max) / 2, pressurePsi: (pMin + pMax) / 2 };
      const nearestDistance = placed.length ? Math.min(...placed.map((p) => runDistance(p, centre))) : null;
      const status: CellStatus = inCell.length > 0 ? "tested" : nearestDistance !== null && nearestDistance <= NEAR_DISTANCE ? "near" : "untested";
      cells.push({
        col,
        row,
        o2Min,
        o2Max,
        pMin,
        pMax,
        status,
        tone: inCell.length > 0 ? toneOf(counts) : null,
        runs: inCell,
        counts,
        nearestDistance,
      });
    }
  }
  return {
    materialClass: opts.materialClass,
    materialTested: evidence.length > 0,
    evidenceRunCount: evidence.length,
    offChartRunCount: placed.length - drawn,
    columns,
    rows,
    cells,
  };
}

export function onGrid(o2Percent: number, pressurePsi: number): boolean {
  return o2Percent >= GRID_O2.min && o2Percent <= GRID_O2.max && pressurePsi >= GRID_PRESSURE.min && pressurePsi <= GRID_PRESSURE.max;
}

/** The cell containing a cabin condition, or null when it lies off the chart. */
export function cellAt(grid: FlammabilityGrid, o2Percent: number, pressurePsi: number): GridCell | null {
  if (!onGrid(o2Percent, pressurePsi)) return null;
  const col = Math.min(grid.columns - 1, Math.floor((o2Percent - GRID_O2.min) / GRID_O2.step));
  const row = Math.min(grid.rows - 1, Math.floor((pressurePsi - GRID_PRESSURE.min) / GRID_PRESSURE.step));
  return grid.cells[row * grid.columns + col] ?? null;
}

/** The k evidence runs nearest a point (O2 scaled by 10 %, pressure by 3 psi), for "why this colour". */
export function nearestEvidence(
  evidence: readonly Run[],
  point: { o2Percent: number; pressurePsi: number },
  k = 5
): NearRun[] {
  return nearestRuns(point, evidence, { count: k });
}

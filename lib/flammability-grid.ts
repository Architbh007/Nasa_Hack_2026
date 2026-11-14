import { AIRFLOW_CM_S, MATERIAL_PHASE } from "@/lib/constants";
import { isIgnitionStudy } from "@/lib/metrics";
import { materialClassForFuel } from "@/lib/materials";
import { predictIgnitionProbability, type ModelArtifact } from "@/lib/model";
import type { Airflow, Investigation, MaterialClass, TestRun } from "@/lib/schema";

/**
 * The square "flammability grid" on the habitat page: O2 % across, total
 * pressure up. Each cell is coloured by the ignition model and marked untested
 * when no ignition test of the same material falls inside it.
 */

/** 12 x 12 square: the O2 band where cabin design decisions are made. Points above 51% are reported as off-chart. */
export const GRID_O2 = { min: 15, max: 51, step: 3 } as const;
export const GRID_PRESSURE = { min: 3, max: 15, step: 1 } as const;

export type CellLevel = "unlikely" | "possible" | "likely";

/** Probability cut-offs for the three colour levels. */
export const LEVEL_THRESHOLDS = { possible: 1 / 3, likely: 2 / 3 } as const;

export function levelFor(p: number): CellLevel {
  if (p >= LEVEL_THRESHOLDS.likely) return "likely";
  if (p >= LEVEL_THRESHOLDS.possible) return "possible";
  return "unlikely";
}

export const LEVEL_LABEL: Record<CellLevel, string> = {
  unlikely: "Fire unlikely",
  possible: "In between",
  likely: "Fire likely",
};

export type GridCell = {
  col: number;
  row: number;
  o2Min: number;
  o2Max: number;
  pMin: number;
  pMax: number;
  probability: number;
  level: CellLevel;
  /** Ignition-study runs of the same material inside this cell. */
  runs: TestRun[];
  ignited: number;
  tested: boolean;
};

export type FlammabilityGrid = {
  materialClass: MaterialClass;
  /** False when this material was never part of an ignition study (foam, wire insulation). */
  materialTested: boolean;
  evidenceRunCount: number;
  columns: number;
  rows: number;
  cells: GridCell[];
};

/** Ignition-study runs that are evidence for a material: same material for solids, same phase for liquids and gases. */
export function evidenceRuns(
  materialClass: MaterialClass,
  investigations: readonly Investigation[],
  tests: readonly TestRun[]
): TestRun[] {
  const phase = MATERIAL_PHASE[materialClass];
  const studies = new Map(investigations.filter(isIgnitionStudy).map((i) => [i.id, i.fuelPhase] as const));
  return tests.filter((t) => {
    const p = studies.get(t.investigationId);
    if (p !== phase) return false;
    return phase !== "solid" || materialClassForFuel(t.fuel) === materialClass;
  });
}

const inside = (v: number, lo: number, hi: number, last: boolean) => v >= lo && (last ? v <= hi : v < hi);

export function buildFlammabilityGrid(
  model: ModelArtifact,
  investigations: readonly Investigation[],
  tests: readonly TestRun[],
  opts: { materialClass: MaterialClass; airflow: Airflow }
): FlammabilityGrid {
  const runs = evidenceRuns(opts.materialClass, investigations, tests);
  const fuelPhase = MATERIAL_PHASE[opts.materialClass];
  const flowCmS = AIRFLOW_CM_S[opts.airflow];
  const columns = Math.round((GRID_O2.max - GRID_O2.min) / GRID_O2.step);
  const rows = Math.round((GRID_PRESSURE.max - GRID_PRESSURE.min) / GRID_PRESSURE.step);
  const cells: GridCell[] = [];
  for (let row = 0; row < rows; row++) {
    const pMin = GRID_PRESSURE.min + row * GRID_PRESSURE.step;
    const pMax = pMin + GRID_PRESSURE.step;
    for (let col = 0; col < columns; col++) {
      const o2Min = GRID_O2.min + col * GRID_O2.step;
      const o2Max = o2Min + GRID_O2.step;
      const probability = predictIgnitionProbability(model, {
        o2Percent: (o2Min + o2Max) / 2,
        pressurePsi: (pMin + pMax) / 2,
        flowCmS,
        fuelPhase,
        diluentPercent: null,
        materialClass: opts.materialClass,
      });
      const inCell = runs.filter(
        (t) => inside(t.o2Percent, o2Min, o2Max, col === columns - 1) && inside(t.pressurePsi, pMin, pMax, row === rows - 1)
      );
      cells.push({
        col,
        row,
        o2Min,
        o2Max,
        pMin,
        pMax,
        probability,
        level: levelFor(probability),
        runs: inCell,
        ignited: inCell.filter((t) => t.ignited).length,
        tested: inCell.length > 0,
      });
    }
  }
  return { materialClass: opts.materialClass, materialTested: runs.length > 0, evidenceRunCount: runs.length, columns, rows, cells };
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
  runs: readonly TestRun[],
  point: { o2Percent: number; pressurePsi: number },
  k = 5
): Array<{ test: TestRun; distance: number }> {
  return runs
    .map((test) => ({
      test,
      distance: Math.hypot((test.o2Percent - point.o2Percent) / 10, (test.pressurePsi - point.pressurePsi) / 3),
    }))
    .sort((a, b) => a.distance - b.distance || a.test.testId.localeCompare(b.test.testId))
    .slice(0, k);
}

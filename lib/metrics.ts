import { EARTH_O2_PERCENT, PSI_TO_KPA } from "@/lib/constants";
import { effectivePressurePsi, type Category, type Investigation, type Run } from "@/lib/schema";

export type AtmospherePoint = { o2Percent: number; pressurePsi: number };

/** The tested O2/pressure envelope of an investigation (from its runs only; null when it has none). */
export type RangeBox = Pick<Investigation, "ranges">;

export function psiToKPa(psi: number): number {
  return psi * PSI_TO_KPA;
}

/** Oxygen partial pressure of a cabin atmosphere, in psi and kPa. */
export function oxygenPartialPressure(o2Percent: number, pressurePsi: number): { psi: number; kPa: number } {
  const psi = (o2Percent / 100) * pressurePsi;
  return { psi, kPa: psi * PSI_TO_KPA };
}

/** Relative increase in O2 concentration versus Earth's 21%, as a percent. */
export function o2IncreaseVsEarth(o2Percent: number): number {
  return ((o2Percent - EARTH_O2_PERCENT) / EARTH_O2_PERCENT) * 100;
}

/** True when an investigation has both an O2 and a pressure range. */
export function hasEnvelope(inv: RangeBox): boolean {
  return inv.ranges.o2Percent !== null && inv.ranges.pressurePsi !== null;
}

export function rangeContains(inv: RangeBox, point: AtmospherePoint): boolean {
  const { o2Percent: o2, pressurePsi: p } = inv.ranges;
  if (!o2 || !p) return false;
  return point.o2Percent >= o2.min && point.o2Percent <= o2.max && point.pressurePsi >= p.min && point.pressurePsi <= p.max;
}

export type NormalizationScales = { o2Span: number; pressureSpan: number };

/** Spans of the tested envelope across all investigations that have one; used to normalize distances. */
export function datasetScales(investigations: readonly RangeBox[]): NormalizationScales {
  const boxes = investigations.filter(hasEnvelope);
  if (boxes.length === 0) return { o2Span: 100, pressureSpan: 15 };
  const o2Min = Math.min(...boxes.map((i) => i.ranges.o2Percent!.min));
  const o2Max = Math.max(...boxes.map((i) => i.ranges.o2Percent!.max));
  const pMin = Math.min(...boxes.map((i) => i.ranges.pressurePsi!.min));
  const pMax = Math.max(...boxes.map((i) => i.ranges.pressurePsi!.max));
  return { o2Span: Math.max(1, o2Max - o2Min), pressureSpan: Math.max(0.5, pMax - pMin) };
}

function axisGap(value: number, min: number, max: number): number {
  if (value < min) return min - value;
  if (value > max) return value - max;
  return 0;
}

/**
 * Euclidean distance from a point to an investigation's tested O2/pressure box, each axis divided
 * by the dataset-wide span. Zero inside the box; null when the investigation has no envelope.
 */
export function normalizedDistance(inv: RangeBox, point: AtmospherePoint, scales: NormalizationScales): number | null {
  const { o2Percent: o2, pressurePsi: p } = inv.ranges;
  if (!o2 || !p) return null;
  const dx = axisGap(point.o2Percent, o2.min, o2.max) / scales.o2Span;
  const dy = axisGap(point.pressurePsi, p.min, p.max) / scales.pressureSpan;
  return Math.hypot(dx, dy);
}

export type NearestInvestigation = { investigation: Investigation; distance: number };

export type CoverageResult = {
  category: Category | null;
  /** Same-category investigations (or all, when no category given) whose run envelope contains the point. */
  covering: Investigation[];
  /** Other-category investigations whose run envelope contains the point. */
  coveringOtherCategories: Investigation[];
  /** Closest same-category investigations that have an envelope (covering ones at distance 0). */
  nearest: NearestInvestigation[];
  /** True when no same-category investigation's envelope contains the point. */
  gap: boolean;
};

export function coverageCheck(
  point: AtmospherePoint,
  investigations: readonly Investigation[],
  options: { category?: Category | null; nearestCount?: number; scales?: NormalizationScales } = {}
): CoverageResult {
  const category = options.category ?? null;
  const scales = options.scales ?? datasetScales(investigations);
  const same = investigations.filter((i) => category === null || i.category === category);
  const other = investigations.filter((i) => category !== null && i.category !== category);
  const covering = same.filter((i) => rangeContains(i, point));
  const nearest = same
    .flatMap((investigation) => {
      const distance = normalizedDistance(investigation, point, scales);
      return distance === null ? [] : [{ investigation, distance }];
    })
    .sort((a, b) => a.distance - b.distance || a.investigation.id.localeCompare(b.investigation.id))
    .slice(0, options.nearestCount ?? 5);
  return {
    category,
    covering,
    coveringOtherCategories: other.filter((i) => rangeContains(i, point)),
    nearest,
    gap: covering.length === 0,
  };
}

// ------------------------------------------------------------- run level

/** Axis scales for run distance: 10 percentage points of O2 count the same as 3 psi. */
export const RUN_SCALE = { o2: 10, psi: 3 } as const;
/** "Tested" means a same-category run within these tolerances of the point. */
export const TESTED_TOLERANCE = { o2: 2, psi: 1 } as const;
/** "Near" means the nearest same-category run is within this run distance. */
export const NEAR_DISTANCE = 0.6;

export type PlacedRun = { run: Run; o2Percent: number; pressurePsi: number; assumedPressure: boolean };

/** Runs that can be placed on the O2-pressure map (O2 recorded, and a measured, paper or cited-nominal pressure). */
export function placeRun(run: Run): PlacedRun | null {
  const p = effectivePressurePsi(run);
  if (run.o2Percent === null || p === null) return null;
  return { run, o2Percent: run.o2Percent, pressurePsi: p, assumedPressure: run.pressurePsi === null };
}

export function placeRuns(runs: readonly Run[]): PlacedRun[] {
  return runs.flatMap((r) => {
    const placed = placeRun(r);
    return placed ? [placed] : [];
  });
}

export type NearRun = PlacedRun & { distance: number; dO2: number; dPsi: number };

export function runDistance(r: Pick<PlacedRun, "o2Percent" | "pressurePsi">, point: AtmospherePoint): number {
  return Math.hypot((r.o2Percent - point.o2Percent) / RUN_SCALE.o2, (r.pressurePsi - point.pressurePsi) / RUN_SCALE.psi);
}

/** Real runs closest to a point, nearest first. These are neighbours to look at, not a prediction. */
export function nearestRuns(
  point: AtmospherePoint,
  runs: readonly Run[],
  options: { category?: Category | null; count?: number } = {}
): NearRun[] {
  return placeRuns(runs.filter((r) => !options.category || r.category === options.category))
    .map((p) => ({
      ...p,
      distance: runDistance(p, point),
      dO2: p.o2Percent - point.o2Percent,
      dPsi: p.pressurePsi - point.pressurePsi,
    }))
    .sort((a, b) => a.distance - b.distance || a.run.id.localeCompare(b.run.id))
    .slice(0, options.count ?? 5);
}

export function isWithinTested(r: Pick<NearRun, "dO2" | "dPsi">): boolean {
  return Math.abs(r.dO2) <= TESTED_TOLERANCE.o2 && Math.abs(r.dPsi) <= TESTED_TOLERANCE.psi;
}

/** Runs within the "tested" tolerances of a point. */
export function runsWithinTolerance(point: AtmospherePoint, runs: readonly Run[], category?: Category | null): PlacedRun[] {
  return placeRuns(runs.filter((r) => !category || r.category === category)).filter((p) =>
    isWithinTested({ dO2: p.o2Percent - point.o2Percent, dPsi: p.pressurePsi - point.pressurePsi })
  );
}

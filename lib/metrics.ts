import { EARTH_O2_PERCENT, PSI_TO_KPA } from "@/lib/constants";
import type { FuelPhase, Investigation, TestRun } from "@/lib/schema";

export type AtmospherePoint = { o2Percent: number; pressurePsi: number };

/** The tested O2/pressure envelope of an investigation. */
export type RangeBox = Pick<Investigation, "oxygenRange" | "pressureRange">;

export function psiToKPa(psi: number): number {
  return psi * PSI_TO_KPA;
}

/** Oxygen partial pressure of a cabin atmosphere, in psi and kPa. */
export function oxygenPartialPressure(
  o2Percent: number,
  pressurePsi: number
): { psi: number; kPa: number } {
  const psi = (o2Percent / 100) * pressurePsi;
  return { psi, kPa: psi * PSI_TO_KPA };
}

/** Relative increase in O2 concentration versus Earth's 21%, as a percent. */
export function o2IncreaseVsEarth(o2Percent: number): number {
  return ((o2Percent - EARTH_O2_PERCENT) / EARTH_O2_PERCENT) * 100;
}

export function rangeContains(inv: RangeBox, point: AtmospherePoint): boolean {
  return (
    point.o2Percent >= inv.oxygenRange.min &&
    point.o2Percent <= inv.oxygenRange.max &&
    point.pressurePsi >= inv.pressureRange.minPsi &&
    point.pressurePsi <= inv.pressureRange.maxPsi
  );
}

export type NormalizationScales = { o2Span: number; pressureSpan: number };

/** Spans of the tested envelope across all investigations; used to normalize distances. */
export function datasetScales(investigations: readonly RangeBox[]): NormalizationScales {
  if (investigations.length === 0) return { o2Span: 100, pressureSpan: 15 };
  const o2Min = Math.min(...investigations.map((i) => i.oxygenRange.min));
  const o2Max = Math.max(...investigations.map((i) => i.oxygenRange.max));
  const pMin = Math.min(...investigations.map((i) => i.pressureRange.minPsi));
  const pMax = Math.max(...investigations.map((i) => i.pressureRange.maxPsi));
  return {
    o2Span: Math.max(1, o2Max - o2Min),
    pressureSpan: Math.max(0.5, pMax - pMin),
  };
}

const axisGap = (value: number, min: number, max: number) =>
  value < min ? min - value : value > max ? value - max : 0;

/**
 * Euclidean distance from a point to an investigation's tested O2/pressure box,
 * with each axis divided by the dataset-wide span. Zero when the box contains the point.
 */
export function normalizedDistance(
  inv: RangeBox,
  point: AtmospherePoint,
  scales: NormalizationScales
): number {
  const dx = axisGap(point.o2Percent, inv.oxygenRange.min, inv.oxygenRange.max) / scales.o2Span;
  const dy =
    axisGap(point.pressurePsi, inv.pressureRange.minPsi, inv.pressureRange.maxPsi) /
    scales.pressureSpan;
  return Math.hypot(dx, dy);
}

export type NearestInvestigation = { investigation: Investigation; distance: number };

export type CoverageResult = {
  fuelPhase: FuelPhase | null;
  /** Same-phase investigations (or all, when no phase given) whose ranges contain the point. */
  covering: Investigation[];
  /** Other-phase investigations whose ranges contain the point. */
  coveringOtherPhases: Investigation[];
  /** Closest same-phase investigations by normalized distance (includes covering ones at 0). */
  nearest: NearestInvestigation[];
  /** True when no same-phase investigation covers the point. */
  gap: boolean;
};

export function coverageCheck(
  point: AtmospherePoint,
  investigations: readonly Investigation[],
  options: { fuelPhase?: FuelPhase | null; nearestCount?: number; scales?: NormalizationScales } = {}
): CoverageResult {
  const fuelPhase = options.fuelPhase ?? null;
  const scales = options.scales ?? datasetScales(investigations);
  const samePhase = investigations.filter((i) => fuelPhase === null || i.fuelPhase === fuelPhase);
  const otherPhase = investigations.filter((i) => fuelPhase !== null && i.fuelPhase !== fuelPhase);
  const covering = samePhase.filter((i) => rangeContains(i, point));
  const nearest = samePhase
    .map((investigation) => ({
      investigation,
      distance: normalizedDistance(investigation, point, scales),
    }))
    .sort((a, b) => a.distance - b.distance || a.investigation.id.localeCompare(b.investigation.id))
    .slice(0, options.nearestCount ?? 5);
  return {
    fuelPhase,
    covering,
    coveringOtherPhases: otherPhase.filter((i) => rangeContains(i, point)),
    nearest,
    gap: covering.length === 0,
  };
}

/** Test runs near a point (within the given O2 and pressure tolerances). */
export function nearbyTests(
  point: AtmospherePoint,
  tests: readonly TestRun[],
  options: {
    fuelPhaseOf?: (t: TestRun) => FuelPhase | undefined;
    fuelPhase?: FuelPhase | null;
    o2Tolerance?: number;
    pressureTolerance?: number;
  } = {}
): TestRun[] {
  const o2Tol = options.o2Tolerance ?? 2.5;
  const pTol = options.pressureTolerance ?? 0.75;
  return tests.filter((t) => {
    if (options.fuelPhase && options.fuelPhaseOf && options.fuelPhaseOf(t) !== options.fuelPhase) {
      return false;
    }
    return (
      Math.abs(t.o2Percent - point.o2Percent) <= o2Tol &&
      Math.abs(t.pressurePsi - point.pressurePsi) <= pTol
    );
  });
}

/** Detection-only investigations (smoke/dust) are not ignition attempts. */
export function isIgnitionStudy(inv: Pick<Investigation, "safetyPillars">): boolean {
  return !(inv.safetyPillars.length === 1 && inv.safetyPillars[0] === "detection");
}

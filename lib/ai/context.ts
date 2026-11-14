import { GRAVITY_LABEL, MATERIAL_LABEL, AIRFLOW_LABEL } from "@/lib/constants";
import type { HabitatAssessment } from "@/lib/habitat";
import { HABITAT_KEYS, type Investigation, type TestRun } from "@/lib/schema";

/**
 * Compact, grounded context objects sent to the model. Everything the SI may
 * cite is in here; nothing else is.
 */

const r2 = (v: number) => Math.round(v * 100) / 100;

function stat(values: number[]) {
  if (values.length === 0) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return { n: values.length, mean: r2(mean), min: r2(Math.min(...values)), max: r2(Math.max(...values)) };
}

export function testStats(tests: readonly TestRun[]) {
  const outcomes: Record<string, number> = {};
  for (const t of tests) outcomes[t.outcome] = (outcomes[t.outcome] ?? 0) + 1;
  const ignited = tests.filter((t) => t.ignited).length;
  const nums = (f: (t: TestRun) => number | null) => tests.map(f).filter((v): v is number => v !== null);
  return {
    runs: tests.length,
    ignited,
    ignitionRatePercent: tests.length ? Math.round((100 * ignited) / tests.length) : 0,
    outcomes,
    flameSpreadRateMmS: stat(nums((t) => t.flameSpreadRateMmS)),
    extinctionDiameterMm: stat(nums((t) => t.extinctionDiameterMm)),
    peakTemperatureK: stat(nums((t) => t.peakTemperatureK)),
    smokeObscurationPercent: stat(nums((t) => t.smokeObscurationPercent)),
    groundReferenceRuns: tests.filter((t) => t.gravityLevel === "normal").length,
  };
}

export function investigationContext(inv: Investigation, tests: readonly TestRun[]) {
  return {
    id: inv.id,
    name: inv.name,
    acronym: inv.acronym,
    project: inv.project,
    platform: inv.platform,
    hardware: inv.hardware,
    yearsActive: `${inv.yearsActive.start}-${inv.yearsActive.end}`,
    fuelPhase: inv.fuelPhase,
    fuels: inv.fuels,
    sampleGeometry: inv.sampleGeometry,
    oxygenRangePercent: inv.oxygenRange,
    pressureRangePsi: { min: inv.pressureRange.minPsi, max: inv.pressureRange.maxPsi },
    flowRangeCmS: inv.flowRange ?? "quiescent",
    diluents: inv.diluents,
    gravityLevel: inv.gravityLevel,
    objectives: inv.objectives,
    variables: inv.variables,
    constants: inv.constants,
    measurements: inv.measurements,
    keyFindings: inv.keyFindings,
    safetyPillars: inv.safetyPillars,
    habitatRelevance: Object.fromEntries(HABITAT_KEYS.map((k) => [k, inv.habitatRelevance[k]])),
    earthApplications: inv.earthApplications,
    testStatistics: testStats(tests),
    dataSource: inv.dataSource,
  };
}

/** Lighter record for lists (ranking, comparison, retrieval). */
export function briefContext(inv: Investigation, tests: readonly TestRun[]) {
  const s = testStats(tests);
  return {
    id: inv.id,
    acronym: inv.acronym,
    name: inv.name,
    project: inv.project,
    hardware: inv.hardware,
    fuelPhase: inv.fuelPhase,
    fuels: inv.fuels,
    oxygenRangePercent: inv.oxygenRange,
    pressureRangePsi: { min: inv.pressureRange.minPsi, max: inv.pressureRange.maxPsi },
    flowRangeCmS: inv.flowRange ?? "quiescent",
    gravityLevel: inv.gravityLevel,
    diluents: inv.diluents,
    measurements: inv.measurements,
    safetyPillars: inv.safetyPillars,
    keyFindings: inv.keyFindings,
    habitatRelevanceScores: Object.fromEntries(HABITAT_KEYS.map((k) => [k, inv.habitatRelevance[k].score])),
    testStatistics: { runs: s.runs, ignitionRatePercent: s.ignitionRatePercent, outcomes: s.outcomes, flameSpreadRateMmS: s.flameSpreadRateMmS },
    dataSource: inv.dataSource,
  };
}

export type GridSquareEvidence = {
  materialIgnitionTested: boolean;
  /** null when the cabin is off the grid (above its O2 range). */
  square: { o2RangePercent: [number, number]; pressureRangePsi: [number, number]; runsOfThisMaterial: number; ignited: number } | null;
};

export function habitatContext(
  a: HabitatAssessment,
  ranked: Array<{ inv: Investigation; tests: readonly TestRun[]; score: number }>,
  grid?: GridSquareEvidence
) {
  return {
    condition: {
      o2Percent: r2(a.inputs.o2Percent),
      pressurePsi: r2(a.inputs.pressurePsi),
      material: MATERIAL_LABEL[a.inputs.materialClass],
      fuelPhase: a.fuelPhase,
      airflow: AIRFLOW_LABEL[a.inputs.airflow],
      gravity: GRAVITY_LABEL[a.inputs.gravity],
    },
    metrics: {
      o2PartialPressurePsi: r2(a.pO2.psi),
      o2PartialPressureKPa: r2(a.pO2.kPa),
      o2ConcentrationChangeVsEarthPercent: Math.round(a.o2IncreasePct),
      seaLevelReference: "21% O2 at 14.7 psi, pO2 3.09 psi",
    },
    model: {
      predictedIgnitionProbabilityPercent: Math.round(a.ignitionProbability * 100),
      riskBand: a.riskBand,
      note: "Logistic regression trained on synthetic test runs; a relative indicator, not a certified limit.",
      estimatedFlameSpreadRateMmS:
        a.spread.estimate === null
          ? null
          : { estimate: r2(a.spread.estimate), nearestRunsRange: [a.spread.min, a.spread.max], neighbors: a.spread.neighbors.length },
    },
    coverage: {
      gap: a.coverage.gap,
      coveringSamePhaseInvestigationIds: a.coverage.covering.map((i) => i.id),
      coveringOtherPhaseInvestigationIds: a.coverage.coveringOtherPhases.map((i) => i.id),
      nearestSamePhase: a.coverage.nearest.slice(0, 3).map((n) => ({ id: n.investigation.id, normalizedDistance: r2(n.distance) })),
      samePhaseRunsNearby: a.nearbyTestCount,
    },
    gridSquare: grid ?? null,
    partialGravity: a.partialGravity
      ? "No partial-gravity combustion data exists in PSI; E-FIELD Flames is a simulated partial-gravity proxy; LUCI and FM2 are expected future sources."
      : null,
    topRanked: ranked.map((r) => ({ relevanceScore: Math.round(r.score * 100), ...briefContext(r.inv, r.tests) })),
  };
}

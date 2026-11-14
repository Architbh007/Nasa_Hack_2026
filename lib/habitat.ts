import { AIRFLOW_CM_S, CATEGORY_SHORT, GRAVITY_LABEL, MATERIAL_CATEGORY } from "@/lib/constants";
import { num } from "@/lib/format";
import {
  coverageCheck,
  NEAR_DISTANCE,
  nearestRuns,
  o2IncreaseVsEarth,
  oxygenPartialPressure,
  placeRuns,
  runsWithinTolerance,
  TESTED_TOLERANCE,
  type AtmospherePoint,
  type CoverageResult,
  type NearRun,
} from "@/lib/metrics";
import { DEFAULT_RANKING_WEIGHTS, rankInvestigations, type RankedInvestigation, type RankingWeights } from "@/lib/ranking";
import type { Airflow, Category, HabitatGravity, Investigation, MaterialClass, Run, Scenario, Summary } from "@/lib/schema";

/**
 * One pure function that turns a proposed cabin condition into everything shown on the habitat
 * page. The UI, the SI route and the prewarm script all call it, so the SI sees what the user sees.
 * It reports coverage by real tests and the nearest real runs. It never predicts an outcome.
 */

export type HabitatInputs = {
  o2Percent: number;
  pressurePsi: number;
  materialClass: MaterialClass;
  airflow: Airflow;
  gravity: HabitatGravity;
};

export type HabitatData = {
  investigations: readonly Investigation[];
  runs: readonly Run[];
  summaries?: readonly Summary[];
};

/** The fuel categories a cabin can burn. Smoke/dust studies are not ignition tests. */
export const FUEL_CATEGORIES = ["solid", "liquid", "gas"] as const satisfies readonly Category[];
export type FuelCategory = (typeof FUEL_CATEGORIES)[number];

/**
 * tested: a same-category run within ±2% O2 and ±1 psi. near: the nearest run is within run distance 0.6.
 * untested: runs exist, none close. no-runs: no run-level data with O2 and pressure for this category.
 */
export type Verdict = "tested" | "near" | "untested" | "no-runs";

export const VERDICT_LABEL: Record<Verdict, string> = {
  tested: "Has test data",
  near: "Test data nearby",
  untested: "No test data nearby",
  "no-runs": "No run data",
};

export type CategoryVerdict = {
  category: FuelCategory;
  verdict: Verdict;
  /** Plain-language reason for the verdict. */
  reason: string;
  /** Same-category runs within the tested tolerances. */
  withinTolerance: number;
  /** True when every run within tolerance relies on a cited nominal pressure. */
  onlyAssumedPressure: boolean;
  nearest: NearRun[];
  /** Same-category runs that can be placed on the map. */
  placeableRuns: number;
};

export type HabitatAssessment = {
  inputs: HabitatInputs;
  category: FuelCategory;
  flowCmS: number | null;
  pO2: { psi: number; kPa: number };
  o2IncreasePct: number;
  verdicts: Record<FuelCategory, CategoryVerdict>;
  /** Investigation-level envelope check for the chosen material's category. */
  coverage: CoverageResult;
  /** Statements of what the data we hold never tested, relative to this atmosphere. */
  neverTested: string[];
  ranked: RankedInvestigation[];
  partialGravity: boolean;
};

export function categoryVerdict(
  point: AtmospherePoint,
  runs: readonly Run[],
  category: FuelCategory,
  nearestCount = 5
): CategoryVerdict {
  const placeable = placeRuns(runs.filter((r) => r.category === category));
  const nearest = nearestRuns(point, runs, { category, count: nearestCount });
  const within = runsWithinTolerance(point, runs, category);
  const base = { category, withinTolerance: within.length, nearest, placeableRuns: placeable.length };
  const measured = within.filter((r) => !r.assumedPressure).length;
  const onlyAssumedPressure = within.length > 0 && measured === 0;
  const label = CATEGORY_SHORT[category].toLowerCase();
  const tol = `±${TESTED_TOLERANCE.o2}% O2 and ±${TESTED_TOLERANCE.psi} psi`;
  if (placeable.length === 0) {
    return { ...base, verdict: "no-runs", onlyAssumedPressure, reason: `No ${label}-fuel runs with both O2 and pressure in the data we hold.` };
  }
  if (within.length > 0) {
    return {
      ...base,
      verdict: "tested",
      onlyAssumedPressure,
      reason: `${within.length} ${label}-fuel run${within.length === 1 ? "" : "s"} within ${tol}: ${measured} with a recorded pressure, ${within.length - measured} with no recorded pressure, placed at the cited ISS nominal.`,
    };
  }
  const best = nearest[0]!;
  const where = `${num(best.o2Percent)}% O2, ${num(best.pressurePsi)} psi (${best.run.id})`;
  if (best.distance <= NEAR_DISTANCE) {
    return { ...base, verdict: "near", onlyAssumedPressure, reason: `No ${label}-fuel run within ${tol}; the nearest is at ${where}.` };
  }
  return { ...base, verdict: "untested", onlyAssumedPressure, reason: `No ${label}-fuel run near this atmosphere; the nearest is at ${where}.` };
}

/** What the runs we hold never reached, relative to a point. Each line is checkable against the data. */
export function neverTestedStatements(point: AtmospherePoint, runs: readonly Run[], gravity: HabitatGravity): string[] {
  const out: string[] = [];
  for (const category of FUEL_CATEGORIES) {
    const placed = placeRuns(runs.filter((r) => r.category === category));
    const label = CATEGORY_SHORT[category].toLowerCase();
    if (placed.length === 0) {
      out.push(`No ${label}-fuel runs with O2 and pressure in the data we hold.`);
      continue;
    }
    const maxO2 = Math.max(...placed.map((p) => p.o2Percent));
    const minP = Math.min(...placed.map((p) => p.pressurePsi));
    if (point.o2Percent > maxO2) out.push(`No ${label}-fuel run at ${num(point.o2Percent)}% O2 or higher (highest: ${num(maxO2)}%).`);
    if (point.pressurePsi < minP) out.push(`No ${label}-fuel run at ${num(point.pressurePsi)} psi or lower (lowest: ${num(minP)} psi).`);
    const corner = placed.filter((p) => p.o2Percent >= point.o2Percent - TESTED_TOLERANCE.o2 && p.pressurePsi <= point.pressurePsi + TESTED_TOLERANCE.psi);
    if (corner.length === 0 && point.o2Percent <= maxO2 && point.pressurePsi >= minP) {
      out.push(`No ${label}-fuel run combines this much O2 with this low a pressure.`);
    }
  }
  if (gravity !== "micro") {
    out.push(`Every run in this dataset was in microgravity; none at ${GRAVITY_LABEL[gravity]}.`);
  }
  return out;
}

export function assessHabitat(
  inputs: HabitatInputs,
  data: HabitatData,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS
): HabitatAssessment {
  const category = MATERIAL_CATEGORY[inputs.materialClass] as FuelCategory;
  const point = { o2Percent: inputs.o2Percent, pressurePsi: inputs.pressurePsi };
  const verdicts = Object.fromEntries(
    FUEL_CATEGORIES.map((c) => [c, categoryVerdict(point, data.runs, c)])
  ) as Record<FuelCategory, CategoryVerdict>;
  return {
    inputs,
    category,
    flowCmS: AIRFLOW_CM_S[inputs.airflow],
    pO2: oxygenPartialPressure(inputs.o2Percent, inputs.pressurePsi),
    o2IncreasePct: o2IncreaseVsEarth(inputs.o2Percent),
    verdicts,
    coverage: coverageCheck(point, data.investigations, { category }),
    neverTested: neverTestedStatements(point, data.runs, inputs.gravity),
    ranked: rankInvestigations(data.investigations, { ...point, materialClass: inputs.materialClass, airflow: inputs.airflow }, weights),
    partialGravity: inputs.gravity === "lunar" || inputs.gravity === "mars",
  };
}

/** Round inputs so near-identical slider positions share an SI cache entry (used by the route and the prewarm script). */
export function normalizeHabitatInputs(inputs: HabitatInputs): HabitatInputs {
  return { ...inputs, o2Percent: Math.round(inputs.o2Percent * 2) / 2, pressurePsi: Math.round(inputs.pressurePsi * 10) / 10 };
}

export function inputsFromScenario(s: Scenario, materialClass?: MaterialClass): HabitatInputs {
  return {
    o2Percent: s.o2Percent,
    pressurePsi: s.pressurePsi,
    materialClass: materialClass ?? s.typicalMaterials[0] ?? "fabric",
    airflow: s.typicalAirflow,
    gravity: s.gravity,
  };
}

export function matchingScenario(scenarios: readonly Scenario[], inputs: HabitatInputs): Scenario | null {
  return (
    scenarios.find(
      (s) => Math.abs(s.o2Percent - inputs.o2Percent) < 0.01 && Math.abs(s.pressurePsi - inputs.pressurePsi) < 0.01 && s.gravity === inputs.gravity
    ) ?? null
  );
}

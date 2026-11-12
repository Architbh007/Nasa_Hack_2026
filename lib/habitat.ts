import { AIRFLOW_CM_S, MATERIAL_PHASE } from "@/lib/constants";
import {
  coverageCheck,
  isIgnitionStudy,
  nearbyTests,
  o2IncreaseVsEarth,
  oxygenPartialPressure,
  type CoverageResult,
} from "@/lib/metrics";
import {
  estimateSpreadRate,
  predictIgnitionProbability,
  type ModelArtifact,
  type SpreadEstimate,
} from "@/lib/model";
import {
  DEFAULT_RANKING_WEIGHTS,
  rankInvestigations,
  type RankedInvestigation,
  type RankingWeights,
} from "@/lib/ranking";
import type {
  Airflow,
  FuelPhase,
  HabitatGravity,
  Investigation,
  MaterialClass,
  Scenario,
  TestRun,
} from "@/lib/schema";

/**
 * One pure function that turns a proposed cabin condition into every number
 * shown on the habitat page. The UI, the SI route and the prewarm script all
 * call this, so the SI sees exactly what the user sees.
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
  tests: readonly TestRun[];
  model: ModelArtifact;
};

export type RiskBand = "low" | "moderate" | "high" | "very-high";

export type HabitatAssessment = {
  inputs: HabitatInputs;
  fuelPhase: FuelPhase;
  flowCmS: number | null;
  pO2: { psi: number; kPa: number };
  o2IncreasePct: number;
  ignitionProbability: number;
  riskBand: RiskBand;
  spread: SpreadEstimate;
  coverage: CoverageResult;
  /** Same-phase ignition-study runs within ±2.5% O2 and ±0.75 psi. */
  nearbyTestCount: number;
  ranked: RankedInvestigation[];
  partialGravity: boolean;
};

export function riskBand(p: number): RiskBand {
  if (p < 0.25) return "low";
  if (p < 0.5) return "moderate";
  if (p < 0.75) return "high";
  return "very-high";
}

export const RISK_LABEL: Record<RiskBand, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  "very-high": "Very high",
};

export function phaseLookup(investigations: readonly Investigation[]) {
  const m = new Map(investigations.map((i) => [i.id, i.fuelPhase] as const));
  return (t: TestRun) => m.get(t.investigationId);
}

/** Runs from ignition studies only (smoke and dust tests are not ignition attempts). */
export function ignitionStudyTests(
  investigations: readonly Investigation[],
  tests: readonly TestRun[]
): TestRun[] {
  const ids = new Set(investigations.filter(isIgnitionStudy).map((i) => i.id));
  return tests.filter((t) => ids.has(t.investigationId));
}

export function assessHabitat(
  inputs: HabitatInputs,
  data: HabitatData,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS
): HabitatAssessment {
  const fuelPhase = MATERIAL_PHASE[inputs.materialClass];
  const flowCmS = AIRFLOW_CM_S[inputs.airflow];
  const point = { o2Percent: inputs.o2Percent, pressurePsi: inputs.pressurePsi };
  const phaseOf = phaseLookup(data.investigations);
  const ignitionProbability = predictIgnitionProbability(data.model, {
    o2Percent: inputs.o2Percent,
    pressurePsi: inputs.pressurePsi,
    flowCmS,
    fuelPhase,
    diluentPercent: null,
  });
  const relevantRuns = ignitionStudyTests(data.investigations, data.tests).filter(
    (t) => phaseOf(t) === fuelPhase
  );
  return {
    inputs,
    fuelPhase,
    flowCmS,
    pO2: oxygenPartialPressure(inputs.o2Percent, inputs.pressurePsi),
    o2IncreasePct: o2IncreaseVsEarth(inputs.o2Percent),
    ignitionProbability,
    riskBand: riskBand(ignitionProbability),
    spread: estimateSpreadRate(data.tests, phaseOf, {
      o2Percent: inputs.o2Percent,
      pressurePsi: inputs.pressurePsi,
      flowCmS,
      fuelPhase,
      materialClass: inputs.materialClass,
      gravity: inputs.gravity,
    }),
    coverage: coverageCheck(point, data.investigations, { fuelPhase }),
    nearbyTestCount: nearbyTests(point, relevantRuns).length,
    ranked: rankInvestigations(data.investigations, {
      o2Percent: inputs.o2Percent,
      pressurePsi: inputs.pressurePsi,
      materialClass: inputs.materialClass,
      airflow: inputs.airflow,
    }, weights),
    partialGravity: inputs.gravity === "lunar" || inputs.gravity === "mars",
  };
}

export type SensitivityPoint = { o2: number; probability: number; earthPressure: number };

/** Predicted ignition probability as O2 sweeps at the chosen pressure (and at 14.7 psi for reference). */
export function sensitivityCurve(
  model: ModelArtifact,
  inputs: HabitatInputs,
  range: { from: number; to: number; step: number } = { from: 15, to: 50, step: 0.5 }
): SensitivityPoint[] {
  const fuelPhase = MATERIAL_PHASE[inputs.materialClass];
  const flowCmS = AIRFLOW_CM_S[inputs.airflow];
  const out: SensitivityPoint[] = [];
  for (let o2 = range.from; o2 <= range.to + 1e-9; o2 += range.step) {
    const base = { o2Percent: o2, flowCmS, fuelPhase, diluentPercent: null };
    out.push({
      o2: Math.round(o2 * 10) / 10,
      probability: predictIgnitionProbability(model, { ...base, pressurePsi: inputs.pressurePsi }),
      earthPressure: predictIgnitionProbability(model, { ...base, pressurePsi: 14.7 }),
    });
  }
  return out;
}

/** Round inputs so near-identical slider positions share an SI cache entry (used by the route and the prewarm script). */
export function normalizeHabitatInputs(inputs: HabitatInputs): HabitatInputs {
  return {
    ...inputs,
    o2Percent: Math.round(inputs.o2Percent * 2) / 2,
    pressurePsi: Math.round(inputs.pressurePsi * 10) / 10,
  };
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
      (s) =>
        Math.abs(s.o2Percent - inputs.o2Percent) < 0.01 &&
        Math.abs(s.pressurePsi - inputs.pressurePsi) < 0.01 &&
        s.gravity === inputs.gravity
    ) ?? null
  );
}

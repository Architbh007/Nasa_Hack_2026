import { AIRFLOW_CM_S, MATERIAL_PHASE } from "@/lib/constants";
import { materialClassForFuel } from "@/lib/materials";
import {
  datasetScales,
  normalizedDistance,
  rangeContains,
  type NormalizationScales,
} from "@/lib/metrics";
import type { Airflow, Investigation, MaterialClass, SafetyPillar } from "@/lib/schema";

/**
 * Transparent relevance ranking of investigations for a habitat condition.
 * Each component is in [0, 1]; the total is the weight-normalized sum, and
 * every component is returned so the UI can show exactly why a record ranks
 * where it does.
 */

export const RANKING_COMPONENTS = [
  "rangeOverlap",
  "fuelPhaseMatch",
  "flowRegimeMatch",
  "safetyPillar",
] as const;
export type RankingComponentKey = (typeof RANKING_COMPONENTS)[number];

export type RankingWeights = Record<RankingComponentKey, number>;

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  rangeOverlap: 0.4,
  fuelPhaseMatch: 0.3,
  flowRegimeMatch: 0.15,
  safetyPillar: 0.15,
};

export const RANKING_LABEL: Record<RankingComponentKey, string> = {
  rangeOverlap: "Range overlap",
  fuelPhaseMatch: "Fuel phase match",
  flowRegimeMatch: "Flow regime match",
  safetyPillar: "Safety pillar weight",
};

export type PillarEmphasis = Record<SafetyPillar, number>;
export const EQUAL_PILLARS: PillarEmphasis = { prevention: 1, detection: 1, suppression: 1 };

export type RankingQuery = {
  o2Percent: number;
  pressurePsi: number;
  materialClass: MaterialClass;
  airflow: Airflow;
  pillarEmphasis?: PillarEmphasis;
};

export type ScoreComponent = {
  key: RankingComponentKey;
  label: string;
  value: number;
  weight: number;
  /** weight * value / sum(weights): the share of the total score this component provides. */
  contribution: number;
  detail: string;
};

export type RankedInvestigation = {
  investigation: Investigation;
  score: number;
  components: ScoreComponent[];
};

/** Decay length for range overlap outside the tested box, in normalized units. */
const RANGE_DECAY = 0.15;

function rangeOverlap(inv: Investigation, q: RankingQuery, scales: NormalizationScales) {
  const point = { o2Percent: q.o2Percent, pressurePsi: q.pressurePsi };
  if (rangeContains(inv, point)) {
    return { value: 1, detail: "Tested O2 and pressure range brackets this atmosphere." };
  }
  const d = normalizedDistance(inv, point, scales);
  return {
    value: Math.exp(-d / RANGE_DECAY),
    detail: `Outside tested range (${inv.oxygenRange.min}-${inv.oxygenRange.max}% O2, ${inv.pressureRange.minPsi}-${inv.pressureRange.maxPsi} psi); normalized distance ${d.toFixed(2)}.`,
  };
}

function fuelPhaseMatch(inv: Investigation, q: RankingQuery) {
  const phase = MATERIAL_PHASE[q.materialClass];
  if (inv.fuelPhase !== phase) {
    return { value: 0.1, detail: `Tests ${inv.fuelPhase} fuels; this material is ${phase}.` };
  }
  const matching = inv.fuels.filter((f) => materialClassForFuel(f) === q.materialClass);
  if (matching.length > 0) {
    return { value: 1, detail: `Same phase, and tests matching material: ${matching.join(", ")}.` };
  }
  return { value: 0.75, detail: `Same fuel phase (${phase}) but different material types.` };
}

function flowRegimeMatch(inv: Investigation, q: RankingQuery) {
  const target = AIRFLOW_CM_S[q.airflow];
  const range = inv.flowRange;
  if (target === null) {
    if (!range) return { value: 1, detail: "Quiescent tests match a quiescent cabin." };
    if (range.min <= 2) return { value: 0.6, detail: `Includes near-quiescent flow (${range.min} cm/s).` };
    return {
      value: 0.6 * Math.exp(-range.min / 10),
      detail: `Forced flow only (${range.min}-${range.max} cm/s); no quiescent runs.`,
    };
  }
  if (!range) {
    return { value: q.airflow === "low" ? 0.5 : 0.15, detail: `Quiescent tests only; cabin flow is ~${target} cm/s.` };
  }
  if (target >= range.min && target <= range.max) {
    return { value: 1, detail: `Tested flow ${range.min}-${range.max} cm/s includes ~${target} cm/s.` };
  }
  const gap = target < range.min ? range.min - target : target - range.max;
  return {
    value: Math.exp(-gap / 10),
    detail: `Tested flow ${range.min}-${range.max} cm/s misses ~${target} cm/s by ${gap.toFixed(1)} cm/s.`,
  };
}

function safetyPillarScore(inv: Investigation, q: RankingQuery) {
  const emphasis = q.pillarEmphasis ?? EQUAL_PILLARS;
  const total = emphasis.prevention + emphasis.detection + emphasis.suppression;
  const got = inv.safetyPillars.reduce((s, p) => s + emphasis[p], 0);
  return {
    value: total === 0 ? 0 : got / total,
    detail: `Covers ${inv.safetyPillars.join(", ")}.`,
  };
}

export function scoreInvestigation(
  inv: Investigation,
  query: RankingQuery,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
  scales?: NormalizationScales
): RankedInvestigation {
  const s = scales ?? datasetScales([inv]);
  const raw: Record<RankingComponentKey, { value: number; detail: string }> = {
    rangeOverlap: rangeOverlap(inv, query, s),
    fuelPhaseMatch: fuelPhaseMatch(inv, query),
    flowRegimeMatch: flowRegimeMatch(inv, query),
    safetyPillar: safetyPillarScore(inv, query),
  };
  const wSum = RANKING_COMPONENTS.reduce((acc, k) => acc + Math.max(0, weights[k]), 0);
  const components = RANKING_COMPONENTS.map((key) => {
    const weight = Math.max(0, weights[key]);
    const value = raw[key].value;
    return {
      key,
      label: RANKING_LABEL[key],
      value,
      weight,
      contribution: wSum === 0 ? 0 : (weight * value) / wSum,
      detail: raw[key].detail,
    };
  });
  return {
    investigation: inv,
    score: components.reduce((acc, c) => acc + c.contribution, 0),
    components,
  };
}

export function rankInvestigations(
  investigations: readonly Investigation[],
  query: RankingQuery,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS
): RankedInvestigation[] {
  const scales = datasetScales(investigations);
  return investigations
    .map((inv) => scoreInvestigation(inv, query, weights, scales))
    .sort((a, b) => b.score - a.score || a.investigation.id.localeCompare(b.investigation.id));
}

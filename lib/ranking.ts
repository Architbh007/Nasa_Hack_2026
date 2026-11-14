import { AIRFLOW_CM_S, CATEGORY_SHORT, DATA_LEVEL_LABEL, MATERIAL_CATEGORY } from "@/lib/constants";
import { formatRange } from "@/lib/format";
import { materialClassForFuel } from "@/lib/materials";
import { datasetScales, normalizedDistance, rangeContains, type NormalizationScales } from "@/lib/metrics";
import type { Airflow, DataLevel, Investigation, MaterialClass } from "@/lib/schema";

/**
 * Transparent relevance ranking of investigations for a habitat condition. Each component is in
 * [0, 1]; the total is the weight-normalized sum, and every component is returned with a plain
 * explanation so the UI can show exactly why a record ranks where it does.
 */

export const RANKING_COMPONENTS = ["rangeOverlap", "categoryMatch", "flowMatch", "evidenceLevel"] as const;
export type RankingComponentKey = (typeof RANKING_COMPONENTS)[number];
export type RankingWeights = Record<RankingComponentKey, number>;

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  rangeOverlap: 0.35,
  categoryMatch: 0.35,
  flowMatch: 0.15,
  evidenceLevel: 0.15,
};

export const RANKING_LABEL: Record<RankingComponentKey, string> = {
  rangeOverlap: "Tested range overlap",
  categoryMatch: "Fuel category match",
  flowMatch: "Airflow match",
  evidenceLevel: "Data detail",
};

export type RankingQuery = {
  o2Percent: number;
  pressurePsi: number;
  materialClass: MaterialClass;
  airflow: Airflow;
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

export type RankedInvestigation = { investigation: Investigation; score: number; components: ScoreComponent[] };

/** Decay length for range overlap outside the tested box, in normalized units. */
const RANGE_DECAY = 0.15;

/** How much a data level can tell you about specific conditions. Runs scale up with the run count. */
export const EVIDENCE_BASE: Record<DataLevel, number> = {
  runs: 0.6,
  "planned-matrix": 0.4,
  "day-summary": 0.4,
  "log-summary": 0.2,
  schedule: 0.2,
  "metadata-only": 0,
};

function rangeOverlap(inv: Investigation, q: RankingQuery, scales: NormalizationScales) {
  const point = { o2Percent: q.o2Percent, pressurePsi: q.pressurePsi };
  const d = normalizedDistance(inv, point, scales);
  if (d === null) {
    return { value: 0, detail: `No run-level O2 and pressure data (${DATA_LEVEL_LABEL[inv.dataLevel].toLowerCase()}).` };
  }
  const o2 = inv.ranges.o2Percent!;
  const p = inv.ranges.pressurePsi!;
  const box = `${formatRange(o2.min, o2.max, "% O2")}, ${formatRange(p.min, p.max, " psi")}${inv.ranges.pressureIncludesAssumed ? " (pressure partly cited nominal)" : ""}`;
  if (rangeContains(inv, point)) return { value: 1, detail: `Tested runs span this atmosphere: ${box}.` };
  return { value: Math.exp(-d / RANGE_DECAY), detail: `Outside the tested runs (${box}); normalized distance ${d.toFixed(2)}.` };
}

function categoryMatch(inv: Investigation, q: RankingQuery) {
  const target = MATERIAL_CATEGORY[q.materialClass];
  if (inv.category !== target) {
    return { value: 0.1, detail: `Studies ${CATEGORY_SHORT[inv.category].toLowerCase()} fuels; this material is ${CATEGORY_SHORT[target].toLowerCase()}.` };
  }
  const matching = inv.fuels.filter((f) => materialClassForFuel(f) === q.materialClass);
  if (matching.length > 0) {
    return { value: 1, detail: `Same category, and tested matching materials: ${matching.slice(0, 4).join(", ")}${matching.length > 4 ? "…" : ""}.` };
  }
  return { value: 0.75, detail: `Same fuel category (${CATEGORY_SHORT[target].toLowerCase()}) but no matching material in its records.` };
}

function flowMatch(inv: Investigation, q: RankingQuery) {
  const target = AIRFLOW_CM_S[q.airflow];
  const range = inv.ranges.flowCmS;
  if (!range) return { value: 0.5, detail: "Airflow not recorded in the source tables." };
  const span = formatRange(range.min, range.max, " cm/s");
  if (target === null) {
    if (range.min <= 2) return { value: 1, detail: `Includes near-quiescent flow (${span}).` };
    return { value: Math.exp(-range.min / 10), detail: `Forced flow only (${span}); no quiescent runs.` };
  }
  if (target >= range.min && target <= range.max) return { value: 1, detail: `Tested flow ${span} includes about ${target} cm/s.` };
  const gap = target < range.min ? range.min - target : target - range.max;
  return { value: Math.exp(-gap / 10), detail: `Tested flow ${span} misses about ${target} cm/s by ${gap.toFixed(1)} cm/s.` };
}

function evidenceLevel(inv: Investigation) {
  const base = EVIDENCE_BASE[inv.dataLevel];
  if (inv.dataLevel !== "runs") return { value: base, detail: `${DATA_LEVEL_LABEL[inv.dataLevel]}; no individual runs.` };
  return {
    value: base + 0.4 * Math.min(1, inv.runCount / 100),
    detail: `${inv.runCount} run-level test${inv.runCount === 1 ? "" : "s"}${inv.dataSource === "published" ? " from a published paper" : " in PSI"}.`,
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
    categoryMatch: categoryMatch(inv, query),
    flowMatch: flowMatch(inv, query),
    evidenceLevel: evidenceLevel(inv),
  };
  const wSum = RANKING_COMPONENTS.reduce((acc, k) => acc + Math.max(0, weights[k]), 0);
  const components = RANKING_COMPONENTS.map((key) => {
    const weight = Math.max(0, weights[key]);
    return {
      key,
      label: RANKING_LABEL[key],
      value: raw[key].value,
      weight,
      contribution: wSum === 0 ? 0 : (weight * raw[key].value) / wSum,
      detail: raw[key].detail,
    };
  });
  return { investigation: inv, score: components.reduce((acc, c) => acc + c.contribution, 0), components };
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

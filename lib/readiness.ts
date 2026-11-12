import { GRAVITY_LABEL, PILLAR_LABEL } from "@/lib/constants";
import { assessHabitat, inputsFromScenario, type HabitatAssessment, type HabitatData } from "@/lib/habitat";
import { datasetScales } from "@/lib/metrics";
import { scoreInvestigation, type RankedInvestigation } from "@/lib/ranking";
import { SAFETY_PILLARS, type Investigation, type SafetyPillar, type Scenario } from "@/lib/schema";

/**
 * Mission readiness for a habitat preset: how well the evidence base covers
 * prevention, detection and suppression at that atmosphere, for cabin fabrics.
 */

export type PillarScore = {
  pillar: SafetyPillar;
  /** 0-100: mean evidence strength of the two best records carrying this pillar. */
  score: number;
  best: RankedInvestigation[];
};

export type ScenarioReadiness = {
  scenario: Scenario;
  assessment: HabitatAssessment;
  pillars: PillarScore[];
  overall: number;
  gaps: string[];
  best: RankedInvestigation[];
};

/** Evidence strength ignores the pillar component: it asks how well a record matches this atmosphere and material. */
const EVIDENCE_WEIGHTS = { rangeOverlap: 0.5, fuelPhaseMatch: 0.35, flowRegimeMatch: 0.15, safetyPillar: 0 };

export function scenarioReadiness(scenario: Scenario, data: HabitatData): ScenarioReadiness {
  const inputs = inputsFromScenario(scenario, "fabric");
  const assessment = assessHabitat(inputs, data);
  const scales = datasetScales(data.investigations);
  const query = { o2Percent: inputs.o2Percent, pressurePsi: inputs.pressurePsi, materialClass: inputs.materialClass, airflow: inputs.airflow };
  const scored = data.investigations
    .map((inv: Investigation) => scoreInvestigation(inv, query, EVIDENCE_WEIGHTS, scales))
    .sort((a, b) => b.score - a.score || a.investigation.id.localeCompare(b.investigation.id));

  const pillars: PillarScore[] = SAFETY_PILLARS.map((pillar) => {
    const withPillar = scored.filter((r) => r.investigation.safetyPillars.includes(pillar));
    const best = withPillar.slice(0, 2);
    const score = best.length === 0 ? 0 : (best.reduce((s, r) => s + r.score, 0) / best.length) * 100;
    return { pillar, score: Math.round(score), best };
  });

  const gaps: string[] = [];
  if (assessment.coverage.gap) {
    gaps.push(`No solid-fuel investigation brackets ${scenario.o2Percent}% O2 at ${scenario.pressurePsi} psi; fabric predictions here are extrapolations.`);
  }
  for (const p of pillars) {
    if (p.score < 40) gaps.push(`Weak ${PILLAR_LABEL[p.pillar].toLowerCase()} evidence at this atmosphere (score ${p.score}/100).`);
  }
  if (scenario.gravity === "lunar" || scenario.gravity === "mars") {
    gaps.push(`No ${GRAVITY_LABEL[scenario.gravity]} combustion data; results are bounded by microgravity and 1 g tests.`);
  }
  if (assessment.nearbyTestCount === 0) {
    gaps.push("No solid-fuel test runs within ±2.5% O2 and ±0.75 psi of this atmosphere.");
  }

  const pillarMean = pillars.reduce((s, p) => s + p.score, 0) / pillars.length;
  const overall = Math.round(pillarMean * (assessment.coverage.gap ? 0.8 : 1));
  return { scenario, assessment, pillars, overall, gaps, best: scored.slice(0, 3) };
}

import { CATEGORY_SHORT, PILLAR_LABEL } from "@/lib/constants";
import {
  assessHabitat,
  FUEL_CATEGORIES,
  inputsFromScenario,
  type CategoryVerdict,
  type FuelCategory,
  type HabitatAssessment,
  type HabitatData,
} from "@/lib/habitat";
import { datasetScales, NEAR_DISTANCE, placeRuns, runDistance } from "@/lib/metrics";
import { scoreInvestigation, type RankedInvestigation } from "@/lib/ranking";
import { SAFETY_PILLARS, type Investigation, type SafetyPillar, type Scenario } from "@/lib/schema";

/**
 * Mission readiness for a habitat preset: which fuel categories real tests cover at that
 * atmosphere, which investigations are the closest evidence, and what is missing. The pillar
 * lists use the team's own pillar assessment and say so.
 */

export type PillarEvidence = {
  pillar: SafetyPillar;
  /** Investigations the team assessed as carrying this pillar, best evidence first. */
  investigations: RankedInvestigation[];
  /** How many of them have run-level data. */
  withRuns: number;
};

/** Counts of real runs by run distance from the scenario, per category (for the readiness chart). */
export type DistanceBand = { band: string; maxDistance: number } & Record<FuelCategory, number>;

export type ScenarioReadiness = {
  scenario: Scenario;
  assessment: HabitatAssessment;
  verdicts: CategoryVerdict[];
  pillars: PillarEvidence[];
  bands: DistanceBand[];
  gaps: string[];
  best: RankedInvestigation[];
};

/** Evidence ranking leans on range overlap: it asks how closely a record's real runs match this atmosphere. */
const EVIDENCE_WEIGHTS = { rangeOverlap: 0.45, categoryMatch: 0.3, flowMatch: 0.1, evidenceLevel: 0.15 };

export const DISTANCE_BANDS: ReadonlyArray<{ band: string; maxDistance: number }> = [
  { band: "Very close (distance ≤ 0.25)", maxDistance: 0.25 },
  { band: `Close (distance ≤ ${NEAR_DISTANCE})`, maxDistance: NEAR_DISTANCE },
  { band: "Farther (≤ 1.5)", maxDistance: 1.5 },
];

export function distanceBands(scenario: Pick<Scenario, "o2Percent" | "pressurePsi">, data: HabitatData): DistanceBand[] {
  const placed = placeRuns(data.runs);
  let previous = -Infinity;
  return DISTANCE_BANDS.map(({ band, maxDistance }) => {
    const row = { band, maxDistance, solid: 0, liquid: 0, gas: 0 } as DistanceBand;
    for (const p of placed) {
      const d = runDistance(p, scenario);
      if (d > previous && d <= maxDistance && (FUEL_CATEGORIES as readonly string[]).includes(p.run.category)) {
        row[p.run.category as FuelCategory] += 1;
      }
    }
    previous = maxDistance;
    return row;
  });
}

export function scenarioReadiness(scenario: Scenario, data: HabitatData): ScenarioReadiness {
  const inputs = inputsFromScenario(scenario, "fabric");
  const assessment = assessHabitat(inputs, data);
  const scales = datasetScales(data.investigations);
  const query = { o2Percent: inputs.o2Percent, pressurePsi: inputs.pressurePsi, materialClass: inputs.materialClass, airflow: inputs.airflow };
  const scored = data.investigations
    .map((inv: Investigation) => scoreInvestigation(inv, query, EVIDENCE_WEIGHTS, scales))
    .sort((a, b) => b.score - a.score || a.investigation.id.localeCompare(b.investigation.id));

  const pillars: PillarEvidence[] = SAFETY_PILLARS.map((pillar) => {
    const investigations = scored.filter((r) => r.investigation.teamAssessment.safetyPillars.includes(pillar));
    return { pillar, investigations, withRuns: investigations.filter((r) => r.investigation.dataLevel === "runs").length };
  });

  const verdicts = FUEL_CATEGORIES.map((c) => assessment.verdicts[c]);
  const gaps: string[] = [];
  for (const v of verdicts) {
    // "no-runs" is already stated by neverTested below.
    if (v.verdict === "untested") gaps.push(`${CATEGORY_SHORT[v.category]}: ${v.reason}`);
  }
  for (const p of pillars) {
    if (p.withRuns === 0) gaps.push(`${PILLAR_LABEL[p.pillar]}: no investigation with run-level data carries this pillar (team assessment).`);
  }
  for (const line of assessment.neverTested) if (!gaps.includes(line)) gaps.push(line);

  return { scenario, assessment, verdicts, pillars, bands: distanceBands(scenario, data), gaps: [...new Set(gaps)], best: scored.slice(0, 3) };
}

import { AIRFLOW_LABEL, CATEGORY_SHORT, GRAVITY_LABEL, MATERIAL_LABEL } from "@/lib/constants";
import { FUEL_CATEGORIES, type HabitatAssessment } from "@/lib/habitat";
import type { NearRun } from "@/lib/metrics";
import type { ScenarioReadiness } from "@/lib/readiness";
import type { Investigation, Run, Summary } from "@/lib/schema";

/**
 * Compact, grounded context objects sent to the model. Everything the SI may cite is in here;
 * nothing else is. Missing values are sent as null and listed under `missingFields` so the SI can
 * say what is not recorded instead of guessing.
 */

const r2 = (v: number) => Math.round(v * 100) / 100;

function stat(values: number[]) {
  if (values.length === 0) return null;
  return { n: values.length, min: r2(Math.min(...values)), max: r2(Math.max(...values)) };
}

/** Aggregate facts about an investigation's runs. Counts only; no rates or predictions. */
export function runStats(runs: readonly Run[]) {
  const outcomes: Record<string, number> = {};
  const outcomeBasis: Record<string, number> = {};
  for (const r of runs) {
    outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1;
    outcomeBasis[r.outcomeBasis] = (outcomeBasis[r.outcomeBasis] ?? 0) + 1;
  }
  const missing = (f: (r: Run) => unknown) => runs.filter((r) => f(r) === null).length;
  return {
    runs: runs.length,
    outcomes,
    outcomeBasis,
    o2Percent: stat(runs.flatMap((r) => (r.o2Percent === null ? [] : [r.o2Percent]))),
    pressurePsi: stat(runs.flatMap((r) => (r.pressurePsi === null ? [] : [r.pressurePsi]))),
    runsMissing: {
      o2Percent: missing((r) => r.o2Percent),
      pressurePsi: missing((r) => r.pressurePsi),
      flowCmS: missing((r) => r.flowMinCmS),
      outcome: runs.filter((r) => r.outcome === "unknown").length,
    },
    pressureAssumedRuns: runs.filter((r) => r.pressureAssumedPsi !== null).length,
  };
}

/** Field names that are empty for this investigation, so the SI can state them as missing. */
function missingFields(inv: Investigation): string[] {
  const out: string[] = [];
  if (inv.dataLevel !== "runs") out.push("run-level test data");
  if (!inv.ranges.o2Percent) out.push("O2 range");
  if (!inv.ranges.pressurePsi) out.push("pressure range");
  if (!inv.ranges.flowCmS) out.push("airflow");
  for (const k of ["objectives", "approach", "hypothesis", "earthBenefits", "startDate", "endDate"] as const) {
    if (!inv[k]) out.push(k);
  }
  return out;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function investigationContext(inv: Investigation, runs: readonly Run[], summaries: readonly Summary[] = []) {
  return {
    id: inv.id,
    accession: inv.accession,
    acronym: inv.acronym,
    name: inv.name,
    platform: inv.platform,
    hardware: inv.hardware.map((h) => h.name),
    dates: { start: inv.startDate || null, end: inv.endDate || null },
    psiSubResearchArea: inv.subResearchArea || null,
    objectives: clip(inv.objectives, 1800),
    approach: clip(inv.approach, 1000),
    earthBenefits: clip(inv.earthBenefits, 900),
    teamCategory: { category: inv.category, basis: inv.categoryBasis },
    teamSafetyPillars: inv.teamAssessment,
    dataLevel: inv.dataLevel,
    fuelsAsWritten: inv.fuels,
    rangesFromRuns: inv.ranges,
    runStatistics: runStats(runs),
    exampleRunIds: runs.slice(0, 5).map((r) => r.id),
    summaries: summaries.map((s) => ({ kind: s.kind, title: s.title, note: s.note })),
    knownIssues: inv.knownIssues,
    missingFields: missingFields(inv),
    dataSource: inv.dataSource,
  };
}

/** Lighter record for lists (ranking, comparison, retrieval). */
export function briefContext(inv: Investigation, runs: readonly Run[]) {
  const s = runStats(runs);
  return {
    id: inv.id,
    accession: inv.accession,
    acronym: inv.acronym,
    name: inv.name,
    hardware: inv.hardware.map((h) => h.name),
    teamCategory: inv.category,
    dataLevel: inv.dataLevel,
    fuelsAsWritten: inv.fuels.slice(0, 8),
    rangesFromRuns: inv.ranges,
    objectivesExcerpt: clip(inv.objectives, 500),
    teamSafetyPillars: inv.teamAssessment.safetyPillars,
    runStatistics: { runs: s.runs, outcomes: s.outcomes, outcomeBasis: s.outcomeBasis, runsMissing: s.runsMissing },
    missingFields: missingFields(inv),
    dataSource: inv.dataSource,
  };
}

/** A real run as the SI sees it: values, outcome with its basis, and where it came from. */
export function runContext(n: Pick<NearRun, "run" | "assumedPressure"> & { distance?: number }) {
  const r = n.run;
  return {
    runId: r.id,
    investigationId: r.investigationId,
    material: r.material,
    o2Percent: r.o2Percent,
    pressurePsi: r.pressurePsi,
    pressureStatus: r.pressureStatus,
    pressurePlacedAtCitedNominal: n.assumedPressure ? r.pressureAssumedPsi : null,
    flowCmS: r.flowMinCmS === null ? null : [r.flowMinCmS, r.flowMaxCmS],
    outcome: r.outcome,
    outcomeBasis: r.outcomeBasis,
    source: `${r.source.file}, ${r.source.ref}`,
    ...(n.distance === undefined ? {} : { runDistance: r2(n.distance) }),
    caveats: r.flags.slice(0, 3),
  };
}

export function habitatContext(a: HabitatAssessment, ranked: Array<{ inv: Investigation; runs: readonly Run[]; score: number }>) {
  return {
    condition: {
      o2Percent: r2(a.inputs.o2Percent),
      pressurePsi: r2(a.inputs.pressurePsi),
      material: MATERIAL_LABEL[a.inputs.materialClass],
      category: a.category,
      airflow: AIRFLOW_LABEL[a.inputs.airflow],
      gravity: GRAVITY_LABEL[a.inputs.gravity],
    },
    metrics: {
      o2PartialPressurePsi: r2(a.pO2.psi),
      o2PartialPressureKPa: r2(a.pO2.kPa),
      o2ConcentrationChangeVsEarthPercent: Math.round(a.o2IncreasePct),
      seaLevelReference: "21% O2 at 14.7 psi, pO2 3.09 psi",
    },
    coverageByCategory: Object.fromEntries(
      FUEL_CATEGORIES.map((c) => {
        const v = a.verdicts[c];
        return [
          c,
          {
            verdict: v.verdict,
            reason: v.reason,
            runsWithinTolerance: v.withinTolerance,
            nearestRuns: v.nearest.slice(0, 4).map(runContext),
          },
        ];
      })
    ),
    neverTested: a.neverTested,
    method:
      "Coverage compares the condition with real run-level tests only. 'Tested' means a same-category run within ±2% O2 and ±1 psi. Nothing here is a prediction.",
    topRanked: ranked.map((r) => ({ relevanceScore: Math.round(r.score * 100), ...briefContext(r.inv, r.runs) })),
  };
}

export function scenarioContext(s: ScenarioReadiness, records: Array<{ inv: Investigation; runs: readonly Run[] }>) {
  return {
    preset: {
      id: s.scenario.id,
      label: s.scenario.label,
      o2Percent: s.scenario.o2Percent,
      pressurePsi: s.scenario.pressurePsi,
      gravity: GRAVITY_LABEL[s.scenario.gravity],
      atmosphereSource: s.scenario.source ? `${s.scenario.source.label}: ${s.scenario.source.detail}` : "citation needed",
    },
    coverageByCategory: s.verdicts.map((v) => ({
      category: CATEGORY_SHORT[v.category],
      verdict: v.verdict,
      reason: v.reason,
      nearestRuns: v.nearest.slice(0, 3).map(runContext),
    })),
    teamPillarEvidence: Object.fromEntries(
      s.pillars.map((p) => [p.pillar, { investigationIds: p.investigations.map((i) => i.investigation.id), withRunData: p.withRuns }])
    ),
    gaps: s.gaps,
    supportingInvestigations: records.map((r) => briefContext(r.inv, r.runs)),
  };
}

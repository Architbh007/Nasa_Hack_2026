import { aiConfig } from "@/lib/ai/client";
import {
  briefContext,
  habitatContext,
  investigationContext,
  scenarioContext,
} from "@/lib/ai/context";
import { SiError } from "@/lib/ai/errors";
import {
  COMPARE_SYSTEM,
  EXPERIMENT_PLAN_SYSTEM,
  FIRE_TWIN_SYSTEM,
  HABITAT_SYSTEM,
  LESSON_SYSTEM,
  LOWER_O2_SYSTEM,
  SCENARIO_SYSTEM,
  SUMMARY_SYSTEM,
} from "@/lib/ai/prompts";
import {
  ComparisonSchema,
  experimentProposalSchema,
  fireTwinNarrationSchema,
  habitatInterpretationSchema,
  lessonSchema,
  lowerOxygenSchema,
  InvestigationSummarySchema,
  ScenarioSummarySchema,
} from "@/lib/ai/schemas";
import { structuredCall } from "@/lib/ai/structured";
import { getDataset } from "@/lib/data";
import { FIRE_EVENTS } from "@/lib/fire-history";
import { EVENT_LABEL, ILLUSTRATIVE, itemLabel, planFire, ROOM_ITEMS } from "@/lib/fire-twin";
import { assessHabitat, type HabitatInputs } from "@/lib/habitat";
import { CREW_BAND, hadFlame, lowerOxygenCheck, MAX_COMPARE_O2, outWhenFlowDropped, SEA_LEVEL_PO2_PSI } from "@/lib/lower-oxygen";
import type { NearRun, PlacedRun } from "@/lib/metrics";
import { ESTIMATE_LABEL, estimateFlame, type FlameEstimate } from "@/lib/flame-estimate";
import { MATERIAL_CATEGORY } from "@/lib/constants";
import type { RankingWeights } from "@/lib/ranking";
import { PLAN_VERDICT_LABEL, planExperiments, type PlanOptions } from "@/lib/planner";
import { scenarioReadiness } from "@/lib/readiness";
import type { Investigation } from "@/lib/schema";

/** SI operations shared by the API routes and the prewarm script. */

function requireInvestigation(id: string): Investigation {
  const inv = getDataset().investigationById.get(id);
  if (!inv) throw new SiError("not_found", `Unknown investigation "${id}".`, 404);
  return inv;
}

const runsOf = (id: string) => getDataset().runsByInvestigation.get(id) ?? [];
const summariesOf = (id: string) => getDataset().summariesByInvestigation.get(id) ?? [];

export function summarizeInvestigation(id: string) {
  const inv = requireInvestigation(id);
  return structuredCall({
    kind: "summary",
    label: `summary:${id}`,
    model: aiConfig().modelMain,
    system: SUMMARY_SYSTEM,
    input: investigationContext(inv, runsOf(id), summariesOf(id)),
    schema: InvestigationSummarySchema,
    effort: "low",
  });
}

export function compareInvestigations(ids: readonly string[]) {
  const unique = [...new Set(ids)].sort();
  if (unique.length < 2 || unique.length > 4) {
    throw new SiError("bad_request", "Select between 2 and 4 investigations to compare.", 400);
  }
  const records = unique.map((id) => briefContext(requireInvestigation(id), runsOf(id)));
  return structuredCall({
    kind: "compare",
    label: `compare:${unique.join(",")}`,
    model: aiConfig().modelMain,
    system: COMPARE_SYSTEM,
    input: { investigations: records },
    schema: ComparisonSchema,
    effort: "low",
  });
}

/** Number of top-ranked records sent with a habitat interpretation. */
export const HABITAT_EVIDENCE_COUNT = 6;

export function interpretHabitat(inputs: HabitatInputs, weights?: RankingWeights) {
  const { investigations, runs } = getDataset();
  // Recompute server-side: the SI only ever sees numbers derived from the dataset.
  const a = assessHabitat(inputs, { investigations, runs }, weights);
  const top = a.ranked.slice(0, HABITAT_EVIDENCE_COUNT).map((r) => ({
    inv: r.investigation,
    runs: runsOf(r.investigation.id),
    score: r.score,
  }));
  const allowed = new Set(top.map((t) => t.inv.id));
  return structuredCall({
    kind: "habitat",
    label: `habitat:${inputs.o2Percent}%/${inputs.pressurePsi}psi/${inputs.materialClass}/${inputs.airflow}/${inputs.gravity}`,
    model: aiConfig().modelMain,
    system: HABITAT_SYSTEM,
    input: habitatContext(a, top, runs),
    schema: habitatInterpretationSchema(allowed),
    effort: "medium",
    maxTokens: 12000,
  });
}

export function summarizeScenario(scenarioId: string) {
  const { scenarios, investigations, runs } = getDataset();
  const scenario = scenarios.find((s) => s.id === scenarioId);
  if (!scenario) throw new SiError("not_found", `Unknown scenario "${scenarioId}".`, 404);
  const readiness = scenarioReadiness(scenario, { investigations, runs });
  const ids = new Set([
    ...readiness.best.map((b) => b.investigation.id),
    ...readiness.verdicts.flatMap((v) => v.nearest.slice(0, 3).map((n) => n.run.investigationId)),
  ]);
  const records = [...ids].map((id) => ({ inv: requireInvestigation(id), runs: runsOf(id) }));
  return structuredCall({
    kind: "scenario",
    label: `scenario:${scenarioId}`,
    model: aiConfig().modelMain,
    system: SCENARIO_SYSTEM,
    input: scenarioContext(readiness, records),
    schema: ScenarioSummarySchema,
    effort: "low",
  });
}

/** Investigations every Fire Twin narration may cite, besides the start item's nearest evidence. */
export const FIRE_TWIN_BASE_IDS = ["bass", "bass-ii", "flex", "same", "same-r", "daft"] as const;

export type FireTwinOptions = { startItemId: string; ventsOn: boolean; crewResponse: boolean };

export function narrateFireTwin(inputs: HabitatInputs, opts: FireTwinOptions) {
  const { runs } = getDataset();
  if (!ROOM_ITEMS.some((i) => i.id === opts.startItemId)) throw new SiError("bad_request", `Unknown item "${opts.startItemId}".`, 400);
  // Recompute server-side so the SI only sees numbers derived from the dataset.
  const plan = planFire(inputs, opts.startItemId, opts, { runs });
  const ids = [...new Set([...plan.evidenceIds, ...FIRE_TWIN_BASE_IDS])];
  return structuredCall({
    kind: "fire-twin",
    label: `fire-twin:${inputs.o2Percent}%/${inputs.pressurePsi}psi/${inputs.airflow}/${inputs.gravity}/${opts.startItemId}/${opts.ventsOn ? "vents" : "still"}/${opts.crewResponse ? "crew" : "nocrew"}`,
    model: aiConfig().modelFast,
    system: FIRE_TWIN_SYSTEM,
    input: {
      atmosphere: { o2Percent: inputs.o2Percent, pressurePsi: inputs.pressurePsi, gravity: inputs.gravity, airflow: inputs.airflow, ventsOn: opts.ventsOn },
      crewResponds: opts.crewResponse,
      fireStartsAt: itemLabel(opts.startItemId),
      items: Object.values(plan.risks).map((r) => ({
        item: r.item.label,
        material: r.item.material,
        noNearbyRunStatesAnOutcome: !r.tested,
        nearestRunsThatStateAnOutcome: r.evidence?.considered ?? 0,
        ofWhichBurned: r.evidence?.burned ?? null,
        ofWhichWentOutOrNeverLit: r.evidence?.wentOut ?? null,
        burnsInSimulation: r.ignites,
        nearestRunIds: r.evidence?.runIds ?? [],
      })),
      timeline: plan.events.map((e) => ({
        atSeconds: Math.round(e.t),
        event: EVENT_LABEL[e.kind],
        item: e.itemId ? itemLabel(e.itemId) : null,
        illustrative: e.illustrative,
      })),
      illustrativeAssumptions: ILLUSTRATIVE,
      records: ids.map((id) => briefContext(requireInvestigation(id), runsOf(id))),
    },
    schema: fireTwinNarrationSchema(new Set(ids)),
    effort: "low",
    maxTokens: 3000,
  });
}

/** Runs (with notes) sent to the lower-oxygen SI. */
export const LOWER_O2_EXAMPLE_COUNT = 6;

export function explainLowerOxygen(inputs: HabitatInputs, fromO2: number, toO2: number) {
  const { runs } = getDataset();
  if (!(toO2 >= 0 && toO2 < fromO2 && fromO2 <= MAX_COMPARE_O2)) {
    throw new SiError("bad_request", `Choose a lowered oxygen below the starting oxygen, both between 0% and ${MAX_COMPARE_O2}%.`, 400);
  }
  const category = MATERIAL_CATEGORY[inputs.materialClass];
  const pressurePsi = inputs.pressurePsi;
  // Recompute server-side so the SI only sees numbers derived from the dataset.
  const before = lowerOxygenCheck({ fromO2, toO2: fromO2, pressurePsi, category }, runs, LOWER_O2_EXAMPLE_COUNT);
  const after = lowerOxygenCheck({ fromO2, toO2, pressurePsi, category }, runs, LOWER_O2_EXAMPLE_COUNT);
  const estimateRuns = [fromO2, toO2].flatMap((o2) => {
    const e = estimateFlame({ o2Percent: o2, pressurePsi }, runs, category);
    return e.kind === "estimate" ? e.topRuns.map((t) => t.run) : [];
  });
  const evidence = [...[before, after].flatMap((c) => [...c.examples, ...c.nearestWithResult, ...c.airflowEvidence]), ...estimateRuns];
  const invIds = [...new Set([...before.runs, ...after.runs, ...evidence].map((p) => p.run.investigationId))].sort();
  const allowed = new Set([...invIds, ...evidence.map((p) => p.run.id)]);
  const clipText = (t: string | null) => (t && t.length > 320 ? `${t.slice(0, 317)}...` : t);
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const runView = (p: PlacedRun) => ({
    runId: p.run.id,
    investigationId: p.run.investigationId,
    material: p.run.material,
    o2Percent: p.o2Percent,
    pressurePsi: p.pressurePsi,
    flowCmS: p.run.flowMinCmS === null ? null : [p.run.flowMinCmS, p.run.flowMaxCmS],
    outcome: p.run.outcome,
    outcomeBasis: p.run.outcomeBasis,
    hadFlame: hadFlame(p.run),
    wentOutWhenAirflowDropped: outWhenFlowDropped(p.run),
    investigatorNotes: clipText(p.run.outcomeText),
    source: `${p.run.source.file}, ${p.run.source.ref}`,
  });
  const pct = (v: number) => Math.round(v * 100);
  const estimateView = (e: FlameEstimate) =>
    e.kind !== "estimate"
      ? { kind: e.kind }
      : {
          kind: e.kind,
          reading: ESTIMATE_LABEL(e.probability, e.low, e.high),
          chanceOfFlamePercent: pct(e.probability),
          range90Percent: [pct(e.low), pct(e.high)],
          confidence: e.confidence,
          effectiveNearbyTests: Math.round(e.evidence * 10) / 10,
          extrapolatingBelowLowestTestedO2: e.extrapolating ? e.lowestTestedO2 : null,
          heaviestRuns: e.topRuns.map((t) => t.run.run.id),
        };
  const awayFrom = (n: NearRun) => ({ ...runView(n), o2PointsAway: r1(n.dO2), psiAway: r1(n.dPsi) });
  const airView = (o2: number, c: typeof after) => ({
    o2Percent: o2,
    pressurePsi,
    crew: {
      o2PartialPressurePsi: Math.round(c.pO2Psi * 100) / 100,
      equivalentAltitudeM: o2 === 0 ? null : Math.round(c.altitudeM / 100) * 100,
      band: CREW_BAND[c.band].label,
    },
    // Only present when real runs sit within ±2% O2 and ±1 psi of this air.
    runsAtThisAir:
      c.runs.length === 0
        ? null
        : {
            total: c.runs.length,
            hadFlame: c.withFlame,
            didNotIgnite: c.noIgnition,
            resultNotStated: c.notStated,
            flameWentOutWhenAirflowDropped: c.flowLinkedOut,
            examples: c.examples.map(runView),
          },
    nearestRunsThatStateAResult: c.nearestWithResult.map(awayFrom),
    flameEstimate: estimateView(estimateFlame({ o2Percent: o2, pressurePsi }, runs, category)),
  });
  return structuredCall({
    kind: "lower-o2",
    label: `lower-o2:${fromO2}->${toO2}%/${pressurePsi}psi/${inputs.materialClass}/${inputs.gravity}`,
    model: aiConfig().modelFast,
    system: LOWER_O2_SYSTEM,
    input: {
      cabin: { gravity: inputs.gravity, airflow: inputs.airflow, material: inputs.materialClass, fuelCategory: category },
      seaLevelO2PartialPressurePsi: Math.round(SEA_LEVEL_PO2_PSI * 100) / 100,
      before: airView(fromO2, before),
      after: airView(toO2, after),
      nearestRunsWhereFlameWentOutWhenAirflowDropped: after.airflowEvidence.map(awayFrom),
      records: invIds.map((id) => briefContext(requireInvestigation(id), runsOf(id))),
    },
    schema: lowerOxygenSchema(allowed),
    effort: "low",
    maxTokens: 3500,
  });
}

export function explainFireEvent(eventId: string) {
  const event = FIRE_EVENTS.find((e) => e.id === eventId);
  if (!event) throw new SiError("not_found", `Unknown event "${eventId}".`, 404);
  const ids = event.relatedInvestigationIds;
  return structuredCall({
    kind: "lesson",
    label: `lesson:${eventId}`,
    model: aiConfig().modelFast,
    system: LESSON_SYSTEM,
    input: {
      event: {
        title: event.title,
        when: event.dateLabel,
        then: event.then,
        atmosphere: event.atmosphere,
        whatWentWrong: event.whatWentWrong,
        now: event.now,
      },
      relatedInvestigations: ids.map((id) => {
        const inv = requireInvestigation(id);
        return { id: inv.id, acronym: inv.acronym, name: inv.name, platform: inv.platform, objectives: inv.objectives };
      }),
    },
    schema: lessonSchema(new Set(ids)),
    effort: "low",
    maxTokens: 1500,
  });
}

/** Write a cited proposal for a test plan. The plan is recomputed here, so the SI sees only dataset-derived numbers. */
export function proposeExperimentPlan(options: PlanOptions) {
  const { runs } = getDataset();
  const plan = planExperiments(runs, options);
  if (plan.tests.length === 0) throw new SiError("bad_request", "This plan has no tests to write up.", 400);
  const invIds = new Set<string>();
  const runIds = new Set<string>();
  for (const t of plan.tests) {
    for (const r of t.buildsOn) {
      invIds.add(r.investigationId);
      runIds.add(r.runId);
    }
    for (const h of t.hardware) {
      invIds.add(h.investigationId);
      runIds.add(h.runId);
    }
    if (t.stepsFrom?.kind === "run") {
      invIds.add(t.stepsFrom.investigationId);
      runIds.add(t.stepsFrom.runId);
    }
  }
  const allowed = new Set([...invIds, ...runIds]);
  const o = plan.options;
  return structuredCall({
    kind: "experiment-plan",
    label: `plan:${o.targets.map((t) => `${t.id}@${t.o2Percent}/${t.pressurePsi}`).join("+")}/${o.scope}/${o.budget}/${o.mode}`,
    model: aiConfig().modelMain,
    system: EXPERIMENT_PLAN_SYSTEM,
    input: {
      material: o.scope === "all-solids" ? "all solid fuels" : o.scope,
      campaignStyle: o.mode === "stepping" ? "stepping stones: each test within near distance of existing or planned evidence" : "direct",
      distanceRule: "10 percentage points of O2 count the same as 3 psi; tested = within ±2% O2 and ±1 psi; near = distance ≤ 0.6",
      targets: plan.targets.map((t) => ({
        id: t.target.id,
        label: t.target.label,
        o2Percent: t.target.o2Percent,
        pressurePsi: t.target.pressurePsi,
        gravity: t.target.gravity,
        verdictBefore: PLAN_VERDICT_LABEL[t.before],
        verdictAfter: PLAN_VERDICT_LABEL[t.after],
        testedAfterTest: t.testedAfterTest,
      })),
      gridCoverage: { before: plan.coverageBefore, after: plan.coverageAfter },
      tests: plan.tests.map((t) => ({
        testNumber: t.index,
        o2Percent: t.o2Percent,
        pressurePsi: t.pressurePsi,
        o2PartialPressurePsi: t.pO2Psi,
        reason: t.reason,
        stepsFrom: t.stepsFrom,
        buildsOnRuns: t.buildsOn,
        nearbyRunsBothBurnedAndWentOut: t.boundary,
        hardwarePrecedent: t.hardware,
        needsPartialGravityPlatform: t.needsPartialGravity,
      })),
      records: [...invIds].sort().map((id) => briefContext(requireInvestigation(id), runsOf(id))),
    },
    schema: experimentProposalSchema(allowed, plan.tests.length),
    effort: "low",
    maxTokens: 6000,
  });
}

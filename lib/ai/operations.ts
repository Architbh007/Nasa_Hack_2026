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
  SCENARIO_SYSTEM,
  SUMMARY_SYSTEM,
} from "@/lib/ai/prompts";
import {
  ComparisonSchema,
  experimentProposalSchema,
  fireTwinNarrationSchema,
  habitatInterpretationSchema,
  lessonSchema,
  InvestigationSummarySchema,
  ScenarioSummarySchema,
} from "@/lib/ai/schemas";
import { structuredCall } from "@/lib/ai/structured";
import { getDataset } from "@/lib/data";
import { FIRE_EVENTS } from "@/lib/fire-history";
import { EVENT_LABEL, ILLUSTRATIVE, itemLabel, planFire, ROOM_ITEMS } from "@/lib/fire-twin";
import { assessHabitat, type HabitatInputs } from "@/lib/habitat";
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
    input: habitatContext(a, top),
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

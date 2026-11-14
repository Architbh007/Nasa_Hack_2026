import { aiConfig } from "@/lib/ai/client";
import {
  briefContext,
  edgeContext,
  habitatContext,
  investigationContext,
  scenarioContext,
} from "@/lib/ai/context";
import { SiError } from "@/lib/ai/errors";
import {
  COMPARE_SYSTEM,
  EDGE_SYSTEM,
  HABITAT_SYSTEM,
  SCENARIO_SYSTEM,
  SUMMARY_SYSTEM,
} from "@/lib/ai/prompts";
import {
  ComparisonSchema,
  EdgeExplanationSchema,
  habitatInterpretationSchema,
  InvestigationSummarySchema,
  ScenarioSummarySchema,
} from "@/lib/ai/schemas";
import { structuredCall } from "@/lib/ai/structured";
import { getDataset } from "@/lib/data";
import { assessHabitat, type HabitatInputs } from "@/lib/habitat";
import type { RankingWeights } from "@/lib/ranking";
import { scenarioReadiness } from "@/lib/readiness";
import type { Investigation } from "@/lib/schema";
import { edgeId, similarity } from "@/lib/similarity";

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

export function explainEdge(source: string, target: string) {
  const a = requireInvestigation(source);
  const b = requireInvestigation(target);
  const [x, y] = a.id < b.id ? [a, b] : [b, a];
  return structuredCall({
    kind: "edge",
    label: `edge:${edgeId(x.id, y.id)}`,
    model: aiConfig().modelFast,
    system: EDGE_SYSTEM,
    input: edgeContext(x, y, similarity(x, y)),
    schema: EdgeExplanationSchema,
    effort: "low",
    maxTokens: 2000,
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

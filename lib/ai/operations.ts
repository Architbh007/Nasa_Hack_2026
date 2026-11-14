import { aiConfig } from "@/lib/ai/client";
import { briefContext, habitatContext, investigationContext } from "@/lib/ai/context";
import { SiError } from "@/lib/ai/errors";
import { COMPARE_SYSTEM, FIRE_TWIN_SYSTEM, HABITAT_SYSTEM, LESSON_SYSTEM, SUMMARY_SYSTEM } from "@/lib/ai/prompts";
import {
  ComparisonSchema,
  fireTwinNarrationSchema,
  habitatInterpretationSchema,
  InvestigationSummarySchema,
  lessonSchema,
} from "@/lib/ai/schemas";
import { structuredCall } from "@/lib/ai/structured";
import { getDataset } from "@/lib/data";
import { FIRE_EVENTS } from "@/lib/fire-history";
import { EVENT_LABEL, ILLUSTRATIVE, itemLabel, planFire, ROOM_ITEMS } from "@/lib/fire-twin";
import { buildFlammabilityGrid, cellAt } from "@/lib/flammability-grid";
import { assessHabitat, type HabitatInputs } from "@/lib/habitat";
import type { RankingWeights } from "@/lib/ranking";
import type { Investigation } from "@/lib/schema";

/** SI operations shared by the API routes and the prewarm script. */

function requireInvestigation(id: string): Investigation {
  const inv = getDataset().investigationById.get(id);
  if (!inv) throw new SiError("not_found", `Unknown investigation "${id}".`, 404);
  return inv;
}

const testsOf = (id: string) => getDataset().testsByInvestigation.get(id) ?? [];

export function summarizeInvestigation(id: string) {
  const inv = requireInvestigation(id);
  return structuredCall({
    kind: "summary",
    label: `summary:${id}`,
    model: aiConfig().modelMain,
    system: SUMMARY_SYSTEM,
    input: investigationContext(inv, testsOf(id)),
    schema: InvestigationSummarySchema,
    effort: "low",
  });
}

export function compareInvestigations(ids: readonly string[]) {
  const unique = [...new Set(ids)].sort();
  if (unique.length < 2 || unique.length > 4) {
    throw new SiError("bad_request", "Select between 2 and 4 investigations to compare.", 400);
  }
  const records = unique.map((id) => briefContext(requireInvestigation(id), testsOf(id)));
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
  const { investigations, tests, model } = getDataset();
  // Recompute server-side: the SI only ever sees numbers derived from the dataset.
  const a = assessHabitat(inputs, { investigations, tests, model }, weights);
  const top = a.ranked.slice(0, HABITAT_EVIDENCE_COUNT).map((r) => ({
    inv: r.investigation,
    tests: testsOf(r.investigation.id),
    score: r.score,
  }));
  const allowed = new Set(top.map((t) => t.inv.id));
  const grid = buildFlammabilityGrid(model, investigations, tests, { materialClass: inputs.materialClass, airflow: inputs.airflow });
  const cell = cellAt(grid, inputs.o2Percent, inputs.pressurePsi);
  const square = cell
    ? { o2RangePercent: [cell.o2Min, cell.o2Max] as [number, number], pressureRangePsi: [cell.pMin, cell.pMax] as [number, number], runsOfThisMaterial: cell.runs.length, ignited: cell.ignited }
    : null;
  return structuredCall({
    kind: "habitat",
    label: `habitat:${inputs.o2Percent}%/${inputs.pressurePsi}psi/${inputs.materialClass}/${inputs.airflow}/${inputs.gravity}`,
    model: aiConfig().modelMain,
    system: HABITAT_SYSTEM,
    input: habitatContext(a, top, { materialIgnitionTested: grid.materialTested, square }),
    schema: habitatInterpretationSchema(allowed),
    effort: "medium",
    maxTokens: 12000,
  });
}

/** Investigations every Fire Twin narration may cite, besides the start item's nearest evidence. */
export const FIRE_TWIN_BASE_IDS = ["bass", "bass-ii", "flex", "same", "same-r", "daft"] as const;

export type FireTwinOptions = { startItemId: string; ventsOn: boolean; crewResponse: boolean };

export function narrateFireTwin(inputs: HabitatInputs, opts: FireTwinOptions) {
  const { investigations, tests, model } = getDataset();
  if (!ROOM_ITEMS.some((i) => i.id === opts.startItemId)) throw new SiError("bad_request", `Unknown item "${opts.startItemId}".`, 400);
  // Recompute server-side so the SI only sees numbers derived from the dataset.
  const plan = planFire(inputs, opts.startItemId, opts, { investigations, tests, model });
  const ids = [...new Set([...plan.evidenceIds, ...FIRE_TWIN_BASE_IDS])];
  const r1 = (v: number) => Math.round(v * 10) / 10;
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
        neverIgnitionTested: !r.tested,
        predictedIgnitionPercent: r.probability === null ? null : Math.round(r.probability * 100),
        ignitesInSimulation: r.ignites,
        flameSpreadMmS: r.spreadMmS === null ? null : r1(r.spreadMmS),
      })),
      timeline: plan.events.map((e) => ({
        atSeconds: Math.round(e.t),
        event: EVENT_LABEL[e.kind],
        item: e.itemId ? itemLabel(e.itemId) : null,
        illustrative: e.illustrative,
      })),
      illustrativeAssumptions: ILLUSTRATIVE,
      records: ids.map((id) => briefContext(requireInvestigation(id), testsOf(id))),
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

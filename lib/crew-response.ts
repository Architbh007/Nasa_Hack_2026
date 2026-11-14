import { z } from "zod";
import codingJson from "@/data/real/crew-response-coding.json";
import type { Run } from "@/lib/schema";

/**
 * Crew response evidence. The first steps of a spacecraft fire response are to stop the
 * ventilation and then use an extinguisher. The BASS as-run notes record what small flames did
 * when the crew turned the airflow down or off, or turned a nitrogen jet on them.
 *
 * The events are hand-coded by the team from those notes (data/real/crew-response-coding.json).
 * Each one keeps the exact words it was coded from. Everything here counts what the notes say;
 * nothing is predicted and no fan setting is converted to a flow speed.
 */

export const ResponseActionSchema = z.enum(["airflow-stopped", "airflow-reduced", "nitrogen", "airflow-increased"]);
export const ResponseResultSchema = z.enum(["went-out", "partly-out", "kept-burning"]);

const CodedEventSchema = z.object({
  runId: z.string().regex(/^[a-z0-9-]+$/),
  action: ResponseActionSchema,
  result: ResponseResultSchema,
  /** Copied word for word from the run's note. */
  quote: z.string().min(1),
  caveat: z.string().min(1).optional(),
});

export const ResponseCodingFileSchema = z.object({
  kind: z.literal("hand-coded-response-events"),
  note: z.string(),
  needsHumanVerification: z.boolean(),
  sourceFile: z.string(),
  rules: z.array(z.string()),
  events: z.array(CodedEventSchema),
});

export type ResponseAction = z.infer<typeof ResponseActionSchema>;
export type ResponseResult = z.infer<typeof ResponseResultSchema>;
export type CodedEvent = z.infer<typeof CodedEventSchema>;
export type ResponseCodingFile = z.infer<typeof ResponseCodingFileSchema>;

/** The run fields the page shows next to a coded event. */
export type ResponseRun = Pick<
  Run,
  "id" | "investigationId" | "material" | "o2Percent" | "o2Text" | "flowMinCmS" | "flowMaxCmS" | "flowText" | "outcome" | "outcomeBasis" | "source"
>;

export type ResponseEvent = CodedEvent & { run: ResponseRun };

export const RESPONSE_ACTIONS: readonly ResponseAction[] = ["airflow-stopped", "airflow-reduced", "nitrogen", "airflow-increased"];
export const RESPONSE_RESULTS: readonly ResponseResult[] = ["went-out", "partly-out", "kept-burning"];

export const RESPONSE_ACTION_LABEL: Record<ResponseAction, string> = {
  "airflow-stopped": "Airflow stopped",
  "airflow-reduced": "Airflow turned down",
  nitrogen: "Nitrogen jet",
  "airflow-increased": "Airflow turned up",
};

export const RESPONSE_ACTION_DETAIL: Record<ResponseAction, string> = {
  "airflow-stopped": "The fan, air or flow was turned off.",
  "airflow-reduced": "The flow was turned down but left on.",
  nitrogen: "A nitrogen jet was turned on the flame.",
  "airflow-increased": "The fan was turned up to try to blow the flame off.",
};

export const RESPONSE_RESULT_LABEL: Record<ResponseResult, string> = {
  "went-out": "Went out",
  "partly-out": "Partly out",
  "kept-burning": "Kept burning",
};

let cachedFile: ResponseCodingFile | null = null;

export function getResponseCoding(): ResponseCodingFile {
  cachedFile ??= ResponseCodingFileSchema.parse(codingJson as unknown);
  return cachedFile;
}

const pickRun = (r: Run): ResponseRun => ({
  id: r.id,
  investigationId: r.investigationId,
  material: r.material,
  o2Percent: r.o2Percent,
  o2Text: r.o2Text,
  flowMinCmS: r.flowMinCmS,
  flowMaxCmS: r.flowMaxCmS,
  flowText: r.flowText,
  outcome: r.outcome,
  outcomeBasis: r.outcomeBasis,
  source: r.source,
});

/** Join the coded events to their runs. A coded run that is missing from the dataset is an error, not a silent skip. */
export function joinResponseEvents(coded: readonly CodedEvent[], runs: readonly Run[]): ResponseEvent[] {
  const byId = new Map(runs.map((r) => [r.id, r]));
  return coded.map((e) => {
    const run = byId.get(e.runId);
    if (!run) throw new Error(`Crew response coding refers to a run that is not in the dataset: ${e.runId}`);
    return { ...e, run: pickRun(run) };
  });
}

export type ResponseTally = {
  action: ResponseAction;
  total: number;
  runs: number;
  counts: Record<ResponseResult, number>;
};

/** Count results per action. `runs` is the number of different runs behind the events. */
export function tallyResponses(events: readonly Pick<CodedEvent, "runId" | "action" | "result">[]): ResponseTally[] {
  return RESPONSE_ACTIONS.map((action) => {
    const mine = events.filter((e) => e.action === action);
    const counts: Record<ResponseResult, number> = { "went-out": 0, "partly-out": 0, "kept-burning": 0 };
    for (const e of mine) counts[e.result] += 1;
    return { action, total: mine.length, runs: new Set(mine.map((e) => e.runId)).size, counts };
  });
}

export type ResponseCoverage = {
  events: number;
  codedRuns: number;
  /** O2 range of the runs that have a coded response event (null when none records O2). */
  o2Range: { min: number; max: number } | null;
  solidRuns: number;
  solidRunsWithFlow: number;
  /** Solid runs at a higher O2 than any coded response event. */
  solidRunsAboveCodedO2: number;
  highestSolidO2: number | null;
};

/** How far the response evidence reaches, and where the solid-fuel runs go beyond it. */
export function responseCoverage(events: readonly ResponseEvent[], runs: readonly Run[]): ResponseCoverage {
  const o2 = events.map((e) => e.run.o2Percent).filter((v): v is number => v !== null);
  const o2Range = o2.length > 0 ? { min: Math.min(...o2), max: Math.max(...o2) } : null;
  const solids = runs.filter((r) => r.category === "solid");
  const solidO2 = solids.map((r) => r.o2Percent).filter((v): v is number => v !== null);
  return {
    events: events.length,
    codedRuns: new Set(events.map((e) => e.runId)).size,
    o2Range,
    solidRuns: solids.length,
    solidRunsWithFlow: solids.filter((r) => r.o2Percent !== null && r.flowMaxCmS !== null).length,
    solidRunsAboveCodedO2: o2Range ? solidO2.filter((v) => v > o2Range.max).length : 0,
    highestSolidO2: solidO2.length > 0 ? Math.max(...solidO2) : null,
  };
}

export type FlowPoint = {
  id: string;
  investigationId: string;
  material: string | null;
  o2Percent: number;
  flowMinCmS: number;
  flowMaxCmS: number;
  outcome: Run["outcome"];
  outcomeBasis: Run["outcomeBasis"];
  sourceRef: string;
};

/** Solid-fuel runs that record both O2 and a flow speed in cm/s. Runs with only free-text flow are left out. */
export function flowMapPoints(runs: readonly Run[]): FlowPoint[] {
  const out: FlowPoint[] = [];
  for (const r of runs) {
    if (r.category !== "solid" || r.o2Percent === null || r.flowMinCmS === null || r.flowMaxCmS === null) continue;
    out.push({
      id: r.id,
      investigationId: r.investigationId,
      material: r.material,
      o2Percent: r.o2Percent,
      flowMinCmS: r.flowMinCmS,
      flowMaxCmS: r.flowMaxCmS,
      outcome: r.outcome,
      outcomeBasis: r.outcomeBasis,
      sourceRef: r.source.ref,
    });
  }
  return out;
}

export type ConsequenceRow = {
  id: string;
  material: string | null;
  o2Percent: number | null;
  pressurePsi: number | null;
  flowMaxCmS: number | null;
  burnDurationS: number;
  co2IncreasePpm: number | null;
  coIncreasePpm: number | null;
  maxTempSfuOutletC: number | null;
};

/** Saffire IV-VI burns with a published burn duration (Table 2 of the Saffire VI paper). Missing cells stay null. */
export function consequenceRows(runs: readonly Run[]): ConsequenceRow[] {
  const out: ConsequenceRow[] = [];
  for (const r of runs) {
    const burn = r.metrics.burnDurationS ?? null;
    if (r.investigationId !== "saffire-iv-vi" || burn === null) continue;
    out.push({
      id: r.id,
      material: r.material,
      o2Percent: r.o2Percent,
      pressurePsi: r.pressurePsi,
      flowMaxCmS: r.flowMaxCmS,
      burnDurationS: burn,
      co2IncreasePpm: r.metrics.co2IncreasePpm ?? null,
      coIncreasePpm: r.metrics.coIncreasePpm ?? null,
      maxTempSfuOutletC: r.metrics.maxTempSfuOutletC ?? null,
    });
  }
  return out;
}

export type ExtinguishedCause = ResponseAction | "not-coded";

export type ExtinguishedBreakdown = {
  /** BASS runs whose recorded outcome is "extinguished". */
  total: number;
  counts: Record<ExtinguishedCause, number>;
};

const CAUSE_ORDER: readonly ResponseAction[] = ["airflow-stopped", "airflow-reduced", "nitrogen", "airflow-increased"];

/**
 * "Extinguished" covers several different endings. For the BASS runs with that outcome, this says
 * which crew action the note ties the flame going out to. A run with more than one such action is
 * counted once, under the first in the order stopped, turned down, nitrogen. Runs with no coded
 * action that put the flame out (fuel ran out, went out with no stated action, or an unclear note)
 * are "not-coded".
 */
export function extinguishedBreakdown(events: readonly Pick<CodedEvent, "runId" | "action" | "result">[], runs: readonly Run[]): ExtinguishedBreakdown {
  const wentOutBy = new Map<string, Set<ResponseAction>>();
  for (const e of events) {
    if (e.result !== "went-out") continue;
    wentOutBy.set(e.runId, (wentOutBy.get(e.runId) ?? new Set<ResponseAction>()).add(e.action));
  }
  const counts: Record<ExtinguishedCause, number> = { "airflow-stopped": 0, "airflow-reduced": 0, nitrogen: 0, "airflow-increased": 0, "not-coded": 0 };
  const extinguished = runs.filter((r) => r.investigationId === "bass" && r.outcome === "extinguished");
  for (const r of extinguished) {
    const actions = wentOutBy.get(r.id);
    const cause = CAUSE_ORDER.find((a) => actions?.has(a)) ?? "not-coded";
    counts[cause] += 1;
  }
  return { total: extinguished.length, counts };
}

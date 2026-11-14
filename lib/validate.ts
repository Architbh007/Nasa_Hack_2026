import { ATM_TO_PSI, KPA_TO_PSI, MMHG_TO_PSI, PSI_TO_KPA } from "@/lib/constants";
import type { RealFiles } from "@/lib/real/build";
import {
  effectivePressurePsi,
  InvestigationsFileSchema,
  RunsFileSchema,
  ScenariosFileSchema,
  SummariesFileSchema,
  type Investigation,
  type Run,
  type Scenario,
  type Summary,
} from "@/lib/schema";

export type ParsedDataset = {
  investigations: Investigation[];
  runs: Run[];
  summaries: Summary[];
  scenarios: Scenario[];
};

export type ValidationReport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: { investigations: number; runs: number; summaries: number; scenarios: number };
  data: ParsedDataset | null;
};

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

function zodIssues(label: string, issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): string[] {
  return issues.slice(0, 25).map((i) => `${label}${i.path.length ? `[${i.path.map(String).join(".")}]` : ""}: ${i.message}`);
}

function rangeOf(values: number[]) {
  return values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
}

function sameRange(a: { min: number; max: number } | null, b: { min: number; max: number } | null) {
  if (a === null || b === null) return a === b;
  return near(a.min, b.min, 1e-9) && near(a.max, b.max, 1e-9);
}

/**
 * Schema plus consistency checks on the built dataset: provenance on every run, outcomes only
 * with a stated basis, investigation ranges equal to what the runs say, and units that agree.
 */
export function validateDataset(raw: {
  investigations: unknown;
  runs: unknown;
  summaries: unknown;
  scenarios: unknown;
}): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const inv = InvestigationsFileSchema.safeParse(raw.investigations);
  const run = RunsFileSchema.safeParse(raw.runs);
  const sum = SummariesFileSchema.safeParse(raw.summaries);
  const scn = ScenariosFileSchema.safeParse(raw.scenarios);
  if (!inv.success) errors.push(...zodIssues("investigations", inv.error.issues));
  if (!run.success) errors.push(...zodIssues("runs", run.error.issues));
  if (!sum.success) errors.push(...zodIssues("summaries", sum.error.issues));
  if (!scn.success) errors.push(...zodIssues("scenarios", scn.error.issues));
  const stats = { investigations: 0, runs: 0, summaries: 0, scenarios: 0 };
  if (!inv.success || !run.success || !sum.success || !scn.success) return { ok: false, errors, warnings, stats, data: null };

  const investigations = inv.data;
  const runs = run.data;
  const summaries = sum.data;
  const scenarios = scn.data;

  const invIds = new Set<string>();
  for (const i of investigations) {
    if (invIds.has(i.id)) errors.push(`Duplicate investigation id ${i.id}`);
    invIds.add(i.id);
    if (i.dataSource === "psi" && !i.accession) errors.push(`${i.id}: PSI investigation without an accession`);
  }

  const runIds = new Set<string>();
  const byInv = new Map<string, Run[]>();
  for (const r of runs) {
    if (runIds.has(r.id)) errors.push(`Duplicate run id ${r.id}`);
    runIds.add(r.id);
    if (!invIds.has(r.investigationId)) errors.push(`Run ${r.id} references unknown investigation ${r.investigationId}`);
    byInv.set(r.investigationId, [...(byInv.get(r.investigationId) ?? []), r]);

    // Provenance and honesty rules.
    if (r.dataSource === "psi" && r.sourceKind !== "psi-table") errors.push(`${r.id}: PSI run must come from a PSI table`);
    if (r.dataSource === "published" && r.sourceKind !== "paper") errors.push(`${r.id}: published run must cite a paper`);
    if ((r.outcome === "unknown") !== (r.outcomeBasis === "none")) {
      errors.push(`${r.id}: outcome '${r.outcome}' with basis '${r.outcomeBasis}' (an outcome needs a basis, and a basis needs an outcome)`);
    }
    if (r.outcomeBasis === "notes-keyword" && !r.outcomeText) errors.push(`${r.id}: outcome read from notes but the notes are missing`);
    if (r.pressureStatus === "not-recorded" && r.pressurePsi !== null) errors.push(`${r.id}: pressure marked not recorded but has a value`);
    if (r.pressureStatus !== "not-recorded" && r.pressurePsi === null) errors.push(`${r.id}: pressure marked ${r.pressureStatus} but missing`);
    if (r.pressureAssumedPsi !== null && (r.pressurePsi !== null || !r.pressureAssumedSource)) {
      errors.push(`${r.id}: an assumed pressure is only allowed when none is recorded, and must cite a source`);
    }
    if (r.pressurePsi !== null && r.pressureKPa !== null && !near(r.pressurePsi * PSI_TO_KPA, r.pressureKPa, 0.2)) {
      errors.push(`${r.id}: ${r.pressurePsi} psi and ${r.pressureKPa} kPa disagree`);
    }
    if (r.flowMinCmS !== null && r.flowMaxCmS !== null && r.flowMinCmS > r.flowMaxCmS) errors.push(`${r.id}: flow min > max`);
    const gas = [r.o2Percent, r.n2Percent, r.co2Percent, r.hePercent];
    if (gas.every((g) => g !== null)) {
      const total = gas.reduce<number>((a, b) => a + (b as number), 0);
      if (!near(total, 100, 1.5)) warnings.push(`${r.id}: gas composition sums to ${total.toFixed(2)}%`);
    }
  }

  for (const s of summaries) {
    if (!invIds.has(s.investigationId)) errors.push(`Summary references unknown investigation ${s.investigationId}`);
  }

  for (const i of investigations) {
    const own = byInv.get(i.id) ?? [];
    if (own.length !== i.runCount) errors.push(`${i.id}: runCount ${i.runCount} but ${own.length} runs`);
    const hasSummary = summaries.some((s) => s.investigationId === i.id);
    const expected = own.length ? "runs" : hasSummary ? summaries.find((s) => s.investigationId === i.id)!.kind : "metadata-only";
    if (i.dataLevel !== expected) errors.push(`${i.id}: dataLevel ${i.dataLevel}, expected ${expected}`);
    // Ranges come from runs only; investigations without runs have no ranges.
    const o2 = rangeOf(own.flatMap((r) => (r.o2Percent === null ? [] : [r.o2Percent])));
    const p = rangeOf(own.flatMap((r) => {
      const v = effectivePressurePsi(r);
      return v === null ? [] : [v];
    }));
    const flow = rangeOf(own.flatMap((r) => [r.flowMinCmS, r.flowMaxCmS].filter((v): v is number => v !== null)));
    if (!sameRange(o2, i.ranges.o2Percent)) errors.push(`${i.id}: O2 range disagrees with its runs`);
    if (!sameRange(p, i.ranges.pressurePsi)) errors.push(`${i.id}: pressure range disagrees with its runs`);
    if (!sameRange(flow, i.ranges.flowCmS)) errors.push(`${i.id}: flow range disagrees with its runs`);
    if (i.teamAssessment.safetyPillars.length && !i.teamAssessment.basis) errors.push(`${i.id}: pillars without a basis`);
  }

  const scenarioIds = new Set<string>();
  for (const s of scenarios) {
    if (scenarioIds.has(s.id)) errors.push(`Duplicate scenario id ${s.id}`);
    scenarioIds.add(s.id);
    if (!s.source) warnings.push(`Scenario ${s.id} has no source (shown as "citation needed")`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: { investigations: investigations.length, runs: runs.length, summaries: summaries.length, scenarios: scenarios.length },
    data: { investigations, runs, summaries, scenarios },
  };
}

/**
 * Checks on the extracted source files themselves: each stored conversion equals the raw value
 * times the published factor (rounded to 2 decimals in the extractors).
 */
export function validateSourceConversions(f: Pick<RealFiles, "bass-tests" | "flex-tests" | "cfi-tests" | "saffire-iv-vi-tests">): string[] {
  const errors: string[] = [];
  const check = (label: string, raw: number | null, stored: number | null, factor: number, tol = 0.011) => {
    if (raw === null || stored === null) {
      if ((raw === null) !== (stored === null)) errors.push(`${label}: one of the raw and converted values is missing`);
      return;
    }
    if (!near(raw * factor, stored, tol)) errors.push(`${label}: ${raw} x ${factor} = ${(raw * factor).toFixed(3)}, stored ${stored}`);
  };
  for (const b of f["bass-tests"]) {
    check(`${b.testId} atm→psi`, b.pressureAtm, b.pressurePsi, ATM_TO_PSI);
    if (b.o2RawCell !== null && b.o2Percent !== null && !near(b.o2RawCell * 100, b.o2Percent, 0.051)) {
      errors.push(`${b.testId}: O2 fraction ${b.o2RawCell} is not ${b.o2Percent}%`);
    }
  }
  for (const x of f["flex-tests"]) {
    if (!x.pressureInvalid) check(`${x.testId} mmHg→psi`, x.pressureMmHg, x.pressurePsi, MMHG_TO_PSI);
  }
  for (const c of f["cfi-tests"]) {
    check(`${c.testId} atm→psi`, c.pressureAtm, c.pressurePsi, ATM_TO_PSI);
    const parts = [c.o2Percent, c.n2Percent, c.hePercent];
    if (c.compositionSumPercent !== null && parts.every((v) => v !== null)) {
      const sum = parts.reduce<number>((a, v) => a + (v as number), 0);
      if (!near(sum, c.compositionSumPercent, 0.051)) errors.push(`${c.testId}: stored composition sum ${c.compositionSumPercent} != ${sum}`);
    }
  }
  for (const s of f["saffire-iv-vi-tests"].samples) {
    check(`${s.sampleId} kPa→psi`, s.pressureKPa, s.pressurePsi, KPA_TO_PSI, 0.051);
  }
  return errors;
}

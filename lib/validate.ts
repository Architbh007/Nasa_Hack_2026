import { computeRanges } from "@/lib/ranges";
import {
  InvestigationsFileSchema,
  ScenariosFileSchema,
  TestsFileSchema,
  type Investigation,
  type Scenario,
  type TestRun,
} from "@/lib/schema";

export type ValidationReport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    investigations: number;
    tests: number;
    scenarios: number;
    testsPerInvestigation: { min: number; max: number };
  };
};

export type ParsedDataset = {
  investigations: Investigation[];
  tests: TestRun[];
  scenarios: Scenario[];
};

const TOL = { o2: 0.051, psi: 0.0051, kPa: 0.051, flow: 0.051 };

function zodIssues(label: string, issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): string[] {
  return issues.slice(0, 25).map((i) => `${label}${i.path.length ? `[${i.path.map(String).join(".")}]` : ""}: ${i.message}`);
}

/**
 * Schema plus cross-file consistency checks. Works on raw JSON so it can guard
 * both generated and real PSI data.
 */
export function validateDataset(raw: {
  investigations: unknown;
  tests: unknown;
  scenarios: unknown;
}): ValidationReport & { data: ParsedDataset | null } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const inv = InvestigationsFileSchema.safeParse(raw.investigations);
  const tst = TestsFileSchema.safeParse(raw.tests);
  const scn = ScenariosFileSchema.safeParse(raw.scenarios);
  if (!inv.success) errors.push(...zodIssues("investigations", inv.error.issues));
  if (!tst.success) errors.push(...zodIssues("tests", tst.error.issues));
  if (!scn.success) errors.push(...zodIssues("scenarios", scn.error.issues));

  const empty = {
    investigations: 0,
    tests: 0,
    scenarios: 0,
    testsPerInvestigation: { min: 0, max: 0 },
  };
  if (!inv.success || !tst.success || !scn.success) {
    return { ok: false, errors, warnings, stats: empty, data: null };
  }

  const investigations = inv.data;
  const tests = tst.data;
  const scenarios = scn.data;

  const ids = new Set<string>();
  for (const i of investigations) {
    if (ids.has(i.id)) errors.push(`Duplicate investigation id ${i.id}`);
    ids.add(i.id);
  }
  const testIds = new Set<string>();
  const byInv = new Map<string, TestRun[]>();
  for (const t of tests) {
    if (testIds.has(t.testId)) errors.push(`Duplicate testId ${t.testId}`);
    testIds.add(t.testId);
    if (!ids.has(t.investigationId)) {
      errors.push(`Test ${t.testId} references unknown investigation ${t.investigationId}`);
      continue;
    }
    const arr = byInv.get(t.investigationId) ?? [];
    arr.push(t);
    byInv.set(t.investigationId, arr);
  }
  const scenarioIds = new Set<string>();
  for (const s of scenarios) {
    if (scenarioIds.has(s.id)) errors.push(`Duplicate scenario id ${s.id}`);
    scenarioIds.add(s.id);
  }

  for (const i of investigations) {
    const runs = byInv.get(i.id) ?? [];
    if (runs.length === 0) {
      warnings.push(`Investigation ${i.id} has no test runs; ranges cannot be checked`);
      continue;
    }
    const c = computeRanges(runs);
    const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
    if (!near(c.oxygenRange.min, i.oxygenRange.min, TOL.o2) || !near(c.oxygenRange.max, i.oxygenRange.max, TOL.o2)) {
      errors.push(`${i.id}: oxygenRange ${i.oxygenRange.min}-${i.oxygenRange.max} disagrees with tests ${c.oxygenRange.min}-${c.oxygenRange.max}`);
    }
    if (!near(c.pressureRange.minPsi, i.pressureRange.minPsi, TOL.psi) || !near(c.pressureRange.maxPsi, i.pressureRange.maxPsi, TOL.psi)) {
      errors.push(`${i.id}: pressureRange ${i.pressureRange.minPsi}-${i.pressureRange.maxPsi} psi disagrees with tests ${c.pressureRange.minPsi}-${c.pressureRange.maxPsi}`);
    }
    if (!near(c.pressureRange.minKPa, i.pressureRange.minKPa, TOL.kPa) || !near(c.pressureRange.maxKPa, i.pressureRange.maxKPa, TOL.kPa)) {
      errors.push(`${i.id}: pressureRange kPa values disagree with psi values`);
    }
    if ((c.flowRange === null) !== (i.flowRange === null)) {
      errors.push(`${i.id}: flowRange is ${i.flowRange === null ? "null" : "set"} but tests are ${c.flowRange === null ? "quiescent" : "flowing"}`);
    } else if (c.flowRange && i.flowRange && (!near(c.flowRange.min, i.flowRange.min, TOL.flow) || !near(c.flowRange.max, i.flowRange.max, TOL.flow))) {
      errors.push(`${i.id}: flowRange ${i.flowRange.min}-${i.flowRange.max} disagrees with tests ${c.flowRange.min}-${c.flowRange.max}`);
    }
    const unknownFuels = [...new Set(runs.map((t) => t.fuel))].filter((f) => !i.fuels.includes(f));
    if (unknownFuels.length) warnings.push(`${i.id}: tests use fuels not listed on the investigation: ${unknownFuels.join(", ")}`);
    const unknownDiluents = [...new Set(runs.map((t) => t.diluent).filter((d): d is string => d !== null))].filter((d) => !i.diluents.includes(d));
    if (unknownDiluents.length) warnings.push(`${i.id}: tests use diluents not listed on the investigation: ${unknownDiluents.join(", ")}`);
  }

  const sources = new Set([
    ...investigations.map((i) => i.dataSource),
    ...tests.map((t) => t.dataSource),
    ...scenarios.map((s) => s.dataSource),
  ]);
  if (sources.size > 1) warnings.push(`Mixed dataSource values: ${[...sources].join(", ")}`);

  const counts = investigations.map((i) => byInv.get(i.id)?.length ?? 0);
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      investigations: investigations.length,
      tests: tests.length,
      scenarios: scenarios.length,
      testsPerInvestigation: { min: Math.min(...counts), max: Math.max(...counts) },
    },
    data: { investigations, tests, scenarios },
  };
}

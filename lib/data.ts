import investigationsJson from "@/data/investigations.json";
import testsJson from "@/data/tests.json";
import scenariosJson from "@/data/scenarios.json";
import modelJson from "@/data/model.json";
import { ModelArtifactSchema, type ModelArtifact } from "@/lib/model";
import {
  InvestigationsFileSchema,
  ScenariosFileSchema,
  TestsFileSchema,
  type FuelPhase,
  type Investigation,
  type Scenario,
  type TestRun,
} from "@/lib/schema";

/**
 * Server-side dataset access. JSON is imported statically (so it is bundled
 * for serverless deploys) and validated once with zod on first use.
 */
export type Dataset = {
  investigations: Investigation[];
  tests: TestRun[];
  scenarios: Scenario[];
  model: ModelArtifact;
  investigationById: Map<string, Investigation>;
  testsByInvestigation: Map<string, TestRun[]>;
  testCounts: Record<string, number>;
  phaseOfTest: (t: TestRun) => FuelPhase | undefined;
};

let cached: Dataset | null = null;

export function getDataset(): Dataset {
  if (cached) return cached;
  const investigations = InvestigationsFileSchema.parse(investigationsJson as unknown);
  const tests = TestsFileSchema.parse(testsJson as unknown);
  const scenarios = ScenariosFileSchema.parse(scenariosJson as unknown);
  const model = ModelArtifactSchema.parse(modelJson as unknown);
  const investigationById = new Map(investigations.map((i) => [i.id, i]));
  const testsByInvestigation = new Map<string, TestRun[]>();
  for (const t of tests) {
    const arr = testsByInvestigation.get(t.investigationId) ?? [];
    arr.push(t);
    testsByInvestigation.set(t.investigationId, arr);
  }
  const testCounts = Object.fromEntries(
    investigations.map((i) => [i.id, testsByInvestigation.get(i.id)?.length ?? 0])
  );
  cached = {
    investigations,
    tests,
    scenarios,
    model,
    investigationById,
    testsByInvestigation,
    testCounts,
    phaseOfTest: (t) => investigationById.get(t.investigationId)?.fuelPhase,
  };
  return cached;
}

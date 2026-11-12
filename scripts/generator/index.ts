import { computeRanges } from "@/lib/ranges";
import type { Investigation, Scenario, TestRun } from "@/lib/schema";
import { DESIGNS } from "./designs";
import { buildKeyFindings } from "./findings";
import { inSyntheticSolidGap, simulateRun } from "./physics";
import { buildHabitatRelevance } from "./relevance";
import { Rng } from "./rng";
import { SCENARIOS } from "./scenarios";

export type GeneratedDataset = {
  investigations: Investigation[];
  tests: TestRun[];
  scenarios: Scenario[];
};

const PSI_PORTAL = "https://psi.nasa.gov";

/**
 * Build the full synthetic dataset from a seed. Each investigation draws from
 * its own seeded stream, so editing one design does not reshuffle the others.
 */
export function generateDataset(seed: number): GeneratedDataset {
  const tests: TestRun[] = [];
  const testsById = new Map<string, TestRun[]>();
  for (const design of DESIGNS) {
    const rng = new Rng(`${seed}:${design.id}`);
    const runs: TestRun[] = [];
    for (let i = 0; i < design.testCount; i++) runs.push(simulateRun(design, rng, i));
    testsById.set(design.id, runs);
    tests.push(...runs);
  }

  const solidIds = new Set(DESIGNS.filter((d) => d.fuelPhase === "solid").map((d) => d.id));
  const gapViolations = tests.filter((t) => solidIds.has(t.investigationId) && inSyntheticSolidGap(t));
  if (gapViolations.length > 0) {
    throw new Error(`Coverage gap violated by ${gapViolations.map((t) => t.testId).join(", ")}`);
  }

  const drafts = DESIGNS.map((d) => {
    const runs = testsById.get(d.id) ?? [];
    const ranges = computeRanges(runs);
    return {
      id: d.id,
      name: d.name,
      acronym: d.acronym,
      project: d.project,
      platform: d.platform,
      hardware: [...d.hardware],
      yearsActive: { ...d.yearsActive },
      fuelPhase: d.fuelPhase,
      fuels: [...d.fuels],
      sampleGeometry: d.sampleGeometry,
      ...ranges,
      diluents: [
        ...new Set(
          d.diluentOptions.map((o) => o.diluent).filter((x): x is string => x !== null)
        ),
      ],
      gravityLevel: d.gravityLevel,
      objectives: [...d.objectives],
      variables: [...d.variables],
      constants: [...d.constants],
      measurements: [...d.measurements],
      keyFindings: buildKeyFindings(d, runs),
      safetyPillars: [...d.safetyPillars],
      earthApplications: [...d.earthApplications],
      sourceUrls: [PSI_PORTAL],
      dataSource: "synthetic" as const,
    };
  });

  const relevance = buildHabitatRelevance(drafts, testsById, SCENARIOS);
  const investigations: Investigation[] = drafts.map((d) => {
    const habitatRelevance = relevance.get(d.id);
    if (!habitatRelevance) throw new Error(`Missing relevance for ${d.id}`);
    // Keep key order stable and readable in the JSON file.
    const { keyFindings, safetyPillars, earthApplications, sourceUrls, dataSource, ...head } = d;
    return {
      ...head,
      keyFindings,
      safetyPillars,
      habitatRelevance,
      earthApplications,
      sourceUrls,
      dataSource,
    };
  });

  return { investigations, tests, scenarios: SCENARIOS.map((s) => ({ ...s })) };
}

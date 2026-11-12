import { HABITAT_LABEL } from "@/lib/constants";
import {
  datasetScales,
  nearbyTests,
  normalizedDistance,
  rangeContains,
  type NormalizationScales,
} from "@/lib/metrics";
import type { HabitatKey, Investigation, Scenario, TestRun } from "@/lib/schema";

type Entry = Investigation["habitatRelevance"][HabitatKey];
type Draft = Omit<Investigation, "habitatRelevance">;

const fmt = (s: Scenario) => `${s.o2Percent}% O2 at ${s.pressurePsi} psi`;

function scoreFor(
  inv: Draft,
  tests: readonly TestRun[],
  scenario: Scenario,
  scales: NormalizationScales
): Entry {
  const parts: string[] = [];
  let score = 0;
  const point = { o2Percent: scenario.o2Percent, pressurePsi: scenario.pressurePsi };

  if (rangeContains(inv, point)) {
    score += 2;
    parts.push(`tested range brackets ${fmt(scenario)}`);
  } else if (normalizedDistance(inv, point, scales) < 0.12) {
    score += 1;
    parts.push(`tested range sits close to ${fmt(scenario)}`);
  } else {
    parts.push(`tested range does not reach ${fmt(scenario)}`);
  }

  if (nearbyTests(point, tests).length >= 5) score += 0.5;

  if (inv.fuelPhase === "solid") {
    score += 1;
    parts.push("solid materials match cabin fabrics, plastics and wiring");
  } else {
    score += 0.5;
    parts.push(inv.fuelPhase === "liquid" ? "liquid fuels apply to stored propellants and fluids" : "gaseous fuels apply to leak scenarios");
  }

  const microHabitat = scenario.gravity === "micro";
  if (microHabitat && inv.gravityLevel === "microgravity") {
    score += 1;
    parts.push("microgravity matches");
  } else if (!microHabitat && inv.gravityLevel === "simulated-partial") {
    score += 1;
    parts.push("simulated partial gravity is the closest available proxy");
  } else if (!microHabitat) {
    score += 0.5;
    parts.push("microgravity data only bounds partial-gravity behavior");
  }

  if (inv.safetyPillars.includes("detection")) score += 0.5;
  if (inv.safetyPillars.includes("suppression")) score += 0.5;

  const label = HABITAT_LABEL[scenario.habitatKey as HabitatKey];
  const rationale = `${label}: ${parts.join("; ")}.`;
  return {
    score: Math.max(0, Math.min(5, Math.round(score))),
    rationale: rationale.charAt(0).toUpperCase() + rationale.slice(1),
  };
}

export function buildHabitatRelevance(
  drafts: readonly Draft[],
  testsById: ReadonlyMap<string, readonly TestRun[]>,
  scenarios: readonly Scenario[]
): Map<string, Investigation["habitatRelevance"]> {
  const scales = datasetScales(drafts);
  const byKey = new Map<HabitatKey, Scenario>();
  for (const s of scenarios) if (s.habitatKey) byKey.set(s.habitatKey, s);
  const get = (k: HabitatKey) => {
    const s = byKey.get(k);
    if (!s) throw new Error(`No scenario with habitatKey ${k}`);
    return s;
  };
  const result = new Map<string, Investigation["habitatRelevance"]>();
  for (const d of drafts) {
    const tests = testsById.get(d.id) ?? [];
    result.set(d.id, {
      iss: scoreFor(d, tests, get("iss"), scales),
      lunarBase: scoreFor(d, tests, get("lunarBase"), scales),
      rover: scoreFor(d, tests, get("rover"), scales),
      marsTransit: scoreFor(d, tests, get("marsTransit"), scales),
    });
  }
  return result;
}

import { describe, expect, it } from "vitest";
import { habitatContext } from "@/lib/ai/context";
import { HABITAT_SYSTEM, PROMPT_VERSION } from "@/lib/ai/prompts";
import { assessHabitat, type HabitatInputs } from "@/lib/habitat";
import { validateDataset } from "@/lib/validate";
import { readBuiltFiles } from "./fixtures";

const { investigations, runs } = validateDataset(readBuiltFiles()).data!;

const context = (inputs: HabitatInputs) => {
  const a = assessHabitat(inputs, { investigations, runs });
  const top = a.ranked.slice(0, 6).map((r) => ({ inv: r.investigation, runs: runs.filter((x) => x.investigationId === r.investigation.id), score: r.score }));
  return habitatContext(a, top, runs);
};

const iss: HabitatInputs = { o2Percent: 21, pressurePsi: 14.7, materialClass: "fabric", airflow: "ventilated", gravity: "micro" };

describe("habitat SI context", () => {
  it("describes the chosen fuel category in full and leaves the other categories at one word", () => {
    const c = context(iss);
    expect(c.chosenFuelCategory.category).toBe("solid");
    expect(c.chosenFuelCategory.nearestRuns.length).toBeGreaterThan(0);
    expect(Object.keys(c.chosenFuelCategory.outcomesOfNearestRuns).length).toBeGreaterThan(0);
    // The closest runs may state no outcome, so the context also carries the closest ones that do.
    const stating = c.chosenFuelCategory.nearestRunsThatStateAnOutcome;
    expect(stating.length).toBeGreaterThan(0);
    expect(stating.every((r) => r.outcome !== "unknown")).toBe(true);
    expect(c.otherFuelCategories.map((o) => o.category).sort()).toEqual(["gas", "liquid"]);
    for (const o of c.otherFuelCategories) expect(Object.keys(o).sort()).toEqual(["category", "verdict"]);
  });

  it("no longer passes 'no data' lines about fuels the user did not choose", () => {
    const c = context(iss);
    expect(c.neverTested.some((t) => /gas-fuel|liquid-fuel/.test(t))).toBe(false);
    expect(JSON.stringify(c)).not.toMatch(/No gas-fuel runs/);
  });

  it("keeps the gap statements that are about the chosen category and gravity", () => {
    const c = context({ ...iss, o2Percent: 34, pressurePsi: 8.2, gravity: "lunar" });
    expect(c.neverTested.some((t) => /solid-fuel/.test(t))).toBe(true);
    expect(c.neverTested.some((t) => /Every run in this dataset/.test(t))).toBe(true);
  });

  it("tells the SI when no run is classified as the chosen material", () => {
    const foam = context({ ...iss, materialClass: "foam" });
    expect(foam.thisMaterial.realRunsClassifiedAsThisMaterial).toBe(0);
    expect(foam.thisMaterial.realRunsOfTheWholeCategory).toBeGreaterThan(0);
    expect(foam.thisMaterial.note).toMatch(/do not claim/);
    const fabric = context(iss);
    expect(fabric.thisMaterial.realRunsClassifiedAsThisMaterial).toBeGreaterThan(0);
  });

  it("asks the SI to lead with the nearest real runs and never to write a bare 'no data'", () => {
    expect(HABITAT_SYSTEM).toMatch(/Open with what the real runs nearest this air recorded/);
    expect(HABITAT_SYSTEM).toMatch(/Never write a bare "no data/);
    expect(PROMPT_VERSION).toBe("2026-11-15.helpful-1");
  });
});

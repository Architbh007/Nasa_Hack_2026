import { describe, expect, it } from "vitest";
import { NEAR_DISTANCE, TESTED_TOLERANCE, placeRuns, runDistance } from "@/lib/metrics";
import { scopeRuns } from "@/lib/flammability-grid";
import { PLAN_LIMITS, coverageCount, planExperiments, targetFromScenario, verdictAt, type PlanTarget } from "@/lib/planner";
import { validateDataset } from "@/lib/validate";
import { makeRun, readBuiltFiles } from "./fixtures";

const { runs, scenarios } = validateDataset(readBuiltFiles()).data!;
const target = (id: string) => targetFromScenario(scenarios.find((s) => s.id === id)!);
const lunar = target("lunar-base");
const mars = target("mars-transit");

describe("planExperiments on the real dataset", () => {
  const plan = planExperiments(runs, { targets: [lunar, mars], scope: "all-solids", budget: 5, mode: "stepping" });

  it("closes the lunar gap for solids with a test at the lunar atmosphere itself", () => {
    const first = plan.tests[0]!;
    expect(first.o2Percent).toBe(34);
    expect(first.pressurePsi).toBe(8.2);
    expect(first.atTargetId).toBe("lunar-base");
    expect(first.stepsFrom).toMatchObject({ kind: "run", runId: "saffire-vi-2" });
    const lunarOutcome = plan.targets.find((t) => t.target.id === "lunar-base")!;
    expect(lunarOutcome.before).toBe("near");
    expect(lunarOutcome.after).toBe("tested");
    expect(lunarOutcome.testedAfterTest).toBe(1);
  });

  it("keeps every stepping-stone test within near distance of existing or planned evidence", () => {
    for (const t of plan.tests) {
      expect(t.stepsFrom).not.toBeNull();
      expect(t.stepsFrom!.distance).toBeLessThanOrEqual(NEAR_DISTANCE + 1e-9);
    }
  });

  it("never proposes a test on ground real runs already cover", () => {
    const placed = placeRuns(scopeRuns("all-solids", runs));
    for (const t of plan.tests) {
      const covered = placed.some(
        (p) => Math.abs(p.o2Percent - t.o2Percent) <= TESTED_TOLERANCE.o2 && Math.abs(p.pressurePsi - t.pressurePsi) <= TESTED_TOLERANCE.psi
      );
      expect(covered).toBe(false);
    }
  });

  it("only grows coverage, and is deterministic", () => {
    expect(plan.coverageAfter.tested + plan.coverageAfter.near).toBeGreaterThan(plan.coverageBefore.tested + plan.coverageBefore.near);
    expect(planExperiments(runs, plan.options)).toEqual(plan);
  });

  it("lists hardware precedent only from recorded pressures near the test pressure", () => {
    const byId = new Map(runs.map((r) => [r.id, r]));
    for (const t of plan.tests) {
      for (const h of t.hardware) {
        expect(byId.get(h.runId)?.pressurePsi).toBe(h.pressurePsi);
        expect(Math.abs(h.pressurePsi - t.pressurePsi)).toBeLessThanOrEqual(0.75);
      }
    }
  });

  it("flags tests that serve lunar or Mars targets as needing partial gravity", () => {
    expect(plan.tests[0]!.needsPartialGravity).toBe(true);
  });

  it("does not spend more tests on a target once it is tested", () => {
    const liquid = planExperiments(runs, { targets: [lunar], scope: "liquid-fuel", budget: 4, mode: "stepping" });
    const done = liquid.targets[0]!.testedAfterTest!;
    expect(done).toBeGreaterThan(0);
    for (const t of liquid.tests.filter((x) => x.index > done)) {
      expect(t.serves.some((s) => s.targetId === "lunar-base")).toBe(false);
    }
  });

  it("direct mode may jump further than stepping mode", () => {
    const direct = planExperiments(runs, { targets: [lunar, mars], scope: "all-solids", budget: 5, mode: "direct" });
    const maxStep = Math.max(...direct.tests.map((t) => t.stepsFrom?.distance ?? 0));
    expect(maxStep).toBeGreaterThan(NEAR_DISTANCE);
  });
});

describe("planExperiments edge cases", () => {
  it("clamps the budget", () => {
    expect(planExperiments(runs, { targets: [lunar], scope: "all-solids", budget: 0, mode: "stepping" }).options.budget).toBe(PLAN_LIMITS.minBudget);
    expect(planExperiments(runs, { targets: [lunar], scope: "all-solids", budget: 50, mode: "stepping" }).options.budget).toBe(PLAN_LIMITS.maxBudget);
  });

  it("starts at a target when the material has no runs at all", () => {
    const plan = planExperiments(runs, { targets: [mars], scope: "gas-leak", budget: 2, mode: "stepping" });
    expect(plan.evidenceRunCount).toBe(0);
    expect(plan.tests[0]).toMatchObject({ o2Percent: mars.o2Percent, pressurePsi: mars.pressurePsi, stepsFrom: null });
    expect(plan.targets[0]!.after).toBe("tested");
  });

  it("flags a boundary when nearby real runs both burned and went out", () => {
    const synthetic = [
      makeRun({ id: "b1", o2Percent: 30, pressurePsi: 10, outcome: "burned" }),
      makeRun({ id: "b2", o2Percent: 31, pressurePsi: 10.4, outcome: "extinguished" }),
    ];
    const t: PlanTarget = { id: "t", label: "Target", o2Percent: 34, pressurePsi: 10, gravity: "micro" };
    const plan = planExperiments(synthetic, { targets: [t], scope: "plastic", budget: 1, mode: "stepping" });
    expect(plan.tests[0]!.boundary).toEqual({ burned: 1, wentOut: 1 });
  });

  it("verdictAt and coverageCount use the habitat thresholds", () => {
    const pts = [{ o2Percent: 21, pressurePsi: 14.7 }];
    expect(verdictAt({ o2Percent: 22.5, pressurePsi: 14 }, pts)).toBe("tested");
    expect(verdictAt({ o2Percent: 25, pressurePsi: 14.7 }, pts)).toBe("near");
    expect(runDistance(pts[0]!, { o2Percent: 40, pressurePsi: 5 })).toBeGreaterThan(NEAR_DISTANCE);
    expect(verdictAt({ o2Percent: 40, pressurePsi: 5 }, pts)).toBe("untested");
    const c = coverageCount(pts);
    expect(c.tested).toBe(1);
    expect(c.tested + c.near + c.untested).toBe(c.total);
  });
});

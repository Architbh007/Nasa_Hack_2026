import { describe, expect, it } from "vitest";
import { fitIgnitionModel } from "@/lib/model";
import { scenarioReadiness } from "@/lib/readiness";
import { generateDataset } from "@/scripts/generator";

const ds = generateDataset(42);
const model = fitIgnitionModel(ds.tests, ds.investigations);
const data = { investigations: ds.investigations, tests: ds.tests, model };
const r = (id: string) => scenarioReadiness(ds.scenarios.find((s) => s.id === id)!, data);

describe("scenario readiness", () => {
  it("rates the ISS cabin above the exploration atmospheres", () => {
    expect(r("iss-cabin").overall).toBeGreaterThan(r("lunar-base").overall);
    expect(r("iss-cabin").overall).toBeGreaterThan(r("pressurized-rover").overall);
  });

  it("flags the deliberate coverage gap for lunar base and rover, not Mars transit", () => {
    expect(r("lunar-base").assessment.coverage.gap).toBe(true);
    expect(r("pressurized-rover").assessment.coverage.gap).toBe(true);
    expect(r("mars-transit").assessment.coverage.gap).toBe(false);
    expect(r("lunar-base").gaps.some((g) => /partial|Lunar/i.test(g))).toBe(true);
  });

  it("keeps pillar scores in 0-100 with supporting records", () => {
    for (const s of ds.scenarios) {
      const x = scenarioReadiness(s, data);
      for (const p of x.pillars) {
        expect(p.score).toBeGreaterThanOrEqual(0);
        expect(p.score).toBeLessThanOrEqual(100);
      }
      expect(x.best).toHaveLength(3);
    }
  });
});

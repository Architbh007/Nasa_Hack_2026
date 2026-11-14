import { describe, expect, it } from "vitest";
import { assessHabitat, inputsFromScenario } from "@/lib/habitat";
import { scenarioReadiness } from "@/lib/readiness";
import { validateDataset } from "@/lib/validate";
import { readBuiltFiles } from "./fixtures";

const { data } = validateDataset(readBuiltFiles());
const ds = data!;
const input = { investigations: ds.investigations, runs: ds.runs };
const r = (id: string) => scenarioReadiness(ds.scenarios.find((s) => s.id === id)!, input);

describe("scenario readiness on the real data", () => {
  it("finds the ISS cabin covered by real solid and liquid runs", () => {
    const v = r("iss-cabin").verdicts;
    expect(v.find((x) => x.category === "solid")?.verdict).toBe("tested");
    expect(v.find((x) => x.category === "liquid")?.verdict).toBe("tested");
  });

  it("finds no solid run at the lunar atmosphere; the nearest is a published Saffire-VI sample", () => {
    const solid = r("lunar-base").verdicts.find((x) => x.category === "solid")!;
    expect(solid.verdict).not.toBe("tested");
    expect(solid.nearest[0]!.run.investigationId).toBe("saffire-iv-vi");
    expect(solid.nearest[0]!.run.dataSource).toBe("published");
    expect(r("lunar-base").gaps.some((g) => /microgravity/.test(g))).toBe(true);
  });

  it("finds Mars transit solids covered only by Saffire-V", () => {
    const solid = r("mars-transit").verdicts.find((x) => x.category === "solid")!;
    expect(solid.verdict).toBe("tested");
    expect(solid.nearest.slice(0, solid.withinTolerance).every((n) => n.run.id.startsWith("saffire-v-"))).toBe(true);
  });

  it("reports gaseous fuels as having no run data anywhere", () => {
    for (const s of ds.scenarios) expect(r(s.id).verdicts.find((x) => x.category === "gas")?.verdict).toBe("no-runs");
  });

  it("never outputs a probability", () => {
    const a = assessHabitat(inputsFromScenario(ds.scenarios[0]!), input);
    expect(JSON.stringify(a)).not.toMatch(/probab/i);
  });
});

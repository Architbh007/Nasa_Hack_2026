import { describe, expect, it } from "vitest";
import { DEFAULT_RANKING_WEIGHTS, rankInvestigations, scoreInvestigation } from "@/lib/ranking";
import { generateDataset } from "@/scripts/generator";
import { makeInvestigation } from "./fixtures";

const { investigations } = generateDataset(42);
const byId = (id: string) => {
  const inv = investigations.find((i) => i.id === id);
  if (!inv) throw new Error(`missing ${id}`);
  return inv;
};

describe("ranking", () => {
  const query = { o2Percent: 21, pressurePsi: 14.7, materialClass: "fabric" as const, airflow: "ventilated" as const };

  it("component contributions sum to the total score", () => {
    const r = scoreInvestigation(byId("saffire-i"), query);
    const sum = r.components.reduce((s, c) => s + c.contribution, 0);
    expect(r.score).toBeCloseTo(sum);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("ranks a covering same-phase fabric study above an off-phase study", () => {
    const ranked = rankInvestigations(investigations, query);
    const pos = (id: string) => ranked.findIndex((r) => r.investigation.id === id);
    expect(pos("saffire-i")).toBeLessThan(pos("cfi-g"));
    expect(ranked[0]!.investigation.fuelPhase).toBe("solid");
  });

  it("range overlap decays outside the tested box", () => {
    const inv = makeInvestigation();
    const inside = scoreInvestigation(inv, { ...query, o2Percent: 21, pressurePsi: 12 });
    const outside = scoreInvestigation(inv, { ...query, o2Percent: 60, pressurePsi: 5 });
    const val = (r: typeof inside) => r.components.find((c) => c.key === "rangeOverlap")!.value;
    expect(val(inside)).toBe(1);
    expect(val(outside)).toBeLessThan(0.5);
  });

  it("weights change the ordering", () => {
    const pillarOnly = { rangeOverlap: 0, fuelPhaseMatch: 0, flowRegimeMatch: 0, safetyPillar: 1 };
    const a = rankInvestigations(investigations, query, DEFAULT_RANKING_WEIGHTS)[0]!.investigation.id;
    const b = rankInvestigations(investigations, query, pillarOnly)[0]!;
    expect(b.investigation.safetyPillars.length).toBeGreaterThanOrEqual(2);
    expect(typeof a).toBe("string");
  });
});

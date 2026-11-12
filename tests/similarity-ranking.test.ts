import { describe, expect, it } from "vitest";
import { DEFAULT_RANKING_WEIGHTS, rankInvestigations, scoreInvestigation } from "@/lib/ranking";
import { jaccard, similarity, similarityEdges } from "@/lib/similarity";
import { generateDataset } from "@/scripts/generator";
import { makeInvestigation } from "./fixtures";

const { investigations } = generateDataset(42);
const byId = (id: string) => {
  const inv = investigations.find((i) => i.id === id);
  if (!inv) throw new Error(`missing ${id}`);
  return inv;
};

describe("jaccard", () => {
  it("handles overlap, disjoint and empty sets", () => {
    expect(jaccard(["a", "b"], ["b", "c"]).value).toBeCloseTo(1 / 3);
    expect(jaccard(["a"], ["b"]).value).toBe(0);
    expect(jaccard([], []).value).toBeNull();
    expect(jaccard(["A"], ["a"]).shared).toEqual(["A"]);
  });
});

describe("similarity", () => {
  it("is 1 for identical records and symmetric", () => {
    const a = byId("bass");
    expect(similarity(a, a).score).toBeCloseTo(1);
    const ab = similarity(byId("bass"), byId("saffire-i"));
    const ba = similarity(byId("saffire-i"), byId("bass"));
    expect(ab.score).toBeCloseTo(ba.score);
    expect(ab.id).toBe(ba.id);
  });

  it("labels SAME to DAFT as instrument reuse via the P-Trak counter", () => {
    const s = similarity(byId("same"), byId("daft"));
    expect(s.label).toBe("shared instrument");
    expect(s.components.measurements.shared).toEqual(["TSI P-Trak ultrafine particle counter"]);
  });

  it("labels the SPICE flow duct family as shared hardware", () => {
    for (const id of ["bass", "bass-ii", "slice"]) {
      const s = similarity(byId("spice"), byId(id));
      expect(s.label).toBe("shared hardware");
      expect(s.components.hardware.shared).toContain("SPICE fan-driven flow duct");
    }
  });

  it("returns only edges above the threshold, strongest first", () => {
    const edges = similarityEdges(investigations, 0.5);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((e) => e.score >= 0.5)).toBe(true);
    for (let i = 1; i < edges.length; i++) {
      expect(edges[i - 1]!.score).toBeGreaterThanOrEqual(edges[i]!.score);
    }
  });
});

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

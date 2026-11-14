import { describe, expect, it } from "vitest";
import { rankInvestigations, scoreInvestigation } from "@/lib/ranking";
import type { Investigation } from "@/lib/schema";
import { jaccard, similarity, similarityEdges } from "@/lib/similarity";
import { validateDataset } from "@/lib/validate";
import { makeInvestigation, readBuiltFiles } from "./fixtures";

const investigations = validateDataset(readBuiltFiles()).data!.investigations;
const byId = (id: string): Investigation => {
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

describe("similarity on the real PSI records", () => {
  it("is 1 for identical records and symmetric", () => {
    expect(similarity(byId("bass"), byId("bass")).score).toBeCloseTo(1);
    const ab = similarity(byId("bass"), byId("saffire-i"));
    const ba = similarity(byId("saffire-i"), byId("bass"));
    expect(ab.score).toBeCloseTo(ba.score);
    expect(ab.id).toBe(ba.id);
  });

  it("labels links that PSI itself lists as related", () => {
    expect(similarity(byId("daft"), byId("same")).label).toBe("PSI-listed relation");
    expect(similarity(byId("bass"), byId("bass-ii")).label).toBe("PSI-listed relation");
    expect(similarity(byId("slice"), byId("spice")).label).toBe("PSI-listed relation");
  });

  it("links the ACME investigations through their shared CIR/ACME hardware", () => {
    const s = similarity(byId("cld-flame"), byId("s-flame"));
    expect(s.label).toBe("shared hardware");
    expect(s.components.hardware.shared).toEqual(expect.arrayContaining(["CIR", "ACME"]));
  });

  it("returns only edges above the threshold, strongest first", () => {
    const edges = similarityEdges(investigations, 0.5);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((e) => e.score >= 0.5)).toBe(true);
    for (let i = 1; i < edges.length; i++) expect(edges[i - 1]!.score).toBeGreaterThanOrEqual(edges[i]!.score);
  });
});

describe("ranking", () => {
  const query = { o2Percent: 21, pressurePsi: 14.7, materialClass: "fabric" as const, airflow: "ventilated" as const };

  it("component contributions sum to the total score", () => {
    const r = scoreInvestigation(byId("bass"), query);
    expect(r.score).toBeCloseTo(r.components.reduce((s, c) => s + c.contribution, 0));
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it("ranks solid studies with real runs at cabin air above description-only records", () => {
    const ranked = rankInvestigations(investigations, query);
    const pos = (id: string) => ranked.findIndex((r) => r.investigation.id === id);
    expect(ranked[0]!.investigation.category).toBe("solid");
    expect(pos("bass")).toBeLessThan(pos("same"));
    expect(pos("bass-ii")).toBeLessThan(pos("cfi-g"));
  });

  it("gives no range credit to an investigation without runs", () => {
    const r = scoreInvestigation(byId("cfi-g"), query);
    expect(r.components.find((c) => c.key === "rangeOverlap")!.value).toBe(0);
    expect(r.components.find((c) => c.key === "evidenceLevel")!.value).toBe(0);
  });

  it("range overlap decays outside the tested runs", () => {
    const inv = makeInvestigation();
    const val = (o2: number, p: number) => scoreInvestigation(inv, { ...query, o2Percent: o2, pressurePsi: p }).components.find((c) => c.key === "rangeOverlap")!.value;
    expect(val(21, 12)).toBe(1);
    expect(val(60, 5)).toBeLessThan(0.5);
  });

  it("weights change the ordering", () => {
    const evidenceOnly = { rangeOverlap: 0, categoryMatch: 0, flowMatch: 0, evidenceLevel: 1 };
    const ranked = rankInvestigations(investigations, query, evidenceOnly);
    // Run tables with 100+ runs score 1; description-only records score 0 and sink to the bottom.
    expect(ranked[0]!.investigation.runCount).toBeGreaterThanOrEqual(100);
    expect(ranked.at(-1)!.investigation.dataLevel).toBe("metadata-only");
    expect(rankInvestigations(investigations, query)[0]!.investigation.category).toBe("solid");
  });
});

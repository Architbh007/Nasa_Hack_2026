import { describe, expect, it } from "vitest";
import { categoryVerdict, neverTestedStatements } from "@/lib/habitat";
import {
  coverageCheck,
  datasetScales,
  nearestRuns,
  normalizedDistance,
  o2IncreaseVsEarth,
  oxygenPartialPressure,
  placeRun,
  rangeContains,
  runDistance,
} from "@/lib/metrics";
import { makeInvestigation, makeRun } from "./fixtures";

describe("oxygenPartialPressure", () => {
  it("computes sea-level pO2 in psi and kPa", () => {
    const p = oxygenPartialPressure(21, 14.7);
    expect(p.psi).toBeCloseTo(3.087, 3);
    expect(p.kPa).toBeCloseTo(21.28, 1);
  });

  it("shows the lunar exploration atmosphere has lower pO2 than sea level", () => {
    expect(oxygenPartialPressure(34, 8.2).psi).toBeLessThan(oxygenPartialPressure(21, 14.7).psi);
    expect(o2IncreaseVsEarth(34)).toBeCloseTo(61.9, 1);
  });
});

describe("investigation envelopes", () => {
  const inv = makeInvestigation();
  const empty = makeInvestigation({ id: "empty", dataLevel: "metadata-only", runCount: 0, ranges: { o2Percent: null, pressurePsi: null, pressureIncludesAssumed: false, flowCmS: null } });

  it("contains points inside the run range only", () => {
    expect(rangeContains(inv, { o2Percent: 21, pressurePsi: 12 })).toBe(true);
    expect(rangeContains(inv, { o2Percent: 30, pressurePsi: 12 })).toBe(false);
    expect(rangeContains(empty, { o2Percent: 21, pressurePsi: 12 })).toBe(false);
  });

  it("has no distance for an investigation without runs", () => {
    const scales = datasetScales([inv, empty]);
    expect(normalizedDistance(inv, { o2Percent: 21, pressurePsi: 12 }, scales)).toBe(0);
    expect(normalizedDistance(empty, { o2Percent: 21, pressurePsi: 12 }, scales)).toBeNull();
  });

  it("coverage ignores investigations without runs and other categories", () => {
    const liquid = makeInvestigation({ id: "liq", category: "liquid" });
    const c = coverageCheck({ o2Percent: 21, pressurePsi: 12 }, [inv, empty, liquid], { category: "solid" });
    expect(c.covering.map((i) => i.id)).toEqual(["test-inv"]);
    expect(c.coveringOtherCategories.map((i) => i.id)).toEqual(["liq"]);
    expect(c.nearest.map((n) => n.investigation.id)).toEqual(["test-inv"]);
  });
});

describe("run placement and nearest runs", () => {
  const measured = makeRun({ id: "a", o2Percent: 22, pressurePsi: 14.5 });
  const assumed = makeRun({ id: "b", o2Percent: 21, pressurePsi: null, pressureStatus: "not-recorded", pressureAssumedPsi: 14.7, pressureAssumedSource: "nasa.gov" });
  const noO2 = makeRun({ id: "c", o2Percent: null });
  const lowP = makeRun({ id: "d", o2Percent: 31, pressurePsi: 7.85, pressureStatus: "paper" });

  it("places a run at its measured pressure, or at the cited nominal (flagged), and never without O2", () => {
    expect(placeRun(measured)).toMatchObject({ pressurePsi: 14.5, assumedPressure: false });
    expect(placeRun(assumed)).toMatchObject({ pressurePsi: 14.7, assumedPressure: true });
    expect(placeRun(noO2)).toBeNull();
  });

  it("scales 10 points of O2 like 3 psi", () => {
    expect(runDistance({ o2Percent: 31, pressurePsi: 8 }, { o2Percent: 21, pressurePsi: 8 })).toBeCloseTo(1);
    expect(runDistance({ o2Percent: 21, pressurePsi: 11 }, { o2Percent: 21, pressurePsi: 8 })).toBeCloseTo(1);
  });

  it("ranks the closest real runs first", () => {
    const near = nearestRuns({ o2Percent: 34, pressurePsi: 8.2 }, [measured, assumed, noO2, lowP]);
    expect(near.map((n) => n.run.id)).toEqual(["d", "a", "b"]);
    expect(near[0]!.dO2).toBeCloseTo(-3);
  });
});

describe("coverage verdicts", () => {
  const runs = [
    makeRun({ id: "s1", o2Percent: 21, pressurePsi: 14.5 }),
    makeRun({ id: "s2", o2Percent: 31, pressurePsi: 7.85 }),
    makeRun({ id: "l1", category: "liquid", o2Percent: 34, pressurePsi: 10.3 }),
  ];

  it("is tested within ±2% O2 and ±1 psi, near within distance 0.6, otherwise not tested", () => {
    expect(categoryVerdict({ o2Percent: 21, pressurePsi: 14.7 }, runs, "solid").verdict).toBe("tested");
    expect(categoryVerdict({ o2Percent: 34, pressurePsi: 8.2 }, runs, "solid").verdict).toBe("near");
    expect(categoryVerdict({ o2Percent: 100, pressurePsi: 4.3 }, runs, "solid").verdict).toBe("untested");
    expect(categoryVerdict({ o2Percent: 21, pressurePsi: 14.7 }, runs, "gas").verdict).toBe("no-runs");
  });

  it("says when a tested verdict rests only on the cited nominal pressure", () => {
    const only = [makeRun({ id: "x", o2Percent: 21, pressurePsi: null, pressureStatus: "not-recorded", pressureAssumedPsi: 14.7, pressureAssumedSource: "nasa.gov" })];
    const v = categoryVerdict({ o2Percent: 21, pressurePsi: 14.7 }, only, "solid");
    expect(v.verdict).toBe("tested");
    expect(v.onlyAssumedPressure).toBe(true);
    expect(v.reason).toMatch(/no recorded pressure/);
  });

  it("lists what was never tested", () => {
    const lines = neverTestedStatements({ o2Percent: 40, pressurePsi: 5 }, runs, "lunar");
    expect(lines).toContain("No solid-fuel run at 40% O2 or higher (highest: 31%).");
    expect(lines).toContain("No solid-fuel run at 5 psi or lower (lowest: 7.85 psi).");
    expect(lines.some((l) => /No gas-fuel runs/.test(l))).toBe(true);
    expect(lines.some((l) => /microgravity/.test(l))).toBe(true);
  });
});

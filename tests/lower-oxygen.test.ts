import { describe, expect, it } from "vitest";
import { crewBand, equivalentAltitudeM, hadFlame, lowerOxygenCheck, outWhenFlowDropped, SEA_LEVEL_PO2_PSI } from "@/lib/lower-oxygen";
import { validateDataset } from "@/lib/validate";
import { makeRun, readBuiltFiles } from "./fixtures";

const { runs } = validateDataset(readBuiltFiles()).data!;

describe("equivalent altitude", () => {
  it("is zero at or above sea-level oxygen", () => {
    expect(equivalentAltitudeM(SEA_LEVEL_PO2_PSI)).toBe(0);
    expect(equivalentAltitudeM(5)).toBe(0);
  });

  it("matches the standard atmosphere roughly", () => {
    // 17% at 14.7 psi is about 1.7 km; 17% at 8.2 psi is above 6 km.
    expect(equivalentAltitudeM(0.17 * 14.7)).toBeGreaterThan(1500);
    expect(equivalentAltitudeM(0.17 * 14.7)).toBeLessThan(2000);
    expect(equivalentAltitudeM(0.17 * 8.2)).toBeGreaterThan(6000);
    expect(crewBand(equivalentAltitudeM(0.17 * 8.2))).toBe("danger");
    expect(crewBand(equivalentAltitudeM(0.21 * 14.7))).toBe("fine");
    expect(crewBand(equivalentAltitudeM(0))).toBe("danger");
  });
});

describe("flame reading", () => {
  it("counts recorded flames and reads notes for unstated outcomes", () => {
    expect(hadFlame(makeRun({ outcome: "extinguished" }))).toBe(true);
    expect(hadFlame(makeRun({ outcome: "no-ignition" }))).toBe(false);
    expect(hadFlame(makeRun({ outcome: "unknown", outcomeText: "nice ignition, blue flame" }))).toBe(true);
    expect(hadFlame(makeRun({ outcome: "unknown", outcomeText: "did not ignite" }))).toBe(false);
    expect(hadFlame(makeRun({ outcome: "unknown", outcomeText: null }))).toBe(false);
  });

  it("links extinction to airflow only from the notes", () => {
    expect(outWhenFlowDropped(makeRun({ outcome: "extinguished", outcomeText: "Extinguished when flow off." }))).toBe(true);
    expect(outWhenFlowDropped(makeRun({ outcome: "extinguished", outcomeText: "burned out fuel" }))).toBe(false);
    expect(outWhenFlowDropped(makeRun({ outcome: "burned", outcomeText: "fan off" }))).toBe(false);
  });
});

describe("lowering all the way to 0% O2", () => {
  it("finds no runs and flags the crew air as dangerous", () => {
    const zero = lowerOxygenCheck({ fromO2: 21, toO2: 0, pressurePsi: 14.7, category: "solid" }, runs);
    expect(zero.pO2Psi).toBe(0);
    expect(zero.band).toBe("danger");
    expect(zero.runs.length + zero.withFlame).toBe(0);
  });
});

describe("lowering an ISS cabin to 17% O2", () => {
  const check = lowerOxygenCheck({ fromO2: 21, toO2: 17, pressurePsi: 14.7, category: "solid" }, runs);

  it("finds the real BASS runs where solids still burned", () => {
    expect(check.runs.length).toBeGreaterThan(0);
    expect(check.withFlame).toBeGreaterThan(0);
    expect(check.runs.every((p) => p.run.category === "solid")).toBe(true);
  });

  it("surfaces flames that went out when airflow dropped, first", () => {
    expect(check.flowLinkedOut).toBeGreaterThan(0);
    expect(outWhenFlowDropped(check.examples[0]!.run)).toBe(true);
  });

  it("keeps the counts consistent", () => {
    expect(check.withFlame + check.noIgnition + check.notStated).toBe(check.runs.length);
    expect(check.outcomeCounts.reduce((s, c) => s + c.count, 0)).toBe(check.runs.length);
  });
});

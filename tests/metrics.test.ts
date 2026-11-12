import { describe, expect, it } from "vitest";
import {
  coverageCheck,
  isIgnitionStudy,
  normalizedDistance,
  o2IncreaseVsEarth,
  oxygenPartialPressure,
  rangeContains,
} from "@/lib/metrics";
import { makeInvestigation } from "./fixtures";

describe("oxygenPartialPressure", () => {
  it("computes sea-level pO2 in psi and kPa", () => {
    const p = oxygenPartialPressure(21, 14.7);
    expect(p.psi).toBeCloseTo(3.087, 3);
    expect(p.kPa).toBeCloseTo(21.28, 1);
  });

  it("shows the lunar exploration atmosphere has lower pO2 than sea level", () => {
    expect(oxygenPartialPressure(34, 8.2).psi).toBeLessThan(oxygenPartialPressure(21, 14.7).psi);
  });
});

describe("o2IncreaseVsEarth", () => {
  it("is zero at 21% and relative above it", () => {
    expect(o2IncreaseVsEarth(21)).toBe(0);
    expect(o2IncreaseVsEarth(34)).toBeCloseTo(61.9, 1);
    expect(o2IncreaseVsEarth(100)).toBeCloseTo(376.2, 1);
  });
});

describe("coverage", () => {
  const solidLow = makeInvestigation({ id: "a", oxygenRange: { min: 16, max: 28 } });
  const solidHigh = makeInvestigation({
    id: "b",
    oxygenRange: { min: 20, max: 45 },
    pressureRange: { minPsi: 10.6, maxPsi: 14.7, minKPa: 73.1, maxKPa: 101.4 },
  });
  const gas = makeInvestigation({
    id: "g",
    fuelPhase: "gas",
    oxygenRange: { min: 15, max: 50 },
    pressureRange: { minPsi: 7, maxPsi: 14.7, minKPa: 48.3, maxKPa: 101.4 },
  });
  const all = [solidLow, solidHigh, gas];

  it("rangeContains respects both axes", () => {
    expect(rangeContains(solidHigh, { o2Percent: 30, pressurePsi: 12 })).toBe(true);
    expect(rangeContains(solidHigh, { o2Percent: 30, pressurePsi: 10.2 })).toBe(false);
  });

  it("flags a gap when no same-phase investigation covers the point", () => {
    const lunar = coverageCheck({ o2Percent: 34, pressurePsi: 8.2 }, all, { fuelPhase: "solid" });
    expect(lunar.gap).toBe(true);
    expect(lunar.covering).toHaveLength(0);
    expect(lunar.coveringOtherPhases.map((i) => i.id)).toEqual(["g"]);
    expect(lunar.nearest[0]?.distance).toBeGreaterThan(0);
  });

  it("returns covering investigations and zero distance when covered", () => {
    const iss = coverageCheck({ o2Percent: 21, pressurePsi: 14.7 }, all, { fuelPhase: "solid" });
    expect(iss.gap).toBe(false);
    expect(iss.covering.map((i) => i.id).sort()).toEqual(["a", "b"]);
    expect(iss.nearest[0]?.distance).toBe(0);
  });

  it("normalized distance grows with separation", () => {
    const scales = { o2Span: 70, pressureSpan: 10 };
    const near = normalizedDistance(solidLow, { o2Percent: 30, pressurePsi: 12 }, scales);
    const far = normalizedDistance(solidLow, { o2Percent: 60, pressurePsi: 4 }, scales);
    expect(near).toBeGreaterThan(0);
    expect(far).toBeGreaterThan(near);
  });

  it("treats detection-only investigations as non-ignition studies", () => {
    expect(isIgnitionStudy({ safetyPillars: ["detection"] })).toBe(false);
    expect(isIgnitionStudy({ safetyPillars: ["prevention", "detection"] })).toBe(true);
  });
});

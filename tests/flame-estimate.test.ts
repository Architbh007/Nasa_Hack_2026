import { describe, expect, it } from "vitest";
import { betaCdf, betaQuantile, ESTIMATE_LABEL, estimateFlame, flameLabel } from "@/lib/flame-estimate";
import { validateDataset } from "@/lib/validate";
import { makeRun, readBuiltFiles } from "./fixtures";

const { runs } = validateDataset(readBuiltFiles()).data!;

describe("beta helpers", () => {
  it("matches known values", () => {
    expect(betaCdf(0.5, 1, 1)).toBeCloseTo(0.5, 6);
    expect(betaCdf(0.5, 2, 2)).toBeCloseTo(0.5, 6);
    expect(betaCdf(0.3, 2, 5)).toBeCloseTo(0.579825, 4);
    expect(betaQuantile(0.95, 1, 1)).toBeCloseTo(0.95, 6);
  });
});

describe("labels", () => {
  it("uses only stated results", () => {
    expect(flameLabel(makeRun({ outcome: "no-ignition" }))).toBe(0);
    expect(flameLabel(makeRun({ outcome: "extinguished" }))).toBe(1);
    expect(flameLabel(makeRun({ outcome: "unknown", outcomeText: null }))).toBeNull();
  });
});

describe("flame estimate on the real data", () => {
  it("is confident near the BASS tests at 17% on the ISS", () => {
    const e = estimateFlame({ o2Percent: 17, pressurePsi: 14.7 }, runs, "solid");
    expect(e.kind).toBe("estimate");
    if (e.kind !== "estimate") return;
    expect(e.probability).toBeGreaterThan(0.8);
    expect(e.confidence).toBe("high");
    expect(e.low).toBeLessThan(e.probability);
    expect(e.high).toBeGreaterThan(e.probability);
    expect(e.extrapolating).toBe(false);
  });

  it("loses confidence and flags extrapolation far below the tests", () => {
    const near = estimateFlame({ o2Percent: 17, pressurePsi: 14.7 }, runs, "solid");
    const far = estimateFlame({ o2Percent: 8, pressurePsi: 14.7 }, runs, "solid");
    if (near.kind !== "estimate") throw new Error("expected estimate");
    if (far.kind === "estimate") {
      expect(far.evidence).toBeLessThan(near.evidence);
      expect(far.extrapolating).toBe(true);
      expect(far.high - far.low).toBeGreaterThan(near.high - near.low);
    } else {
      expect(far.kind).toBe("too-far");
    }
  });

  it("never burns at 0% and declines very far away", () => {
    expect(estimateFlame({ o2Percent: 0, pressurePsi: 14.7 }, runs, "solid").kind).toBe("no-oxygen");
    const far = estimateFlame({ o2Percent: 1, pressurePsi: 3 }, runs, "solid");
    if (far.kind === "estimate") expect(ESTIMATE_LABEL(far.probability, far.low, far.high)).toBe("Can't tell from the data");
    else expect(far.kind).toBe("too-far");
  });
});

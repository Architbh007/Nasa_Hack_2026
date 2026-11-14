import { describe, expect, it } from "vitest";
import {
  coefficientTable,
  estimateSpreadRate,
  featurize,
  fitIgnitionModel,
  isHoldout,
  predictIgnitionProbability,
  trainLogistic,
} from "@/lib/model";
import type { TestRun } from "@/lib/schema";
import { generateDataset } from "@/scripts/generator";

const dataset = generateDataset(42);
const model = fitIgnitionModel(dataset.tests, dataset.investigations);

describe("trainLogistic", () => {
  it("separates a linearly separable toy problem", () => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = -20; i <= 20; i++) {
      X.push([i / 10, 1]);
      y.push(i > 0 ? 1 : 0);
    }
    const w = trainLogistic(X, y, { iterations: 3000, learningRate: 0.5 });
    expect(w[0]).toBeGreaterThan(1);
    const correct = X.filter((x, i) => (x[0]! * w[0]! + x[1]! * w[1]! > 0 ? 1 : 0) === y[i]).length;
    expect(correct / X.length).toBeGreaterThan(0.95);
  });
});

describe("featurize", () => {
  it("encodes quiescent flow and one-hot phase", () => {
    const f = featurize({ o2Percent: 21, pressurePsi: 14.7, flowCmS: null, fuelPhase: "liquid", diluentPercent: null });
    expect(f[0]).toBeCloseTo(3.087, 3);
    expect(f.slice(2)).toEqual([0, 1, 0, 1, 0, 0, 0]);
  });
});

describe("ignition model on the synthetic dataset", () => {
  it("excludes detection-only investigations from training", () => {
    expect(model.trainedOn.excludedInvestigationIds.sort()).toEqual(["daft", "daft-2", "same", "same-r"]);
  });

  it("beats the majority-class baseline on the holdout split", () => {
    expect(model.metrics.trainAccuracy).toBeGreaterThan(0.8);
    expect(model.metrics.holdoutAccuracy).toBeGreaterThan(model.metrics.holdoutBaselineAccuracy);
    expect(model.metrics.nHoldout).toBeGreaterThan(50);
  });

  it("predicts higher ignition likelihood as oxygen rises", () => {
    const at = (o2: number) =>
      predictIgnitionProbability(model, { o2Percent: o2, pressurePsi: 10.2, flowCmS: 20, fuelPhase: "solid", diluentPercent: null });
    expect(at(15)).toBeLessThan(at(25));
    expect(at(25)).toBeLessThan(at(40));
    for (const o2 of [15, 30, 60, 100]) {
      expect(at(o2)).toBeGreaterThanOrEqual(0);
      expect(at(o2)).toBeLessThanOrEqual(1);
    }
  });

  it("learns that solids need more oxygen than gases", () => {
    const base = { o2Percent: 18, pressurePsi: 10.2, flowCmS: 20, diluentPercent: null } as const;
    expect(predictIgnitionProbability(model, { ...base, fuelPhase: "solid" })).toBeLessThan(
      predictIgnitionProbability(model, { ...base, fuelPhase: "gas" })
    );
  });

  it("assigns a positive weight to O2 partial pressure and a negative one to diluent", () => {
    const table = coefficientTable(model);
    expect(table.find((r) => r.key === "pO2")!.perUnitWeight).toBeGreaterThan(0);
    expect(table.find((r) => r.key === "diluent")!.perUnitWeight).toBeLessThan(0);
  });

  it("encodes plastic only for solid fuels", () => {
    const base = { o2Percent: 21, pressurePsi: 14.7, flowCmS: 20, diluentPercent: null } as const;
    expect(featurize({ ...base, fuelPhase: "solid", materialClass: "plastic" }).at(-1)).toBe(1);
    expect(featurize({ ...base, fuelPhase: "solid", materialClass: "fabric" }).at(-1)).toBe(0);
    expect(featurize({ ...base, fuelPhase: "gas", materialClass: "plastic" }).at(-1)).toBe(0);
  });

  it("assigns holdout deterministically", () => {
    expect(isHoldout("bass-001", 0.2)).toBe(isHoldout("bass-001", 0.2));
  });
});

describe("estimateSpreadRate", () => {
  const phase = new Map(dataset.investigations.map((i) => [i.id, i.fuelPhase] as const));
  const phaseOf = (t: TestRun) => phase.get(t.investigationId);

  it("returns the k nearest solid runs with measured spread", () => {
    const est = estimateSpreadRate(dataset.tests, phaseOf, {
      o2Percent: 21,
      pressurePsi: 14.7,
      flowCmS: 20,
      fuelPhase: "solid",
      materialClass: "fabric",
      gravity: "micro",
    });
    expect(est.neighbors).toHaveLength(10);
    expect(est.estimate).not.toBeNull();
    expect(est.estimate!).toBeGreaterThanOrEqual(est.min!);
    expect(est.estimate!).toBeLessThanOrEqual(est.max!);
    expect(est.neighbors.every((n) => n.test.flameSpreadRateMmS !== null)).toBe(true);
  });

  it("estimates faster spread at elevated oxygen", () => {
    const q = { pressurePsi: 14.7, flowCmS: 20, fuelPhase: "solid" as const, materialClass: "fabric" as const };
    const low = estimateSpreadRate(dataset.tests, phaseOf, { ...q, o2Percent: 21 }).estimate!;
    const high = estimateSpreadRate(dataset.tests, phaseOf, { ...q, o2Percent: 40 }).estimate!;
    expect(high).toBeGreaterThan(low);
  });

  it("returns null when no runs of that phase measured spread", () => {
    const est = estimateSpreadRate(dataset.tests, phaseOf, {
      o2Percent: 21,
      pressurePsi: 14.7,
      flowCmS: null,
      fuelPhase: "liquid",
    });
    expect(est.estimate).toBeNull();
    expect(est.candidates).toBe(0);
  });
});

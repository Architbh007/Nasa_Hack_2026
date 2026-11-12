import { z } from "zod";
import { isIgnitionStudy } from "@/lib/metrics";
import { materialClassForFuel } from "@/lib/materials";
import {
  DataSourceSchema,
  type FuelPhase,
  type GravityLevel,
  type HabitatGravity,
  type Investigation,
  type MaterialClass,
  type TestRun,
} from "@/lib/schema";

/**
 * Ignition likelihood model: logistic regression implemented by hand and fit
 * with batch gradient descent on test-level runs. No intercept: the three
 * fuel-phase indicators act as phase-specific baselines.
 */

export const FEATURES = [
  { key: "pO2", label: "O2 partial pressure", unit: "psi", continuous: true },
  { key: "o2", label: "O2 concentration", unit: "%", continuous: true },
  { key: "flow", label: "Airflow speed", unit: "cm/s", continuous: true },
  { key: "quiescent", label: "Quiescent (no forced flow)", unit: "0/1", continuous: false },
  { key: "solid", label: "Fuel phase: solid", unit: "0/1", continuous: false },
  { key: "liquid", label: "Fuel phase: liquid", unit: "0/1", continuous: false },
  { key: "gas", label: "Fuel phase: gas", unit: "0/1", continuous: false },
  { key: "diluent", label: "Diluent concentration", unit: "%", continuous: true },
] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];

export type IgnitionInput = {
  o2Percent: number;
  pressurePsi: number;
  /** null = quiescent */
  flowCmS: number | null;
  fuelPhase: FuelPhase;
  diluentPercent: number | null;
};

export function featurize(input: IgnitionInput): number[] {
  const flow = input.flowCmS ?? 0;
  return [
    (input.o2Percent / 100) * input.pressurePsi,
    input.o2Percent,
    flow,
    input.flowCmS === null || input.flowCmS < 0.5 ? 1 : 0,
    input.fuelPhase === "solid" ? 1 : 0,
    input.fuelPhase === "liquid" ? 1 : 0,
    input.fuelPhase === "gas" ? 1 : 0,
    input.diluentPercent ?? 0,
  ];
}

export const ModelArtifactSchema = z.object({
  kind: z.literal("logistic-regression"),
  featureKeys: z.array(z.string()),
  weights: z.array(z.number()),
  means: z.array(z.number()),
  stds: z.array(z.number()),
  hyperparameters: z.object({
    iterations: z.number().int().positive(),
    learningRate: z.number().positive(),
    l2: z.number().min(0),
    holdoutFraction: z.number().min(0).max(0.9),
  }),
  metrics: z.object({
    trainAccuracy: z.number(),
    holdoutAccuracy: z.number(),
    trainLogLoss: z.number(),
    holdoutLogLoss: z.number(),
    holdoutBaselineAccuracy: z.number(),
    nTrain: z.number().int(),
    nHoldout: z.number().int(),
    positiveRate: z.number(),
  }),
  trainedOn: z.object({
    investigationIds: z.array(z.string()),
    excludedInvestigationIds: z.array(z.string()),
    testCount: z.number().int(),
  }),
  dataSource: DataSourceSchema,
});

export type ModelArtifact = z.infer<typeof ModelArtifactSchema>;

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const dot = (a: readonly number[], b: readonly number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] as number) * (b[i] as number);
  return s;
};

/** Plain batch gradient descent with L2 regularization on already-scaled features. */
export function trainLogistic(
  X: readonly number[][],
  y: readonly number[],
  opts: { iterations?: number; learningRate?: number; l2?: number } = {}
): number[] {
  const iterations = opts.iterations ?? 4000;
  const lr = opts.learningRate ?? 0.3;
  const l2 = opts.l2 ?? 1e-3;
  const n = X.length;
  if (n === 0) throw new Error("trainLogistic: no training rows");
  const d = (X[0] as number[]).length;
  const w = new Array<number>(d).fill(0);
  const grad = new Array<number>(d).fill(0);
  for (let it = 0; it < iterations; it++) {
    grad.fill(0);
    for (let i = 0; i < n; i++) {
      const xi = X[i] as number[];
      const err = sigmoid(dot(w, xi)) - (y[i] as number);
      for (let j = 0; j < d; j++) grad[j] = (grad[j] as number) + err * (xi[j] as number);
    }
    for (let j = 0; j < d; j++) {
      w[j] = (w[j] as number) - lr * ((grad[j] as number) / n + l2 * (w[j] as number));
    }
  }
  return w;
}

/** Deterministic holdout assignment from the test id (FNV-1a hash). */
export function isHoldout(testId: string, fraction: number): boolean {
  let h = 0x811c9dc5;
  for (let i = 0; i < testId.length; i++) {
    h ^= testId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 1000 < fraction * 1000;
}

function scale(raw: readonly number[], means: readonly number[], stds: readonly number[]): number[] {
  return raw.map((v, j) => (v - (means[j] as number)) / (stds[j] as number));
}

function evaluate(w: readonly number[], X: readonly number[][], y: readonly number[]) {
  if (X.length === 0) return { accuracy: NaN, logLoss: NaN };
  let correct = 0;
  let loss = 0;
  X.forEach((x, i) => {
    const p = Math.min(1 - 1e-9, Math.max(1e-9, sigmoid(dot(w, x))));
    const yi = y[i] as number;
    if ((p >= 0.5 ? 1 : 0) === yi) correct++;
    loss += -(yi * Math.log(p) + (1 - yi) * Math.log(1 - p));
  });
  return { accuracy: correct / X.length, logLoss: loss / X.length };
}

export function testToInput(t: TestRun, fuelPhase: FuelPhase): IgnitionInput {
  return {
    o2Percent: t.o2Percent,
    pressurePsi: t.pressurePsi,
    flowCmS: t.flowCmS,
    fuelPhase,
    diluentPercent: t.diluentPercent,
  };
}

/**
 * Fit the ignition model on ignition studies (detection-only smoke/dust
 * investigations are excluded; their runs were never ignition attempts).
 */
export function fitIgnitionModel(
  tests: readonly TestRun[],
  investigations: readonly Investigation[],
  opts: { iterations?: number; learningRate?: number; l2?: number; holdoutFraction?: number } = {}
): ModelArtifact {
  const hyperparameters = {
    iterations: opts.iterations ?? 4000,
    learningRate: opts.learningRate ?? 0.3,
    l2: opts.l2 ?? 1e-3,
    holdoutFraction: opts.holdoutFraction ?? 0.2,
  };
  const included = investigations.filter(isIgnitionStudy);
  const excluded = investigations.filter((i) => !isIgnitionStudy(i));
  const phase = new Map(included.map((i) => [i.id, i.fuelPhase] as const));
  const rows = tests.filter((t) => phase.has(t.investigationId));
  if (rows.length === 0) throw new Error("fitIgnitionModel: no ignition-study runs");

  const raw = rows.map((t) => featurize(testToInput(t, phase.get(t.investigationId) as FuelPhase)));
  const y: number[] = rows.map((t) => (t.ignited ? 1 : 0));
  const holdout = rows.map((t) => isHoldout(t.testId, hyperparameters.holdoutFraction));
  const trainRaw = raw.filter((_, i) => !holdout[i]);

  const means = FEATURES.map((f, j) =>
    f.continuous ? trainRaw.reduce((s, r) => s + (r[j] as number), 0) / trainRaw.length : 0
  );
  const stds = FEATURES.map((f, j) => {
    if (!f.continuous) return 1;
    const m = means[j] as number;
    const v = trainRaw.reduce((s, r) => s + ((r[j] as number) - m) ** 2, 0) / trainRaw.length;
    return Math.sqrt(v) || 1;
  });

  const X = raw.map((r) => scale(r, means, stds));
  const Xtr = X.filter((_, i) => !holdout[i]);
  const ytr = y.filter((_, i) => !holdout[i]);
  const Xho = X.filter((_, i) => holdout[i]);
  const yho = y.filter((_, i) => holdout[i]);

  const weights = trainLogistic(Xtr, ytr, hyperparameters);
  const tr = evaluate(weights, Xtr, ytr);
  const ho = evaluate(weights, Xho, yho);
  const trainPositive = ytr.reduce((a, b) => a + b, 0) / ytr.length;
  const majority = trainPositive >= 0.5 ? 1 : 0;
  const baseline = yho.length ? yho.filter((v) => v === majority).length / yho.length : NaN;

  return {
    kind: "logistic-regression",
    featureKeys: FEATURES.map((f) => f.key),
    weights,
    means,
    stds,
    hyperparameters,
    metrics: {
      trainAccuracy: tr.accuracy,
      holdoutAccuracy: ho.accuracy,
      trainLogLoss: tr.logLoss,
      holdoutLogLoss: ho.logLoss,
      holdoutBaselineAccuracy: baseline,
      nTrain: Xtr.length,
      nHoldout: Xho.length,
      positiveRate: trainPositive,
    },
    trainedOn: {
      investigationIds: included.map((i) => i.id),
      excludedInvestigationIds: excluded.map((i) => i.id),
      testCount: rows.length,
    },
    dataSource: investigations.some((i) => i.dataSource === "psi") ? "psi" : "synthetic",
  };
}

export function predictIgnitionProbability(model: ModelArtifact, input: IgnitionInput): number {
  return sigmoid(dot(model.weights, scale(featurize(input), model.means, model.stds)));
}

export type CoefficientRow = {
  key: FeatureKey;
  label: string;
  unit: string;
  /** Weight on the standardized feature (comparable across features). */
  standardizedWeight: number;
  /** Change in log-odds per one raw unit (per psi, per %, per cm/s, or for the indicator). */
  perUnitWeight: number;
  oddsRatioPerUnit: number;
};

export function coefficientTable(model: ModelArtifact): CoefficientRow[] {
  return FEATURES.map((f, j) => {
    const w = model.weights[j] ?? 0;
    const perUnit = w / (model.stds[j] ?? 1);
    return {
      key: f.key,
      label: f.label,
      unit: f.unit,
      standardizedWeight: w,
      perUnitWeight: perUnit,
      oddsRatioPerUnit: Math.exp(perUnit),
    };
  });
}

// ------------------------------------------------------------ spread estimate

export type SpreadQuery = {
  o2Percent: number;
  pressurePsi: number;
  flowCmS: number | null;
  fuelPhase: FuelPhase;
  materialClass?: MaterialClass | null;
  gravity?: HabitatGravity;
};

export type SpreadNeighbor = { test: TestRun; distance: number };

export type SpreadEstimate = {
  /** Inverse-distance weighted mean of the k nearest runs with a measured spread rate. */
  estimate: number | null;
  min: number | null;
  max: number | null;
  neighbors: SpreadNeighbor[];
  candidates: number;
  meanDistance: number | null;
};

function gravityPenalty(test: GravityLevel, query: HabitatGravity | undefined): number {
  if (!query) return 0;
  const exact =
    (query === "micro" && test === "microgravity") ||
    (query === "earth" && test === "normal") ||
    ((query === "lunar" || query === "mars") && test === "simulated-partial");
  if (exact) return 0;
  if (query === "lunar" || query === "mars") return 0.2;
  return 0.4;
}

export function estimateSpreadRate(
  tests: readonly TestRun[],
  phaseOf: (t: TestRun) => FuelPhase | undefined,
  query: SpreadQuery,
  k = 10
): SpreadEstimate {
  const candidates = tests.filter(
    (t) => t.flameSpreadRateMmS !== null && phaseOf(t) === query.fuelPhase
  );
  const qFlow = query.flowCmS ?? 0;
  const scored = candidates
    .map((test) => {
      const dO2 = (test.o2Percent - query.o2Percent) / 10;
      const dP = (test.pressurePsi - query.pressurePsi) / 3;
      const dF = ((test.flowCmS ?? 0) - qFlow) / 15;
      let distance = Math.hypot(dO2, dP, dF);
      if (query.materialClass && materialClassForFuel(test.fuel) !== query.materialClass) {
        distance += 0.5;
      }
      distance += gravityPenalty(test.gravityLevel, query.gravity);
      return { test, distance };
    })
    .sort((a, b) => a.distance - b.distance || a.test.testId.localeCompare(b.test.testId))
    .slice(0, k);

  if (scored.length === 0) {
    return { estimate: null, min: null, max: null, neighbors: [], candidates: 0, meanDistance: null };
  }
  let wSum = 0;
  let vSum = 0;
  for (const n of scored) {
    const w = 1 / (n.distance + 0.05);
    wSum += w;
    vSum += w * (n.test.flameSpreadRateMmS as number);
  }
  const rates = scored.map((n) => n.test.flameSpreadRateMmS as number);
  return {
    estimate: vSum / wSum,
    min: Math.min(...rates),
    max: Math.max(...rates),
    neighbors: scored,
    candidates: candidates.length,
    meanDistance: scored.reduce((s, n) => s + n.distance, 0) / scored.length,
  };
}

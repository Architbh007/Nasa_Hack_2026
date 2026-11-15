import { hadFlame } from "@/lib/lower-oxygen";
import { placeRuns, runDistance, type AtmospherePoint, type PlacedRun } from "@/lib/metrics";
import type { Category, Run } from "@/lib/schema";

/**
 * Flame estimate: a kernel-weighted Beta-Binomial estimator (a Bayesian nearest-neighbour vote).
 *
 * - Labels come only from real runs: a recorded flame is 1, "no ignition" is 0, runs that state
 *   neither are left out. Nothing is synthesised.
 * - Each run votes with a Gaussian kernel weight exp(-d^2 / 2h^2), d being the app's run distance
 *   (10% O2 = 3 psi). The bandwidth adapts: h = max(KERNEL_BANDWIDTH, distance to the K-th nearest
 *   labelled run), so an estimate always rests on real runs, and every weight is scaled by
 *   (KERNEL_BANDWIDTH / h)^2, so evidence far away counts for less.
 * - Posterior: Beta(PRIOR + weighted flames, PRIOR + weighted no-ignitions) (Jeffreys prior).
 * - Confidence comes from the effective sample size (sum of weights): the further from real
 *   tests, the less evidence and the wider the range. Beyond MAX_REACH it declines to estimate.
 *
 * This is an estimate, not test data, and the UI must label it that way.
 */

export const KERNEL_BANDWIDTH = 0.35;
export const PRIOR = 0.5;
/** The adaptive bandwidth reaches at least this many labelled runs. */
export const NEIGHBOURS = 8;
/** No estimate when the nearest labelled run is further than this run distance. */
export const MAX_REACH = 2.5;
/**
 * Below the lowest O2 any labelled run was tested at, evidence is further discounted by
 * exp(-gap^2 / 2s^2), gap in O2 points: the data cannot show where flames stop.
 */
export const EXTRAPOLATION_SCALE_O2 = 3;
/** A 90% range wider than this reads as "can't tell". */
export const UNCERTAIN_WIDTH = 0.6;

export type EstimateConfidence = "high" | "medium" | "low";

export type FlameEstimate =
  | { kind: "no-oxygen" }
  | { kind: "too-far"; evidence: number; lowestTestedO2: number | null }
  | {
      kind: "estimate";
      /** Posterior mean probability that a flame lights and burns. */
      probability: number;
      /** 90% credible interval. */
      low: number;
      high: number;
      /** Effective number of real runs behind the estimate (sum of kernel weights). */
      evidence: number;
      confidence: EstimateConfidence;
      /** True when the air is below the lowest O2 any labelled run was tested at. */
      extrapolating: boolean;
      lowestTestedO2: number | null;
      /** Runs that weigh most in the estimate, heaviest first. */
      topRuns: Array<{ run: PlacedRun; weight: number; flame: boolean }>;
    };

/** A labelled run for the estimate, or null when the run states neither a flame nor no ignition. */
export function flameLabel(run: Run): 0 | 1 | null {
  if (run.outcome === "no-ignition") return 0;
  return hadFlame(run) ? 1 : null;
}

export function estimateConfidence(evidence: number): EstimateConfidence {
  if (evidence >= 10) return "high";
  if (evidence >= 3) return "medium";
  return "low";
}

/** Plain-words reading of an estimate. A very wide range reads as "can't tell". */
export const ESTIMATE_LABEL = (p: number, low = 0, high = 1): string =>
  high - low > UNCERTAIN_WIDTH
    ? "Can't tell from the data"
    : p >= 0.8 ? "Likely to burn" : p >= 0.5 ? "May burn" : p >= 0.2 ? "Probably won't burn" : "Unlikely to burn";

export function estimateFlame(point: AtmospherePoint, runs: readonly Run[], category: Category, topCount = 3): FlameEstimate {
  if (point.o2Percent <= 0) return { kind: "no-oxygen" };

  const labelled = placeRuns(runs.filter((r) => r.category === category)).flatMap((p) => {
    const y = flameLabel(p.run);
    return y === null ? [] : [{ p, y }];
  });
  const lowestTestedO2 = labelled.length ? Math.min(...labelled.map((l) => l.p.o2Percent)) : null;

  const withDistance = labelled.map((l) => ({ ...l, d: runDistance(l.p, point) })).sort((x, y) => x.d - y.d);
  const nearest = withDistance[0]?.d ?? Infinity;
  if (nearest > MAX_REACH) return { kind: "too-far", evidence: 0, lowestTestedO2 };

  const kth = withDistance[Math.min(NEIGHBOURS, withDistance.length) - 1]?.d ?? KERNEL_BANDWIDTH;
  const h = Math.max(KERNEL_BANDWIDTH, kth);
  const gapBelowTests = lowestTestedO2 === null ? 0 : Math.max(0, lowestTestedO2 - point.o2Percent);
  const discount = (KERNEL_BANDWIDTH / h) ** 2 * Math.exp(-(gapBelowTests ** 2) / (2 * EXTRAPOLATION_SCALE_O2 ** 2));
  let flames = 0;
  let none = 0;
  const weighted = withDistance.map(({ p, y, d }) => {
    const w = Math.exp(-(d * d) / (2 * h * h)) * discount;
    if (y === 1) flames += w;
    else none += w;
    return { run: p, weight: w, flame: y === 1 };
  });
  const evidence = flames + none;

  const a = PRIOR + flames;
  const b = PRIOR + none;
  return {
    kind: "estimate",
    probability: a / (a + b),
    low: betaQuantile(0.05, a, b),
    high: betaQuantile(0.95, a, b),
    evidence,
    confidence: gapBelowTests > 0 ? "low" : estimateConfidence(evidence),
    extrapolating: gapBelowTests > 0,
    lowestTestedO2,
    topRuns: weighted.sort((x, y) => y.weight - x.weight || x.run.run.id.localeCompare(y.run.run.id)).slice(0, topCount),
  };
}

// ------------------------------------------------------------- Beta distribution helpers

function logGamma(x: number): number {
  // Lanczos approximation (g = 7, n = 9).
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let s = c[0]!;
  for (let i = 1; i < 9; i++) s += c[i]! / (x + i);
  const t = x + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s);
}

function betaContinuedFraction(x: number, a: number, b: number): number {
  const TINY = 1e-30;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-12) break;
  }
  return h;
}

/** Regularized incomplete beta function I_x(a, b). */
export function betaCdf(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (front * betaContinuedFraction(x, a, b)) / a : 1 - (front * betaContinuedFraction(1 - x, b, a)) / b;
}

/** Quantile of Beta(a, b) by bisection. */
export function betaQuantile(p: number, a: number, b: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (betaCdf(mid, a, b) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

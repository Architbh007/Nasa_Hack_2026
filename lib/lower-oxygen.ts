import { OUTCOME_LABEL } from "@/lib/constants";
import { nearestRuns, oxygenPartialPressure, runsWithinTolerance, type NearRun, type PlacedRun } from "@/lib/metrics";
import type { Category, Run } from "@/lib/schema";

/**
 * "What if we lower the oxygen during a fire?" Reads what real runs recorded at the lowered air
 * (same pressure, same fuel category) and what that air would mean for the crew. No prediction:
 * flame counts come from recorded outcomes and investigator notes; the crew line is standard-atmosphere arithmetic.
 */

/** Sea-level O2 partial pressure: 20.95% of 14.696 psi. */
export const SEA_LEVEL_PO2_PSI = 0.2095 * 14.696;

/**
 * Altitude (m) on Earth where ordinary air has this O2 partial pressure (ISA troposphere formula).
 * Returns 0 at or above sea-level pO2.
 */
export function equivalentAltitudeM(pO2Psi: number): number {
  if (pO2Psi >= SEA_LEVEL_PO2_PSI) return 0;
  const ratio = pO2Psi / SEA_LEVEL_PO2_PSI;
  return (1 - Math.pow(ratio, 1 / 5.25588)) / 2.25577e-5;
}

/** Highest oxygen the before/after comparison offers. */
export const MAX_COMPARE_O2 = 31;

/** Where the lowering slider starts: 21% from rich air, 17% from Earth-like air, otherwise 3 points lower. */
export function defaultLoweredO2(fromO2: number): number {
  if (fromO2 >= 25) return 21;
  return fromO2 > 18 ? 17 : Math.max(0, Math.round(fromO2 - 3));
}

/** Starting before/after pair for a cabin: before is the cabin's own O2, capped at MAX_COMPARE_O2. */
export function defaultComparePair(cabinO2: number): { fromO2: number; toO2: number } {
  const fromO2 = Math.min(MAX_COMPARE_O2, Math.round(cabinO2 * 2) / 2);
  return { fromO2, toO2: defaultLoweredO2(fromO2) };
}

export type CrewBand = "fine" | "mild" | "hypoxic" | "danger";

/** Rough guide to how the lowered air feels, by equivalent altitude. */
export const CREW_BAND: Record<CrewBand, { label: string; detail: string }> = {
  fine: { label: "Fine to breathe", detail: "About as much oxygen as at sea level or a low town." },
  mild: { label: "Like a mountain town", detail: "Breathable for healthy crew, slightly harder work." },
  hypoxic: { label: "Hypoxia likely", detail: "Like a high mountain: headaches, slower thinking. Crew would want masks." },
  danger: { label: "Dangerous for crew", detail: "Too little oxygen to breathe safely. Crew must be on masks." },
};

export function crewBand(altitudeM: number): CrewBand {
  if (altitudeM < 1500) return "fine";
  if (altitudeM < 3000) return "mild";
  if (altitudeM < 5000) return "hypoxic";
  return "danger";
}

const NO_FLAME = /no ignition|did not ignite|didn't ignite|failed to ignite|would not ignite/i;
const FLAME_WORDS = /flame|burn|ignit|lit\b/i;
const FLOW_LINKED = /fan (off|down)|flow (off|down|stop|change)|low(est)? flow|lower flow|reduc\w* flow|decreas\w* flow|flow reduc|when flow|limit flow/i;

/** True when the run recorded (or its notes describe) a flame at that air. */
export function hadFlame(run: Run): boolean {
  if (run.outcome === "no-ignition") return false;
  if (run.outcome !== "unknown") return true;
  const text = run.outcomeText ?? "";
  return FLAME_WORDS.test(text) && !NO_FLAME.test(text);
}

/** True when an extinguished run's notes tie the flame going out to the airflow dropping. */
export function outWhenFlowDropped(run: Run): boolean {
  return run.outcome === "extinguished" && FLOW_LINKED.test(run.outcomeText ?? "");
}

export type LowerOxygenCheck = {
  fromO2: number;
  toO2: number;
  pressurePsi: number;
  pO2Psi: number;
  altitudeM: number;
  band: CrewBand;
  /** Same-category runs within ±2% O2 / ±1 psi of the lowered air. */
  runs: PlacedRun[];
  withFlame: number;
  noIgnition: number;
  notStated: number;
  flowLinkedOut: number;
  outcomeCounts: { label: string; count: number }[];
  /** Up to `exampleCount` runs whose notes show a flame, flow-linked extinctions first. */
  examples: PlacedRun[];
  /**
   * The closest same-category runs that state a result (flame or no ignition), at any distance.
   * The best evidence available when nothing sits within tolerance of the lowered air.
   */
  nearestWithResult: NearRun[];
  /** The closest same-category runs whose notes say the flame went out when airflow dropped. */
  airflowEvidence: NearRun[];
};

/** A run states a result when it recorded a flame or recorded that nothing ignited. */
export function statesResult(run: Run): boolean {
  return run.outcome === "no-ignition" || hadFlame(run);
}

export function lowerOxygenCheck(
  input: { fromO2: number; toO2: number; pressurePsi: number; category: Category },
  runs: readonly Run[],
  exampleCount = 3
): LowerOxygenCheck {
  const { toO2, pressurePsi } = input;
  const near = runsWithinTolerance({ o2Percent: toO2, pressurePsi }, runs, input.category);
  const pO2Psi = oxygenPartialPressure(toO2, pressurePsi).psi;
  const altitudeM = equivalentAltitudeM(pO2Psi);

  const counts = new Map<string, number>();
  for (const p of near) {
    const label = OUTCOME_LABEL[p.run.outcome];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const withFlame = near.filter((p) => hadFlame(p.run));
  const flowLinked = withFlame.filter((p) => outWhenFlowDropped(p.run));
  const others = withFlame.filter((p) => !outWhenFlowDropped(p.run) && (p.run.outcomeText ?? "").length > 0);
  const byCloseness = (a: PlacedRun, b: PlacedRun) =>
    Math.abs(a.o2Percent - toO2) - Math.abs(b.o2Percent - toO2) || a.run.id.localeCompare(b.run.id);

  const ranked = nearestRuns({ o2Percent: toO2, pressurePsi }, runs, { category: input.category, count: Number.MAX_SAFE_INTEGER });
  const nearestWithResult = ranked.filter((n) => statesResult(n.run)).slice(0, exampleCount);
  const airflowEvidence = ranked.filter((n) => outWhenFlowDropped(n.run)).slice(0, exampleCount);

  return {
    fromO2: input.fromO2,
    toO2,
    pressurePsi,
    pO2Psi,
    altitudeM,
    band: crewBand(altitudeM),
    runs: near,
    withFlame: withFlame.length,
    noIgnition: near.filter((p) => p.run.outcome === "no-ignition").length,
    notStated: near.length - withFlame.length - near.filter((p) => p.run.outcome === "no-ignition").length,
    flowLinkedOut: flowLinked.length,
    outcomeCounts: [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    examples: [...flowLinked.sort(byCloseness), ...others.sort(byCloseness)].slice(0, exampleCount),
    nearestWithResult,
    airflowEvidence,
  };
}

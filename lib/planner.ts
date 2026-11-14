import { GRID_O2, GRID_PRESSURE, scopeRuns, type GridScope } from "@/lib/flammability-grid";
import {
  NEAR_DISTANCE,
  TESTED_TOLERANCE,
  oxygenPartialPressure,
  placeRuns,
  psiToKPa,
  runDistance,
  type AtmospherePoint,
  type PlacedRun,
} from "@/lib/metrics";
import type { HabitatGravity, Outcome, Run, Scenario } from "@/lib/schema";

/**
 * Future Experiment Planner. Given mission atmospheres and a test budget, choose the O2/pressure
 * points where new tests would close the most untested ground between existing real runs and
 * those missions. Pure and deterministic.
 *
 * It uses the same distance and thresholds as the Habitat page (10% O2 counts the same as 3 psi;
 * "tested" within ±2% O2 and ±1 psi; "near" within distance 0.6). It says where new data would be
 * most useful. It never predicts whether anything ignites or how a flame would spread.
 */

export type PlanMode = "stepping" | "direct";

export type PlanTarget = {
  id: string;
  label: string;
  o2Percent: number;
  pressurePsi: number;
  gravity: HabitatGravity;
};

export type PlanOptions = {
  targets: readonly PlanTarget[];
  scope: GridScope;
  /** Number of tests, 1 to PLAN_LIMITS.maxBudget. */
  budget: number;
  mode: PlanMode;
};

export const PLAN_LIMITS = { minBudget: 1, maxBudget: 8 } as const;

/** Candidate grid: every 1% O2 across 15–51% and every 0.5 psi across 3–15 psi, plus each exact target. */
export const CANDIDATE_STEP = { o2: 1, psi: 0.5 } as const;

/** How many real runs a test card lists as the evidence it builds on. */
const BUILDS_ON_COUNT = 3;
/** A flown investigation "operated at this pressure" when one of its runs recorded a pressure within this many psi. */
const HARDWARE_PSI_WINDOW = 0.75;
/** Weight of grid coverage relative to target-distance reduction; small, so it only breaks near-ties. */
const COVERAGE_WEIGHT = 0.01;

export type Verdict = "tested" | "near" | "untested";

export const PLAN_VERDICT_LABEL: Record<Verdict, string> = {
  tested: "Tested",
  near: "Near tested",
  untested: "Not tested",
};

type Point = AtmospherePoint;

/** Evidence the planner reasons over: real runs, plus tests already chosen earlier in the plan. */
type EvidencePoint = Point & { source: { kind: "run"; run: Run } | { kind: "test"; index: number } };

export type RunRef = {
  runId: string;
  investigationId: string;
  o2Percent: number;
  pressurePsi: number;
  pressureAssumed: boolean;
  outcome: Outcome;
  source: string;
  distance: number;
};

export type HardwarePrecedent = { investigationId: string; runId: string; pressurePsi: number };

export type TargetProgress = {
  targetId: string;
  label: string;
  /** Distance from the target to its nearest evidence before and after this test. */
  before: number;
  after: number;
};

export type PlannedTest = {
  index: number;
  o2Percent: number;
  pressurePsi: number;
  pressureKPa: number;
  pO2Psi: number;
  /** Whether the test sits exactly on a mission target. */
  atTargetId: string | null;
  /** Targets this test brings closer to evidence, with distances before and after. */
  serves: TargetProgress[];
  /** The evidence point this test steps from: a real run or an earlier test in the plan. */
  stepsFrom: { kind: "run"; runId: string; investigationId: string; distance: number } | { kind: "test"; index: number; distance: number } | null;
  /** Nearest real runs of the chosen scope. */
  buildsOn: RunRef[];
  /** Real runs within "near" distance include both "burned" and "went out or never lit": a limit lies nearby. */
  boundary: { burned: number; wentOut: number } | null;
  /** Flown investigations (any fuel) that recorded a pressure close to this test's pressure. */
  hardware: HardwarePrecedent[];
  /** Why the test was chosen, in one plain sentence. */
  reason: string;
  /** Lunar or Mars gravity is wanted by a served target, but every run in the data is microgravity. */
  needsPartialGravity: boolean;
};

export type TargetOutcome = {
  target: PlanTarget;
  before: Verdict;
  after: Verdict;
  distanceBefore: number | null;
  distanceAfter: number | null;
  /** First test after which the target counts as tested, or null. */
  testedAfterTest: number | null;
  /** Off the 15–51% / 3–15 psi chart. */
  offChart: boolean;
};

export type CoverageCount = { tested: number; near: number; untested: number; total: number };

export type ExperimentPlan = {
  options: PlanOptions;
  evidenceRunCount: number;
  tests: PlannedTest[];
  targets: TargetOutcome[];
  coverageBefore: CoverageCount;
  coverageAfter: CoverageCount;
  /** Stopped before the budget because no remaining candidate helps. */
  stoppedEarly: boolean;
};

const DOWN: ReadonlySet<Outcome> = new Set<Outcome>(["extinguished", "blowoff", "no-ignition"]);

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

export function targetFromScenario(s: Scenario): PlanTarget {
  return { id: s.id, label: s.label, o2Percent: s.o2Percent, pressurePsi: s.pressurePsi, gravity: s.gravity };
}

/** Presets that are already everyday cabin air; the planner offers the exploration atmospheres as targets. */
export const NON_TARGET_PRESETS: ReadonlySet<string> = new Set(["earth-sea-level", "iss-cabin"]);

export type CustomTarget = { o2Percent: number; pressurePsi: number };

/** Resolve chosen preset ids (unknown ids are dropped) plus an optional custom atmosphere. */
export function resolveTargets(scenarios: readonly Scenario[], ids: readonly string[], custom?: CustomTarget | null): PlanTarget[] {
  const out = scenarios.filter((s) => ids.includes(s.id)).map(targetFromScenario);
  if (custom) {
    out.push({
      id: "custom",
      label: `Custom atmosphere (${custom.o2Percent}% O2, ${custom.pressurePsi} psi)`,
      o2Percent: custom.o2Percent,
      pressurePsi: custom.pressurePsi,
      gravity: "micro",
    });
  }
  return out;
}

export function onChart(p: Point): boolean {
  return p.o2Percent >= GRID_O2.min && p.o2Percent <= GRID_O2.max && p.pressurePsi >= GRID_PRESSURE.min && p.pressurePsi <= GRID_PRESSURE.max;
}

const withinTolerance = (a: Point, b: Point) =>
  Math.abs(a.o2Percent - b.o2Percent) <= TESTED_TOLERANCE.o2 && Math.abs(a.pressurePsi - b.pressurePsi) <= TESTED_TOLERANCE.psi;

function nearestDistance(p: Point, evidence: readonly Point[]): number | null {
  let best: number | null = null;
  for (const e of evidence) {
    const d = runDistance(e, p);
    if (best === null || d < best) best = d;
  }
  return best;
}

export function verdictAt(p: Point, evidence: readonly Point[]): Verdict {
  if (evidence.some((e) => withinTolerance(e, p))) return "tested";
  const d = nearestDistance(p, evidence);
  return d !== null && d <= NEAR_DISTANCE ? "near" : "untested";
}

export type CellStatusSquare = { o2Min: number; o2Max: number; pMin: number; pMax: number; status: Verdict };

/** Status of every grid square (as on the Habitat page): holds evidence, is near it, or is untested. */
export function gridCellStatuses(evidence: readonly Point[]): CellStatusSquare[] {
  const cols = Math.round((GRID_O2.max - GRID_O2.min) / GRID_O2.step);
  const rows = Math.round((GRID_PRESSURE.max - GRID_PRESSURE.min) / GRID_PRESSURE.step);
  const out: CellStatusSquare[] = [];
  for (let r = 0; r < rows; r++) {
    const pMin = GRID_PRESSURE.min + r * GRID_PRESSURE.step;
    const pMax = pMin + GRID_PRESSURE.step;
    for (let c = 0; c < cols; c++) {
      const o2Min = GRID_O2.min + c * GRID_O2.step;
      const o2Max = o2Min + GRID_O2.step;
      const inside = evidence.some(
        (e) =>
          e.o2Percent >= o2Min &&
          (c === cols - 1 ? e.o2Percent <= o2Max : e.o2Percent < o2Max) &&
          e.pressurePsi >= pMin &&
          (r === rows - 1 ? e.pressurePsi <= pMax : e.pressurePsi < pMax)
      );
      let status: Verdict = "tested";
      if (!inside) {
        const d = nearestDistance({ o2Percent: (o2Min + o2Max) / 2, pressurePsi: (pMin + pMax) / 2 }, evidence);
        status = d !== null && d <= NEAR_DISTANCE ? "near" : "untested";
      }
      out.push({ o2Min, o2Max, pMin, pMax, status });
    }
  }
  return out;
}

export function coverageCount(evidence: readonly Point[]): CoverageCount {
  const cells = gridCellStatuses(evidence);
  const n = (s: Verdict) => cells.filter((c) => c.status === s).length;
  return { tested: n("tested"), near: n("near"), untested: n("untested"), total: cells.length };
}

function candidatePoints(targets: readonly PlanTarget[]): Point[] {
  const out: Point[] = [];
  for (let o2 = GRID_O2.min; o2 <= GRID_O2.max + 1e-9; o2 += CANDIDATE_STEP.o2) {
    for (let psi = GRID_PRESSURE.min; psi <= GRID_PRESSURE.max + 1e-9; psi += CANDIDATE_STEP.psi) {
      out.push({ o2Percent: round(o2), pressurePsi: round(psi) });
    }
  }
  for (const t of targets) {
    if (!out.some((p) => p.o2Percent === t.o2Percent && p.pressurePsi === t.pressurePsi)) {
      out.push({ o2Percent: t.o2Percent, pressurePsi: t.pressurePsi });
    }
  }
  return out;
}

/** Grid square centres, used for the coverage tie-breaker. */
function cellCentres(): Point[] {
  const out: Point[] = [];
  for (let psi = GRID_PRESSURE.min; psi < GRID_PRESSURE.max; psi += GRID_PRESSURE.step) {
    for (let o2 = GRID_O2.min; o2 < GRID_O2.max; o2 += GRID_O2.step) {
      out.push({ o2Percent: o2 + GRID_O2.step / 2, pressurePsi: psi + GRID_PRESSURE.step / 2 });
    }
  }
  return out;
}

function toRunRef(p: PlacedRun, at: Point): RunRef {
  return {
    runId: p.run.id,
    investigationId: p.run.investigationId,
    o2Percent: p.o2Percent,
    pressurePsi: p.pressurePsi,
    pressureAssumed: p.assumedPressure,
    outcome: p.run.outcome,
    source: `${p.run.source.file}, ${p.run.source.ref}`,
    distance: round(runDistance(p, at), 3),
  };
}

function hardwarePrecedent(psi: number, allRuns: readonly Run[]): HardwarePrecedent[] {
  const best = new Map<string, HardwarePrecedent & { gap: number }>();
  for (const r of allRuns) {
    // Only recorded pressures count as precedent, not the cited ISS nominal used to place unrecorded runs.
    if (r.pressurePsi === null) continue;
    const gap = Math.abs(r.pressurePsi - psi);
    if (gap > HARDWARE_PSI_WINDOW) continue;
    const prev = best.get(r.investigationId);
    if (!prev || gap < prev.gap || (gap === prev.gap && r.id < prev.runId)) {
      best.set(r.investigationId, { investigationId: r.investigationId, runId: r.id, pressurePsi: r.pressurePsi, gap });
    }
  }
  return [...best.values()]
    .sort((a, b) => a.gap - b.gap || a.investigationId.localeCompare(b.investigationId))
    .map(({ investigationId, runId, pressurePsi }) => ({ investigationId, runId, pressurePsi }));
}

function describeReason(serves: readonly TargetProgress[], atTarget: PlanTarget | null, coverageGain: number): string {
  if (atTarget) return `Tests the ${atTarget.label} itself.`;
  const helped = serves.filter((s) => s.after < s.before);
  if (helped.length > 0) {
    const parts = helped.map((s) => `${s.label} (distance ${round(s.before)} → ${round(s.after)})`);
    return `Moves the nearest evidence closer to ${parts.join(" and ")}.`;
  }
  return `Brings ${coverageGain} untested grid square${coverageGain === 1 ? "" : "s"} within reach of evidence.`;
}

/** Build the plan. Deterministic: ties go to lower O2, then lower pressure. */
export function planExperiments(runs: readonly Run[], options: PlanOptions): ExperimentPlan {
  const budget = Math.min(PLAN_LIMITS.maxBudget, Math.max(PLAN_LIMITS.minBudget, Math.round(options.budget)));
  const placed = placeRuns(scopeRuns(options.scope, runs));
  const evidence: EvidencePoint[] = placed.map((p) => ({
    o2Percent: p.o2Percent,
    pressurePsi: p.pressurePsi,
    source: { kind: "run", run: p.run },
  }));
  const realOnly: Point[] = evidence.slice();

  const candidates = candidatePoints(options.targets);
  const centres = cellCentres();
  const tests: PlannedTest[] = [];
  const firstTested = new Map<string, number>();
  let stoppedEarly = false;

  for (let k = 1; k <= budget; k++) {
    const targetDist = options.targets.map((t) => nearestDistance(t, evidence) ?? Infinity);
    // A target already inside tested tolerance needs no more tests; only open targets drive the choice.
    const open = options.targets.map((t) => !evidence.some((e) => withinTolerance(e, t)));
    const centreDist = centres.map((c) => nearestDistance(c, evidence) ?? Infinity);

    let best: { p: Point; score: number; gain: number; coverage: number } | null = null;
    for (const c of candidates) {
      if (evidence.some((e) => withinTolerance(e, c))) continue; // already tested ground: no new information
      const reach = nearestDistance(c, evidence) ?? Infinity;
      if (options.mode === "stepping" && evidence.length > 0 && reach > NEAR_DISTANCE) continue;

      let gain = 0;
      options.targets.forEach((t, i) => {
        if (!open[i]) return;
        const d = runDistance(c, t);
        const before = targetDist[i] as number;
        // With no evidence at all, any test helps; prefer the one closest to the target.
        if (d < before) gain += Number.isFinite(before) ? before - d : 100 - d;
      });
      let coverage = 0;
      centres.forEach((ctr, i) => {
        if ((centreDist[i] as number) > NEAR_DISTANCE && runDistance(c, ctr) <= NEAR_DISTANCE) coverage++;
      });
      const score = gain + COVERAGE_WEIGHT * coverage;
      if (score <= 0) continue;
      if (
        !best ||
        score > best.score + 1e-9 ||
        (Math.abs(score - best.score) <= 1e-9 &&
          (c.o2Percent < best.p.o2Percent || (c.o2Percent === best.p.o2Percent && c.pressurePsi < best.p.pressurePsi)))
      ) {
        best = { p: c, score, gain, coverage };
      }
    }

    if (!best) {
      stoppedEarly = true;
      break;
    }

    const p = best.p;
    // What this test steps from: the nearest existing evidence (real run or earlier test).
    let anchor: EvidencePoint | null = null;
    let anchorD = Infinity;
    for (const e of evidence) {
      const d = runDistance(e, p);
      if (d < anchorD) {
        anchorD = d;
        anchor = e;
      }
    }

    const serves: TargetProgress[] = options.targets.flatMap((t, i) => {
      const before = targetDist[i] as number;
      if (!open[i] || !Number.isFinite(before)) return [];
      return [{ targetId: t.id, label: t.label, before: round(before, 3), after: round(Math.min(before, runDistance(p, t)), 3) }];
    });

    const near = placed
      .map((pr) => ({ pr, d: runDistance(pr, p) }))
      .sort((a, b) => a.d - b.d || a.pr.run.id.localeCompare(b.pr.run.id));
    const local = near.filter((n) => n.d <= NEAR_DISTANCE);
    const burned = local.filter((n) => n.pr.run.outcome === "burned").length;
    const wentOut = local.filter((n) => DOWN.has(n.pr.run.outcome)).length;
    const atTarget = options.targets.find((t) => t.o2Percent === p.o2Percent && t.pressurePsi === p.pressurePsi) ?? null;
    const helpsPartialGravity =
      (atTarget !== null && (atTarget.gravity === "lunar" || atTarget.gravity === "mars")) ||
      serves.some((sv) => {
        const t = options.targets.find((x) => x.id === sv.targetId);
        return !!t && (t.gravity === "lunar" || t.gravity === "mars") && sv.after < sv.before;
      });

    tests.push({
      index: k,
      o2Percent: p.o2Percent,
      pressurePsi: p.pressurePsi,
      pressureKPa: round(psiToKPa(p.pressurePsi), 1),
      pO2Psi: round(oxygenPartialPressure(p.o2Percent, p.pressurePsi).psi, 2),
      atTargetId: atTarget?.id ?? null,
      serves,
      stepsFrom:
        anchor === null
          ? null
          : anchor.source.kind === "run"
            ? { kind: "run", runId: anchor.source.run.id, investigationId: anchor.source.run.investigationId, distance: round(anchorD, 3) }
            : { kind: "test", index: anchor.source.index, distance: round(anchorD, 3) },
      buildsOn: near.slice(0, BUILDS_ON_COUNT).map((n) => toRunRef(n.pr, p)),
      boundary: burned > 0 && wentOut > 0 ? { burned, wentOut } : null,
      hardware: hardwarePrecedent(p.pressurePsi, runs),
      reason: describeReason(serves, atTarget, best.coverage),
      needsPartialGravity: helpsPartialGravity,
    });

    evidence.push({ ...p, source: { kind: "test", index: k } });
    for (const t of options.targets) {
      if (!firstTested.has(t.id) && withinTolerance(p, t)) firstTested.set(t.id, k);
    }
  }

  const allAfter: Point[] = evidence;
  return {
    options: { ...options, budget },
    evidenceRunCount: placed.length,
    tests,
    targets: options.targets.map((t) => {
      const before = verdictAt(t, realOnly);
      return {
        target: t,
        before,
        after: verdictAt(t, allAfter),
        distanceBefore: nearestDistance(t, realOnly) === null ? null : round(nearestDistance(t, realOnly) as number, 3),
        distanceAfter: nearestDistance(t, allAfter) === null ? null : round(nearestDistance(t, allAfter) as number, 3),
        testedAfterTest: before === "tested" ? null : (firstTested.get(t.id) ?? null),
        offChart: !onChart(t),
      };
    }),
    coverageBefore: coverageCount(realOnly),
    coverageAfter: coverageCount(allAfter),
    stoppedEarly,
  };
}

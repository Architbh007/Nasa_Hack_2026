import type { FuelPhase, GravityLevel, Outcome, TestRun } from "@/lib/schema";
import { SYNTHETIC_SOLID_GAP } from "@/lib/constants";
import type { InvestigationDesign } from "./designs";
import { clamp, Rng, round, sigmoid } from "./rng";

/**
 * Synthetic physics. Deliberately simple, monotone relationships so the data
 * tells a believable story:
 *  - ignition ~ logistic(O2 partial pressure) with phase-specific midpoints,
 *    plus an O2 concentration term and diluent penalties, plus noise
 *  - solid spread ~ linear in O2 above threshold, mild pressure scaling,
 *    flow-dependent in microgravity (starvation < 5 cm/s, blowoff > 30 cm/s)
 *  - CO2 suppresses more than helium (and nitrogen) per percent added
 *  - droplet extinction diameter shrinks as O2 rises; cool flames at low O2
 */

/** O2 partial pressure (psi) at which ignition odds are even, by fuel phase. */
export const IGNITION_MIDPOINT_PSI: Record<FuelPhase, number> = {
  gas: 1.4,
  liquid: 1.7,
  solid: 2.7,
};
const PO2_SLOPE = 3.2; // logit per psi of O2 partial pressure
const O2_CONC_SLOPE = 0.13; // logit per % O2 (concentration effect at fixed pO2)
const IGNITION_NOISE_SD = 0.4;

/** Ignition logit penalty per percent of diluent. CO2 > He > N2. */
export const DILUENT_IGNITION_PENALTY: Record<string, number> = {
  "carbon dioxide": 0.07,
  helium: 0.03,
  nitrogen: 0.025,
};
/** Extinction (quench) strength per percent diluent. CO2 > He > N2. */
const DILUENT_QUENCH_STRENGTH: Record<string, number> = {
  "carbon dioxide": 0.13,
  helium: 0.05,
  nitrogen: 0.04,
};
/** Droplet extinction-diameter increase per percent diluent. */
const DILUENT_DROPLET_RATIO: Record<string, number> = {
  "carbon dioxide": 0.009,
  helium: 0.005,
  nitrogen: 0.004,
};

const COOL_FLAME_FUELS = /heptane|decane|dodecane|hexadecane|butane|dimethyl ether/i;

type Conditions = {
  o2Percent: number;
  pressurePsi: number;
  flowCmS: number | null;
  diluent: string | null;
  diluentPercent: number | null;
  gravityLevel: GravityLevel;
  fuel: string;
  sampleSizeMm: number;
};

function sampleConditions(d: InvestigationDesign, rng: Rng): Conditions {
  const o2Level = rng.pick(d.o2Levels);
  const o2Percent = clamp(o2Level + rng.normal(0, 0.25), 5, 100);
  const pLevel = rng.pick(d.pressureLevels);
  // Asymmetric jitter keeps each run within 0.05 psi below its set point.
  const pressurePsi = pLevel + clamp(rng.normal(0, 0.06), -0.05, 0.12);
  const flowCmS = d.flowLevels
    ? Math.max(0.2, rng.pick(d.flowLevels) * (1 + rng.normal(0, 0.04)))
    : null;
  const option = rng.pick(d.diluentOptions);
  let diluent: string | null = null;
  let diluentPercent: number | null = null;
  if (option.diluent !== null && option.percents.length > 0) {
    diluent = option.diluent;
    diluentPercent = Math.max(0.5, rng.pick(option.percents) + rng.normal(0, 0.3));
  }
  const gravityLevel: GravityLevel =
    d.groundReferenceFraction && rng.chance(d.groundReferenceFraction)
      ? "normal"
      : d.gravityLevel;
  const fuel = rng.pick(d.fuels);
  const [sMin, sMax] = d.sampleSizeMm;
  const sampleSizeMm = sMin === sMax ? sMin : rng.uniform(sMin, sMax);
  return {
    o2Percent,
    pressurePsi,
    flowCmS,
    diluent,
    diluentPercent,
    gravityLevel,
    fuel,
    sampleSizeMm,
  };
}

function ignitionProbability(d: InvestigationDesign, c: Conditions, rng: Rng): number {
  const pO2 = (c.o2Percent / 100) * c.pressurePsi;
  let logit =
    PO2_SLOPE * (pO2 - IGNITION_MIDPOINT_PSI[d.fuelPhase]) +
    O2_CONC_SLOPE * (c.o2Percent - 21);
  if (c.diluent && c.diluentPercent) {
    logit -= (DILUENT_IGNITION_PENALTY[c.diluent] ?? 0.03) * c.diluentPercent;
  }
  if (d.kind === "gas-jet" && c.flowCmS !== null) {
    logit -= 0.03 * Math.max(0, c.flowCmS - 40);
  }
  return sigmoid(logit + rng.normal(0, IGNITION_NOISE_SD));
}

type Result = {
  ignited: boolean;
  outcome: Outcome;
  flameSpreadRateMmS: number | null;
  burnDurationS: number;
  peakTemperatureK: number | null;
  smokeObscurationPercent: number | null;
  extinctionDiameterMm: number | null;
};

const NO_IGNITION: Result = {
  ignited: false,
  outcome: "no-ignition",
  flameSpreadRateMmS: null,
  burnDurationS: 0,
  peakTemperatureK: null,
  smokeObscurationPercent: null,
  extinctionDiameterMm: null,
};

function rollOutcome(
  rng: Rng,
  ordered: ReadonlyArray<[Outcome, number]>,
  fallback: Outcome
): Outcome {
  for (const [outcome, p] of ordered) {
    if (rng.chance(clamp(p, 0, 1))) return outcome;
  }
  return fallback;
}

function quenchStrength(c: Conditions): number {
  if (!c.diluent || !c.diluentPercent) return 0;
  return (DILUENT_QUENCH_STRENGTH[c.diluent] ?? 0.04) * c.diluentPercent;
}

function solidSpread(d: InvestigationDesign, c: Conditions, rng: Rng): Result {
  const micro = c.gravityLevel !== "normal";
  const f = c.flowCmS ?? 0;
  const o2x = c.o2Percent - 21;
  const pO2 = (c.o2Percent / 100) * c.pressurePsi;

  const pQuench = c.diluentPercent ? 0.025 * c.diluentPercent : 0;
  const pBlow = micro
    ? f > 30
      ? 0.25 + 0.04 * (f - 30) - 0.02 * o2x
      : 0
    : f > 40
      ? 0.1
      : 0;
  const nearThreshold = clamp(0.4 * (2.9 - pO2), 0, 0.3);
  const pSelf = micro
    ? f < 5
      ? clamp(0.6 + 0.06 * (5 - f) - 0.035 * o2x, 0.1, 0.92) + nearThreshold
      : clamp(0.12 - 0.008 * o2x, 0.02, 0.3) + nearThreshold
    : 0.06 + nearThreshold;

  const outcome = rollOutcome(
    rng,
    [
      ["quenched", pQuench],
      ["blowoff", pBlow],
      ["self-extinguished", pSelf],
    ],
    "sustained"
  );

  let flameSpreadRateMmS: number | null = null;
  let burnDurationS: number;
  if (outcome === "sustained") {
    const pressureFactor = (c.pressurePsi / 14.7) ** 0.35;
    const flowPeak = 0.55 + 0.75 * (1 - Math.exp(-25 / 8));
    const flowFactor = micro
      ? f <= 25
        ? 0.55 + 0.75 * (1 - Math.exp(-f / 8))
        : flowPeak * (1 - 0.012 * (f - 25))
      : 1.35;
    const material = d.spreadFactor?.[c.fuel] ?? 1;
    flameSpreadRateMmS =
      0.11 *
      Math.max(0.4, c.o2Percent - 13) *
      pressureFactor *
      flowFactor *
      material *
      rng.lognormal(0.12);
    burnDurationS = Math.min(
      d.maxBurnS,
      (c.sampleSizeMm / flameSpreadRateMmS) * rng.lognormal(0.05)
    );
  } else if (outcome === "self-extinguished") {
    burnDurationS = rng.uniform(3, 30);
  } else if (outcome === "blowoff") {
    burnDurationS = rng.uniform(1, 8);
  } else {
    burnDurationS = rng.uniform(4, 25);
  }

  const tempDrop: Partial<Record<Outcome, number>> = {
    "self-extinguished": 120,
    blowoff: 80,
    quenched: 150,
  };
  const peakTemperatureK = d.measuresTemperature
    ? 1350 +
      16 * o2x +
      120 * (c.pressurePsi / 14.7 - 1) -
      (tempDrop[outcome] ?? 0) +
      rng.normal(0, 35)
    : null;

  const smokeObscurationPercent = d.measuresSmoke
    ? clamp(
        (d.smokeFactor?.[c.fuel] ?? 1) * (6 + 0.035 * burnDurationS) * rng.lognormal(0.2),
        0,
        95
      )
    : null;

  return {
    ignited: true,
    outcome,
    flameSpreadRateMmS,
    burnDurationS,
    peakTemperatureK,
    smokeObscurationPercent,
    extinctionDiameterMm: null,
  };
}

function solidPyrolysis(d: InvestigationDesign, c: Conditions, rng: Rng): Result {
  // Heated to pyrolysis on purpose; these are smoke-generation runs, not ignition attempts.
  const heatingLevel = rng.uniform(6, 28);
  return {
    ...NO_IGNITION,
    smokeObscurationPercent: d.measuresSmoke
      ? clamp((d.smokeFactor?.[c.fuel] ?? 1) * heatingLevel * rng.lognormal(0.15), 0, 95)
      : null,
  };
}

function gasBurner(d: InvestigationDesign, c: Conditions, rng: Rng): Result {
  const pO2 = (c.o2Percent / 100) * c.pressurePsi;
  const pSelf = sigmoid(-2.2 * (pO2 - 2.0) + 0.06 * (c.diluentPercent ?? 0) - 0.8);
  const outcome = rollOutcome(rng, [["self-extinguished", pSelf]], "sustained");
  return {
    ignited: true,
    outcome,
    flameSpreadRateMmS: null,
    burnDurationS:
      outcome === "sustained" ? d.maxBurnS * rng.uniform(0.7, 1) : rng.uniform(5, 60),
    peakTemperatureK: d.measuresTemperature
      ? 1500 +
        14 * (c.o2Percent - 21) -
        (outcome === "sustained" ? 0 : 150) +
        rng.normal(0, 40)
      : null,
    smokeObscurationPercent: null,
    extinctionDiameterMm: null,
  };
}

function gasJet(d: InvestigationDesign, c: Conditions, rng: Rng): Result {
  const f = c.flowCmS ?? 0;
  const dil = c.diluentPercent ?? 0;
  const pO2 = (c.o2Percent / 100) * c.pressurePsi;
  const fBlow =
    38 + 1.2 * (c.o2Percent - 21) - 0.25 * dil + (c.gravityLevel === "normal" ? 10 : 0);
  const pBlow = sigmoid((f - fBlow) / 5);
  const pQuench = dil >= 35 ? 0.1 : 0;
  const pSelf = 0.03 + (pO2 < 2 ? 0.2 : 0);
  const outcome = rollOutcome(
    rng,
    [
      ["blowoff", pBlow],
      ["quenched", pQuench],
      ["self-extinguished", pSelf],
    ],
    "sustained"
  );
  return {
    ignited: true,
    outcome,
    flameSpreadRateMmS: null,
    burnDurationS:
      outcome === "sustained"
        ? d.maxBurnS * rng.uniform(0.8, 1)
        : outcome === "blowoff"
          ? rng.uniform(0.5, 5)
          : rng.uniform(3, 30),
    peakTemperatureK: d.measuresTemperature
      ? 1850 +
        12 * (c.o2Percent - 21) -
        4 * dil -
        (outcome === "sustained" ? 0 : 120) +
        rng.normal(0, 40)
      : null,
    smokeObscurationPercent: null,
    extinctionDiameterMm: null,
  };
}

const SPHERICAL_FUEL_FACTOR: Record<string, number> = {
  hydrogen: 2,
  ethylene: 1.2,
  methane: 0.8,
};

function gasSpherical(d: InvestigationDesign, c: Conditions, rng: Rng): Result {
  const pO2 = (c.o2Percent / 100) * c.pressurePsi;
  const o2x = c.o2Percent - 21;
  const pQuench = clamp(quenchStrength(c) / 4 - 0.3 - 0.02 * o2x, 0, 0.9);
  const pSelf = sigmoid(-2 * (pO2 - 1.9) - 1);
  const outcome = rollOutcome(
    rng,
    [
      ["quenched", pQuench],
      ["self-extinguished", pSelf],
    ],
    "sustained"
  );
  const flameSpreadRateMmS =
    outcome === "sustained"
      ? 0.06 *
        Math.max(1, c.o2Percent - 10) *
        (c.pressurePsi / 14.7) ** 0.2 *
        (SPHERICAL_FUEL_FACTOR[c.fuel] ?? 1) *
        rng.lognormal(0.12)
      : null;
  return {
    ignited: true,
    outcome,
    flameSpreadRateMmS,
    burnDurationS:
      outcome === "sustained"
        ? d.maxBurnS * rng.uniform(0.6, 1)
        : outcome === "self-extinguished"
          ? rng.uniform(10, 80)
          : rng.uniform(2, 20),
    peakTemperatureK: d.measuresTemperature
      ? 1700 +
        15 * o2x -
        5 * (c.diluentPercent ?? 0) -
        (outcome === "sustained" ? 0 : 150) +
        rng.normal(0, 40)
      : null,
    smokeObscurationPercent: null,
    extinctionDiameterMm: null,
  };
}

function gasCoolFlame(d: InvestigationDesign, c: Conditions, rng: Rng): Result {
  // Hot flames only at the highest oxygen levels; cool flames favored by lower O2, higher pressure.
  const pCool =
    c.o2Percent > 72 ? 0 : sigmoid(-0.15 * (c.o2Percent - 50) + 0.35 * (c.pressurePsi - 10));
  const outcome = rollOutcome(
    rng,
    [
      ["cool-flame", pCool],
      ["self-extinguished", 0.08],
    ],
    "sustained"
  );
  const peakTemperatureK =
    outcome === "cool-flame"
      ? 680 + 1.2 * (c.o2Percent - 40) + rng.normal(0, 35)
      : 1900 + 6 * (c.o2Percent - 50) - (outcome === "sustained" ? 0 : 150) + rng.normal(0, 40);
  return {
    ignited: true,
    outcome,
    flameSpreadRateMmS:
      outcome === "sustained"
        ? 0.05 * (c.o2Percent - 10) * (c.pressurePsi / 14.7) ** 0.2 * rng.lognormal(0.12)
        : null,
    burnDurationS:
      outcome === "sustained"
        ? d.maxBurnS * rng.uniform(0.6, 1)
        : outcome === "cool-flame"
          ? rng.uniform(40, d.maxBurnS)
          : rng.uniform(5, 40),
    peakTemperatureK: d.measuresTemperature ? peakTemperatureK : null,
    smokeObscurationPercent: null,
    extinctionDiameterMm: null,
  };
}

function droplet(d: InvestigationDesign, c: Conditions, rng: Rng): Result {
  const d0 = c.sampleSizeMm;
  const dil = c.diluentPercent ?? 0;
  const normalG = c.gravityLevel === "normal";
  const dilRatio = c.diluent ? (DILUENT_DROPLET_RATIO[c.diluent] ?? 0.004) * dil : 0;
  // Extinction-to-initial diameter ratio falls as O2 rises.
  let ratio =
    clamp(0.8 - 0.03 * (c.o2Percent - 12) + dilRatio, 0.02, 0.9) * rng.lognormal(0.12);
  if (normalG) ratio *= 0.7;
  ratio = clamp(ratio, 0.02, 0.92);

  const pQuench = c.diluent
    ? sigmoid(quenchStrength(c) - 2.2 - 0.1 * (c.o2Percent - 21))
    : 0;
  const coolFlameCapable = COOL_FLAME_FUELS.test(c.fuel);
  const pCool =
    d.kind === "droplet-coolflame"
      ? coolFlameCapable
        ? sigmoid(-0.35 * (c.o2Percent - 17) + 0.25 * (c.pressurePsi - 10))
        : 0
      : coolFlameCapable && c.o2Percent < 18 && c.pressurePsi >= 10
        ? 0.3
        : 0;

  let outcome: Outcome;
  let extRatio = ratio;
  if (rng.chance(pQuench)) {
    outcome = "quenched";
    extRatio = clamp(ratio + 0.2, 0.05, 0.95);
  } else if (!normalG && rng.chance(pCool)) {
    outcome = "cool-flame";
    extRatio = ratio * 0.6;
  } else if (ratio < 0.25) {
    outcome = "sustained";
  } else {
    outcome = "self-extinguished";
  }

  const extinctionDiameterMm = d0 * extRatio;
  const fuelK = /methanol/i.test(c.fuel) ? 0.8 : 1;
  const hotK = Math.max(
    0.2,
    (0.5 + 0.012 * (c.o2Percent - 21)) * fuelK * (normalG ? 1.3 : 1) * rng.lognormal(0.08)
  );
  let burnDurationS: number;
  if (outcome === "cool-flame") {
    const hotExt = d0 * ratio;
    burnDurationS = (d0 ** 2 - hotExt ** 2) / hotK + (hotExt ** 2 - extinctionDiameterMm ** 2) / 0.18;
  } else {
    burnDurationS = (d0 ** 2 - extinctionDiameterMm ** 2) / hotK;
  }
  burnDurationS = Math.min(d.maxBurnS, burnDurationS);

  const peakTemperatureK = d.measuresTemperature
    ? outcome === "cool-flame"
      ? 700 + rng.normal(0, 30)
      : 1550 +
        14 * (c.o2Percent - 21) -
        3 * dil -
        (outcome === "quenched" ? 120 : 0) +
        rng.normal(0, 40)
    : null;

  return {
    ignited: true,
    outcome,
    flameSpreadRateMmS: null,
    burnDurationS,
    peakTemperatureK,
    smokeObscurationPercent: null,
    extinctionDiameterMm,
  };
}

function simulateOutcome(d: InvestigationDesign, c: Conditions, rng: Rng): Result {
  if (d.kind === "solid-pyrolysis") return solidPyrolysis(d, c, rng);
  if (d.kind === "dust") return NO_IGNITION;
  const pIgnite = ignitionProbability(d, c, rng);
  if (!rng.chance(pIgnite)) return NO_IGNITION;
  switch (d.kind) {
    case "solid-spread":
      return solidSpread(d, c, rng);
    case "gas-burner":
      return gasBurner(d, c, rng);
    case "gas-jet":
      return gasJet(d, c, rng);
    case "gas-spherical":
      return gasSpherical(d, c, rng);
    case "gas-coolflame":
      return gasCoolFlame(d, c, rng);
    case "droplet":
    case "droplet-coolflame":
      return droplet(d, c, rng);
  }
}

export function inSyntheticSolidGap(run: Pick<TestRun, "o2Percent" | "pressurePsi">): boolean {
  return (
    run.o2Percent >= SYNTHETIC_SOLID_GAP.o2Min &&
    run.o2Percent <= SYNTHETIC_SOLID_GAP.o2Max &&
    run.pressurePsi < SYNTHETIC_SOLID_GAP.pressureMaxPsi
  );
}

export function simulateRun(d: InvestigationDesign, rng: Rng, index: number): TestRun {
  const c = sampleConditions(d, rng);
  if (d.fuelPhase === "solid" && inSyntheticSolidGap(c)) {
    throw new Error(
      `Design ${d.id} produced a solid run inside the deliberate coverage gap (${c.o2Percent.toFixed(1)}% O2, ${c.pressurePsi.toFixed(2)} psi). Adjust its o2Levels/pressureLevels.`
    );
  }
  const r = simulateOutcome(d, c, rng);
  const nullableRound = (v: number | null, digits: number) =>
    v === null ? null : round(v, digits);
  return {
    testId: `${d.id}-${String(index + 1).padStart(3, "0")}`,
    investigationId: d.id,
    o2Percent: round(c.o2Percent, 1),
    pressurePsi: round(c.pressurePsi, 2),
    flowCmS: nullableRound(c.flowCmS, 1),
    diluent: c.diluent,
    diluentPercent: nullableRound(c.diluentPercent, 1),
    gravityLevel: c.gravityLevel,
    fuel: c.fuel,
    sampleSizeMm: round(c.sampleSizeMm, 1),
    ignited: r.ignited,
    outcome: r.outcome,
    flameSpreadRateMmS: nullableRound(r.flameSpreadRateMmS, 2),
    burnDurationS: round(r.burnDurationS, 1),
    peakTemperatureK: nullableRound(r.peakTemperatureK, 0),
    smokeObscurationPercent: nullableRound(r.smokeObscurationPercent, 1),
    extinctionDiameterMm: nullableRound(r.extinctionDiameterMm, 2),
    dataSource: "synthetic",
  };
}

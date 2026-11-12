import type { TestRun } from "@/lib/schema";
import type { InvestigationDesign } from "./designs";

/**
 * Key findings are filled from templates with statistics computed from the
 * generated test runs, so every number in a finding matches tests.json.
 */

const mean = (xs: readonly number[]) =>
  xs.length === 0 ? NaN : xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((100 * n) / d));
const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const a = sorted[lo] as number;
  const b = sorted[hi] as number;
  return a + (b - a) * (idx - lo);
}

function ignitionFinding(tests: readonly TestRun[]): string | null {
  const ignited = tests.filter((t) => t.ignited);
  if (ignited.length === 0) return null;
  const lowest = ignited.reduce((a, b) =>
    a.o2Percent * a.pressurePsi <= b.o2Percent * b.pressurePsi ? a : b
  );
  return `Ignition in ${ignited.length} of ${tests.length} runs; the lowest O2 partial pressure that ignited was ${f2((lowest.o2Percent / 100) * lowest.pressurePsi)} psi (${f1(lowest.o2Percent)}% O2 at ${f1(lowest.pressurePsi)} psi).`;
}

/** Group runs into O2 level bins (nearest whole percent). */
function o2Bins(runs: readonly TestRun[]): Array<{ level: number; runs: TestRun[] }> {
  const m = new Map<number, TestRun[]>();
  for (const t of runs) {
    const level = Math.round(t.o2Percent);
    const arr = m.get(level) ?? [];
    arr.push(t);
    m.set(level, arr);
  }
  return [...m.entries()].map(([level, r]) => ({ level, runs: r })).sort((a, b) => a.level - b.level);
}

function spreadVsO2Finding(tests: readonly TestRun[], label: string): string | null {
  const s = tests.filter((t) => t.flameSpreadRateMmS !== null);
  const bins = o2Bins(s).filter((b) => b.runs.length >= 2);
  const low = bins[0];
  const high = bins[bins.length - 1];
  if (!low || !high || high.level - low.level < 3) return null;
  const rate = (r: TestRun[]) => mean(r.map((t) => t.flameSpreadRateMmS as number));
  const lowRate = rate(low.runs);
  const highRate = rate(high.runs);
  const change = Math.round(((highRate - lowRate) / lowRate) * 100);
  const verb = change >= 0 ? "increased" : "decreased";
  return `Mean ${label} ${verb} about ${Math.abs(change)}% between ~${low.level}% and ~${high.level}% O2 (${f2(lowRate)} to ${f2(highRate)} mm/s, sustained runs).`;
}

function spreadSummaryFinding(tests: readonly TestRun[]): string | null {
  const s = tests.filter((t) => t.flameSpreadRateMmS !== null);
  if (s.length < 4) return null;
  const rates = s.map((t) => t.flameSpreadRateMmS as number);
  const size = mean(s.map((t) => t.sampleSizeMm));
  return `${s.length} sustained flames spread at ${f2(mean(rates))} mm/s on average (range ${f2(Math.min(...rates))} to ${f2(Math.max(...rates))} mm/s) over ~${Math.round(size)} mm samples.`;
}

function materialRankingFinding(tests: readonly TestRun[]): string | null {
  const s = tests.filter((t) => t.flameSpreadRateMmS !== null);
  const byFuel = new Map<string, number[]>();
  for (const t of s) {
    const arr = byFuel.get(t.fuel) ?? [];
    arr.push(t.flameSpreadRateMmS as number);
    byFuel.set(t.fuel, arr);
  }
  const ranked = [...byFuel.entries()]
    .filter(([, v]) => v.length >= 2)
    .map(([fuel, v]) => ({ fuel, m: mean(v) }))
    .sort((a, b) => b.m - a.m);
  if (ranked.length < 2) return null;
  const top = ranked[0] as { fuel: string; m: number };
  const bottom = ranked[ranked.length - 1] as { fuel: string; m: number };
  return `${top.fuel} spread fastest (${f2(top.m)} mm/s mean) and ${bottom.fuel} slowest (${f2(bottom.m)} mm/s), a ${(top.m / bottom.m).toFixed(1)}x difference across ${ranked.length} materials.`;
}

function spreadVsPressureFinding(tests: readonly TestRun[]): string | null {
  const s = tests.filter((t) => t.flameSpreadRateMmS !== null);
  const byLevel = new Map<number, { low: number[]; high: number[] }>();
  for (const t of s) {
    const level = Math.round(t.o2Percent);
    const entry = byLevel.get(level) ?? { low: [], high: [] };
    if (t.pressurePsi <= 11) entry.low.push(t.flameSpreadRateMmS as number);
    else if (t.pressurePsi >= 14) entry.high.push(t.flameSpreadRateMmS as number);
    byLevel.set(level, entry);
  }
  const ratios: number[] = [];
  for (const { low, high } of byLevel.values()) {
    if (low.length > 0 && high.length > 0) ratios.push(mean(low) / mean(high));
  }
  if (ratios.length < 2) return null;
  const diff = Math.round((1 - mean(ratios)) * 100);
  if (diff <= 0) return null;
  return `At matched O2 levels, spread at reduced pressure (11 psi or lower) averaged about ${diff}% slower than at 14.7 psi.`;
}

function flowFinding(tests: readonly TestRun[]): string | null {
  const micro = tests.filter((t) => t.ignited && t.gravityLevel !== "normal");
  const low = micro.filter((t) => (t.flowCmS ?? 0) < 5);
  const mid = micro.filter((t) => (t.flowCmS ?? 0) >= 5 && (t.flowCmS ?? 0) <= 30);
  const high = micro.filter((t) => (t.flowCmS ?? 0) > 30);
  if (low.length < 3 || mid.length < 3) return null;
  const selfLow = pct(low.filter((t) => t.outcome === "self-extinguished").length, low.length);
  const selfMid = pct(mid.filter((t) => t.outcome === "self-extinguished").length, mid.length);
  let text = `Below 5 cm/s, ${selfLow}% of ignited microgravity runs self-extinguished (oxygen starvation) versus ${selfMid}% at 5 to 30 cm/s.`;
  const blowCount = high.filter((t) => t.outcome === "blowoff").length;
  if (high.length >= 3 && blowCount > 0) {
    text += ` Above 30 cm/s, ${pct(blowCount, high.length)}% blew off.`;
  }
  return text;
}

function groundReferenceFinding(tests: readonly TestRun[]): string | null {
  const ground = tests.filter((t) => t.gravityLevel === "normal" && t.flameSpreadRateMmS !== null);
  const micro = tests.filter((t) => t.gravityLevel !== "normal" && t.flameSpreadRateMmS !== null);
  if (ground.length < 3 || micro.length < 3) return null;
  const g = mean(ground.map((t) => t.flameSpreadRateMmS as number));
  const m = mean(micro.map((t) => t.flameSpreadRateMmS as number));
  return `${ground.length} 1 g ground-reference runs averaged ${f2(g)} mm/s spread versus ${f2(m)} mm/s in microgravity.`;
}

function diluentFinding(tests: readonly TestRun[]): string | null {
  // Suppression effect: ignition prevented or flame quenched by the diluent.
  const extinct = (t: TestRun) => t.outcome === "quenched" || t.outcome === "no-ignition";
  const level = (t: TestRun) => Math.round((t.diluentPercent ?? 0) / 10) * 10;
  const co2 = tests.filter((t) => t.diluent === "carbon dioxide");
  const he = tests.filter((t) => t.diluent === "helium");
  const shared = new Set(co2.map(level).filter((l) => he.some((t) => level(t) === l)));
  const co2m = co2.filter((t) => shared.has(level(t)));
  const hem = he.filter((t) => shared.has(level(t)));
  if (co2m.length >= 4 && hem.length >= 4) {
    const levels = [...shared].sort((a, b) => a - b);
    return `At matched diluent levels (${levels[0]} to ${levels[levels.length - 1]}%), carbon dioxide prevented ignition or quenched the flame in ${pct(co2m.filter(extinct).length, co2m.length)}% of runs versus ${pct(hem.filter(extinct).length, hem.length)}% with helium.`;
  }
  const n2 = tests.filter((t) => t.diluent === "nitrogen" && (t.diluentPercent ?? 0) >= 15);
  const none = tests.filter((t) => t.diluent === null);
  if (n2.length >= 4 && none.length >= 4) {
    const withN2 = pct(n2.filter(extinct).length, n2.length);
    const without = pct(none.filter(extinct).length, none.length);
    if (withN2 - without < 10) return null;
    return `With 15% or more nitrogen dilution, ${withN2}% of runs failed to ignite or were quenched, versus ${without}% undiluted.`;
  }
  return null;
}

function dropletFinding(tests: readonly TestRun[]): string | null {
  const s = tests.filter((t) => t.extinctionDiameterMm !== null && t.diluent === null);
  if (s.length < 6) return null;
  const o2s = s.map((t) => t.o2Percent).sort((a, b) => a - b);
  const lowCut = quantile(o2s, 1 / 3);
  const highCut = quantile(o2s, 2 / 3);
  const low = s.filter((t) => t.o2Percent <= lowCut);
  const high = s.filter((t) => t.o2Percent >= highCut);
  if (low.length < 2 || high.length < 2) return null;
  const ratio = (t: TestRun) => (t.extinctionDiameterMm as number) / t.sampleSizeMm;
  return `Flame extinction diameter fell from ${Math.round(mean(low.map(ratio)) * 100)}% of initial droplet size at ~${f1(mean(low.map((t) => t.o2Percent)))}% O2 to ${Math.round(mean(high.map(ratio)) * 100)}% at ~${f1(mean(high.map((t) => t.o2Percent)))}% O2 (undiluted runs).`;
}

function coolFlameFinding(tests: readonly TestRun[]): string | null {
  const ignited = tests.filter((t) => t.ignited);
  const cool = ignited.filter((t) => t.outcome === "cool-flame");
  if (cool.length < 2) return null;
  const o2s = ignited.map((t) => t.o2Percent).sort((a, b) => a - b);
  const median = quantile(o2s, 0.5);
  const below = ignited.filter((t) => t.o2Percent <= median);
  const above = ignited.filter((t) => t.o2Percent > median);
  const share = (r: TestRun[]) => pct(r.filter((t) => t.outcome === "cool-flame").length, r.length);
  let text = `Cool flames made up ${share(below)}% of ignited runs at or below ${f1(median)}% O2 versus ${share(above)}% above it (${cool.length} cool-flame runs in total).`;
  const temps = cool.map((t) => t.peakTemperatureK).filter((v): v is number => v !== null);
  const hot = ignited
    .filter((t) => t.outcome === "sustained" || t.outcome === "self-extinguished")
    .map((t) => t.peakTemperatureK)
    .filter((v): v is number => v !== null);
  if (temps.length >= 2 && hot.length >= 2) {
    text += ` Cool flames peaked near ${Math.round(mean(temps))} K versus ${Math.round(mean(hot))} K for hot flames.`;
  }
  return text;
}

function blowoffFinding(tests: readonly TestRun[]): string | null {
  const flowing = tests.filter((t) => t.ignited && t.flowCmS !== null);
  if (flowing.length < 6 || !flowing.some((t) => t.outcome === "blowoff")) return null;
  const flows = flowing.map((t) => t.flowCmS as number).sort((a, b) => a - b);
  let threshold = 35;
  if (flowing.filter((t) => (t.flowCmS as number) > threshold).length < 3) {
    threshold = Math.round(quantile(flows, 0.5));
  }
  const above = flowing.filter((t) => (t.flowCmS as number) > threshold);
  const below = flowing.filter((t) => (t.flowCmS as number) <= threshold);
  if (above.length < 3 || below.length < 3) return null;
  const share = (r: TestRun[]) => pct(r.filter((t) => t.outcome === "blowoff").length, r.length);
  return `Blowoff ended ${share(above)}% of ignited runs with coflow above ${threshold} cm/s versus ${share(below)}% at or below it.`;
}

function smokeFinding(tests: readonly TestRun[]): string | null {
  const s = tests.filter((t) => t.smokeObscurationPercent !== null);
  if (s.length < 4) return null;
  const byFuel = new Map<string, number[]>();
  for (const t of s) {
    const arr = byFuel.get(t.fuel) ?? [];
    arr.push(t.smokeObscurationPercent as number);
    byFuel.set(t.fuel, arr);
  }
  let best = "";
  let bestMean = -Infinity;
  for (const [fuel, vals] of byFuel) {
    const m = mean(vals);
    if (m > bestMean) {
      bestMean = m;
      best = fuel;
    }
  }
  const all = s.map((t) => t.smokeObscurationPercent as number);
  return `Mean smoke obscuration was ${f1(mean(all))}% (max ${f1(Math.max(...all))}%) across ${byFuel.size} materials; ${best} produced the densest smoke (${f1(bestMean)}% mean).`;
}

function dustFinding(d: InvestigationDesign, tests: readonly TestRun[]): string | null {
  const shared = d.measurements.find((m) => m.includes("P-Trak"));
  if (!shared) return null;
  const fuels = new Set(tests.map((t) => t.fuel));
  return `Reused the ${shared} from SAME across ${tests.length} injection runs of ${fuels.size} particle types, giving a common calibration between smoke and dust measurements.`;
}

function temperatureFinding(tests: readonly TestRun[]): string | null {
  const s = tests.filter((t) => t.peakTemperatureK !== null && t.outcome === "sustained");
  if (s.length < 6) return null;
  const o2s = s.map((t) => t.o2Percent).sort((a, b) => a - b);
  const lowCut = quantile(o2s, 1 / 3);
  const highCut = quantile(o2s, 2 / 3);
  if (highCut - lowCut < 2) return null;
  const low = s.filter((t) => t.o2Percent <= lowCut).map((t) => t.peakTemperatureK as number);
  const high = s.filter((t) => t.o2Percent >= highCut).map((t) => t.peakTemperatureK as number);
  if (low.length < 2 || high.length < 2) return null;
  return `Peak flame temperature rose from ~${Math.round(mean(low))} K to ~${Math.round(mean(high))} K between the lowest and highest third of tested O2.`;
}

export function buildKeyFindings(d: InvestigationDesign, tests: readonly TestRun[]): string[] {
  const candidates: Array<string | null> = [];
  switch (d.kind) {
    case "solid-spread":
      candidates.push(
        spreadVsO2Finding(tests, "flame spread rate") ?? spreadSummaryFinding(tests),
        flowFinding(tests),
        materialRankingFinding(tests),
        spreadVsPressureFinding(tests),
        groundReferenceFinding(tests),
        smokeFinding(tests),
        diluentFinding(tests),
        ignitionFinding(tests)
      );
      break;
    case "solid-pyrolysis":
      candidates.push(smokeFinding(tests));
      break;
    case "dust":
      candidates.push(dustFinding(d, tests));
      break;
    case "gas-jet":
      candidates.push(blowoffFinding(tests), diluentFinding(tests), temperatureFinding(tests), ignitionFinding(tests));
      break;
    case "gas-burner":
      candidates.push(ignitionFinding(tests), temperatureFinding(tests), diluentFinding(tests));
      break;
    case "gas-spherical":
      candidates.push(
        diluentFinding(tests),
        spreadVsO2Finding(tests, "flame growth rate"),
        ignitionFinding(tests)
      );
      break;
    case "gas-coolflame":
      candidates.push(coolFlameFinding(tests), ignitionFinding(tests));
      break;
    case "droplet":
    case "droplet-coolflame":
      candidates.push(
        dropletFinding(tests),
        diluentFinding(tests),
        coolFlameFinding(tests),
        ignitionFinding(tests)
      );
      break;
  }
  return candidates.filter((c): c is string => c !== null).slice(0, 4);
}

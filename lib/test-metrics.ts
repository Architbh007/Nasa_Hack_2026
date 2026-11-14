import type { Run } from "@/lib/schema";

/** Labels for the measured values carried in Run.metrics (units are in the key). */
export const METRIC_LABEL: Record<string, string> = {
  burnTimeS: "Burn time (s)",
  burnDurationS: "Burn duration (s)",
  burningRate: "Burning rate (mm²/s)",
  extinctionDiameterMm: "Extinction diameter (mm)",
  dropletInitialDiameterMm: "Initial droplet diameter (mm)",
  hotFlameExtinctionDiameterMm: "Hot-flame extinction diameter (mm)",
  coolFlameExtinctionDiameterMm: "Cool-flame extinction diameter (mm)",
  hotFlameBurnTimeS: "Hot-flame burn time (s)",
  co2MmHg: "CO2 (mmHg)",
  o2FinalPercent: "Final O2 (%)",
  ignitionPowerW: "Igniter power (W)",
  ignitionTimeS: "Igniter time (s)",
  lengthCm: "Sample length (cm)",
  widthCm: "Sample width (cm)",
  thicknessCm: "Sample thickness (cm)",
  peakHeatReleaseW: "Peak heat release (W)",
  averageHeatReleaseW: "Average heat release (W)",
  maxTempSfuOutletC: "Max outlet temperature (°C)",
  co2IncreasePpm: "CO2 increase (ppm)",
  coIncreasePpm: "CO increase (ppm)",
};

export const metricLabel = (key: string) => METRIC_LABEL[key] ?? key;

/** Outcome-like metrics first, then sample and setup values. */
const PRIORITY = [
  "burningRate",
  "extinctionDiameterMm",
  "hotFlameBurnTimeS",
  "burnTimeS",
  "burnDurationS",
  "coolFlameExtinctionDiameterMm",
  "peakHeatReleaseW",
];

/** Metric keys measured in at least `min` runs, most informative first. */
export function availableMetrics(runs: readonly Run[], min = 3): string[] {
  const counts = new Map<string, number>();
  for (const r of runs) {
    for (const [k, v] of Object.entries(r.metrics)) if (v !== null) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const keys = [...counts.entries()].filter(([, n]) => n >= min).map(([k]) => k);
  const rank = (k: string) => (PRIORITY.includes(k) ? PRIORITY.indexOf(k) : PRIORITY.length);
  return keys.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** The most informative measured metric for a set of runs, or null if none was measured often enough. */
export function primaryMetric(runs: readonly Run[]): string | null {
  return availableMetrics(runs)[0] ?? null;
}

export function metricValue(r: Run, key: string): number | null {
  return r.metrics[key] ?? null;
}

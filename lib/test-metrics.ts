import type { TestRun } from "@/lib/schema";

export type MetricKey =
  | "flameSpreadRateMmS"
  | "extinctionDiameterMm"
  | "smokeObscurationPercent"
  | "peakTemperatureK"
  | "burnDurationS";

export const METRIC_LABEL: Record<MetricKey, string> = {
  flameSpreadRateMmS: "Flame spread rate (mm/s)",
  extinctionDiameterMm: "Extinction diameter (mm)",
  smokeObscurationPercent: "Smoke obscuration (%)",
  peakTemperatureK: "Peak temperature (K)",
  burnDurationS: "Burn duration (s)",
};

export const METRIC_SHORT: Record<MetricKey, string> = {
  flameSpreadRateMmS: "Spread",
  extinctionDiameterMm: "Extinction dia.",
  smokeObscurationPercent: "Obscuration",
  peakTemperatureK: "Peak temp.",
  burnDurationS: "Burn time",
};

export const METRIC_UNIT: Record<MetricKey, string> = {
  flameSpreadRateMmS: "mm/s",
  extinctionDiameterMm: "mm",
  smokeObscurationPercent: "%",
  peakTemperatureK: "K",
  burnDurationS: "s",
};

const PRIORITY: readonly MetricKey[] = [
  "flameSpreadRateMmS",
  "extinctionDiameterMm",
  "smokeObscurationPercent",
  "peakTemperatureK",
  "burnDurationS",
];

/** The most informative measured outcome metric for a set of runs, or null if none was measured. */
export function primaryMetric(tests: readonly TestRun[]): MetricKey | null {
  for (const key of PRIORITY) {
    const values = tests.map((t) => t[key]).filter((v): v is number => v !== null);
    if (values.length >= 3 && values.some((v) => v > 0)) return key;
  }
  return null;
}

/**
 * A metric value for plotting. Spread rate is 0 when there was no sustained
 * flame (no spread), so those runs stay on the chart; other metrics are only
 * plotted where measured.
 */
export function metricValue(t: TestRun, key: MetricKey): number | null {
  const v = t[key];
  if (v !== null) return v;
  return key === "flameSpreadRateMmS" ? 0 : null;
}

export function ignitionRate(tests: readonly TestRun[]): number {
  return tests.length === 0 ? 0 : tests.filter((t) => t.ignited).length / tests.length;
}

import type { Investigation } from "@/lib/schema";

export const fmt = (v: number, digits = 1) =>
  Number.isFinite(v) ? v.toFixed(digits) : "–";

export function formatRange(min: number, max: number, unit: string, digits = 1): string {
  if (Math.abs(max - min) < 10 ** -digits) return `${fmt(min, digits)}${unit}`;
  return `${fmt(min, digits)}–${fmt(max, digits)}${unit}`;
}

export const formatO2Range = (inv: Pick<Investigation, "oxygenRange">) =>
  formatRange(inv.oxygenRange.min, inv.oxygenRange.max, "%");

export const formatPressureRange = (inv: Pick<Investigation, "pressureRange">) =>
  formatRange(inv.pressureRange.minPsi, inv.pressureRange.maxPsi, " psi");

export const formatPressureRangeKPa = (inv: Pick<Investigation, "pressureRange">) =>
  formatRange(inv.pressureRange.minKPa, inv.pressureRange.maxKPa, " kPa", 0);

export const formatFlowRange = (inv: Pick<Investigation, "flowRange">) =>
  inv.flowRange ? formatRange(inv.flowRange.min, inv.flowRange.max, " cm/s") : "Quiescent";

export const formatYears = (inv: Pick<Investigation, "yearsActive">) =>
  inv.yearsActive.start === inv.yearsActive.end
    ? String(inv.yearsActive.start)
    : `${inv.yearsActive.start}–${inv.yearsActive.end}`;

export const percent = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

export const GRAVITY_LEVEL_LABEL: Record<Investigation["gravityLevel"], string> = {
  microgravity: "Microgravity",
  normal: "Normal gravity",
  "simulated-partial": "Simulated partial gravity",
};

/** "Combustion Integrated Rack (CIR)" -> "CIR"; drops generic words for compact table cells. */
export function shortHardware(name: string): string {
  const abbr = /\(([^)]+)\)/.exec(name);
  if (abbr?.[1]) return abbr[1];
  return name.replace(/ modular hardware$/i, "").replace(/ hardware$/i, "");
}

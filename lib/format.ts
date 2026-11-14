import { PRESSURE_STATUS_LABEL } from "@/lib/constants";
import type { Investigation, Run } from "@/lib/schema";

export const fmt = (v: number, digits = 1) => (Number.isFinite(v) ? v.toFixed(digits) : "–");

/** Trim trailing zeros: 14.70 -> 14.7, 21.00 -> 21. */
export const num = (v: number, digits = 2) => (Number.isFinite(v) ? String(Number(v.toFixed(digits))) : "–");

export function formatRange(min: number, max: number, unit: string, digits = 1): string {
  if (Math.abs(max - min) < 10 ** -digits) return `${num(min, digits)}${unit}`;
  return `${num(min, digits)}–${num(max, digits)}${unit}`;
}

const NOT_RECORDED = "Not recorded";

export const formatO2Range = (inv: Pick<Investigation, "ranges">) =>
  inv.ranges.o2Percent ? formatRange(inv.ranges.o2Percent.min, inv.ranges.o2Percent.max, "%") : NOT_RECORDED;

export const formatPressureRange = (inv: Pick<Investigation, "ranges">) =>
  inv.ranges.pressurePsi
    ? `${formatRange(inv.ranges.pressurePsi.min, inv.ranges.pressurePsi.max, " psi")}${inv.ranges.pressureIncludesAssumed ? "*" : ""}`
    : NOT_RECORDED;

export const formatFlowRange = (inv: Pick<Investigation, "ranges">) =>
  inv.ranges.flowCmS ? formatRange(inv.ranges.flowCmS.min, inv.ranges.flowCmS.max, " cm/s") : NOT_RECORDED;

/** PSI dates are MM-DD-YYYY; show the years only ("2009–2013", "2017–", or "Not listed"). */
export function formatYears(inv: Pick<Investigation, "startDate" | "endDate">): string {
  const year = (d: string) => /(\d{4})/.exec(d)?.[1] ?? null;
  const a = year(inv.startDate);
  const b = year(inv.endDate);
  if (!a && !b) return "Not listed";
  if (a && b) return a === b ? a : `${a}–${b}`;
  return a ? `${a}–` : `–${b}`;
}

export const percent = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

export function formatRunO2(r: Pick<Run, "o2Percent" | "o2Text">): string {
  if (r.o2Percent === null) return NOT_RECORDED;
  return r.o2Text && r.o2Text !== String(r.o2Percent) ? `${num(r.o2Percent)}% (source: ${r.o2Text})` : `${num(r.o2Percent)}%`;
}

export function formatRunPressure(r: Pick<Run, "pressurePsi" | "pressureStatus" | "pressureAssumedPsi">): string {
  if (r.pressurePsi !== null) return `${num(r.pressurePsi)} psi (${PRESSURE_STATUS_LABEL[r.pressureStatus].toLowerCase()})`;
  if (r.pressureAssumedPsi !== null) return `Not recorded (ISS nominal ${num(r.pressureAssumedPsi)} psi used for placement)`;
  return NOT_RECORDED;
}

export function formatRunFlow(r: Pick<Run, "flowMinCmS" | "flowMaxCmS" | "flowText">): string {
  if (r.flowMinCmS === null || r.flowMaxCmS === null) return r.flowText ? `"${r.flowText}"` : NOT_RECORDED;
  return formatRange(r.flowMinCmS, r.flowMaxCmS, " cm/s");
}

/** "Combustion Integrated Rack (CIR)" -> "CIR"; drops generic words for compact table cells. */
export function shortHardware(name: string): string {
  const abbr = /\(([^)]+)\)/.exec(name);
  if (abbr?.[1]) return abbr[1];
  return name.replace(/ modular hardware$/i, "").replace(/ hardware$/i, "");
}

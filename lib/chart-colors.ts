import type { Category, Outcome } from "@/lib/schema";

/**
 * Chart palette (dark surface #16171b). Hues validated with the dataviz
 * palette checker. Assign categorical slots in this fixed order, never cycled.
 */
export const SERIES_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500"] as const;
/** Recharts marker shapes paired with series slots (secondary encoding). */
export const SERIES_SHAPES = ["circle", "triangle", "diamond", "square"] as const;
export type MarkerShape = (typeof SERIES_SHAPES)[number] | "cross" | "wye" | "star";

export const NEUTRAL_MARK = "#62666e";

/** Fuel category identity colors; the first three pass all-pairs CVD checks, smoke/dust is neutral. */
export const CATEGORY_COLOR: Record<Category, string> = {
  solid: "#3987e5",
  liquid: "#c98500",
  gas: "#199e70",
  "smoke-dust": "#8d9ab0",
};

export const CATEGORY_SHAPE: Record<Category, MarkerShape> = {
  solid: "circle",
  liquid: "diamond",
  gas: "triangle",
  "smoke-dust": "square",
};

export type OutcomeGroup = "burned" | "extinguished" | "cool-flame" | "disruption" | "no-ignition" | "unknown";

export const OUTCOME_GROUP: Record<Outcome, OutcomeGroup> = {
  burned: "burned",
  extinguished: "extinguished",
  blowoff: "extinguished",
  "cool-flame": "cool-flame",
  disruption: "disruption",
  "no-ignition": "no-ignition",
  unknown: "unknown",
};

export const OUTCOME_GROUP_STYLE: Record<OutcomeGroup, { label: string; color: string; shape: MarkerShape }> = {
  burned: { label: "Burned", color: "#d95926", shape: "circle" },
  extinguished: { label: "Extinguished or blew off", color: "#3987e5", shape: "triangle" },
  "cool-flame": { label: "Cool flame", color: "#199e70", shape: "diamond" },
  disruption: { label: "Droplet disruption", color: "#c98500", shape: "square" },
  "no-ignition": { label: "No ignition", color: NEUTRAL_MARK, shape: "cross" },
  unknown: { label: "Outcome not stated", color: "#8a96a3", shape: "wye" },
};

export const OUTCOME_GROUP_ORDER: readonly OutcomeGroup[] = ["burned", "extinguished", "cool-flame", "disruption", "no-ignition", "unknown"];

/** Chart chrome on the dark card surface. */
export const CHART_INK = {
  grid: "#1c2533",
  axis: "#3a4658",
  tick: "#95a2b6",
  label: "#c5cedb",
  surface: "#0c111b",
};

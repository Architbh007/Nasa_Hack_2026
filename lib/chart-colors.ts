import type { FuelPhase, Outcome } from "@/lib/schema";

/**
 * Chart palette (dark surface #16171b). Hues validated with the dataviz
 * palette checker. Assign categorical slots in this fixed order, never cycled.
 */
export const SERIES_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500"] as const;
/** Recharts marker shapes paired with series slots (secondary encoding). */
export const SERIES_SHAPES = ["circle", "triangle", "diamond", "square"] as const;
export type MarkerShape = (typeof SERIES_SHAPES)[number] | "cross";

/** Fuel phase identity colors; this trio passes all-pairs CVD checks. */
export const FUEL_PHASE_COLOR: Record<FuelPhase, string> = {
  solid: "#3987e5",
  liquid: "#c98500",
  gas: "#199e70",
};

export const NEUTRAL_MARK = "#62666e";

export type OutcomeGroup = "sustained" | "extinguished" | "cool-flame" | "no-ignition";

export const OUTCOME_GROUP: Record<Outcome, OutcomeGroup> = {
  sustained: "sustained",
  "self-extinguished": "extinguished",
  blowoff: "extinguished",
  quenched: "extinguished",
  "cool-flame": "cool-flame",
  "no-ignition": "no-ignition",
};

export const OUTCOME_GROUP_STYLE: Record<
  OutcomeGroup,
  { label: string; color: string; shape: MarkerShape }
> = {
  sustained: { label: "Sustained flame", color: "#d95926", shape: "circle" },
  extinguished: {
    label: "Extinguished (self, blowoff, quenched)",
    color: "#3987e5",
    shape: "triangle",
  },
  "cool-flame": { label: "Cool flame", color: "#199e70", shape: "diamond" },
  "no-ignition": { label: "No ignition", color: NEUTRAL_MARK, shape: "cross" },
};

export const OUTCOME_GROUP_ORDER: readonly OutcomeGroup[] = [
  "sustained",
  "extinguished",
  "cool-flame",
  "no-ignition",
];

export const IGNITION_STYLE = {
  ignited: { label: "Ignited", color: "#d95926", shape: "circle" as MarkerShape },
  notIgnited: { label: "Did not ignite", color: NEUTRAL_MARK, shape: "cross" as MarkerShape },
};

/** Chart chrome on the dark card surface. */
export const CHART_INK = {
  grid: "#25272c",
  axis: "#3a3d44",
  tick: "#9a9fa9",
  label: "#b4b8c0",
  surface: "#16171b",
};

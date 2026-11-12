import type { FuelPhase, HabitatKey, SafetyPillar } from "@/lib/schema";

export type ExploreFilters = {
  query: string;
  fuelPhase: FuelPhase | "all";
  hardware: string;
  pillar: SafetyPillar | "all";
  habitat: HabitatKey | "all";
  o2: [number, number];
};

export const DEFAULT_FILTERS: ExploreFilters = {
  query: "",
  fuelPhase: "all",
  hardware: "all",
  pillar: "all",
  habitat: "all",
  o2: [0, 100],
};

/** Minimum habitat relevance score for the habitat filter. */
export const HABITAT_MIN_SCORE = 3;

export const MAX_COMPARE = 4;

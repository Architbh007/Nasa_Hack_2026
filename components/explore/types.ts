import type { Category, DataLevel, SafetyPillar } from "@/lib/schema";

export type ExploreFilters = {
  query: string;
  category: Category | "all";
  dataLevel: DataLevel | "all";
  hardware: string;
  pillar: SafetyPillar | "all";
  /** Tested O2 range filter; investigations without run-level O2 are hidden once it is narrowed. */
  o2: [number, number];
};

export const DEFAULT_FILTERS: ExploreFilters = {
  query: "",
  category: "all",
  dataLevel: "all",
  hardware: "all",
  pillar: "all",
  o2: [0, 100],
};

export const MAX_COMPARE = 4;

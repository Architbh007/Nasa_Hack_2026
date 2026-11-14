import type { FuelCategory, Verdict } from "@/lib/habitat";
import type { Airflow, HabitatGravity, SafetyPillar, Scenario } from "@/lib/schema";

export type ScenarioCardData = {
  id: string;
  label: string;
  description: string;
  o2Percent: number;
  pressurePsi: number;
  gravity: HabitatGravity;
  airflow: Airflow;
  pO2Psi: number;
  source: Scenario["source"];
  verdicts: Array<{
    category: FuelCategory;
    verdict: Verdict;
    reason: string;
    nearest: Array<{ runId: string; investigationId: string; acronym: string; o2Percent: number; pressurePsi: number; outcome: string }>;
  }>;
  pillars: Array<{ pillar: SafetyPillar; withRuns: number; investigations: Array<{ id: string; acronym: string; hasRuns: boolean }> }>;
  /** Real runs per distance band and category (for the chart). */
  bands: Array<{ band: string } & Record<FuelCategory, number>>;
  best: Array<{ id: string; acronym: string; name: string; score: number }>;
  gaps: string[];
};

import type { RiskBand } from "@/lib/habitat";
import type { Airflow, HabitatGravity, SafetyPillar } from "@/lib/schema";

export type ScenarioCardData = {
  id: string;
  label: string;
  description: string;
  o2Percent: number;
  pressurePsi: number;
  gravity: HabitatGravity;
  airflow: Airflow;
  pO2Psi: number;
  ignitionProbability: number;
  riskBand: RiskBand;
  gap: boolean;
  overall: number;
  nearbyTests: number;
  pillars: Array<{ pillar: SafetyPillar; score: number; best: Array<{ id: string; acronym: string }> }>;
  best: Array<{ id: string; acronym: string; name: string; score: number }>;
  gaps: string[];
};

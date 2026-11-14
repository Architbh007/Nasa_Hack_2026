import investigationsJson from "@/data/investigations.json";
import runsJson from "@/data/runs.json";
import scenariosJson from "@/data/scenarios.json";
import summariesJson from "@/data/summaries.json";
import {
  InvestigationsFileSchema,
  RunsFileSchema,
  ScenariosFileSchema,
  SummariesFileSchema,
  type Investigation,
  type Run,
  type Scenario,
  type Summary,
} from "@/lib/schema";

/**
 * Server-side dataset access. The JSON files are built from data/real/ by `npm run build:data`,
 * imported statically (so they are bundled for serverless deploys) and validated once with zod.
 */
export type Dataset = {
  investigations: Investigation[];
  runs: Run[];
  summaries: Summary[];
  scenarios: Scenario[];
  investigationById: Map<string, Investigation>;
  runById: Map<string, Run>;
  runsByInvestigation: Map<string, Run[]>;
  summariesByInvestigation: Map<string, Summary[]>;
};

let cached: Dataset | null = null;

function groupBy<T>(items: readonly T[], key: (t: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    out.set(k, [...(out.get(k) ?? []), item]);
  }
  return out;
}

export function getDataset(): Dataset {
  if (cached) return cached;
  const investigations = InvestigationsFileSchema.parse(investigationsJson as unknown);
  const runs = RunsFileSchema.parse(runsJson as unknown);
  const summaries = SummariesFileSchema.parse(summariesJson as unknown);
  const scenarios = ScenariosFileSchema.parse(scenariosJson as unknown);
  cached = {
    investigations,
    runs,
    summaries,
    scenarios,
    investigationById: new Map(investigations.map((i) => [i.id, i])),
    runById: new Map(runs.map((r) => [r.id, r])),
    runsByInvestigation: groupBy(runs, (r) => r.investigationId),
    summariesByInvestigation: groupBy(summaries, (s) => s.investigationId),
  };
  return cached;
}

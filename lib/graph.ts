import { HABITAT_KEYS, type FuelPhase, type Investigation } from "@/lib/schema";
import { edgeId, similarityEdges, type EdgeLabel, type SimilarityResult } from "@/lib/similarity";

export type GraphNode = {
  id: string;
  acronym: string;
  name: string;
  project: string;
  fuelPhase: FuelPhase;
  avgRelevance: number;
};

export type GraphLink = {
  id: string;
  source: string;
  target: string;
  score: number;
  label: EdgeLabel;
  similarity: SimilarityResult;
};

export const DEFAULT_THRESHOLD = 0.25;

export function averageRelevance(inv: Investigation): number {
  return HABITAT_KEYS.reduce((s, k) => s + inv.habitatRelevance[k].score, 0) / HABITAT_KEYS.length;
}

export function buildNodes(investigations: readonly Investigation[]): GraphNode[] {
  return investigations.map((i) => ({
    id: i.id,
    acronym: i.acronym,
    name: i.name,
    project: i.project,
    fuelPhase: i.fuelPhase,
    avgRelevance: averageRelevance(i),
  }));
}

export function buildLinks(investigations: readonly Investigation[], threshold: number): GraphLink[] {
  return similarityEdges(investigations, threshold).map((s) => ({
    id: s.id,
    source: s.source,
    target: s.target,
    score: s.score,
    label: s.label,
    similarity: s,
  }));
}

export type Insight = {
  id: string;
  title: string;
  body: string;
  nodeIds: string[];
  /** Edges to highlight (by edge id); the first one is selected when the insight is opened. */
  edgeIds: string[];
};

/** Built-in callouts for links worth pointing out in a demo. */
export const INSIGHTS: readonly Insight[] = [
  {
    id: "same-daft",
    title: "Instrument reuse: SAME to DAFT",
    body: "DAFT and DAFT-2 reused the TSI P-Trak particle counter flown on SAME, so smoke and dust measurements share a calibration. That shared instrument is the only link between otherwise unrelated detection studies.",
    nodeIds: ["same", "same-r", "daft", "daft-2"],
    edgeIds: [edgeId("same", "daft"), edgeId("same", "daft-2"), edgeId("same-r", "daft"), edgeId("same-r", "daft-2")],
  },
  {
    id: "spice-duct",
    title: "The SPICE flow duct family",
    body: "SPICE, SLICE, BASS and BASS-II all ran in the Microgravity Science Glovebox using the same fan-driven flow duct, which is why gas-jet and solid-fuel studies sit in one cluster.",
    nodeIds: ["spice", "slice", "bass", "bass-ii"],
    edgeIds: [
      edgeId("spice", "bass"),
      edgeId("spice", "bass-ii"),
      edgeId("spice", "slice"),
      edgeId("slice", "bass"),
      edgeId("slice", "bass-ii"),
      edgeId("bass", "bass-ii"),
    ],
  },
];

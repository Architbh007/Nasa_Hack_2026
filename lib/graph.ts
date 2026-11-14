import type { Category, DataLevel, Investigation } from "@/lib/schema";
import { edgeId, similarityEdges, type EdgeLabel, type SimilarityResult } from "@/lib/similarity";

export type GraphNode = {
  id: string;
  acronym: string;
  name: string;
  project: string;
  category: Category;
  dataLevel: DataLevel;
  /** Node size: run-level tests held (0 for investigations without run tables). */
  runCount: number;
};

export type GraphLink = {
  id: string;
  source: string;
  target: string;
  score: number;
  label: EdgeLabel;
  similarity: SimilarityResult;
};

export const DEFAULT_THRESHOLD = 0.3;

export function buildNodes(investigations: readonly Investigation[]): GraphNode[] {
  return investigations.map((i) => ({
    id: i.id,
    acronym: i.acronym,
    name: i.name,
    project: i.project,
    category: i.category,
    dataLevel: i.dataLevel,
    runCount: i.runCount,
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
  /** Where the claim comes from, shown under the insight. */
  source: string;
  nodeIds: string[];
  /** Edges to highlight (by edge id); the first one is selected when the insight is opened. */
  edgeIds: string[];
};

/** Built-in callouts. Each one restates what a PSI record says; nothing is inferred. */
export const INSIGHTS: readonly Insight[] = [
  {
    id: "daft-same",
    title: "DAFT de-risked SAME's particle counter",
    body: "SAME relied on a commercial TSI P-Trak counter to measure smoke particles. DAFT and DAFT-2 tested whether a modified P-Trak would stay accurate in microgravity, where it cannot rely on gravity to recycle its alcohol.",
    source: "PSI-47 (DAFT / DAFT-2) objectives; PSI lists PSI-102 (SAME) as related.",
    nodeIds: ["daft", "same", "same-r"],
    edgeIds: [edgeId("daft", "same"), edgeId("same", "same-r")],
  },
  {
    id: "glovebox-family",
    title: "The glovebox family",
    body: "PSI lists BASS, BASS-II and SPICE as running in the Microgravity Science Glovebox, records BASS as related to BASS-II and SPICE, and records SLICE as related to SPICE.",
    source: "PSI-26, PSI-25, PSI-107 and PSI-106 hardware and related-investigation fields.",
    nodeIds: ["bass", "bass-ii", "spice", "slice"],
    edgeIds: [edgeId("bass", "bass-ii"), edgeId("bass", "spice"), edgeId("slice", "spice")],
  },
  {
    id: "saffire-line",
    title: "Saffire: one line of flights",
    body: "PSI links Saffire-I to Saffire-II, Saffire-III and BASS. The later flights (IV to VI) are not in the PSI combustion archive; their values here come from NASA papers.",
    source: "PSI-98 related-investigation field; Saffire IV-VI papers (NTRS 20240002981, 20210011521).",
    nodeIds: ["saffire-i", "saffire-ii", "saffire-iii", "saffire-iv-vi", "bass"],
    edgeIds: [edgeId("saffire-i", "saffire-ii"), edgeId("saffire-i", "saffire-iii"), edgeId("saffire-i", "bass")],
  },
];

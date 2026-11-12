import type { Investigation } from "@/lib/schema";

/**
 * Investigation similarity: weighted Jaccard over set-valued attributes.
 * Components where both sides are empty (e.g. no diluents on either) are
 * skipped and the remaining weights renormalized.
 */

export const SIMILARITY_KEYS = [
  "hardware",
  "fuels",
  "fuelPhase",
  "measurements",
  "diluents",
  "safetyPillars",
] as const;
export type SimilarityKey = (typeof SIMILARITY_KEYS)[number];

export type SimilarityWeights = Record<SimilarityKey, number>;

export const DEFAULT_SIMILARITY_WEIGHTS: SimilarityWeights = {
  hardware: 0.25,
  fuels: 0.2,
  fuelPhase: 0.1,
  measurements: 0.3,
  diluents: 0.05,
  safetyPillars: 0.1,
};

export type EdgeLabel = "shared hardware" | "shared fuel" | "shared instrument" | "shared variable";

export type SimilarityComponent = {
  jaccard: number | null;
  shared: string[];
  weight: number;
};

export type SimilarityResult = {
  id: string;
  source: string;
  target: string;
  score: number;
  components: Record<SimilarityKey, SimilarityComponent>;
  sharedVariables: string[];
  label: EdgeLabel;
};

function setOf(inv: Investigation, key: SimilarityKey): string[] {
  switch (key) {
    case "fuelPhase":
      return [inv.fuelPhase];
    case "hardware":
      return inv.hardware;
    case "fuels":
      return inv.fuels;
    case "measurements":
      return inv.measurements;
    case "diluents":
      return inv.diluents;
    case "safetyPillars":
      return inv.safetyPillars;
  }
}

export function jaccard(a: readonly string[], b: readonly string[]): { value: number | null; shared: string[] } {
  const A = new Set(a.map((s) => s.toLowerCase()));
  const B = new Set(b.map((s) => s.toLowerCase()));
  if (A.size === 0 && B.size === 0) return { value: null, shared: [] };
  const shared = a.filter((s, i) => B.has(s.toLowerCase()) && a.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i);
  const union = new Set([...A, ...B]).size;
  return { value: shared.length / union, shared };
}

export function edgeId(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

function pickLabel(components: Record<SimilarityKey, SimilarityComponent>, sharedVariables: string[]): EdgeLabel {
  const all: Array<{ label: EdgeLabel; contribution: number }> = [
    {
      label: "shared hardware",
      contribution: (components.hardware.jaccard ?? 0) * components.hardware.weight,
    },
    {
      label: "shared instrument",
      contribution: (components.measurements.jaccard ?? 0) * components.measurements.weight,
    },
    { label: "shared fuel", contribution: (components.fuels.jaccard ?? 0) * components.fuels.weight },
  ];
  const candidates = all.filter((c) => c.contribution > 0);
  if (candidates.length === 0) return sharedVariables.length > 0 ? "shared variable" : "shared fuel";
  // Hardware wins ties: a common facility is the strongest kind of link.
  candidates.sort((a, b) => b.contribution - a.contribution || (a.label === "shared hardware" ? -1 : 1));
  return (candidates[0] as { label: EdgeLabel }).label;
}

export function similarity(
  a: Investigation,
  b: Investigation,
  weights: SimilarityWeights = DEFAULT_SIMILARITY_WEIGHTS
): SimilarityResult {
  let num = 0;
  let den = 0;
  const components = {} as Record<SimilarityKey, SimilarityComponent>;
  for (const key of SIMILARITY_KEYS) {
    const { value, shared } = jaccard(setOf(a, key), setOf(b, key));
    components[key] = { jaccard: value, shared, weight: weights[key] };
    if (value !== null) {
      num += weights[key] * value;
      den += weights[key];
    }
  }
  const sharedVariables = jaccard(a.variables, b.variables).shared;
  const [source, target] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
  return {
    id: edgeId(a.id, b.id),
    source,
    target,
    score: den === 0 ? 0 : num / den,
    components,
    sharedVariables,
    label: pickLabel(components, sharedVariables),
  };
}

/** All pairwise similarities at or above a threshold, strongest first. */
export function similarityEdges(
  investigations: readonly Investigation[],
  threshold: number,
  weights: SimilarityWeights = DEFAULT_SIMILARITY_WEIGHTS
): SimilarityResult[] {
  const edges: SimilarityResult[] = [];
  for (let i = 0; i < investigations.length; i++) {
    for (let j = i + 1; j < investigations.length; j++) {
      const s = similarity(investigations[i] as Investigation, investigations[j] as Investigation, weights);
      if (s.score >= threshold) edges.push(s);
    }
  }
  return edges.sort((x, y) => y.score - x.score || x.id.localeCompare(y.id));
}

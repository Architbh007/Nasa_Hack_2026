import { materialClassForFuel } from "@/lib/materials";
import type { Investigation } from "@/lib/schema";

/**
 * Investigation similarity: weighted Jaccard over set-valued attributes taken from the PSI
 * records (related-investigation links, hardware, project) plus the team's category and the
 * material classes of the fuels each one burned. Components where both sides are empty are
 * skipped and the remaining weights renormalized.
 */

export const SIMILARITY_KEYS = ["related", "hardware", "project", "materials", "category"] as const;
export type SimilarityKey = (typeof SIMILARITY_KEYS)[number];
export type SimilarityWeights = Record<SimilarityKey, number>;

export const DEFAULT_SIMILARITY_WEIGHTS: SimilarityWeights = {
  related: 0.35,
  hardware: 0.3,
  project: 0.1,
  materials: 0.15,
  category: 0.1,
};

export const SIMILARITY_LABEL: Record<SimilarityKey, string> = {
  related: "Related in PSI",
  hardware: "Hardware",
  project: "Project",
  materials: "Material classes",
  category: "Fuel category",
};

export type EdgeLabel = "PSI-listed relation" | "shared hardware" | "same project" | "shared material";

export type SimilarityComponent = { jaccard: number | null; shared: string[]; weight: number };

export type SimilarityResult = {
  id: string;
  source: string;
  target: string;
  score: number;
  components: Record<SimilarityKey, SimilarityComponent>;
  label: EdgeLabel;
};

function setOf(inv: Investigation, key: SimilarityKey): string[] {
  switch (key) {
    case "related":
      // Each record's own accession plus the ones PSI lists as related, so a one-way link counts.
      return inv.accession ? [inv.accession, ...inv.relatedAccessions] : inv.relatedAccessions;
    case "hardware":
      return inv.hardwareTags;
    case "project":
      return inv.project === "Standalone" ? [] : [inv.project];
    case "materials":
      return [...new Set(inv.fuels.map(materialClassForFuel).filter((m): m is NonNullable<typeof m> => m !== null))];
    case "category":
      return [inv.category];
  }
}

export function jaccard(a: readonly string[], b: readonly string[]): { value: number | null; shared: string[] } {
  const A = new Set(a.map((s) => s.toLowerCase()));
  const B = new Set(b.map((s) => s.toLowerCase()));
  if (A.size === 0 && B.size === 0) return { value: null, shared: [] };
  const shared = [...new Set(a.filter((s) => B.has(s.toLowerCase())))];
  const union = new Set([...A, ...B]).size;
  return { value: shared.length / union, shared };
}

/** PSI relation: one record lists the other as related. Scored 1 or 0 (null when neither lists any). */
function related(a: Investigation, b: Investigation): SimilarityComponent & { listed: boolean } {
  const listed =
    a.id === b.id ||
    (!!b.accession && a.relatedAccessions.includes(b.accession)) ||
    (!!a.accession && b.relatedAccessions.includes(a.accession));
  const none = a.id !== b.id && a.relatedAccessions.length === 0 && b.relatedAccessions.length === 0;
  const pair = [a.accession, b.accession].filter((x): x is string => !!x);
  return { jaccard: none ? null : listed ? 1 : 0, shared: listed ? pair : [], weight: 0, listed };
}

export function edgeId(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

function pickLabel(c: Record<SimilarityKey, SimilarityComponent>): EdgeLabel {
  if ((c.related.jaccard ?? 0) > 0) return "PSI-listed relation";
  const options: Array<{ label: EdgeLabel; v: number }> = [
    { label: "shared hardware", v: (c.hardware.jaccard ?? 0) * c.hardware.weight },
    { label: "same project", v: (c.project.jaccard ?? 0) * c.project.weight },
    { label: "shared material", v: (c.materials.jaccard ?? 0) * c.materials.weight },
  ];
  options.sort((x, y) => y.v - x.v);
  return options[0]!.v > 0 ? options[0]!.label : "shared material";
}

export function similarity(a: Investigation, b: Investigation, weights: SimilarityWeights = DEFAULT_SIMILARITY_WEIGHTS): SimilarityResult {
  let num = 0;
  let den = 0;
  const components = {} as Record<SimilarityKey, SimilarityComponent>;
  for (const key of SIMILARITY_KEYS) {
    const { value, shared } = key === "related" ? { value: related(a, b).jaccard, shared: related(a, b).shared } : jaccard(setOf(a, key), setOf(b, key));
    components[key] = { jaccard: value, shared, weight: weights[key] };
    if (value !== null) {
      num += weights[key] * value;
      den += weights[key];
    }
  }
  const [source, target] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
  return { id: edgeId(a.id, b.id), source, target, score: den === 0 ? 0 : num / den, components, label: pickLabel(components) };
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
      const s = similarity(investigations[i]!, investigations[j]!, weights);
      if (s.score >= threshold) edges.push(s);
    }
  }
  return edges.sort((x, y) => y.score - x.score || x.id.localeCompare(y.id));
}

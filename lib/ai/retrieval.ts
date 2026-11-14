import { createInvestigationIndex } from "@/lib/search";
import type { Category, Investigation, SafetyPillar } from "@/lib/schema";

/**
 * Retrieval for Ask the Data: fuse.js fuzzy match blended with plain keyword overlap, plus light
 * boosts when a question names a fuel category, a low-pressure or high-O2 atmosphere, or a safety
 * pillar. Deliberately simple and explainable.
 */

const CATEGORY_WORDS: Record<Category, RegExp> = {
  solid: /\b(solids?|fabrics?|plastics?|foams?|materials?|wire|textiles?|pmma|sibal|nomex)\b/i,
  liquid: /\b(liquids?|droplets?|sprays?|heptane|decane|methanol|ethanol)\b/i,
  gas: /\b(gas|gases|gaseous|jets?|leaks?|burners?|ethylene|methane|propane)\b/i,
  "smoke-dust": /\b(smoke|dust|particles?|aerosols?|soot)\b/i,
};
/** Questions about exploration atmospheres favour investigations whose runs reach them. */
const LOW_PRESSURE = /\b(low|reduced)[- ]pressure|lunar|moon|mars|rover|exploration|8\.2 psi|10\.2 psi\b/i;
const HIGH_O2 = /\b(high|enriched|elevated)[- ](o2|oxygen)|\b3[0-9]% ?o2\b/i;
const PILLAR_WORDS: Record<SafetyPillar, RegExp> = {
  prevention: /\b(prevent\w*|flammab\w*|ignit\w*|spread)\b/i,
  detection: /\b(detect\w*|smoke|sensors?|alarms?|particles?)\b/i,
  suppression: /\b(suppress\w*|extingu\w*|quench\w*|diluents?|co2|carbon dioxide|helium)\b/i,
};

function boost(inv: Investigation, query: string): number {
  let b = 0;
  for (const [cat, re] of Object.entries(CATEGORY_WORDS) as Array<[Category, RegExp]>) {
    if (re.test(query)) b += inv.category === cat ? 0.25 : -0.05;
  }
  if (LOW_PRESSURE.test(query) && inv.ranges.pressurePsi && inv.ranges.pressurePsi.min < 11) b += 0.15;
  if (HIGH_O2.test(query) && inv.ranges.o2Percent && inv.ranges.o2Percent.max >= 25) b += 0.15;
  for (const [pillar, re] of Object.entries(PILLAR_WORDS) as Array<[SafetyPillar, RegExp]>) {
    if (re.test(query) && inv.teamAssessment.safetyPillars.includes(pillar)) b += 0.08;
  }
  if (inv.dataLevel === "runs") b += 0.05;
  return b;
}

const STOPWORDS = new Set(
  "a an and are as at be by can do does for from had has have how i if in into is it its of on or than that the their them then there these they this to was were what when where which who why will with would about any all also between compare compared did each more most much other over same should such through under used using versus vs we you your tested test tests investigation investigations data show shows".split(" ")
);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9.+-]*/g) ?? [])
    .map((t) => t.replace(/[.+-]+$/, ""))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function docText(inv: Investigation): string {
  return [
    inv.id,
    inv.accession ?? "",
    inv.acronym,
    inv.name,
    inv.project,
    inv.platform,
    inv.category,
    inv.subResearchArea,
    inv.keywords,
    ...inv.hardware.map((h) => h.name),
    ...inv.fuels,
    inv.objectives,
    inv.approach,
    inv.earthBenefits,
  ].join(" ");
}

function namesInvestigation(inv: Investigation, query: string): boolean {
  const q = ` ${query.toLowerCase().replace(/[^a-z0-9-]+/g, " ")} `;
  const acronym = inv.acronym.toLowerCase().replace(/[^a-z0-9-]+/g, " ").trim();
  return q.includes(` ${inv.id} `) || q.includes(` ${acronym} `);
}

export type Retrieved = { investigation: Investigation; score: number; fuzzy: number; overlap: number };

export function retrieve(query: string, investigations: readonly Investigation[], k = 6): Retrieved[] {
  const qTokens = new Set(tokenize(query));
  const fuse = createInvestigationIndex(investigations);
  const fuzzy = new Map<string, number>();
  for (const r of fuse.search(query.slice(0, 200))) fuzzy.set(r.item.id, 1 - (r.score ?? 1));
  for (const tok of qTokens) {
    if (tok.length < 3) continue;
    for (const r of fuse.search(tok)) {
      const s = (1 - (r.score ?? 1)) * 0.6;
      fuzzy.set(r.item.id, Math.max(fuzzy.get(r.item.id) ?? 0, s));
    }
  }

  const scored = investigations.map((inv) => {
    const doc = new Set(tokenize(docText(inv)));
    let hits = 0;
    for (const t of qTokens) if (doc.has(t)) hits++;
    const overlap = qTokens.size === 0 ? 0 : hits / qTokens.size;
    const f = fuzzy.get(inv.id) ?? 0;
    // Exact acronym or id mentions are strong signals.
    const named = namesInvestigation(inv, query) ? 0.5 : 0;
    return { investigation: inv, fuzzy: f, overlap, score: 0.45 * f + 0.45 * overlap + named + boost(inv, query) };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.investigation.id.localeCompare(b.investigation.id))
    .slice(0, k);
}

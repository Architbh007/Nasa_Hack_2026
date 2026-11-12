import { createInvestigationIndex } from "@/lib/search";
import type { FuelPhase, HabitatKey, Investigation, SafetyPillar } from "@/lib/schema";

/**
 * Retrieval for Ask the Data: fuse.js fuzzy match blended with plain keyword
 * overlap, plus light boosts when a question names a fuel phase, habitat or
 * safety pillar. Deliberately simple and explainable.
 */

const PHASE_WORDS: Record<FuelPhase, RegExp> = {
  solid: /\b(solids?|fabrics?|plastics?|foams?|materials?|wire|textiles?)\b/i,
  liquid: /\b(liquids?|droplets?|sprays?|propellants?)\b/i,
  gas: /\b(gas|gases|gaseous|jets?|leaks?)\b/i,
};
const HABITAT_WORDS: Record<HabitatKey, RegExp> = {
  iss: /\b(iss|space station|cabin air)\b/i,
  lunarBase: /\b(lunar|moon)\b/i,
  rover: /\b(rovers?)\b/i,
  marsTransit: /\b(mars|transit)\b/i,
};
const PILLAR_WORDS: Record<SafetyPillar, RegExp> = {
  prevention: /\b(prevent\w*|flammab\w*|ignit\w*|spread)\b/i,
  detection: /\b(detect\w*|smoke|sensors?|alarms?|particles?)\b/i,
  suppression: /\b(suppress\w*|extingu\w*|quench\w*|diluents?|co2|carbon dioxide|helium)\b/i,
};

function boost(inv: Investigation, query: string): number {
  let b = 0;
  for (const [phase, re] of Object.entries(PHASE_WORDS) as Array<[FuelPhase, RegExp]>) {
    if (re.test(query)) b += inv.fuelPhase === phase ? 0.25 : -0.1;
  }
  for (const [key, re] of Object.entries(HABITAT_WORDS) as Array<[HabitatKey, RegExp]>) {
    if (re.test(query)) b += (inv.habitatRelevance[key].score / 5) * 0.25;
  }
  for (const [pillar, re] of Object.entries(PILLAR_WORDS) as Array<[SafetyPillar, RegExp]>) {
    if (re.test(query) && inv.safetyPillars.includes(pillar)) b += 0.12;
  }
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
    inv.acronym,
    inv.name,
    inv.project,
    inv.platform,
    inv.fuelPhase,
    inv.gravityLevel,
    ...inv.hardware,
    ...inv.fuels,
    ...inv.diluents,
    ...inv.measurements,
    ...inv.objectives,
    ...inv.variables,
    ...inv.keyFindings,
    ...inv.safetyPillars,
    ...inv.earthApplications,
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

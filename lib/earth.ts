import type { Investigation } from "@/lib/schema";

/**
 * Earth benefits exactly as each PSI record states them ("Research Impacts/Earth Benefits"),
 * grouped by keyword for reading. The grouping is ours; the text is NASA's, quoted verbatim.
 */

export type EarthGroupKey = "fire-safety" | "detection" | "combustion" | "other";

export const EARTH_GROUPS: ReadonlyArray<{ key: EarthGroupKey; title: string; test: RegExp | null }> = [
  { key: "detection", title: "Smoke and fire detection", test: /detect|smoke|alarm/i },
  { key: "fire-safety", title: "Fire safety and material flammability", test: /fire safety|flammab|fire|suppress|extingu/i },
  { key: "combustion", title: "Cleaner, more efficient combustion", test: /soot|engine|emission|efficien|combustor|pollut|fuel/i },
  { key: "other", title: "Other benefits", test: null },
];

export type EarthItem = {
  investigationId: string;
  acronym: string;
  accession: string | null;
  text: string;
  pageUrl: string | null;
};
export type EarthGroup = { key: EarthGroupKey; title: string; items: EarthItem[] };

export function groupEarthBenefits(investigations: readonly Investigation[]): EarthGroup[] {
  const groups = new Map<EarthGroupKey, EarthItem[]>(EARTH_GROUPS.map((g) => [g.key, []]));
  for (const inv of investigations) {
    if (!inv.earthBenefits) continue;
    const group = EARTH_GROUPS.find((g) => g.test === null || g.test.test(inv.earthBenefits))!;
    groups.get(group.key)!.push({
      investigationId: inv.id,
      acronym: inv.acronym,
      accession: inv.accession,
      text: inv.earthBenefits,
      pageUrl: inv.citation.pageUrl,
    });
  }
  return EARTH_GROUPS.map((g) => ({ key: g.key, title: g.title, items: groups.get(g.key) ?? [] })).filter((g) => g.items.length > 0);
}

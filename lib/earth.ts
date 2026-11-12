import type { Investigation } from "@/lib/schema";

export type EarthGroupKey = "suppression" | "detection" | "gear" | "standards" | "combustion";

export const EARTH_GROUPS: ReadonlyArray<{ key: EarthGroupKey; title: string; blurb: string; test: RegExp }> = [
  {
    key: "suppression",
    title: "Water mist and inert-gas suppression",
    blurb: "How diluents and flow starve flames, informing suppression in ships, aircraft and server rooms.",
    test: /suppression|water mist|inert-gas|ventilation shutdown/i,
  },
  {
    key: "detection",
    title: "Smoke detection",
    blurb: "Particle-size and smoke-yield data for detectors that alarm sooner and false-alarm less.",
    test: /smoke detection|smoke detector|smoke alarm|detector/i,
  },
  {
    key: "gear",
    title: "Firefighter gear",
    blurb: "Flame-resistant fabric behavior that informs protective clothing and turnout gear tests.",
    test: /firefighter|protective clothing|turnout/i,
  },
  {
    key: "standards",
    title: "Material flammability standards",
    blurb: "Evidence that refines how materials are screened and ranked in flammability test methods.",
    test: /flammability standard|test method|fire modelling|building code/i,
  },
  {
    key: "combustion",
    title: "Cleaner combustion and engines",
    blurb: "Soot, flame stability and low-temperature chemistry data for burners, engines and turbines.",
    test: /soot|engine|burner|turbine|combustion|knock|spray|flame control|wildfire/i,
  },
];

export type EarthItem = { text: string; investigations: Array<{ id: string; acronym: string }> };
export type EarthGroup = { key: EarthGroupKey; title: string; blurb: string; items: EarthItem[] };

/** Strip a leading "Category: " label so the item reads on its own inside its group. */
function clean(text: string): string {
  const stripped = text.replace(/^[^:]{3,40}:\s*/, (m) =>
    /(smoke detection|firefighter gear|material flammability standards)/i.test(m) ? "" : m
  );
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

export function groupEarthApplications(investigations: readonly Investigation[]): EarthGroup[] {
  const groups = new Map<EarthGroupKey, Map<string, EarthItem>>();
  for (const g of EARTH_GROUPS) groups.set(g.key, new Map());
  for (const inv of investigations) {
    for (const app of inv.earthApplications) {
      const group = EARTH_GROUPS.find((g) => g.test.test(app)) ?? EARTH_GROUPS[EARTH_GROUPS.length - 1];
      if (!group) continue;
      const text = clean(app);
      const bucket = groups.get(group.key) as Map<string, EarthItem>;
      const item = bucket.get(text) ?? { text, investigations: [] };
      if (!item.investigations.some((i) => i.id === inv.id)) item.investigations.push({ id: inv.id, acronym: inv.acronym });
      bucket.set(text, item);
    }
  }
  return EARTH_GROUPS.map((g) => ({
    key: g.key,
    title: g.title,
    blurb: g.blurb,
    items: [...(groups.get(g.key)?.values() ?? [])].sort((a, b) => b.investigations.length - a.investigations.length),
  }));
}
